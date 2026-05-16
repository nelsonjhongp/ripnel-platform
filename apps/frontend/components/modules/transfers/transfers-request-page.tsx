"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import {
  OpsPageShell,
  OpsSectionDivider,
  OpsSearchField,
  OpsFiltersRow,
} from "@/components/ui/ops-page-shell";
import { OpsMetricPill } from "@/components/ui/ops-metric-pill";
import {
  DraftSummaryPanel,
  InlineVariantForm,
  LockedLocationField,
  type RequestCandidate,
  type RequestProductGroup,
} from "./transfers-request-ui";
import { useTransferDraft } from "./use-transfer-draft";

export function TransfersRequestPage() {
  const { loading: authLoading, defaultLocation, permissions, user } = useAuth();
  const [locations, setLocations] = useState<
    { location_id: string; name: string; code: string; type: string; active: boolean }[]
  >([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [requestQuery, setRequestQuery] = useState("");
  const [requestCandidates, setRequestCandidates] = useState<RequestCandidate[]>([]);
  const [requestQueryError, setRequestQueryError] = useState<string | null>(null);
  const [selectedRequestProduct, setSelectedRequestProduct] =
    useState<RequestProductGroup | null>(null);
  const [requestLocationFilter, setRequestLocationFilter] = useState("all");
  const [requestPickerOpen, setRequestPickerOpen] = useState(false);
  const [highlightedRequestIndex, setHighlightedRequestIndex] = useState(0);
  const requestPickerRef = useRef<HTMLDivElement | null>(null);

  const transferCapabilities = useMemo(
    () => resolveTransferCapabilities({ permissions, roleName: user?.role_name }),
    [permissions, user?.role_name]
  );

  const {
    draftLines,
    setDraftLines,
    setPendingQuantities,
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
    setLoadingLocations(true);
    try {
      const payload = await apiFetch<
        ApiEnvelope<
          { location_id: string; name: string; code: string; type: string; active: boolean }[]
        > | { location_id: string; name: string; code: string; type: string; active: boolean }[]
      >("/api/locations", {
        cache: "no-store",
      });
      const data = unwrapApiData(payload);
      setLocations((data || []).filter((loc) => loc.active));
    } catch {
      // Error handled by hook
    } finally {
      setLoadingLocations(false);
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
          : "No se pudo buscar stock para reposicion"
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
    const normalizedQuery = requestQuery.trim();
    if (normalizedQuery.length < 2) {
      return;
    }

    const timer = setTimeout(() => {
      void loadRequestCandidates(normalizedQuery);
    }, 250);

    return () => clearTimeout(timer);
  }, [loadRequestCandidates, requestQuery]);

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
    () => (requestQuery.trim().length >= 2 ? requestCandidates : []),
    [requestCandidates, requestQuery]
  );
  const activeRequestQueryError =
    requestQuery.trim().length >= 2 ? requestQueryError : null;
  const activeLoadingCandidates =
    requestQuery.trim().length >= 2 ? loadingCandidates : false;
  const requestProducts = useMemo<RequestProductGroup[]>(() => {
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
      .sort((left, right) =>
        left.style_name.localeCompare(right.style_name, "es", {
          sensitivity: "base",
        })
      );
  }, [activeRequestCandidates, originId]);
  const visibleHighlightedRequestIndex =
    requestProducts.length === 0
      ? 0
      : Math.min(Math.max(highlightedRequestIndex, 0), Math.min(requestProducts.length, 8) - 1);

  const requestSearchEmptyMessage = useMemo(() => {
    if (activeLoadingCandidates) return "Buscando stock disponible...";

    if (requestQuery.trim() && requestProducts.length === 0) {
      return "No encontramos productos con ese criterio.";
    }

    return "Busca un producto para ver stock disponible entre sedes.";
  }, [activeLoadingCandidates, requestProducts.length, requestQuery]);

  const requestLocationFilterOptions = useMemo(() => {
    const destinationLocationId = defaultLocation?.location_id;
    const activeLocations = (locations.length > 0 ? locations : [])
      .filter((loc) => loc.active && loc.location_id !== destinationLocationId);

    return [
      { value: "all", label: "Todas las sedes" },
      ...activeLocations.map((loc) => ({
        value: loc.location_id,
        label: loc.name,
      })),
    ];
  }, [defaultLocation?.location_id, locations]);

  const selectedOrigin = useMemo(() => {
    return (
      activeRequestCandidates
        .flatMap((candidate) => candidate.candidate_sources)
        .find((source) => source.location_id === originId) || null
    );
  }, [activeRequestCandidates, originId]);

  const totals = useMemo(() => {
    return {
      lines: draftLines.length,
      units: draftLines.reduce((acc, line) => acc + line.qty_requested, 0),
      sourceLabel: selectedOrigin ? selectedOrigin.location_name : "Pendiente",
    };
  }, [draftLines, selectedOrigin]);

  function resetDraftForOriginChange() {
    resetDraft();
    setDraftLines([]);
    setPendingQuantities({});
  }

  async function handleSubmit() {
    await submitTransferDraft(originId, "", defaultLocation);
  }

  if (authLoading) {
    return (
      <LoadingPage
        variant="ops"
        title="Preparando solicitud entre tiendas"
        description="Validando tu sede activa y los permisos operativos para este flujo."
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
        description="Necesitas una sede default activa para solicitar productos entre tiendas."
      />
    );
  }

  return (
    <OpsPageShell width="wide">
      <PosHeader
        eyebrow="Reposicion entre tiendas"
        title="Solicitar productos"
      />

      <div className="flex flex-wrap items-center gap-2">
        <OpsMetricPill label="Lineas" value={totals.lines} tone="accent" />
        <OpsMetricPill label="Unidades" value={totals.units} />
        <OpsMetricPill label="Origen" value={totals.sourceLabel || "Pendiente"} tone="warning" />
      </div>

      <OpsSectionDivider>
        <div className="space-y-4">
          {error ? <AdminInlineMessage tone="danger">{error}</AdminInlineMessage> : null}
          {successMessage ? (
            <AdminInlineMessage tone="success">{successMessage}</AdminInlineMessage>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_360px] xl:items-start">
            <div className="space-y-4">
              <OpsFiltersRow className="lg:grid-cols-[minmax(0,1.45fr)_0.92fr_240px]">
                <div ref={requestPickerRef} className="relative">
                  <OpsSearchField
                    label="Buscar producto"
                    value={requestQuery}
                    onChange={(value) => {
                      setRequestQuery(value);
                      setRequestPickerOpen(true);
                      setHighlightedRequestIndex(0);
                    }}
                    onFocus={() => {
                      setRequestPickerOpen(true);
                      setHighlightedRequestIndex(0);
                    }}
                    placeholder="SKU, codigo, producto, talla o color"
                    ariaLabel="Buscar producto para solicitar"
                  />

                  {requestPickerOpen ? (
                    <CompactPickerPopover className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30">
                      {loadingCandidates ? (
                        <CompactPickerEmpty>Buscando stock disponible...</CompactPickerEmpty>
                      ) : activeRequestQueryError ? (
                        <CompactPickerEmpty>{activeRequestQueryError}</CompactPickerEmpty>
                      ) : requestProducts.length === 0 ? (
                        <CompactPickerEmpty>{requestSearchEmptyMessage}</CompactPickerEmpty>
                      ) : (
                        <CompactPickerList
                          className="max-h-72 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                          style={{ scrollbarWidth: "none" }}
                        >
                          <div className="divide-y divide-[color:color-mix(in_srgb,var(--ops-border-strong)_72%,transparent)]">
                            {requestProducts.slice(0, 8).map((product, index) => {
                              const isHighlighted = index === visibleHighlightedRequestIndex;
                              return (
                                <CompactPickerOption
                                  key={product.product_key}
                                  active={isHighlighted}
                                  onMouseEnter={() => setHighlightedRequestIndex(index)}
                                  onClick={() => {
                                    setRequestPickerOpen(false);
                                    setSelectedRequestProduct(product);
                                  }}
                                  className="py-2.5"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                                        {product.style_name}
                                      </p>
                                      <p className="mt-0.5 text-[11px] text-[var(--ops-text-muted)]">
                                        {product.secondary_code}
                                      </p>
                                    </div>
                                    <span
                                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                        product.total_available > 0
                                          ? "border-[color:color-mix(in_srgb,#10b981_30%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#047857_72%,var(--ops-text))]"
                                          : "border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]"
                                      }`}
                                    >
                                      {product.total_available} u.
                                    </span>
                                  </div>
                                </CompactPickerOption>
                              );
                            })}
                          </div>
                        </CompactPickerList>
                      )}
                    </CompactPickerPopover>
                  ) : null}
                </div>

                <FilterDropdown
                  label="Origen"
                  value={requestLocationFilter}
                  options={requestLocationFilterOptions}
                  onChange={(value) => {
                    setRequestLocationFilter(value);
                    setRequestPickerOpen(false);
                  }}
                />

                <LockedLocationField value={defaultLocation?.name || "Sin sede"} />
              </OpsFiltersRow>
            </div>

            <DraftSummaryPanel
              draftLines={draftLines}
              destinationName={defaultLocation?.name || "Sin sede"}
              originName={selectedOrigin?.location_name || ""}
              notes={notes}
              onNotesChange={setNotes}
              onUpdateLineQty={updateLineQty}
              onRemoveLine={removeLine}
              onResetOrigin={resetDraftForOriginChange}
              submitting={submitting}
              onSubmit={handleSubmit}
            />
          </div>

          {selectedRequestProduct ? (
            <InlineVariantForm
              product={selectedRequestProduct}
              lockedOriginId={originId}
              onAdd={addRequestLine}
              onCancel={() => setSelectedRequestProduct(null)}
            />
          ) : null}
        </div>
      </OpsSectionDivider>
    </OpsPageShell>
  );
}
