"use client";

import {
  type KeyboardEvent,
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Info, Search, X } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import {
  ErrorPage,
  ForbiddenPage,
  LoadingPage,
} from "@/components/feedback/status-page";
import type { ApiEnvelope } from "@/lib/api";
import { apiFetch, unwrapApiData } from "@/lib/api";
import { resolveTransferCapabilities } from "@/lib/capabilities";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { AdminInlineMessage } from "@/components/admin/admin-ui";
import {
  CompactPickerEmpty,
  CompactPickerList,
  CompactPickerOption,
  CompactPickerPopover,
} from "@/components/ui/compact-picker";
import { Button } from "@/components/ui/button";
import { OpsPageShell } from "@/components/ui/ops-page-shell";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DraftSummaryPanel,
  RequestProductComposer,
  RequestRouteField,
  type RequestCandidate,
  type RequestLocationOption,
  type RequestProductGroup,
} from "./transfers-request-ui";
import { useTransferDraft } from "./use-transfer-draft";

type LocationOption = {
  location_id: string;
  name: string;
  code: string;
  type: string;
  active: boolean;
};

function RequestHeaderMeta({
  lines,
  units,
  originLabel,
}: {
  lines: number;
  units: number;
  originLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-[#6F6480] xl:justify-end">
      <span className="inline-flex items-center rounded-full border border-[#E7E2EE] bg-white px-3 py-1.5 font-medium">
        {lines} {lines === 1 ? "línea" : "líneas"}
      </span>
      <span className="text-[#B5ACBF]">•</span>
      <span className="inline-flex items-center rounded-full border border-[#E7E2EE] bg-white px-3 py-1.5 font-medium">
        {units} {units === 1 ? "unidad" : "unidades"}
      </span>
      <span className="text-[#B5ACBF]">•</span>
      <span className="text-sm text-[#7C7190]">Origen:</span>
      <span className="inline-flex items-center rounded-full border border-[color:color-mix(in_srgb,#f97316_18%,#E7E2EE)] bg-[color:color-mix(in_srgb,#f97316_10%,white)] px-3 py-1.5 font-semibold text-[#C96C1D]">
        {originLabel}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex h-8 w-8 cursor-help items-center justify-center rounded-full border border-[#E7E2EE] bg-white text-[#8A8098] transition hover:border-[color:color-mix(in_srgb,var(--ripnel-accent)_24%,#E7E2EE)] hover:text-[var(--ripnel-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--ripnel-accent)_18%,transparent)]"
            aria-label="Información sobre el movimiento de stock"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8} className="max-w-72">
          El stock se descuenta recién al despachar y recepcionar la reposición.
        </TooltipContent>
      </Tooltip>
    </div>
  );
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
}) {
  return (
    <div ref={requestPickerRef} className="relative space-y-1.5">
      <label className="block text-sm font-medium text-[var(--ops-text)]">
        Producto
      </label>

      <div className="sales-field flex h-11 items-center gap-2 rounded-lg border-[#E7E2EE] bg-white px-3 transition hover:border-[color:color-mix(in_srgb,var(--ripnel-accent)_24%,#E7E2EE)]">
        <Search className="h-4 w-4 shrink-0 text-[#8A8098]" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          placeholder="Buscar producto"
          aria-label="Seleccionar producto para solicitar reposición"
          className="h-full w-full bg-transparent text-sm text-[var(--ops-text)] outline-none placeholder:text-[#9C90AD]"
        />
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClear}
            className="rounded-lg text-[#8A8098] hover:bg-[#F8F5FB] hover:text-[var(--ops-text)]"
            aria-label="Limpiar búsqueda de producto"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {requestPickerOpen ? (
        <CompactPickerPopover className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 rounded-[18px] border border-[#E7E2EE] bg-white">
          {loading ? (
            <CompactPickerEmpty>Buscando productos disponibles...</CompactPickerEmpty>
          ) : error ? (
            <CompactPickerEmpty>{error}</CompactPickerEmpty>
          ) : products.length === 0 ? (
            <CompactPickerEmpty>{emptyMessage}</CompactPickerEmpty>
          ) : (
            <CompactPickerList
              className="max-h-72 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none" }}
            >
              <div className="divide-y divide-[#F1ECF5]">
                {products.slice(0, 8).map((product, index) => (
                  <CompactPickerOption
                    key={product.product_key}
                    active={index === highlightedIndex}
                    selected={selectedProductKey === product.product_key}
                    onMouseEnter={() => onHighlight(index)}
                    onClick={() => onSelect(product)}
                    className="px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-3">
                        <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                          {product.style_name}
                        </p>
                        <p className="shrink-0 text-[11px] text-[#8A8098]">
                          {product.variants.length} variante
                          {product.variants.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="inline-flex items-center rounded-full border border-[color:color-mix(in_srgb,#10b981_16%,#E7E2EE)] bg-[color:color-mix(in_srgb,#10b981_8%,white)] px-2.5 py-1 text-[11px] font-semibold text-[#0F8A5F]">
                        stock: {product.total_available}
                      </span>
                    </div>
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
    successMessage,
    submitting,
    addRequestLine,
    updateLineQty,
    removeLine,
    submitTransferDraft,
    resetDraft,
  } = useTransferDraft({
    isStoreRequestMode: true,
    selectedRequestProduct,
    originId: requestLocationFilter === "all" ? "" : requestLocationFilter,
    setOriginId: (value: string) => {
      if (value === "") {
        setRequestLocationFilter("all");
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
      const payload = await apiFetch<ApiEnvelope<RequestCandidate[]> | RequestCandidate[]>(
        `/api/transfers/request-candidates?${params.toString()}`,
        { cache: "no-store" }
      );
      setRequestCandidates(unwrapApiData(payload) || []);
    } catch (requestError) {
      setRequestQueryError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo buscar stock para reposición"
      );
    } finally {
      setLoadingCandidates(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadLocations();
    });
  }, []);

  useEffect(() => {
    if (!requestPickerOpen && !requestQuery.trim()) {
      return;
    }

    const timer = setTimeout(() => {
      void loadRequestCandidates(requestQuery);
    }, 250);

    return () => clearTimeout(timer);
  }, [loadRequestCandidates, requestQuery, requestPickerOpen]);

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
      .filter((product) => {
        if (!normalizedQuery) {
          return true;
        }

        return product.style_name.toLowerCase().includes(normalizedQuery);
      })
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

  const requestInputValue =
    requestPickerOpen || requestQuery ? requestQuery : selectedRequestProduct?.style_name || "";

  const requestLocationOptions = useMemo<RequestLocationOption[]>(() => {
    const destinationLocationId = defaultLocation?.location_id;
    const activeLocations = locations.filter(
      (location) => location.active && location.location_id !== destinationLocationId
    );

    return [
      { value: "all", label: "Seleccionar origen" },
      ...activeLocations.map((location) => ({
        value: location.location_id,
        label: location.name,
      })),
    ];
  }, [defaultLocation?.location_id, locations]);

  const selectedOriginName =
    requestLocationOptions.find((option) => option.value === requestLocationFilter)?.label ||
    "Pendiente";
  const selectedOriginDisplay = originId ? selectedOriginName : "Pendiente";

  const totals = useMemo(
    () => ({
      lines: draftLines.length,
      units: draftLines.reduce((accumulator, line) => accumulator + line.qty_requested, 0),
    }),
    [draftLines]
  );

  function resetDraftForOriginChange() {
    resetDraft();
  }

  function handleOriginChange(nextValue: string) {
    if (nextValue === requestLocationFilter) {
      return;
    }

    if (draftLines.length > 0) {
      resetDraftForOriginChange();
    }

    setRequestLocationFilter(nextValue);
    setRequestPickerOpen(false);
  }

  async function handleSubmit() {
    await submitTransferDraft(originId, "", defaultLocation);
  }

  if (authLoading) {
    return (
      <LoadingPage
        variant="ops"
        title="Preparando solicitud de reposición"
        description="Validando tu sede activa y los permisos operativos para pedir stock a otra sede."
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
        description="Necesitas una sede default activa para solicitar reposición entre sedes."
      />
    );
  }

  return (
    <OpsPageShell width="wide">
      <TooltipProvider delayDuration={120}>
        <div className="space-y-5 rounded-[28px] bg-[#FAFAFC] p-4 sm:p-5 lg:p-6">
          <PosHeader
            eyebrow="Transferencias"
            title="Solicitar reposición"
            subtitle="Reposición entre sedes"
            meta={
              <RequestHeaderMeta
                lines={totals.lines}
                units={totals.units}
                originLabel={selectedOriginDisplay}
              />
            }
          />

        {error ? <AdminInlineMessage tone="danger">{error}</AdminInlineMessage> : null}
        {successMessage ? (
          <AdminInlineMessage tone="success">{successMessage}</AdminInlineMessage>
        ) : null}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.85fr)_minmax(320px,1fr)] xl:items-start">
            <section className="rounded-[24px] border border-[#E7E2EE] bg-white p-4 sm:p-5">
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--ops-text)]">
                    Buscar y agregar productos
                  </h2>
                </div>

                <RequestProductPickerField
                  value={requestInputValue}
                  onChange={(value) => {
                    setRequestQuery(value);
                    setRequestPickerOpen(true);
                    setHighlightedRequestIndex(0);
                    if (selectedRequestProduct) {
                      setSelectedRequestProduct(null);
                    }
                  }}
                  onFocus={() => {
                    setRequestPickerOpen(true);
                    if (!requestQuery) {
                      setHighlightedRequestIndex(0);
                    }
                  }}
                  onKeyDown={(event) => {
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
                      const selectedProduct = requestProducts[visibleHighlightedRequestIndex];
                      if (!selectedProduct) {
                        return;
                      }

                      setRequestQuery("");
                      setSelectedRequestProduct(selectedProduct);
                      setRequestPickerOpen(false);
                    }
                  }}
                  onClear={() => {
                    setRequestQuery("");
                    setSelectedRequestProduct(null);
                    setRequestPickerOpen(false);
                    setHighlightedRequestIndex(0);
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
                  }}
                  selectedProductKey={selectedRequestProduct?.product_key}
                />

                <RequestRouteField
                  originOptions={requestLocationOptions}
                  originValue={requestLocationFilter}
                  onOriginChange={handleOriginChange}
                  destinationName={defaultLocation?.name || "Sin sede"}
                  hasDraftLines={draftLines.length > 0}
                />

                {selectedRequestProduct ? (
                  <RequestProductComposer
                    key={`${selectedRequestProduct.product_key}:${originId || "all"}`}
                    product={selectedRequestProduct}
                    lockedOriginId={originId}
                    onAdd={addRequestLine}
                    onClear={() => setSelectedRequestProduct(null)}
                  />
                ) : (
                  <div className="rounded-[22px] border border-dashed border-[#E7E2EE] bg-[#FCFBFE] px-5 py-10 text-center text-sm text-[#8A8098]">
                    Selecciona un producto para revisar color, talla, stock disponible y cantidad.
                  </div>
                )}
              </div>
            </section>

            <DraftSummaryPanel
              draftLines={draftLines}
              destinationName={defaultLocation?.name || "Sin sede"}
              originName={originId ? selectedOriginName : ""}
              notes={notes}
              onNotesChange={setNotes}
              onUpdateLineQty={updateLineQty}
              onRemoveLine={removeLine}
              submitting={submitting}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </TooltipProvider>
    </OpsPageShell>
  );
}
