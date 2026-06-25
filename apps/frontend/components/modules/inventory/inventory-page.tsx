"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapPin, RefreshCw, RotateCcw, Download } from "lucide-react";
import { usePagination } from "@/hooks/use-pagination";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { OpsSelect, type OpsOption } from "@/components/ui/ops-selection";
import { OpsDataTable } from "@/components/ui/ops-data-table";
import { OpsMetricInlineGroup } from "@/components/ui/ops-metric-inline-group";
import {
  OpsFiltersRow,
  OpsPageShell,
  OpsSearchField,
  OpsTableBlock,
} from "@/components/ui/ops-page-shell";
import { OpsStatusBadge } from "@/components/ui/ops-status-badge";
import { Pagination } from "@/components/ui/pagination";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiFetch, unwrapApiData } from "@/lib/api";
import { useApiGet } from "@/hooks/use-api-get";
import { buildInventoryDetailRoute } from "@/lib/routes";
import { exportToCsv } from "@/lib/export-csv";
import { cn } from "@/lib/utils";
import { STOCK } from "./inventory-messages";
import {
  formatInventoryVariantsSummary,
  type InventoryProductSummaryResponse,
  getProductStatusTone,
  normalizeProductStatusFilter,
  type ProductStatusFilter,
} from "./inventory-summary-shared";

const PRODUCT_STATUS_OPTIONS: OpsOption[] = [
  { value: "all", label: STOCK.status.all },
  { value: "available", label: STOCK.status.available },
  { value: "incomplete", label: STOCK.status.incomplete },
  { value: "low", label: STOCK.status.low },
  { value: "out", label: STOCK.status.out },
];

function buildLocationOptions(
  availableLocations: InventoryProductSummaryResponse["meta"]["available_locations"]
): OpsOption[] {
  return [
    { value: "all", label: STOCK.status.allLocations },
    ...availableLocations.map((location) => ({
      value: location.location_id,
      label: location.name,
      badge: location.is_default ? STOCK.locationBadge.defaultBadge : undefined,
      tone: location.is_default ? ("accent" as const) : undefined,
    })),
  ];
}

export default function InventoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { defaultLocation, locationsLoading } = useAuth();

  const urlLocationId = searchParams.get("location_id");
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [locationFilter, setLocationFilter] = useState(
    urlLocationId || defaultLocation?.location_id || "all"
  );
  const [productStatus, setProductStatus] = useState<ProductStatusFilter>(
    normalizeProductStatusFilter(searchParams.get("status"))
  );
  const [garmentType, setGarmentType] = useState(searchParams.get("garment_type") || "all");
  const [refreshNonce, setRefreshNonce] = useState(0);

  const locationAutoSet = useRef(false);

  useEffect(() => {
    if (
      !locationAutoSet.current &&
      !urlLocationId &&
      !locationsLoading &&
      defaultLocation?.location_id
    ) {
      locationAutoSet.current = true;
      setLocationFilter(defaultLocation.location_id);
    }
  }, [locationsLoading, defaultLocation?.location_id, urlLocationId]);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (query.trim()) p.set("query", query.trim());
    if (locationFilter !== "all") p.set("location_id", locationFilter);
    if (productStatus !== "all") p.set("status", productStatus);
    if (garmentType !== "all") p.set("garment_type", garmentType);
    return p;
  }, [query, locationFilter, productStatus, garmentType]);

  const {
    data: productData,
    loading,
    error,
  } = useApiGet(
    () =>
      apiFetch<InventoryProductSummaryResponse>(
        `/api/inventory/summary/products?${params.toString()}`,
        { cache: "no-store", suppressAuthEvent: true }
      ).then(unwrapApiData),
    [params.toString(), refreshNonce]
  );

  useEffect(() => {
    const p = new URLSearchParams();
    if (query.trim()) p.set("query", query.trim());
    if (locationFilter !== "all") p.set("location_id", locationFilter);
    if (productStatus !== "all") p.set("status", productStatus);
    if (garmentType !== "all") p.set("garment_type", garmentType);
    const nextUrl = p.toString() ? `${pathname}?${p.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [query, locationFilter, productStatus, garmentType, pathname, router]);

  const productRows = useMemo(() => productData?.rows || [], [productData]);
  const availableLocations = useMemo(
    () => productData?.meta.available_locations || [],
    [productData]
  );
  const locationOptions = useMemo(
    () => buildLocationOptions(availableLocations),
    [availableLocations]
  );

  const selectedLocation =
    availableLocations.find((loc) => loc.location_id === locationFilter) || null;

  const locationBadgeText = useMemo(() => {
    if (locationsLoading) return STOCK.locationBadge.loading;
    if (!defaultLocation?.name) return STOCK.locationBadge.noLocation;
    if (locationFilter === "all") return STOCK.footer.scopeAll;
    const loc = availableLocations.find((l) => l.location_id === locationFilter);
    return loc?.name || defaultLocation.name;
  }, [locationsLoading, defaultLocation, locationFilter, availableLocations]);

  const productTotals = useMemo(
    () => ({
      stockTotal: productRows.reduce((sum, row) => sum + row.stock_total, 0),
      productsWithStock: productRows.filter((row) => row.stock_total > 0).length,
      lowStock: productRows.filter(
        (row) => row.status === "low" || row.status === "incomplete"
      ).length,
      outOfStock: productRows.filter((row) => row.status === "out").length,
    }),
    [productRows]
  );

  const showLocationsColumn = locationFilter === "all" && availableLocations.length > 1;

  const garmentTypeOptions = useMemo<OpsOption[]>(() => {
    const values = Array.from(
      new Set(productRows.map((row) => row.garment_type_name).filter(Boolean))
    ).sort((left, right) => String(left).localeCompare(String(right), "es"));

    return [{ value: "all", label: STOCK.status.all } as OpsOption].concat(
      values.map((value) => ({ value: String(value), label: String(value) }))
    );
  }, [productRows]);

  const {
    paginatedItems: paginatedProducts,
    totalPages: productsTotalPages,
    safePage: productsSafePage,
    setPage: setProductPage,
  } = usePagination(productRows);

  const hasFilters =
    Boolean(query.trim()) ||
    locationFilter !== "all" ||
    productStatus !== "all" ||
    garmentType !== "all";

  function resetFilters() {
    setQuery("");
    setLocationFilter("all");
    setProductStatus("all");
    setGarmentType("all");
    setProductPage(1);
  }

  function goToDetail(styleId: string) {
    router.push(
      buildInventoryDetailRoute(styleId, locationFilter === "all" ? null : locationFilter)
    );
  }

  function handleExport() {
    const rows = (productData?.rows || []).map((row) => [
      row.style_code,
      row.style_name,
      row.garment_type_name || "-",
      String(row.stock_total),
      String(row.sizes_count),
      String(row.colors_count),
      String(row.locations_count),
      row.status_label,
    ]);
    exportToCsv(STOCK.csv.productFilename, [...STOCK.csv.productHeaders], rows);
  }

  return (
    <TooltipProvider delayDuration={120}>
      <OpsPageShell width="wide">
        <PosHeader
          eyebrow={STOCK.header.eyebrow}
          title={STOCK.header.title}
          meta={
            <OpsStatusBadge
              tone="neutral"
              size="sm"
              icon={<MapPin className="h-3.5 w-3.5 text-[var(--ripnel-accent)]" />}
            >
              {locationBadgeText}
            </OpsStatusBadge>
          }
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="rounded-lg"
                    onClick={handleExport}
                    disabled={!productData?.rows?.length}
                    aria-label={STOCK.actions.exportCsv}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  {STOCK.actions.exportCsv}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="rounded-lg"
                    onClick={() => setRefreshNonce((current) => current + 1)}
                    aria-label={STOCK.actions.refresh}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  {STOCK.actions.refresh}
                </TooltipContent>
              </Tooltip>
            </div>
          }
        />

        <OpsMetricInlineGroup
          items={[
            { label: STOCK.metrics.stockTotal, value: productTotals.stockTotal, tone: "accent" },
            { label: STOCK.metrics.productsWithStock, value: productTotals.productsWithStock },
            { label: STOCK.metrics.lowStock, value: productTotals.lowStock, tone: "warning" },
            { label: STOCK.metrics.outOfStock, value: productTotals.outOfStock, tone: "warning" },
          ]}
        />

        <OpsTableBlock className="border-t border-[var(--ops-border-strong)] pt-4">
          <OpsFiltersRow
            className={cn(
              garmentTypeOptions.length > 1
                ? "lg:grid-cols-[minmax(0,1.55fr)_0.95fr_0.92fr_0.9fr_auto]"
                : "lg:grid-cols-[minmax(0,1.55fr)_0.95fr_0.92fr_auto]"
            )}
          >
            <OpsSearchField
              label={STOCK.filters.searchLabel}
              value={query}
              onChange={(value) => {
                setQuery(value);
                setProductPage(1);
              }}
              placeholder={STOCK.filters.searchProduct}
              ariaLabel={STOCK.filters.searchProduct}
            />

            <OpsSelect
              label={STOCK.filters.location}
              value={locationFilter}
              options={locationOptions}
              onChange={(value) => {
                setLocationFilter(value);
                setProductPage(1);
              }}
            />

            <OpsSelect
              label={STOCK.filters.status}
              value={productStatus}
              options={PRODUCT_STATUS_OPTIONS}
              onChange={(value) => {
                setProductStatus(value as ProductStatusFilter);
                setProductPage(1);
              }}
            />

            {garmentTypeOptions.length > 1 ? (
              <OpsSelect
                label={STOCK.filters.garmentType}
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
                  onClick={resetFilters}
                  disabled={!hasFilters}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{STOCK.filters.clear}</TooltipContent>
            </Tooltip>
          </OpsFiltersRow>

          <OpsDataTable
            columns={[
              { key: "producto", header: STOCK.columns.product },
              { key: "tipo", header: STOCK.columns.type },
              { key: "stock", header: STOCK.columns.stock },
              { key: "variantes", header: STOCK.columns.variants },
              ...(showLocationsColumn
                ? [{ key: "sedes", header: STOCK.columns.locations }]
                : []),
              { key: "estado", header: STOCK.columns.status },
              { key: "accion", header: STOCK.columns.action, className: "text-right" },
            ]}
            minWidth={showLocationsColumn ? "1020px" : "920px"}
            loading={loading}
            loadingMessage={STOCK.loading.products}
            error={error}
            errorTitle={STOCK.error.productsTitle}
            isEmpty={paginatedProducts.length === 0}
            emptyMessage={STOCK.empty.products}
            footer={
              <>
                <p className="text-[13px] text-[var(--ops-text-muted)]">
                  {selectedLocation
                    ? STOCK.footer.scopeProduct(selectedLocation.name)
                    : STOCK.footer.scopeAll}
                </p>
                <Pagination
                  page={productsSafePage}
                  totalPages={productsTotalPages}
                  onPageChange={setProductPage}
                />
              </>
            }
          >
            {paginatedProducts.map((row) => (
              <tr
                key={row.style_id}
                className="transition hover:bg-[var(--ops-surface-muted)]"
              >
                <td className="px-4 py-[var(--ops-row-py)]">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--ops-text)]">
                      {row.style_name}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                      {row.style_code}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-[var(--ops-row-py)] text-sm text-[var(--ops-text)]">
                  {row.garment_type_name || STOCK.fallback.noType}
                </td>
                <td className="px-4 py-[var(--ops-row-py)] text-sm font-semibold text-[var(--ops-text)]">
                  {row.stock_total}
                </td>
                <td className="px-4 py-[var(--ops-row-py)] text-sm text-[var(--ops-text)]">
                  {formatInventoryVariantsSummary(row.sizes_count, row.colors_count)}
                </td>
                {showLocationsColumn ? (
                  <td className="px-4 py-[var(--ops-row-py)] text-sm text-[var(--ops-text)]">
                    {STOCK.footer.locationsCount(row.locations_count)}
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
                    onClick={() => goToDetail(row.style_id)}
                  >
                    {STOCK.actions.viewStock}
                  </Button>
                </td>
              </tr>
            ))}
          </OpsDataTable>
        </OpsTableBlock>
      </OpsPageShell>
    </TooltipProvider>
  );
}
