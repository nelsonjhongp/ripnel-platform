"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterDropdown, type FilterDropdownOption } from "@/components/ui/filter-dropdown";
import { OpsMetricPill } from "@/components/ui/ops-metric-pill";
import {
  OpsFiltersRow,
  OpsPageShell,
  OpsSearchField,
  OpsSectionDivider,
  OpsTableBlock,
  OpsTableFooter,
  OpsTableWrap,
} from "@/components/ui/ops-page-shell";
import { OpsStatusBadge } from "@/components/ui/ops-status-badge";
import { Pagination } from "@/components/ui/pagination";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiFetch, unwrapApiData } from "@/lib/api";
import { buildInventoryDetailRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  formatInventoryVariantsSummary,
  type InventoryLocationSummaryResponse,
  type InventoryProductSummaryResponse,
  type InventoryView,
  getLocationStatusTone,
  getProductStatusTone,
  normalizeInventoryView,
  normalizeLocationStatusFilter,
  normalizeProductStatusFilter,
  type LocationStatusFilter,
  type ProductStatusFilter,
} from "./inventory-summary-shared";

const PAGE_SIZE = 10;

const PRODUCT_STATUS_OPTIONS: FilterDropdownOption[] = [
  { value: "all", label: "Todos" },
  { value: "available", label: "Disponible" },
  { value: "incomplete", label: "Stock incompleto" },
  { value: "low", label: "Bajo stock" },
  { value: "out", label: "Sin stock" },
];

const LOCATION_STATUS_OPTIONS: FilterDropdownOption[] = [
  { value: "all", label: "Todos" },
  { value: "normal", label: "Normal" },
  { value: "attention", label: "Revisar" },
  { value: "critical", label: "Crítico" },
];

function buildLocationOptions(
  availableLocations: InventoryProductSummaryResponse["meta"]["available_locations"]
): FilterDropdownOption[] {
  return [
    { value: "all", label: "Todas las sedes" },
    ...availableLocations.map((location) => ({
      value: location.location_id,
      label: location.name,
      badge: location.is_default ? "Actual" : undefined,
      tone: location.is_default ? ("accent" as const) : undefined,
    })),
  ];
}

function buildProductSummaryParams(input: {
  query: string;
  locationId: string;
  status: ProductStatusFilter;
  garmentType: string;
}) {
  const params = new URLSearchParams();

  if (input.query.trim()) {
    params.set("query", input.query.trim());
  }

  if (input.locationId !== "all") {
    params.set("location_id", input.locationId);
  }

  if (input.status !== "all") {
    params.set("status", input.status);
  }

  if (input.garmentType !== "all") {
    params.set("garment_type", input.garmentType);
  }

  return params;
}

function buildLocationSummaryParams(input: {
  query: string;
  status: LocationStatusFilter;
}) {
  const params = new URLSearchParams();

  if (input.query.trim()) {
    params.set("query", input.query.trim());
  }

  if (input.status !== "all") {
    params.set("status", input.status);
  }

  return params;
}

export default function InventoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [view, setView] = useState<InventoryView>(normalizeInventoryView(searchParams.get("view")));
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [locationFilter, setLocationFilter] = useState(searchParams.get("location_id") || "all");
  const [productStatus, setProductStatus] = useState<ProductStatusFilter>(
    normalizeProductStatusFilter(searchParams.get("status"))
  );
  const [garmentType, setGarmentType] = useState(searchParams.get("garment_type") || "all");
  const [locationQuery, setLocationQuery] = useState(searchParams.get("location_query") || "");
  const [locationStatus, setLocationStatus] = useState<LocationStatusFilter>(
    normalizeLocationStatusFilter(searchParams.get("location_health"))
  );
  const [productPage, setProductPage] = useState(1);
  const [locationPage, setLocationPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productSummary, setProductSummary] = useState<InventoryProductSummaryResponse | null>(null);
  const [locationSummary, setLocationSummary] = useState<InventoryLocationSummaryResponse | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const productParams = useMemo(
    () =>
      buildProductSummaryParams({
        query,
        locationId: locationFilter,
        status: productStatus,
        garmentType,
      }),
    [garmentType, locationFilter, productStatus, query]
  );

  const locationParams = useMemo(
    () =>
      buildLocationSummaryParams({
        query: locationQuery,
        status: locationStatus,
      }),
    [locationQuery, locationStatus]
  );

  const loadSummaries = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [productsPayload, locationsPayload] = await Promise.all([
        apiFetch<{ ok: boolean; data: InventoryProductSummaryResponse }>(
          `/api/inventory/summary/products?${productParams.toString()}`,
          {
            cache: "no-store",
            suppressAuthEvent: true,
          }
        ),
        apiFetch<{ ok: boolean; data: InventoryLocationSummaryResponse }>(
          `/api/inventory/summary/locations?${locationParams.toString()}`,
          {
            cache: "no-store",
            suppressAuthEvent: true,
          }
        ),
      ]);

      setProductSummary(unwrapApiData(productsPayload) ?? null);
      setLocationSummary(unwrapApiData(locationsPayload) ?? null);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "No se pudo cargar el stock actual."
      );
    } finally {
      setLoading(false);
    }
  }, [locationParams, productParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSummaries();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadSummaries, refreshNonce]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (view !== "product") {
      params.set("view", view);
    }

    if (query.trim()) {
      params.set("query", query.trim());
    }

    if (locationFilter !== "all") {
      params.set("location_id", locationFilter);
    }

    if (productStatus !== "all") {
      params.set("status", productStatus);
    }

    if (garmentType !== "all") {
      params.set("garment_type", garmentType);
    }

    if (locationQuery.trim()) {
      params.set("location_query", locationQuery.trim());
    }

    if (locationStatus !== "all") {
      params.set("location_health", locationStatus);
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [
    garmentType,
    locationFilter,
    locationQuery,
    locationStatus,
    pathname,
    productStatus,
    query,
    router,
    view,
  ]);

  const productRows = useMemo(() => productSummary?.rows || [], [productSummary]);
  const locationRows = useMemo(() => locationSummary?.rows || [], [locationSummary]);
  const availableLocations = useMemo(
    () => productSummary?.meta.available_locations || [],
    [productSummary]
  );
  const locationOptions = useMemo(() => buildLocationOptions(availableLocations), [availableLocations]);
  const showLocationsColumn = locationFilter === "all" && availableLocations.length > 1;
  const garmentTypeOptions = useMemo<FilterDropdownOption[]>(() => {
    const values = Array.from(
      new Set(productRows.map((row) => row.garment_type_name).filter(Boolean))
    ).sort((left, right) => String(left).localeCompare(String(right), "es"));

    return [{ value: "all", label: "Todos" }].concat(
      values.map((value) => ({ value: String(value), label: String(value) }))
    );
  }, [productRows]);

  const selectedLocation = availableLocations.find((location) => location.location_id === locationFilter) || null;
  const productTotals = useMemo(() => {
    return {
      stockTotal: productRows.reduce((sum, row) => sum + row.stock_total, 0),
      productsWithStock: productRows.filter((row) => row.stock_total > 0).length,
      lowStock: productRows.filter((row) => row.status === "low" || row.status === "incomplete").length,
      outOfStock: productRows.filter((row) => row.status === "out").length,
    };
  }, [productRows]);

  const locationTotals = useMemo(() => {
    return {
      stockTotal: locationRows.reduce((sum, row) => sum + row.stock_total, 0),
      products: locationRows.reduce((sum, row) => sum + row.products_count, 0),
      lowStock: locationRows.reduce((sum, row) => sum + row.low_stock_count, 0),
      outOfStock: locationRows.reduce((sum, row) => sum + row.out_of_stock_count, 0),
    };
  }, [locationRows]);

  const productTotalPages = Math.max(1, Math.ceil(productRows.length / PAGE_SIZE));
  const safeProductPage = Math.min(productPage, productTotalPages);
  const paginatedProducts = productRows.slice(
    (safeProductPage - 1) * PAGE_SIZE,
    safeProductPage * PAGE_SIZE
  );

  const locationTotalPages = Math.max(1, Math.ceil(locationRows.length / PAGE_SIZE));
  const safeLocationPage = Math.min(locationPage, locationTotalPages);
  const paginatedLocations = locationRows.slice(
    (safeLocationPage - 1) * PAGE_SIZE,
    safeLocationPage * PAGE_SIZE
  );

  const hasProductFilters =
    Boolean(query.trim()) ||
    locationFilter !== "all" ||
    productStatus !== "all" ||
    garmentType !== "all";
  const hasLocationFilters = Boolean(locationQuery.trim()) || locationStatus !== "all";

  function resetProductFilters() {
    setQuery("");
    setLocationFilter("all");
    setProductStatus("all");
    setGarmentType("all");
    setProductPage(1);
  }

  function resetLocationFilters() {
    setLocationQuery("");
    setLocationStatus("all");
    setLocationPage(1);
  }

  function goToProductDetail(styleId: string) {
    router.push(buildInventoryDetailRoute(styleId, locationFilter === "all" ? null : locationFilter));
  }

  function goToLocationView(locationId: string) {
    setView("product");
    setLocationFilter(locationId);
    setProductPage(1);
  }

  return (
    <TooltipProvider delayDuration={120}>
      <OpsPageShell width="wide">
        <PosHeader
          eyebrow="INVENTARIO"
          title="Stock actual"
          description="Consulta el stock disponible por producto, sede, talla y color."
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Tabs
                value={view}
                onValueChange={(nextValue) => {
                  setView(nextValue as InventoryView);
                }}
                className="gap-0"
              >
                <TabsList variant="ops" className="max-w-full">
                  <TabsTrigger value="product">Por producto</TabsTrigger>
                  <TabsTrigger value="location">Por sede</TabsTrigger>
                </TabsList>
              </Tabs>

              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="rounded-lg"
                onClick={() => setRefreshNonce((current) => current + 1)}
                aria-label="Actualizar stock actual"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          {view === "product" ? (
            <>
              <OpsMetricPill label="Stock total" value={productTotals.stockTotal} tone="accent" />
              <OpsMetricPill label="Productos con stock" value={productTotals.productsWithStock} />
              <OpsMetricPill label="Bajo stock" value={productTotals.lowStock} tone="warning" />
              <OpsMetricPill label="Sin stock" value={productTotals.outOfStock} tone="warning" />
            </>
          ) : (
            <>
              <OpsMetricPill label="Stock total" value={locationTotals.stockTotal} tone="accent" />
              <OpsMetricPill label="Productos" value={locationTotals.products} />
              <OpsMetricPill label="Bajo stock" value={locationTotals.lowStock} tone="warning" />
              <OpsMetricPill label="Sin stock" value={locationTotals.outOfStock} tone="warning" />
            </>
          )}
        </div>

        <OpsSectionDivider>
          {view === "product" ? (
            <OpsTableBlock>
              <OpsFiltersRow
                className={cn(
                  "lg:grid-cols-[minmax(0,1.55fr)_0.95fr_0.92fr_auto]",
                  garmentTypeOptions.length > 1
                    ? "xl:grid-cols-[minmax(0,1.55fr)_0.95fr_0.92fr_0.9fr_auto]"
                    : ""
                )}
              >
                <OpsSearchField
                  value={query}
                  onChange={(value) => {
                    setQuery(value);
                    setProductPage(1);
                  }}
                  placeholder="Buscar producto"
                  ariaLabel="Buscar producto"
                />

                <FilterDropdown
                  label="Sede"
                  value={locationFilter}
                  options={locationOptions}
                  onChange={(value) => {
                    setLocationFilter(value);
                    setProductPage(1);
                  }}
                />

                <FilterDropdown
                  label="Estado"
                  value={productStatus}
                  options={PRODUCT_STATUS_OPTIONS}
                  onChange={(value) => {
                    setProductStatus(value as ProductStatusFilter);
                    setProductPage(1);
                  }}
                />

                {garmentTypeOptions.length > 1 ? (
                  <FilterDropdown
                    label="Tipo de prenda"
                    value={garmentType}
                    options={garmentTypeOptions}
                    onChange={(value) => {
                      setGarmentType(value);
                      setProductPage(1);
                    }}
                  />
                ) : null}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="h-10 w-10 self-start rounded-lg lg:self-end"
                      onClick={resetProductFilters}
                      disabled={!hasProductFilters}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Limpiar filtros</TooltipContent>
                </Tooltip>
              </OpsFiltersRow>

              <OpsTableWrap minWidth={showLocationsColumn ? "1020px" : "920px"}>
                <table className="w-full border-collapse">
                  <thead className="bg-[var(--ops-surface-muted)]">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Stock</th>
                      <th className="px-4 py-3">Variantes</th>
                      {showLocationsColumn ? <th className="px-4 py-3">Sedes</th> : null}
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={showLocationsColumn ? 7 : 6}
                          className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]"
                        >
                          <LoaderCircle className="mr-2 inline-block h-5 w-5 animate-spin" />
                          Cargando stock actual...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td
                          colSpan={showLocationsColumn ? 7 : 6}
                          className="px-4 py-8 text-center text-sm text-[var(--ops-text-muted)]"
                        >
                          {error}
                        </td>
                      </tr>
                    ) : paginatedProducts.length === 0 ? (
                      <tr>
                        <td colSpan={showLocationsColumn ? 7 : 6} className="px-4 py-10">
                          <div className="rounded-xl border border-dashed border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)] px-4 py-6 text-center text-sm text-[var(--ops-text-muted)]">
                            No encontramos productos para los filtros actuales.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedProducts.map((row) => (
                        <tr key={row.style_id} className="transition hover:bg-[var(--ops-surface-muted)]">
                          <td className="px-4 py-[var(--ops-row-py)]">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-[var(--ops-text)]">{row.style_name}</p>
                              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                                {row.style_code}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-[var(--ops-row-py)] text-sm text-[var(--ops-text)]">
                            {row.garment_type_name || "Sin tipo"}
                          </td>
                          <td className="px-4 py-[var(--ops-row-py)] text-sm font-semibold text-[var(--ops-text)]">
                            {row.stock_total}
                          </td>
                          <td className="px-4 py-[var(--ops-row-py)] text-sm text-[var(--ops-text)]">
                            {formatInventoryVariantsSummary(row.sizes_count, row.colors_count)}
                          </td>
                          {showLocationsColumn ? (
                            <td className="px-4 py-[var(--ops-row-py)] text-sm text-[var(--ops-text)]">
                              {row.locations_count} sedes
                            </td>
                          ) : null}
                          <td className="px-4 py-[var(--ops-row-py)]">
                            <OpsStatusBadge tone={getProductStatusTone(row.status)} size="xs">
                              {row.status_label}
                            </OpsStatusBadge>
                          </td>
                          <td className="px-4 py-[var(--ops-row-py)] text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-lg px-3"
                              onClick={() => goToProductDetail(row.style_id)}
                            >
                              Ver stock
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </OpsTableWrap>

              <OpsTableFooter>
                <p className="text-[13px] text-[var(--ops-text-muted)]">
                  {selectedLocation
                    ? `Stock en sede: ${selectedLocation.name}`
                    : productSummary?.meta.scope_label || "Todas las sedes"}
                </p>
                <Pagination
                  page={safeProductPage}
                  totalPages={productTotalPages}
                  onPageChange={setProductPage}
                />
              </OpsTableFooter>
            </OpsTableBlock>
          ) : (
            <OpsTableBlock>
              <OpsFiltersRow className="lg:grid-cols-[minmax(0,1.4fr)_0.92fr_auto]">
                <OpsSearchField
                  value={locationQuery}
                  onChange={(value) => {
                    setLocationQuery(value);
                    setLocationPage(1);
                  }}
                  placeholder="Buscar sede"
                  ariaLabel="Buscar sede"
                />

                <FilterDropdown
                  label="Estado"
                  value={locationStatus}
                  options={LOCATION_STATUS_OPTIONS}
                  onChange={(value) => {
                    setLocationStatus(value as LocationStatusFilter);
                    setLocationPage(1);
                  }}
                />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="h-10 w-10 self-start rounded-lg lg:self-end"
                      onClick={resetLocationFilters}
                      disabled={!hasLocationFilters}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Limpiar filtros</TooltipContent>
                </Tooltip>
              </OpsFiltersRow>

              <OpsTableWrap minWidth="960px">
                <table className="w-full border-collapse">
                  <thead className="bg-[var(--ops-surface-muted)]">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                      <th className="px-4 py-3">Sede</th>
                      <th className="px-4 py-3">Stock total</th>
                      <th className="px-4 py-3">Productos</th>
                      <th className="px-4 py-3">Bajo stock</th>
                      <th className="px-4 py-3">Sin stock</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                          <LoaderCircle className="mr-2 inline-block h-5 w-5 animate-spin" />
                          Cargando sedes...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--ops-text-muted)]">
                          {error}
                        </td>
                      </tr>
                    ) : paginatedLocations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10">
                          <div className="rounded-xl border border-dashed border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)] px-4 py-6 text-center text-sm text-[var(--ops-text-muted)]">
                            No encontramos sedes para los filtros actuales.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedLocations.map((row) => (
                        <tr key={row.location_id} className="transition hover:bg-[var(--ops-surface-muted)]">
                          <td className="px-4 py-[var(--ops-row-py)]">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-[var(--ops-text)]">{row.location_name}</p>
                            </div>
                          </td>
                          <td className="px-4 py-[var(--ops-row-py)] text-sm font-semibold text-[var(--ops-text)]">
                            {row.stock_total}
                          </td>
                          <td className="px-4 py-[var(--ops-row-py)] text-sm text-[var(--ops-text)]">
                            {row.products_count}
                          </td>
                          <td className="px-4 py-[var(--ops-row-py)] text-sm text-[var(--ops-text)]">
                            {row.low_stock_count}
                          </td>
                          <td className="px-4 py-[var(--ops-row-py)] text-sm text-[var(--ops-text)]">
                            {row.out_of_stock_count}
                          </td>
                          <td className="px-4 py-[var(--ops-row-py)]">
                            <OpsStatusBadge tone={getLocationStatusTone(row.status)} size="xs">
                              {row.status_label}
                            </OpsStatusBadge>
                          </td>
                          <td className="px-4 py-[var(--ops-row-py)] text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-lg px-3"
                              onClick={() => goToLocationView(row.location_id)}
                            >
                              Ver stock
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </OpsTableWrap>

              <OpsTableFooter>
                <p className="text-[13px] text-[var(--ops-text-muted)]">
                  Vista consolidada por ubicación visible.
                </p>
                <Pagination
                  page={safeLocationPage}
                  totalPages={locationTotalPages}
                  onPageChange={setLocationPage}
                />
              </OpsTableFooter>
            </OpsTableBlock>
          )}
        </OpsSectionDivider>
      </OpsPageShell>
    </TooltipProvider>
  );
}
