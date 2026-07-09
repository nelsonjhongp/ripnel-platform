"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
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
import { useDebouncedApiSearch } from "@/hooks/use-debounced-api-search";
import { useTransferCapabilities } from "@/hooks/use-transfer-capabilities";
import { Button } from "@/components/ui/button";
import { TransferRequestReviewDialog } from "./transfers-request-ui";
import { TransferRequestWorkspace } from "./transfers-request-workspace";
import { TransferDestinationStep } from "./TransferDestinationStep";
import { TransferProductsStep } from "./TransferProductsStep";
import {
  buildTransferRequestProductGroups,
  type RequestCandidate,
  type RequestLocationOption,
  type RequestProductGroup,
} from "./transfers-shared";
import { TRANS } from "./transfers-messages";
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
  const [requestQuery, setRequestQuery] = useState("");
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

  const originId = requestLocationFilter;
  const fetchRequestCandidates = useCallback(
    async (signal: AbortSignal) => {
      const normalizedQuery = requestQuery.trim();
      const params = new URLSearchParams({ query: normalizedQuery });
      if (originId) {
        params.set("source_location_id", originId);
      }

      const payload = await apiFetch<ApiEnvelope<RequestCandidate[]> | RequestCandidate[]>(
        `/api/transfers/request-candidates?${params.toString()}`,
        { cache: "no-store", signal }
      );

      return unwrapApiData(payload) || [];
    },
    [originId, requestQuery]
  );

  const getRequestCandidatesErrorMessage = useCallback(
    (requestError: unknown) =>
      requestError instanceof Error
        ? requestError.message
        : "No se pudo buscar stock para la transferencia",
    []
  );

  const {
    results: requestCandidates,
    loading: loadingCandidates,
    error: requestQueryError,
    reset: resetRequestCandidates,
    refetch: refetchRequestCandidates,
  } = useDebouncedApiSearch<RequestCandidate>({
    enabled: Boolean(originId) && (requestPickerOpen || Boolean(requestQuery.trim())),
    fetcher: fetchRequestCandidates,
    getErrorMessage: getRequestCandidatesErrorMessage,
    searchValue: requestQuery,
  });

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
        resetRequestCandidates();
        setHighlightedRequestIndex(0);
      } else {
        setRequestLocationFilter(value);
      }
    },
    setSelectedRequestProduct,
    requestQuery,
    loadRequestCandidates: async (query: string) => {
      if (query !== requestQuery) {
        setRequestQuery(query);
        return;
      }
      refetchRequestCandidates();
    },
    loadInventory: async () => {},
  });

  const requestCompleted = Boolean(submittedTransfer);

  const activeRequestCandidates = useMemo(
    () => (requestPickerOpen || requestQuery.trim() || selectedRequestProduct ? requestCandidates : []),
    [requestCandidates, requestPickerOpen, requestQuery, selectedRequestProduct]
  );
  const activeRequestQueryError = requestPickerOpen || requestQuery.trim() ? requestQueryError : null;
  const activeLoadingCandidates = requestPickerOpen || requestQuery.trim() ? loadingCandidates : false;

  const requestProducts = useMemo<RequestProductGroup[]>(() => {
    return buildTransferRequestProductGroups({
      candidates: activeRequestCandidates,
      originId,
      query: requestQuery,
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

  const hasOriginSelected = Boolean(originId);
  const transferCompleted = Boolean(submittedTransfer);

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
    >
      {transferCompleted ? (
        <section className="ops-surface rounded-xl border p-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[var(--ops-text)]">
              {TRANS.request.sentSuccess}
            </p>
            <p className="text-sm text-[var(--ops-text-muted)]">
              {TRANS.request.draftClosed} Puedes revisar el detalle o iniciar una nueva
              solicitud desde el panel de resumen.
            </p>
          </div>
        </section>
      ) : (
        <>
          <TransferDestinationStep
            originOptions={requestLocationOptions}
            originId={originId}
            onOriginChange={handleOriginChange}
            destinationName={defaultLocation?.name || "Sin sede"}
            destinationType={defaultLocation?.type}
            hasDraftLines={draftLines.length > 0}
          />
          <TransferProductsStep
            originId={originId}
            hasOriginSelected={hasOriginSelected}
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
          />
        </>
      )}
    </TransferRequestWorkspace>
  );
}