"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  RotateCcw,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import {
  ErrorPage,
  ForbiddenPage,
  LoadingPage,
} from "@/components/feedback/status-page";
import type { ApiEnvelope } from "@/lib/api";
import { apiFetch, unwrapApiData } from "@/lib/api";
import { useApiGet } from "@/hooks/use-api-get";
import { useTransferCapabilities } from "@/hooks/use-transfer-capabilities";
import { Button } from "@/components/ui/button";
import { TransferRequestReviewDialog } from "./transfers-request-ui";
import { TransferRequestWorkspace } from "./transfers-request-workspace";
import type {
  RequestCandidate,
  RequestLocationOption,
  RequestProductGroup,
} from "./transfers-shared";
import { useTransferDraft } from "./use-transfer-draft";

type LocationOption = {
  location_id: string;
  name: string;
  code: string;
  type: string;
  active: boolean;
};

const REQUEST_NOTE_PRESETS = [
  "Reposición por quiebre de stock",
  "Solicitud para pedido de cliente",
  "Balanceo entre sedes",
  "Apoyo para campaña / alta demanda",
  "Regularización interna",
] as const;

const REQUEST_NOTE_MAX_LENGTH = 200;

function DraftClearConfirmModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="ops-overlay-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--ops-surface)] px-5 py-5 shadow-[0_18px_60px_rgba(15,23,42,0.18)]">
        <h3 className="text-lg font-semibold text-[var(--ops-text)]">¿Limpiar productos?</h3>
        <p className="mt-3 text-sm leading-6 text-[var(--ops-text-muted)]">
          Se quitarán todos los productos agregados al borrador.
        </p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-9 rounded-lg px-3"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            className="h-9 rounded-lg px-3"
          >
            Limpiar
          </Button>
        </div>
      </div>
    </div>
  );
}

function OriginChangeConfirmModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="ops-overlay-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--ops-surface)] px-5 py-5 shadow-[0_18px_60px_rgba(15,23,42,0.18)]">
        <h3 className="text-lg font-semibold text-[var(--ops-text)]">¿Cambiar origen?</h3>
        <p className="mt-3 text-sm leading-6 text-[var(--ops-text-muted)]">
          Se quitarán las líneas agregadas al borrador para evitar mezclar stock de otra sede.
        </p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-9 rounded-lg px-3"
          >
            Mantener origen
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            className="h-9 rounded-lg px-3"
          >
            Cambiar y limpiar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TransfersRequestPage() {
  const router = useRouter();
  const initialSearchParams =
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  const { loading: authLoading, defaultLocation } = useAuth();
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [requestQuery, setRequestQuery] = useState("");
  const [requestCandidates, setRequestCandidates] = useState<RequestCandidate[]>([]);
  const [requestQueryError, setRequestQueryError] = useState<string | null>(null);
  const [selectedRequestProduct, setSelectedRequestProduct] =
    useState<RequestProductGroup | null>(null);
  const [requestLocationFilter, setRequestLocationFilter] = useState(
    () => {
      const originParam = initialSearchParams.get("origin_id") || "";
      return originParam === "all" ? "" : originParam;
    }
  );
  const [requestPickerOpen, setRequestPickerOpen] = useState(false);
  const [highlightedRequestIndex, setHighlightedRequestIndex] = useState(0);
  const [clearDraftModalOpen, setClearDraftModalOpen] = useState(false);
  const [pendingOriginChange, setPendingOriginChange] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const requestSearchInputRef = useRef<HTMLInputElement | null>(null);

  const transferCapabilities = useTransferCapabilities();

  const { data: locations } = useApiGet<LocationOption[]>(
    () =>
      apiFetch<ApiEnvelope<LocationOption[]> | LocationOption[]>("/api/locations", {
        cache: "no-store",
      }).then((p) => (unwrapApiData(p) || []).filter((l) => l.active)),
    []
  );

  const {
    draftLines,
    notes,
    setNotes,
    error,
    submittedTransfer,
    submittedSummary,
    duplicateDraftVariant,
    clearDuplicateDraftVariant,
    submitting,
    addRequestLine,
    updateLineQty,
    removeLine,
    submitTransferDraft,
    resetDraft,
    clearDraftLines,
    startNewRequest,
  } = useTransferDraft({
    isStoreRequestMode: true,
    selectedRequestProduct,
    originId: requestLocationFilter,
    setOriginId: (value: string) => {
      if (value === "") {
        setRequestLocationFilter("");
        setRequestQuery("");
        setRequestPickerOpen(false);
        setRequestCandidates([]);
        setRequestQueryError(null);
        setHighlightedRequestIndex(0);
      } else {
        setRequestLocationFilter(value);
      }
    },
    setSelectedRequestProduct,
    requestQuery,
    loadRequestCandidates: async (query: string) => {
      await loadRequestCandidates(query);
    },
    loadInventory: async () => {},
  });

  const originId = requestLocationFilter;
  const requestCompleted = Boolean(submittedTransfer);

  const loadRequestCandidates = useCallback(async (queryValue: string) => {
    const normalizedQuery = queryValue.trim();

    setLoadingCandidates(true);
    setRequestQueryError(null);

    try {
      const params = new URLSearchParams({ query: normalizedQuery });
      if (originId) {
        params.set("source_location_id", originId);
      }
      const payload = await apiFetch<ApiEnvelope<RequestCandidate[]> | RequestCandidate[]>(
        `/api/transfers/request-candidates?${params.toString()}`,
        { cache: "no-store" }
      );
      setRequestCandidates(unwrapApiData(payload) || []);
    } catch (requestError) {
      setRequestQueryError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo buscar stock para la transferencia"
      );
    } finally {
      setLoadingCandidates(false);
    }
  }, [originId]);

  useEffect(() => {
    if (!originId) {
      return;
    }

    if (!requestPickerOpen && !requestQuery.trim()) {
      return;
    }

    const timer = setTimeout(() => {
      void loadRequestCandidates(requestQuery);
    }, 250);

    return () => clearTimeout(timer);
  }, [loadRequestCandidates, originId, requestQuery, requestPickerOpen]);

  const activeRequestCandidates = useMemo(
    () => (requestPickerOpen || requestQuery.trim() || selectedRequestProduct ? requestCandidates : []),
    [requestCandidates, requestPickerOpen, requestQuery, selectedRequestProduct]
  );
  const activeRequestQueryError = requestPickerOpen || requestQuery.trim() ? requestQueryError : null;
  const activeLoadingCandidates = requestPickerOpen || requestQuery.trim() ? loadingCandidates : false;

  const requestProducts = useMemo<RequestProductGroup[]>(() => {
    const normalizedQuery = requestQuery.trim().toLowerCase();
    const grouped = new Map<string, RequestProductGroup>();

    for (const candidate of activeRequestCandidates) {
      const visibleSources = candidate.candidate_sources.filter((source) =>
        originId ? source.location_id === originId : true
      );

      if (visibleSources.length === 0) {
        continue;
      }

      const productKey = `${candidate.style_code}::${candidate.style_name}`;
      const variantTotalAvailable = visibleSources.reduce(
        (accumulator, source) => accumulator + Number(source.qty_available || 0),
        0
      );

      if (!grouped.has(productKey)) {
        grouped.set(productKey, {
          product_key: productKey,
          style_code: candidate.style_code,
          style_name: candidate.style_name,
          garment_type_name: candidate.garment_type_name || null,
          secondary_code: candidate.style_code || candidate.sku,
          total_available: 0,
          variants: [],
        });
      }

      const product = grouped.get(productKey)!;
      product.total_available += variantTotalAvailable;
      product.variants.push({
        variant_id: candidate.variant_id,
        sku: candidate.sku,
        size_code: candidate.size_code,
        color_name: candidate.color_name,
        total_available: variantTotalAvailable,
        candidate_sources: visibleSources,
      });
    }

    return [...grouped.values()]
      .map((product) => ({
        ...product,
        variants: product.variants.sort((left, right) => {
          const colorCompare = left.color_name.localeCompare(right.color_name, "es", {
            sensitivity: "base",
          });

          if (colorCompare !== 0) return colorCompare;

          return left.size_code.localeCompare(right.size_code, "es", {
            sensitivity: "base",
          });
        }),
      }))
      .sort((left, right) => {
        const leftName = left.style_name.toLowerCase();
        const rightName = right.style_name.toLowerCase();
        const leftStartsWith = normalizedQuery ? leftName.startsWith(normalizedQuery) : false;
        const rightStartsWith = normalizedQuery ? rightName.startsWith(normalizedQuery) : false;

        if (leftStartsWith !== rightStartsWith) {
          return leftStartsWith ? -1 : 1;
        }

        if (left.total_available !== right.total_available) {
          return right.total_available - left.total_available;
        }

        return left.style_name.localeCompare(right.style_name, "es", {
          sensitivity: "base",
        });
      });
  }, [activeRequestCandidates, originId, requestQuery]);

  const visibleHighlightedRequestIndex =
    requestProducts.length === 0
      ? 0
      : Math.min(Math.max(highlightedRequestIndex, 0), Math.min(requestProducts.length, 8) - 1);

  const requestSearchEmptyMessage = useMemo(() => {
    if (activeLoadingCandidates) return "Buscando productos disponibles...";
    if (requestProducts.length === 0) return "No encontramos productos con ese criterio.";
    return "Selecciona un producto para continuar.";
  }, [activeLoadingCandidates, requestProducts.length]);

  const requestLocationOptions = useMemo<RequestLocationOption[]>(() => {
    const destinationLocationId = defaultLocation?.location_id;
    const activeLocations = (locations || []).filter(
      (location) =>
        location.location_id !== destinationLocationId &&
        location.type !== "workshop"
    );

    return activeLocations.map((location) => ({
      value: location.location_id,
      label: location.name,
      type: location.type,
    }));
  }, [defaultLocation?.location_id, locations]);
  const selectedOriginOption =
    requestLocationOptions.find((option) => option.value === requestLocationFilter) || null;

  const selectedOriginName =
    selectedOriginOption?.label || "";
  const requestSummaryContext = useMemo(
    () => ({
      originName: selectedOriginName,
      originType: selectedOriginOption?.type || null,
      destinationName: defaultLocation?.name || "Sin sede",
      destinationType: defaultLocation?.type || null,
      lines: draftLines.length,
      units: draftLines.reduce((accumulator, line) => accumulator + line.qty_requested, 0),
      notes: notes.trim() || null,
    }),
    [defaultLocation?.name, defaultLocation?.type, draftLines, notes, selectedOriginName, selectedOriginOption?.type]
  );

  function resetDraftForOriginChange() {
    resetDraft();
  }

  function applyOriginChange(nextValue: string, resetCurrentDraft: boolean) {
    if (resetCurrentDraft) {
      resetDraftForOriginChange();
    }

    setRequestLocationFilter(nextValue);
    setRequestQuery("");
    setSelectedRequestProduct(null);
    setRequestPickerOpen(false);
    setHighlightedRequestIndex(0);
    clearDuplicateDraftVariant();
  }

  function handleOriginChange(nextValue: string) {
    if (requestCompleted) {
      return;
    }

    if (nextValue === requestLocationFilter) {
      return;
    }

    if (draftLines.length > 0) {
      setPendingOriginChange(nextValue);
      return;
    }

    applyOriginChange(nextValue, false);
  }

  function handleConfirmOriginChange() {
    if (pendingOriginChange === null) {
      return;
    }

    applyOriginChange(pendingOriginChange, true);
    setPendingOriginChange(null);
  }

  function handleCancelOriginChange() {
    setPendingOriginChange(null);
  }

  function handleRequestQueryChange(value: string) {
    setRequestQuery(value);
    if (selectedRequestProduct) {
      setSelectedRequestProduct(null);
    }
    clearDuplicateDraftVariant();
  }

  function handleSelectRequestProduct(product: RequestProductGroup) {
    setRequestQuery("");
    setSelectedRequestProduct(product);
    setRequestPickerOpen(false);
    clearDuplicateDraftVariant();
  }

  function handleClearRequestProduct() {
    setRequestQuery("");
    setSelectedRequestProduct(null);
    setRequestPickerOpen(false);
    setHighlightedRequestIndex(0);
    clearDuplicateDraftVariant();
    window.requestAnimationFrame(() => {
      requestSearchInputRef.current?.focus();
    });
  }

  function handleReviewSubmit() {
    setReviewDialogOpen(true);
  }

  async function handleConfirmSubmit() {
    await submitTransferDraft(originId, "", defaultLocation, requestSummaryContext);
  }

  function handleClearNotes() {
    setNotes("");
  }

  function handleStartNewRequest() {
    setReviewDialogOpen(false);
    startNewRequest();
  }

  function handleViewSubmittedTransfer() {
    if (!submittedTransfer) return;
    router.push(`/transferencias/${submittedTransfer.transfer_id}`);
  }

  if (authLoading) {
    return (
      <LoadingPage
        variant="ops"
        title="Preparando solicitud de transferencia"
        description="Validando tu sede activa y los permisos operativos para solicitar stock a otra sede."
      />
    );
  }

  if (!transferCapabilities.requestCreate) {
    return <ForbiddenPage variant="ops" />;
  }

  if (!defaultLocation?.location_id) {
    return (
      <ErrorPage
        variant="ops"
        title="Falta una sede operativa"
        description="Necesitas una sede default activa para solicitar una transferencia entre sedes."
      />
    );
  }

  return (
    <TransferRequestWorkspace
      headerActions={
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link href="/transferencias/recepciones">
            <RotateCcw className="h-4 w-4" />
            Pendientes de recepción
          </Link>
        </Button>
      }
      pageError={reviewDialogOpen ? null : error}
      originOptions={requestLocationOptions}
      originId={originId}
      onOriginChange={handleOriginChange}
      destinationName={defaultLocation?.name || "Sin sede"}
      destinationType={defaultLocation?.type}
      requestQuery={requestQuery}
      onRequestQueryChange={handleRequestQueryChange}
      requestPickerOpen={requestPickerOpen}
      onRequestPickerOpenChange={setRequestPickerOpen}
      requestProducts={requestProducts}
      loadingRequestProducts={activeLoadingCandidates}
      requestProductsError={activeRequestQueryError}
      requestProductsEmptyMessage={requestSearchEmptyMessage}
      highlightedRequestIndex={visibleHighlightedRequestIndex}
      onHighlightedRequestIndexChange={setHighlightedRequestIndex}
      requestSearchInputRef={requestSearchInputRef}
      selectedRequestProduct={selectedRequestProduct}
      onSelectRequestProduct={handleSelectRequestProduct}
      onClearRequestProduct={handleClearRequestProduct}
      onAddRequestLine={addRequestLine}
      duplicateDraftVariant={duplicateDraftVariant}
      draftLines={draftLines}
      onUpdateLineQty={updateLineQty}
      onRemoveLine={removeLine}
      onRequestClearDraft={() => setClearDraftModalOpen(true)}
      notes={notes}
      onNotesChange={setNotes}
      onClearNotes={handleClearNotes}
      notePresets={REQUEST_NOTE_PRESETS}
      notesMaxLength={REQUEST_NOTE_MAX_LENGTH}
      submittedTransfer={submittedTransfer}
      submittedSummary={submittedSummary}
      onViewSubmittedTransfer={handleViewSubmittedTransfer}
      onStartNewRequest={handleStartNewRequest}
      submitting={submitting}
      onRequestReview={handleReviewSubmit}
      dialogLayer={
        <>
          <TransferRequestReviewDialog
            open={reviewDialogOpen && !submittedTransfer}
            onOpenChange={setReviewDialogOpen}
            draftLines={draftLines}
            originName={selectedOriginName}
            originType={selectedOriginOption?.type}
            destinationName={defaultLocation?.name || "Sin sede"}
            destinationType={defaultLocation?.type}
            notes={notes.trim() || null}
            error={reviewDialogOpen ? error : null}
            submitting={submitting}
            onConfirm={handleConfirmSubmit}
          />

          <DraftClearConfirmModal
            open={clearDraftModalOpen}
            onCancel={() => setClearDraftModalOpen(false)}
            onConfirm={() => {
              clearDraftLines();
              setClearDraftModalOpen(false);
            }}
          />

          <OriginChangeConfirmModal
            open={pendingOriginChange !== null}
            onCancel={handleCancelOriginChange}
            onConfirm={handleConfirmOriginChange}
          />
        </>
      }
    />
  );
}
