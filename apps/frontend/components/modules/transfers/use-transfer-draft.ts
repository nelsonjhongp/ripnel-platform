import { useCallback, useState } from "react";
import type { ApiEnvelope } from "@/lib/api";
import { apiFetch, unwrapApiData } from "@/lib/api";
import type { DraftLine, RequestCandidateSource, RequestProductVariant, RequestProductGroup } from "./transfers-shared";
import { TRANS } from "./transfers-messages";
import { showSuccess } from "@/lib/toast";

type InventoryItem = {
  location_id: string;
  location_code: string;
  location_name: string;
  variant_id: string;
  sku: string;
  style_code: string;
  style_name: string;
  garment_type_name: string | null;
  size_code: string;
  color_name: string;
  qty: number;
};

type UseTransferDraftOptions = {
  isStoreRequestMode: boolean;
  selectedRequestProduct: RequestProductGroup | null;
  originId: string;
  setOriginId: (value: string) => void;
  setSelectedRequestProduct: (product: RequestProductGroup | null) => void;
  requestQuery: string;
  loadRequestCandidates: (query: string) => Promise<void>;
  loadInventory: (locationId: string) => Promise<void>;
};

type SubmittedSummary = {
  originName: string;
  originType: string | null;
  destinationName: string;
  destinationType: string | null;
  lines: number;
  units: number;
  notes: string | null;
  transferNumber: string | null;
};

export function useTransferDraft({
  isStoreRequestMode,
  selectedRequestProduct,
  originId,
  setOriginId,
  setSelectedRequestProduct,
  requestQuery,
  loadRequestCandidates,
  loadInventory,
}: UseTransferDraftOptions) {
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submittedTransfer, setSubmittedTransfer] = useState<{
    transfer_id: string;
    transfer_number: string | null;
  } | null>(null);
  const [submittedSummary, setSubmittedSummary] = useState<SubmittedSummary | null>(null);
  const [duplicateDraftVariant, setDuplicateDraftVariant] = useState<{
    variantId: string;
    message: string;
    token: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const successMessage = null as string | null;

  const addLine = useCallback(
    (item: InventoryItem, rawQty?: string) => {
      const qtyValue = rawQty ?? pendingQuantities[item.variant_id] ?? "";
      const qtyRequested = Number(qtyValue);

      if (!Number.isInteger(qtyRequested) || qtyRequested <= 0) {
        setError(TRANS.validation.qtyIntegerPositive);
        return;
      }

      if (qtyRequested > item.qty) {
        setError(TRANS.validation.qtyExceedsStock);
        return;
      }

      setError(null);
      setDraftLines((current) => [...current, { ...item, qty_requested: qtyRequested }]);
      setPendingQuantities((current) => ({ ...current, [item.variant_id]: "" }));
    },
    [pendingQuantities]
  );

  const addRequestLine = useCallback(
    (
      variant: RequestProductVariant,
      source: RequestCandidateSource,
      qtyRequested: number
    ) => {
      if (!selectedRequestProduct) {
        setDuplicateDraftVariant(null);
        setError(TRANS.validation.noProductIdentified);
        return;
      }

      if (originId && originId !== source.location_id) {
        setDuplicateDraftVariant(null);
        setError(TRANS.validation.originChanged);
        return;
      }

      if (draftLines.some((line) => line.variant_id === variant.variant_id)) {
        setDuplicateDraftVariant({
          variantId: variant.variant_id,
          message: TRANS.validation.duplicateVariant,
          token: Date.now(),
        });
        setError(null);
        return;
      }

      if (!Number.isInteger(qtyRequested) || qtyRequested <= 0) {
        setDuplicateDraftVariant(null);
        setError(TRANS.validation.qtyIntegerPositive);
        return;
      }

      if (qtyRequested > source.qty_available) {
        setDuplicateDraftVariant(null);
        setError(TRANS.validation.qtyExceedsVisible);
        return;
      }

      setDuplicateDraftVariant(null);
      setError(null);
      setOriginId(source.location_id);
      setDraftLines((current) => [
        ...current,
        {
          location_id: source.location_id,
          location_code: source.location_code,
          location_name: source.location_name,
          variant_id: variant.variant_id,
          sku: variant.sku,
          style_code: selectedRequestProduct.style_code,
          style_name: selectedRequestProduct.style_name,
          garment_type_name: selectedRequestProduct.garment_type_name,
          size_code: variant.size_code,
          color_name: variant.color_name,
          qty: source.qty_available,
          qty_requested: qtyRequested,
        },
      ]);
    },
    [selectedRequestProduct, originId, draftLines, setOriginId]
  );

  const updateLineQty = useCallback((variantId: string, rawValue: string) => {
    setDraftLines((current) =>
      current.map((line) => {
        if (line.variant_id !== variantId) return line;
        const nextQty = Number(rawValue);
        if (!Number.isInteger(nextQty) || nextQty <= 0) return { ...line, qty_requested: 1 };
        return { ...line, qty_requested: Math.min(nextQty, line.qty) };
      })
    );
  }, []);

  const incrementLineQty = useCallback((variantId: string) => {
    setDraftLines((current) =>
      current.map((line) =>
        line.variant_id === variantId
          ? { ...line, qty_requested: Math.min(line.qty_requested + 1, line.qty) }
          : line
      )
    );
  }, []);

  const decrementLineQty = useCallback((variantId: string) => {
    setDraftLines((current) =>
      current.map((line) =>
        line.variant_id === variantId
          ? { ...line, qty_requested: Math.max(line.qty_requested - 1, 1) }
          : line
      )
    );
  }, []);

  const removeLine = useCallback((variantId: string) => {
    setDraftLines((current) => current.filter((line) => line.variant_id !== variantId));
  }, []);

  const submitTransferDraft = useCallback(
    async (
      fromLocationId: string,
      toLocationId: string,
      defaultLocation?: { location_id: string; name: string } | null,
      summaryContext?: Omit<SubmittedSummary, "transferNumber">
    ) => {
      setSubmitting(true);
      setDuplicateDraftVariant(null);
      setSubmittedTransfer(null);
      setSubmittedSummary(null);
      setError(null);

      try {
        const targetDestinationId = isStoreRequestMode
          ? defaultLocation?.location_id
          : toLocationId;

        if (!fromLocationId || !targetDestinationId) {
          throw new Error(
            isStoreRequestMode
              ? TRANS.validation.originRequired
              : TRANS.validation.originDestRequired
          );
        }

        if (!draftLines.length) {
          throw new Error(
            isStoreRequestMode
              ? TRANS.validation.atLeastOneVariant
              : TRANS.validation.atLeastOneVariantManage
          );
        }

        const payload = await apiFetch<
          ApiEnvelope<{ transfer_id: string; transfer_number?: string | null }> | { transfer_id: string; transfer_number?: string | null }
        >("/api/transfers", {
          method: "POST",
          body: JSON.stringify({
            from_location_id: fromLocationId,
            to_location_id: targetDestinationId,
            notes: notes.trim() || null,
            lines: draftLines.map((line) => ({
              variant_id: line.variant_id,
              qty_requested: line.qty_requested,
              notes: null,
            })),
          }),
        });
        const data = unwrapApiData(payload);

        const transferNumber = data.transfer_number || null;

        showSuccess(
          isStoreRequestMode
            ? TRANS.toast.sent(transferNumber || "creada")
            : TRANS.toast.registered(transferNumber || "creada")
        );
        setSubmittedTransfer({
          transfer_id: data.transfer_id,
          transfer_number: transferNumber,
        });
        if (summaryContext) {
          setSubmittedSummary({
            ...summaryContext,
            transferNumber,
          });
        }
        setDraftLines([]);
        setPendingQuantities({});
        setNotes("");
        setOriginId("");
        setSelectedRequestProduct(null);

        if (isStoreRequestMode) {
          await loadRequestCandidates(requestQuery.trim());
        } else {
          await loadInventory(fromLocationId);
        }
      } catch (requestError) {
        const isNetworkError =
          requestError instanceof TypeError ||
          (requestError instanceof Error &&
            requestError.message.toLowerCase().includes("failed to fetch"));

        setError(
          isNetworkError
            ? TRANS.toast.connectionError
            : requestError instanceof Error
              ? requestError.message
            : isStoreRequestMode
              ? TRANS.toast.sendError
              : TRANS.toast.createError
        );
      } finally {
        setSubmitting(false);
      }
    },
    [
      isStoreRequestMode,
      draftLines,
      notes,
      requestQuery,
      loadRequestCandidates,
      loadInventory,
      setOriginId,
      setSelectedRequestProduct,
    ]
  );

  const resetDraft = useCallback(() => {
    setDraftLines([]);
    setPendingQuantities({});
    setOriginId("");
    setSubmittedTransfer(null);
    setSubmittedSummary(null);
    setDuplicateDraftVariant(null);
    setError(null);
  }, [setOriginId]);

  const clearDraftLines = useCallback(() => {
    setDraftLines([]);
    setPendingQuantities({});
    setSubmittedTransfer(null);
    setSubmittedSummary(null);
    setDuplicateDraftVariant(null);
    setError(null);
  }, []);

  const clearDuplicateDraftVariant = useCallback(() => {
    setDuplicateDraftVariant(null);
  }, []);

  const startNewRequest = useCallback(() => {
    setDraftLines([]);
    setPendingQuantities({});
    setNotes("");
    setSubmittedTransfer(null);
    setSubmittedSummary(null);
    setDuplicateDraftVariant(null);
    setError(null);
    setOriginId("");
    setSelectedRequestProduct(null);
  }, [setOriginId, setSelectedRequestProduct]);

  return {
    draftLines,
    setDraftLines,
    pendingQuantities,
    setPendingQuantities,
    notes,
    setNotes,
    error,
    setError,
    successMessage,
    submittedTransfer,
    submittedSummary,
    duplicateDraftVariant,
    clearDuplicateDraftVariant,
    submitting,
    addLine,
    addRequestLine,
    updateLineQty,
    incrementLineQty,
    decrementLineQty,
    removeLine,
    submitTransferDraft,
    resetDraft,
    clearDraftLines,
    startNewRequest,
  };
}
