import { useCallback, useState } from "react";
import type { ApiEnvelope } from "@/lib/api";
import { apiFetch, unwrapApiData } from "@/lib/api";
import type { DraftLine } from "./transfers-request-ui";
import type { RequestCandidateSource, RequestProductVariant } from "./transfers-request-ui";
import type { RequestProductGroup } from "./transfers-request-ui";

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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

  const addLine = useCallback(
    (item: InventoryItem, rawQty?: string) => {
      const qtyValue = rawQty ?? pendingQuantities[item.variant_id] ?? "";
      const qtyRequested = Number(qtyValue);

      if (!Number.isInteger(qtyRequested) || qtyRequested <= 0) {
        setError("La cantidad solicitada debe ser un entero mayor a cero");
        return;
      }

      if (qtyRequested > item.qty) {
        setError("La cantidad solicitada no puede exceder el stock disponible");
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
        setError("No se pudo identificar el producto seleccionado.");
        return;
      }

      if (originId && originId !== source.location_id) {
        setDuplicateDraftVariant(null);
        setError("Esta solicitud ya quedo ligada a otra sede origen. Cambia el origen para continuar.");
        return;
      }

      if (draftLines.some((line) => line.variant_id === variant.variant_id)) {
        setDuplicateDraftVariant({
          variantId: variant.variant_id,
          message: "Esta variante ya está agregada en el borrador.",
          token: Date.now(),
        });
        setError(null);
        return;
      }

      if (!Number.isInteger(qtyRequested) || qtyRequested <= 0) {
        setDuplicateDraftVariant(null);
        setError("La cantidad solicitada debe ser un entero mayor a cero");
        return;
      }

      if (qtyRequested > source.qty_available) {
        setDuplicateDraftVariant(null);
        setError("La cantidad solicitada no puede exceder el stock visible de esa sede.");
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
      setSuccessMessage(null);

      try {
        const targetDestinationId = isStoreRequestMode
          ? defaultLocation?.location_id
          : toLocationId;

        if (!fromLocationId || !targetDestinationId) {
          throw new Error(
            isStoreRequestMode
              ? "Debes definir una sede origen y una sede destino operativa."
              : "Debes seleccionar origen y destino"
          );
        }

        if (!draftLines.length) {
          throw new Error(
            isStoreRequestMode
              ? "Debes agregar al menos una variante a la solicitud."
              : "Debes agregar al menos una variante a la transferencia"
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

        setSuccessMessage(
          isStoreRequestMode
            ? `Solicitud de transferencia ${transferNumber || "creada"} enviada correctamente.`
            : `Transferencia ${transferNumber || "creada"} registrada correctamente.`
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
            ? "No se pudo conectar para enviar la solicitud. Intenta nuevamente."
            : requestError instanceof Error
              ? requestError.message
            : isStoreRequestMode
              ? "No se pudo enviar la solicitud de transferencia"
              : "No se pudo crear la transferencia"
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
    setSuccessMessage(null);
    setSubmittedTransfer(null);
    setSubmittedSummary(null);
    setDuplicateDraftVariant(null);
    setError(null);
  }, [setOriginId]);

  const clearDraftLines = useCallback(() => {
    setDraftLines([]);
    setPendingQuantities({});
    setSuccessMessage(null);
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
    setSuccessMessage(null);
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
    setSuccessMessage,
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
