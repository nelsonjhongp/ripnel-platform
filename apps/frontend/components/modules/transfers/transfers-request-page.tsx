"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ClipboardList,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import {
  ErrorPage,
  ForbiddenPage,
  LoadingPage,
} from "@/components/feedback/status-page";
import type { ApiEnvelope } from "@/lib/api";
import { apiFetch, unwrapApiData } from "@/lib/api";
import { resolveTransferCapabilities } from "@/lib/capabilities";
import { cn } from "@/lib/utils";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { AdminInlineMessage } from "@/components/admin/admin-ui";
import {
  CompactPickerEmpty,
  CompactPickerList,
  CompactPickerOption,
  CompactPickerPopover,
} from "@/components/ui/compact-picker";
import { Button } from "@/components/ui/button";
import { OpsPageShell, OpsSectionDivider } from "@/components/ui/ops-page-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  DraftSummaryPanel,
  RequestDraftTable,
  RequestProductComposer,
  RequestRouteField,
  type RequestCandidate,
  type RequestLocationOption,
  type RequestProductGroup,
} from "./transfers-request-ui";
import { useTransferDraft } from "./use-transfer-draft";
import type { OpsOption } from "@/components/ui/ops-selection";

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

function TransferSectionHeading({
  step,
  title,
}: {
  step: number;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ripnel-accent)] text-xs font-semibold text-white">
        {step}
      </span>
      <h2 className="text-lg font-semibold text-[var(--ops-text)]">{title}</h2>
    </div>
  );
}

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

function buildProductOptionSummary(product: RequestProductGroup) {
  const colorsCount = new Set(
    product.variants.map((variant) => variant.color_name).filter(Boolean)
  ).size;
  const sizesCount = new Set(
    product.variants.map((variant) => variant.size_code).filter(Boolean)
  ).size;

  return {
    colorsCount,
    sizesCount,
  };
}

function RequestProductPickerField({
  value,
  onChange,
  onFocus,
  onKeyDown,
  onClear,
  inputRef,
  requestPickerRef,
  requestPickerOpen,
  loading,
  error,
  emptyMessage,
  products,
  highlightedIndex,
  onHighlight,
  onSelect,
  selectedProductKey,
  placeholder,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onClear: () => void;
  inputRef?: Ref<HTMLInputElement>;
  requestPickerRef: { current: HTMLDivElement | null };
  requestPickerOpen: boolean;
  loading: boolean;
  error: string | null;
  emptyMessage: string;
  products: RequestProductGroup[];
  highlightedIndex: number;
  onHighlight: (index: number) => void;
  onSelect: (product: RequestProductGroup) => void;
  selectedProductKey?: string;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div ref={requestPickerRef} className="relative space-y-1.5">
      <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
        Buscar producto
      </label>

      <div
        className={cn(
          "sales-field flex h-10 items-center gap-2 rounded-lg px-3 transition",
          disabled
            ? "cursor-not-allowed border-dashed bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_82%,var(--ops-surface))] text-[var(--ops-text-muted)]"
            : "hover:bg-[var(--ops-surface-muted)]"
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-[var(--ops-text-muted)]" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Seleccionar producto para solicitar transferencia"
          disabled={disabled}
          className="h-full w-full bg-transparent text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)] disabled:cursor-not-allowed"
        />
        {value && !disabled ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClear}
            className="rounded-lg text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)]"
            aria-label="Limpiar búsqueda de producto"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {requestPickerOpen ? (
        <CompactPickerPopover className="absolute left-0 right-0 top-[calc(100%+1px)] z-30 rounded-xl border border-[var(--ops-border-strong)]">
          {error ? (
            <CompactPickerEmpty>{error}</CompactPickerEmpty>
          ) : loading && products.length === 0 ? (
            <CompactPickerEmpty>Buscando productos disponibles...</CompactPickerEmpty>
          ) : products.length === 0 ? (
            <CompactPickerEmpty>{emptyMessage}</CompactPickerEmpty>
          ) : (
            <CompactPickerList
              className="max-h-72 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none" }}
            >
              <div className="divide-y divide-[var(--ops-border-strong)]">
                {products.slice(0, 8).map((product, index) => (
                  <CompactPickerOption
                    key={product.product_key}
                    active={index === highlightedIndex}
                    selected={selectedProductKey === product.product_key}
                    onMouseEnter={() => onHighlight(index)}
                    onClick={() => onSelect(product)}
                    className="px-4 py-3"
                  >
                    {(() => {
                      const { colorsCount, sizesCount } = buildProductOptionSummary(product);

                      return (
                        <div className="flex min-w-0 items-center">
                          <p className="min-w-0 truncate text-sm text-[var(--ops-text)]">
                            <span className="font-semibold">{product.style_name}</span>
                            <span className="text-[var(--ops-text-muted)]">
                              {` · ${colorsCount} ${colorsCount === 1 ? "color" : "colores"} · ${sizesCount} ${sizesCount === 1 ? "talla" : "tallas"} · stock: ${product.total_available} u.`}
                            </span>
                          </p>
                        </div>
                      );
                    })()}
                  </CompactPickerOption>
                ))}
              </div>
            </CompactPickerList>
          )}
        </CompactPickerPopover>
      ) : null}
    </div>
  );
}

export function TransfersRequestPage() {
  const router = useRouter();
  const initialSearchParams =
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  const { loading: authLoading, defaultLocation, permissions, user } = useAuth();
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [requestQuery, setRequestQuery] = useState("");
  const [requestCandidates, setRequestCandidates] = useState<RequestCandidate[]>([]);
  const [requestQueryError, setRequestQueryError] = useState<string | null>(null);
  const [selectedRequestProduct, setSelectedRequestProduct] =
    useState<RequestProductGroup | null>(null);
  const [requestLocationFilter, setRequestLocationFilter] = useState(
    () => initialSearchParams.get("origin_id") || "all"
  );
  const [requestPickerOpen, setRequestPickerOpen] = useState(false);
  const [highlightedRequestIndex, setHighlightedRequestIndex] = useState(0);
  const [clearDraftModalOpen, setClearDraftModalOpen] = useState(false);
  const [noteMode, setNoteMode] = useState<"preset" | "manual">("preset");
  const [selectedNotePreset, setSelectedNotePreset] = useState("");
  const requestPickerRef = useRef<HTMLDivElement | null>(null);
  const requestSearchInputRef = useRef<HTMLInputElement | null>(null);

  const transferCapabilities = useMemo(
    () => resolveTransferCapabilities({ permissions, roleName: user?.role_name }),
    [permissions, user?.role_name]
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
    originId: requestLocationFilter === "all" ? "" : requestLocationFilter,
    setOriginId: (value: string) => {
      if (value === "") {
        setRequestLocationFilter("all");
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

  const originId = requestLocationFilter === "all" ? "" : requestLocationFilter;
  const hasOriginSelected = Boolean(originId);
  const requestCompleted = Boolean(submittedTransfer);
  const notePresetOptions = useMemo<OpsOption[]>(
    () => REQUEST_NOTE_PRESETS.map((preset) => ({ value: preset, label: preset })),
    []
  );

  async function loadLocations() {
    try {
      const payload = await apiFetch<
        ApiEnvelope<LocationOption[]> | LocationOption[]
      >("/api/locations", {
        cache: "no-store",
      });
      const data = unwrapApiData(payload);
      setLocations((data || []).filter((location) => location.active));
    } catch {
      // Error handled by hook
    }
  }

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
    void Promise.resolve().then(() => {
      void loadLocations();
    });
  }, []);

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

  useEffect(() => {
    if (!requestPickerOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (requestPickerRef.current && !requestPickerRef.current.contains(event.target as Node)) {
        setRequestPickerOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [requestPickerOpen]);

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

  const requestInputValue = requestQuery;

  const requestLocationOptions = useMemo<RequestLocationOption[]>(() => {
    const destinationLocationId = defaultLocation?.location_id;
    const activeLocations = locations.filter(
      (location) => location.active && location.location_id !== destinationLocationId
    );

    return [
      { value: "all", label: "Seleccionar origen", type: null },
      ...activeLocations.map((location) => ({
        value: location.location_id,
        label: location.name,
        type: location.type,
      })),
    ];
  }, [defaultLocation?.location_id, locations]);
  const selectedOriginOption =
    requestLocationOptions.find((option) => option.value === requestLocationFilter) || null;

  const selectedOriginName =
    selectedOriginOption?.label || "Pendiente";
  function resetDraftForOriginChange() {
    resetDraft();
  }

  function handleOriginChange(nextValue: string) {
    if (requestCompleted) {
      return;
    }

    if (nextValue === requestLocationFilter) {
      return;
    }

    if (draftLines.length > 0) {
      resetDraftForOriginChange();
    }

    setRequestLocationFilter(nextValue);
    setRequestQuery("");
    setSelectedRequestProduct(null);
    setRequestPickerOpen(false);
    setHighlightedRequestIndex(0);
    clearDuplicateDraftVariant();
  }

  async function handleSubmit() {
    await submitTransferDraft(originId, "", defaultLocation, {
      originName: selectedOriginName,
      originType: selectedOriginOption?.type || null,
      destinationName: defaultLocation?.name || "Sin sede",
      destinationType: defaultLocation?.type || null,
      lines: draftLines.length,
      units: draftLines.reduce((accumulator, line) => accumulator + line.qty_requested, 0),
      notes: notes.trim() || null,
    });
  }

  function handleSelectNotePreset(value: string) {
    setSelectedNotePreset(value);
    setNotes(value);
  }

  function handleNotesModeChange(mode: "preset" | "manual") {
    setNoteMode(mode);
  }

  function handleClearNotes() {
    setSelectedNotePreset("");
    setNotes("");
  }

  function handleStartNewRequest() {
    startNewRequest();
    setNoteMode("preset");
    setSelectedNotePreset("");
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
    <OpsPageShell width="wide" className="max-w-[1380px]">
      <TooltipProvider delayDuration={120}>
        <div className="space-y-4">
          <PosHeader
            eyebrow="Transferencias"
            title="Solicitar transferencia"
            actions={
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href="/transferencias/recepciones">
                  <RotateCcw className="h-4 w-4" />
                  Pendientes de recepción
                </Link>
              </Button>
            }
          />

          {error ? <AdminInlineMessage tone="danger">{error}</AdminInlineMessage> : null}
          <OpsSectionDivider>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.72fr)_minmax(360px,400px)] xl:items-start">
              <div className="space-y-6">
                {requestCompleted ? (
                  <section className="ops-surface rounded-xl border p-6">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-[var(--ops-text)]">
                        Solicitud enviada
                      </p>
                      <p className="text-sm text-[var(--ops-text-muted)]">
                        El borrador se cerró correctamente. Puedes revisar el detalle o iniciar
                        una nueva solicitud desde el panel de resumen.
                      </p>
                    </div>
                  </section>
                ) : (
                  <>
                    <section className="space-y-3">
                      <TransferSectionHeading step={1} title="Datos de transferencia" />
                      <RequestRouteField
                        originOptions={requestLocationOptions}
                        originValue={requestLocationFilter}
                        onOriginChange={handleOriginChange}
                        destinationName={defaultLocation?.name || "Sin sede"}
                        destinationType={defaultLocation?.type}
                        hasDraftLines={draftLines.length > 0}
                        disabled={requestCompleted}
                      />
                    </section>

                    <section className="space-y-3">
                      <TransferSectionHeading step={2} title="Agregar productos" />

                      <div className="ops-surface space-y-4 rounded-xl border p-4 sm:p-5">
                        <RequestProductPickerField
                          value={requestInputValue}
                          onChange={(value) => {
                            if (!hasOriginSelected || requestCompleted) return;
                            setRequestQuery(value);
                            setRequestPickerOpen(true);
                            setHighlightedRequestIndex(0);
                            clearDuplicateDraftVariant();
                            if (selectedRequestProduct) {
                              setSelectedRequestProduct(null);
                            }
                          }}
                          onFocus={() => {
                            if (!hasOriginSelected || requestCompleted) return;
                            setRequestPickerOpen(true);
                            if (!requestQuery) {
                              setHighlightedRequestIndex(0);
                            }
                          }}
                          onKeyDown={(event) => {
                            if (!hasOriginSelected || requestCompleted) {
                              return;
                            }

                            if (event.key === "Escape") {
                              setRequestPickerOpen(false);
                              return;
                            }

                            if (!requestProducts.length) {
                              return;
                            }

                            if (event.key === "ArrowDown") {
                              event.preventDefault();
                              setRequestPickerOpen(true);
                              setHighlightedRequestIndex((current) =>
                                Math.min(current + 1, Math.min(requestProducts.length, 8) - 1)
                              );
                            }

                            if (event.key === "ArrowUp") {
                              event.preventDefault();
                              setRequestPickerOpen(true);
                              setHighlightedRequestIndex((current) => Math.max(current - 1, 0));
                            }

                            if (event.key === "Enter" && requestPickerOpen) {
                              event.preventDefault();
                              const selectedProduct =
                                requestProducts[visibleHighlightedRequestIndex];
                              if (!selectedProduct) {
                                return;
                              }

                              setRequestQuery("");
                              setSelectedRequestProduct(selectedProduct);
                              setRequestPickerOpen(false);
                              clearDuplicateDraftVariant();
                            }
                          }}
                          onClear={() => {
                            setRequestQuery("");
                            setSelectedRequestProduct(null);
                            setRequestPickerOpen(false);
                            setHighlightedRequestIndex(0);
                            clearDuplicateDraftVariant();
                            window.requestAnimationFrame(() => {
                              requestSearchInputRef.current?.focus();
                            });
                          }}
                          inputRef={requestSearchInputRef}
                          requestPickerRef={requestPickerRef}
                          requestPickerOpen={requestPickerOpen}
                          loading={activeLoadingCandidates}
                          error={activeRequestQueryError}
                          emptyMessage={requestSearchEmptyMessage}
                          products={requestProducts}
                          highlightedIndex={visibleHighlightedRequestIndex}
                          onHighlight={setHighlightedRequestIndex}
                          onSelect={(product) => {
                            setRequestQuery("");
                            setSelectedRequestProduct(product);
                            setRequestPickerOpen(false);
                            clearDuplicateDraftVariant();
                          }}
                          selectedProductKey={selectedRequestProduct?.product_key}
                          placeholder={
                            hasOriginSelected
                              ? "Buscar producto por nombre, SKU o categoría..."
                              : "Selecciona origen primero"
                          }
                          disabled={!hasOriginSelected || requestCompleted}
                        />

                        <div className="pt-1">
                          {selectedRequestProduct && !requestCompleted ? (
                            <RequestProductComposer
                              key={`${selectedRequestProduct.product_key}:${originId || "all"}`}
                              product={selectedRequestProduct}
                              lockedOriginId={originId}
                              onAdd={addRequestLine}
                              duplicateDraftVariant={duplicateDraftVariant}
                            />
                          ) : (
                            <div className="ops-empty-state-compact rounded-xl px-5 py-10 text-center text-sm">
                              {hasOriginSelected
                                ? "Selecciona un producto para revisar variante, stock en origen y cantidad solicitada."
                                : "Elige el origen para empezar a buscar productos disponibles."}
                            </div>
                          )}
                        </div>
                      </div>
                    </section>

                    <section className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ripnel-accent)] text-xs font-semibold text-white">
                            3
                          </span>
                          <h2 className="text-lg font-semibold text-[var(--ops-text)]">
                            Productos solicitados
                            <span className="ml-1.5 text-[15px] font-medium text-[var(--ops-text-muted)]">
                              ({draftLines.length})
                            </span>
                          </h2>
                        </div>

                        {draftLines.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setClearDraftModalOpen(true)}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-[color:color-mix(in_srgb,#dc2626_88%,var(--ops-text))] transition hover:bg-[color:color-mix(in_srgb,#dc2626_10%,transparent)] hover:text-[color:color-mix(in_srgb,#b91c1c_92%,var(--ops-text))] hover:[&_svg]:translate-y-[-0.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,#dc2626_18%,transparent)]"
                          >
                            <Trash2 className="h-4 w-4 transition-transform" />
                            <span>Limpiar todo</span>
                          </button>
                        ) : null}
                      </div>
                      <RequestDraftTable
                        draftLines={draftLines}
                        onUpdateLineQty={updateLineQty}
                        onRemoveLine={removeLine}
                        highlightedVariantId={duplicateDraftVariant?.variantId || null}
                        highlightToken={duplicateDraftVariant?.token}
                        disabled={requestCompleted}
                      />
                    </section>
                  </>
                )}
              </div>

              <section className="space-y-3 xl:sticky xl:top-20 xl:self-start">
                <div className="flex items-center gap-2.5">
                  <ClipboardList className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />
                  <h2 className="text-lg font-semibold text-[var(--ops-text)]">
                    Resumen de transferencia
                  </h2>
                </div>
                <DraftSummaryPanel
                  draftLines={draftLines}
                  destinationName={defaultLocation?.name || "Sin sede"}
                  destinationType={defaultLocation?.type}
                  originName={originId ? selectedOriginName : ""}
                  originType={selectedOriginOption?.type}
                  originSelected={Boolean(originId)}
                  submittedSummary={submittedSummary}
                  notes={notes}
                  onNotesChange={setNotes}
                  noteMode={noteMode}
                  selectedNotePreset={selectedNotePreset}
                  notePresetOptions={notePresetOptions}
                  onSelectNotePreset={handleSelectNotePreset}
                  onNoteModeChange={handleNotesModeChange}
                  onClearNotes={handleClearNotes}
                  notesMaxLength={REQUEST_NOTE_MAX_LENGTH}
                  submittedTransfer={submittedTransfer}
                  onViewSubmittedTransfer={() => {
                    if (!submittedTransfer) return;
                    router.push(`/transferencias/${submittedTransfer.transfer_id}`);
                  }}
                  onStartNewRequest={handleStartNewRequest}
                  submitting={submitting}
                  onSubmit={handleSubmit}
                />
              </section>
            </div>
          </OpsSectionDivider>
        </div>

        <DraftClearConfirmModal
          open={clearDraftModalOpen}
          onCancel={() => setClearDraftModalOpen(false)}
          onConfirm={() => {
            clearDraftLines();
            setClearDraftModalOpen(false);
          }}
        />
      </TooltipProvider>
    </OpsPageShell>
  );
}
