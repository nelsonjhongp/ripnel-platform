"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { usePathname } from "next/navigation";
import {
  ArrowRightLeft,
  Boxes,
  LoaderCircle,
  Plus,
  Trash2,
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
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Button } from "@/components/ui/button";
import {
  AdminInlineMessage,
  AdminSelectMenu,
  AdminTextarea,
} from "@/components/admin/admin-ui";
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
  OpsTableBlock,
  OpsSearchField,
  OpsTableWrap,
  OpsFiltersRow,
} from "@/components/ui/ops-page-shell";
import { OpsMetricPill } from "@/components/ui/ops-metric-pill";
import {
  DraftSummaryPanel,
  InlineVariantForm,
  LockedLocationField,
  type RequestCandidate,
  type RequestCandidateSource,
  type RequestProductGroup,
  type RequestProductVariant,
} from "./transfers-request-ui";

type Location = {
  location_id: string;
  name: string;
  code: string;
  type: string;
  active: boolean;
};

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

type DraftLine = InventoryItem & {
  qty_requested: number;
};

export function TransfersCreatePage() {
  const pathname = usePathname();
  const { loading: authLoading, defaultLocation, permissions, user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [notes, setNotes] = useState("");
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, string>>({});
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

  const isRequestRoute = pathname.endsWith("/solicitar-productos");
  const isManageRoute = pathname.endsWith("/crear-transferencia");
  const isStoreRequestMode = isRequestRoute;

  async function loadLocations() {
    setLoadingLocations(true);
    try {
      const payload = await apiFetch<ApiEnvelope<Location[]> | Location[]>("/api/locations", {
        cache: "no-store",
      });
      const data = unwrapApiData(payload);
      setLocations((data || []).filter((location: Location) => location.active));
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "No se pudieron cargar sedes"
      );
    } finally {
      setLoadingLocations(false);
    }
  }

  async function loadInventory(locationId: string) {
    if (!locationId) {
      setInventory([]);
      return;
    }

    setLoadingInventory(true);
    try {
      const payload = await apiFetch<ApiEnvelope<InventoryItem[]> | InventoryItem[]>(
        `/api/inventory?location_id=${locationId}`,
        { cache: "no-store" }
      );
      const data = unwrapApiData(payload);
      setInventory((data || []).filter((item: InventoryItem) => item.qty > 0));
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "No se pudo cargar stock de origen"
      );
    } finally {
      setLoadingInventory(false);
    }
  }

  const loadRequestCandidates = useCallback(async (queryValue: string) => {
    const normalizedQuery = queryValue.trim();

    if (!isStoreRequestMode || normalizedQuery.length < 2) {
      setRequestCandidates([]);
      setRequestQueryError(null);
      setLoadingCandidates(false);
      return;
    }

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
  }, [isStoreRequestMode]);

  useEffect(() => {
    void loadLocations();
  }, [isStoreRequestMode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialOriginId = params.get("origin_id");

    if (initialOriginId) {
      setOriginId(initialOriginId);
    }
  }, []);

  useEffect(() => {
    if (!isStoreRequestMode) {
      return;
    }

    if (defaultLocation?.location_id) {
      setDestinationId(defaultLocation.location_id);
    }
  }, [defaultLocation?.location_id, isStoreRequestMode]);

  useEffect(() => {
    if (isStoreRequestMode) {
      return;
    }

    setDraftLines([]);
    setPendingQuantities({});
    setSuccessMessage(null);
    void loadInventory(originId);
  }, [originId, isStoreRequestMode]);

  useEffect(() => {
    if (!isStoreRequestMode) return;

    const normalizedQuery = requestQuery.trim();

    if (normalizedQuery.length < 2) {
      setRequestCandidates([]);
      setRequestQueryError(null);
      setLoadingCandidates(false);
      return;
    }

    const timer = setTimeout(() => {
      void loadRequestCandidates(normalizedQuery);
    }, 250);

    return () => clearTimeout(timer);
  }, [isStoreRequestMode, loadRequestCandidates, requestQuery]);

  useEffect(() => {
    if (!isStoreRequestMode) return;
    if (requestLocationFilter === "all") {
      setOriginId("");
    } else {
      setOriginId(requestLocationFilter);
    }
  }, [isStoreRequestMode, requestLocationFilter]);

  const availableInventory = useMemo(() => {
    return inventory.filter(
      (item) => !draftLines.some((line) => line.variant_id === item.variant_id)
    );
  }, [inventory, draftLines]);

  const destinationOptions = useMemo(() => {
    return locations
      .filter((location) => location.location_id !== originId)
      .map((location) => ({
        value: location.location_id,
        label: `${location.code} - ${location.name}`,
        helper: location.type,
      }));
  }, [locations, originId]);

  const originOptions = useMemo(() => {
    return locations
      .filter((location) => location.location_id !== destinationId)
      .map((location) => ({
        value: location.location_id,
        label: `${location.code} - ${location.name}`,
        helper: location.type,
      }));
  }, [destinationId, locations]);

  const requestProducts = useMemo<RequestProductGroup[]>(() => {
    if (!isStoreRequestMode) {
      return [];
    }

    const grouped = new Map<string, RequestProductGroup>();

    for (const candidate of requestCandidates) {
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
  }, [isStoreRequestMode, originId, requestCandidates]);

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

  useEffect(() => {
    if (!requestProducts.length) {
      setHighlightedRequestIndex(0);
      return;
    }
    setHighlightedRequestIndex((current) =>
      Math.min(Math.max(current, 0), Math.min(requestProducts.length, 8) - 1)
    );
  }, [requestProducts]);

  const requestSearchEmptyMessage = useMemo(() => {
    if (loadingCandidates) return "Buscando stock disponible...";

    if (requestQuery.trim() && requestProducts.length === 0) {
      return "No encontramos productos con ese criterio.";
    }

    return "Busca un producto para ver stock disponible entre sedes.";
  }, [loadingCandidates, requestProducts.length, requestQuery]);

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
    if (isStoreRequestMode) {
      return (
        requestCandidates
          .flatMap((candidate) => candidate.candidate_sources)
          .find((source) => source.location_id === originId) || null
      );
    }

    return (
      locations.find((location) => location.location_id === originId)
        ? {
            location_id: originId,
            location_code:
              locations.find((location) => location.location_id === originId)?.code || "",
            location_name:
              locations.find((location) => location.location_id === originId)?.name || "",
            qty_available: 0,
          }
        : null
    );
  }, [isStoreRequestMode, locations, originId, requestCandidates]);

  const totals = useMemo(() => {
    if (isStoreRequestMode) {
      return {
        lines: draftLines.length,
        units: draftLines.reduce((acc, line) => acc + line.qty_requested, 0),
        sourceLabel: selectedOrigin ? selectedOrigin.location_name : "Pendiente",
      };
    }

    return {
      lines: draftLines.length,
      units: draftLines.reduce((acc, line) => acc + line.qty_requested, 0),
      availableVariants: availableInventory.length,
    };
  }, [availableInventory.length, draftLines, isStoreRequestMode, selectedOrigin]);

  const requestSourceLabel = isStoreRequestMode ? totals.sourceLabel || "Pendiente" : "Pendiente";
  const manageAvailableVariants = !isStoreRequestMode ? totals.availableVariants || 0 : 0;

  function resetDraftForOriginChange() {
    setDraftLines([]);
    setPendingQuantities({});
    setOriginId("");
    setSuccessMessage(null);
    setError(null);
  }

  function openRequestProductSelector(product: RequestProductGroup) {
    setSelectedRequestProduct(product);
  }

  function addManageLine(item: InventoryItem) {
    const rawQty = pendingQuantities[item.variant_id] || "";
    const qtyRequested = Number(rawQty);

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
  }

  function addRequestLine(
    variant: RequestProductVariant,
    source: RequestCandidateSource,
    qtyRequested: number
  ) {
    if (!selectedRequestProduct) {
      setError("No se pudo identificar el producto seleccionado.");
      return;
    }

    if (originId && originId !== source.location_id) {
      setError("Esta solicitud ya quedó ligada a otra sede origen. Cambia el origen para continuar.");
      return;
    }

    if (draftLines.some((line) => line.variant_id === variant.variant_id)) {
      setError("Esta variante ya está agregada en el borrador.");
      return;
    }

    if (!Number.isInteger(qtyRequested) || qtyRequested <= 0) {
      setError("La cantidad solicitada debe ser un entero mayor a cero");
      return;
    }

    if (qtyRequested > source.qty_available) {
      setError("La cantidad solicitada no puede exceder el stock visible de esa sede.");
      return;
    }

    setError(null);
    setOriginId((current) => current || source.location_id);
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
  }

  function updateLineQty(variantId: string, rawValue: string) {
    setDraftLines((current) =>
      current.map((line) => {
        if (line.variant_id !== variantId) return line;
        const nextQty = Number(rawValue);
        if (!Number.isInteger(nextQty) || nextQty <= 0) return { ...line, qty_requested: 1 };
        return { ...line, qty_requested: Math.min(nextQty, line.qty) };
      })
    );
  }

  function removeLine(variantId: string) {
    setDraftLines((current) => current.filter((line) => line.variant_id !== variantId));
  }

  async function submitTransferDraft() {
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const targetDestinationId = isStoreRequestMode
        ? defaultLocation?.location_id
        : destinationId;

      if (!originId || !targetDestinationId) {
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
        ApiEnvelope<{ transfer_number?: string | null }> | { transfer_number?: string | null }
      >("/api/transfers", {
        method: "POST",
        body: JSON.stringify({
          from_location_id: originId,
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

      setSuccessMessage(
        `${
          isStoreRequestMode ? "Solicitud" : "Transferencia"
        } ${data.transfer_number || "creada"} registrada en borrador`
      );
      setDraftLines([]);
      setPendingQuantities({});
      setNotes("");
      setOriginId("");
      setSelectedRequestProduct(null);

      if (isStoreRequestMode) {
        await loadRequestCandidates(requestQuery.trim());
      } else {
        await loadInventory(originId);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo crear la transferencia"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitTransferDraft();
  }

  if (authLoading) {
    return (
      <LoadingPage
        variant="ops"
        title={
          isStoreRequestMode ? "Preparando solicitud entre tiendas" : "Preparando transferencia"
        }
        description="Validando tu sede activa y los permisos operativos para este flujo."
      />
    );
  }

  if (isManageRoute && !transferCapabilities.manage) {
    return <ForbiddenPage variant="ops" />;
  }

  if (!isManageRoute && !transferCapabilities.requestCreate) {
    return <ForbiddenPage variant="ops" />;
  }

  if (isStoreRequestMode && !defaultLocation?.location_id) {
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
        eyebrow={isStoreRequestMode ? "Reposición entre tiendas" : "Traslado interno"}
        title={isStoreRequestMode ? "Solicitar productos" : "Crear transferencia"}
      />

      <div className="flex flex-wrap items-center gap-2">
        <OpsMetricPill label="Lineas" value={totals.lines} tone="accent" />
        <OpsMetricPill label="Unidades" value={totals.units} />
        {isStoreRequestMode ? (
          <OpsMetricPill label="Origen" value={requestSourceLabel} tone="warning" />
        ) : (
          <OpsMetricPill
            label="Disponibles"
            value={manageAvailableVariants}
            tone="warning"
          />
        )}
      </div>

      <OpsSectionDivider>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <AdminInlineMessage tone="danger">{error}</AdminInlineMessage> : null}
          {successMessage ? (
            <AdminInlineMessage tone="success">{successMessage}</AdminInlineMessage>
          ) : null}

          {isStoreRequestMode ? (
            <>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_360px] xl:items-start">
                <div className="space-y-4">
                  <OpsFiltersRow className="lg:grid-cols-[minmax(0,1.45fr)_0.92fr_240px]">
                    <div ref={requestPickerRef} className="relative">
                      <OpsSearchField
                        label="Buscar producto"
                        value={requestQuery}
                        onChange={(value) => {
                          setRequestQuery(value)
                          setRequestPickerOpen(true)
                          setHighlightedRequestIndex(0)
                        }}
                        onFocus={() => {
                          setRequestPickerOpen(true)
                          setHighlightedRequestIndex(0)
                        }}
                        placeholder="SKU, codigo, producto, talla o color"
                        ariaLabel="Buscar producto para solicitar"
                      />

                      {requestPickerOpen ? (
                            <CompactPickerPopover className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30">
                              {loadingCandidates ? (
                                <CompactPickerEmpty>Buscando stock disponible...</CompactPickerEmpty>
                              ) : requestQueryError ? (
                                <CompactPickerEmpty>{requestQueryError}</CompactPickerEmpty>
                              ) : requestProducts.length === 0 ? (
                                <CompactPickerEmpty>{requestSearchEmptyMessage}</CompactPickerEmpty>
                              ) : (
                            <CompactPickerList className="max-h-72 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
                              <div className="divide-y divide-[color:color-mix(in_srgb,var(--ops-border-strong)_72%,transparent)]">
                                {requestProducts.slice(0, 8).map((product, index) => {
                                  const isHighlighted = index === highlightedRequestIndex
                                  return (
                                    <CompactPickerOption
                                      key={product.product_key}
                                      active={isHighlighted}
                                      onMouseEnter={() => setHighlightedRequestIndex(index)}
                                      onClick={() => {
                                        setRequestPickerOpen(false)
                                        openRequestProductSelector(product)
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
                                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                          product.total_available > 0
                                            ? "border-[color:color-mix(in_srgb,#10b981_30%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#047857_72%,var(--ops-text))]"
                                            : "border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]"
                                        }`}>
                                          {product.total_available} u.
                                        </span>
                                      </div>
                                    </CompactPickerOption>
                                  )
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
                        setRequestLocationFilter(value)
                        setRequestPickerOpen(false)
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
                  onSubmit={() => void submitTransferDraft()}
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
            </>
          ) : (
            <>
              <section className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5">
                <div className="grid gap-4 xl:grid-cols-[0.92fr_0.92fr_1.16fr]">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                      Origen
                    </label>
                    <AdminSelectMenu
                      value={originId}
                      onValueChange={setOriginId}
                      placeholder="Selecciona una sede"
                      options={originOptions}
                      disabled={loadingLocations}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                      Destino
                    </label>
                    <AdminSelectMenu
                      value={destinationId}
                      onValueChange={setDestinationId}
                      placeholder="Selecciona una sede"
                      options={destinationOptions}
                      disabled={loadingLocations || !originId}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="transfer-notes"
                      className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]"
                    >
                      Notas
                    </label>
                    <AdminTextarea
                      id="transfer-notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={3}
                      placeholder="Motivo operativo del traslado"
                      className="min-h-[92px]"
                    />
                  </div>
                </div>
              </section>

              <div className="grid gap-4 xl:grid-cols-[1.15fr_0.95fr]">
                <OpsTableBlock>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Boxes className="h-4 w-4 text-[var(--ops-text-muted)]" />
                      <div>
                        <h2 className="text-sm font-semibold text-[var(--ops-text)]">
                          Stock disponible en origen
                        </h2>
                        <p className="text-xs text-[var(--ops-text-muted)]">
                          Variantes con stock positivo listas para agregar.
                        </p>
                      </div>
                    </div>
                  </div>

                  <OpsTableWrap minWidth="760px">
                    <table className="w-full border-collapse">
                      <thead className="bg-[var(--ops-surface-muted)]">
                        <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                          <th className="px-4 py-3">Variante</th>
                          <th className="px-4 py-3">Detalle</th>
                          <th className="px-4 py-3 text-right">Disponible</th>
                          <th className="px-4 py-3">Solicitar</th>
                          <th className="px-4 py-3 text-right">Agregar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                        {!originId ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]"
                            >
                              Selecciona un origen para ver el stock disponible.
                            </td>
                          </tr>
                        ) : loadingInventory ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]"
                            >
                              <LoaderCircle className="mr-2 inline-block h-5 w-5 animate-spin" />
                              Cargando stock...
                            </td>
                          </tr>
                        ) : availableInventory.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]"
                            >
                              No hay stock disponible en el origen seleccionado.
                            </td>
                          </tr>
                        ) : (
                          availableInventory.map((item) => (
                            <tr
                              key={item.variant_id}
                              className="transition hover:bg-[var(--ops-surface-muted)]"
                            >
                              <td className="px-4 py-[var(--ops-row-py)]">
                                <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                                  {item.style_name}
                                </p>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ripnel-accent-hover)]">
                                  {item.sku}
                                </p>
                              </td>

                              <td className="px-4 py-[var(--ops-row-py)] text-sm text-[var(--ops-text)]">
                                <p className="truncate">
                                  {item.size_code} / {item.color_name}
                                </p>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                                  {item.garment_type_name || item.style_code}
                                </p>
                              </td>

                              <td className="px-4 py-[var(--ops-row-py)] text-right text-sm font-semibold tabular-nums text-[var(--ops-text)]">
                                {item.qty}
                              </td>

                              <td className="px-4 py-[var(--ops-row-py)]">
                                <input
                                  type="number"
                                  min={1}
                                  max={item.qty}
                                  value={pendingQuantities[item.variant_id] || ""}
                                  onChange={(event) =>
                                    setPendingQuantities((current) => ({
                                      ...current,
                                      [item.variant_id]: event.target.value,
                                    }))
                                  }
                                  placeholder="Cant."
                                  className="sales-field h-9 w-24 rounded-lg px-2 py-1 text-center text-sm"
                                />
                              </td>

                              <td className="px-4 py-[var(--ops-row-py)] text-right">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addManageLine(item)}
                                  className="rounded-lg px-3"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Agregar
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </OpsTableWrap>
                </OpsTableBlock>

                <OpsTableBlock>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4 text-[var(--ops-text-muted)]" />
                      <div>
                        <h2 className="text-sm font-semibold text-[var(--ops-text)]">
                          Lineas del traslado
                        </h2>
                        <p className="text-xs text-[var(--ops-text-muted)]">
                          Borrador listo para registrar.
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">
                      Draft
                    </span>
                  </div>

                  <OpsTableWrap minWidth="680px">
                    <table className="w-full border-collapse">
                      <thead className="bg-[var(--ops-surface-muted)]">
                        <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                          <th className="px-4 py-3">Variante</th>
                          <th className="px-4 py-3 text-right">Stock</th>
                          <th className="px-4 py-3">Cantidad</th>
                          <th className="px-4 py-3 text-right">Quitar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                        {draftLines.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]"
                            >
                              Aun no agregas variantes al traslado.
                            </td>
                          </tr>
                        ) : (
                          draftLines.map((line) => (
                            <tr
                              key={line.variant_id}
                              className="transition hover:bg-[var(--ops-surface-muted)]"
                            >
                              <td className="px-4 py-[var(--ops-row-py)]">
                                <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                                  {line.style_name}
                                </p>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ripnel-accent-hover)]">
                                  {line.sku}
                                </p>
                                <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                                  {line.size_code} / {line.color_name}
                                </p>
                              </td>

                              <td className="px-4 py-[var(--ops-row-py)] text-right text-sm text-[var(--ops-text)]">
                                {line.qty}
                              </td>

                              <td className="px-4 py-[var(--ops-row-py)]">
                                <input
                                  type="number"
                                  min={1}
                                  max={line.qty}
                                  value={line.qty_requested}
                                  onChange={(event) =>
                                    updateLineQty(line.variant_id, event.target.value)
                                  }
                                  className="sales-field h-9 w-24 rounded-lg px-2 py-1 text-center text-sm"
                                />
                              </td>

                              <td className="px-4 py-[var(--ops-row-py)] text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => removeLine(line.variant_id)}
                                  className="rounded-lg text-[var(--ops-text-muted)] hover:text-[color:color-mix(in_srgb,#e11d48_82%,var(--ops-text))]"
                                  aria-label="Quitar linea"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </OpsTableWrap>

                  <div className="flex flex-col gap-3 border-t border-[var(--ops-border-strong)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-[var(--ops-text-muted)]">
                      {totals.lines} lineas y {totals.units} unidades en borrador
                    </span>
                    <Button
                      type="submit"
                      disabled={
                        submitting ||
                        loadingLocations ||
                        !originId ||
                        !destinationId ||
                        !draftLines.length
                      }
                      variant="accent"
                      className="rounded-lg px-4"
                    >
                      {submitting ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRightLeft className="h-4 w-4" />
                      )}
                      Crear transferencia en borrador
                    </Button>
                  </div>
                </OpsTableBlock>
              </div>
            </>
          )}
        </form>
      </OpsSectionDivider>
    </OpsPageShell>
  );
}
