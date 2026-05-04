"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, MapPin, RefreshCw, RotateCcw, Search } from "lucide-react";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { buildApiUrl } from "@/lib/api";

type InventoryItem = {
  location_id: string;
  location_code: string;
  location_name: string;
  variant_id: string;
  sku: string;
  style_id: string;
  style_code: string;
  style_name: string;
  garment_type_name: string | null;
  size_id: string;
  size_code: string;
  color_id: string;
  color_name: string;
  qty: number;
};

type PriceCoverageGap = {
  style_id: string;
  style_code: string;
  style_name: string;
  variant_count: number;
  inventory_row_count: number;
  price_row_count: number;
};

type InventoryGroupedRow = {
  rowKey: string;
  styleCode: string;
  styleName: string;
  garmentTypeName: string | null;
  locationId: string;
  locationCode: string;
  locationName: string;
  variantsCount: number;
  totalQty: number;
};

const PAGE_SIZE = 10;

function buildGroupedRows(items: InventoryItem[]) {
  const map = new Map<string, InventoryGroupedRow>();
  const variantsByRow = new Map<string, Set<string>>();

  for (const item of items) {
    const rowKey = `${item.style_id}|${item.location_id}`;
    const existing = map.get(rowKey);

    if (!existing) {
      map.set(rowKey, {
        rowKey,
        styleCode: item.style_code,
        styleName: item.style_name,
        garmentTypeName: item.garment_type_name,
        locationId: item.location_id,
        locationCode: item.location_code,
        locationName: item.location_name,
        variantsCount: 1,
        totalQty: item.qty,
      });
      variantsByRow.set(rowKey, new Set([item.variant_id]));
      continue;
    }

    const rowVariants = variantsByRow.get(rowKey) || new Set<string>();
    rowVariants.add(item.variant_id);
    variantsByRow.set(rowKey, rowVariants);
    existing.variantsCount = rowVariants.size;
    existing.totalQty += item.qty;
  }

  return Array.from(map.values()).map((row) => ({
    ...row,
  }));
}

export default function InventoryPage() {
  const { defaultLocation, locationAssignments } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [coverageGaps, setCoverageGaps] = useState<PriceCoverageGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [page, setPage] = useState(1);

  async function loadInventory() {
    setLoading(true);
    setError(null);

    try {
      const [inventoryResponse, coverageResponse] = await Promise.all([
        fetch(buildApiUrl("/api/inventory"), { cache: "no-store" }),
        fetch(buildApiUrl("/api/prices/coverage-gaps"), { cache: "no-store" }),
      ]);

      const inventoryPayload = await inventoryResponse.json();
      if (!inventoryResponse.ok) {
        throw new Error(inventoryPayload.message || "No se pudo cargar inventario");
      }
      setItems(Array.isArray(inventoryPayload.data) ? inventoryPayload.data : []);

      const coveragePayload = await coverageResponse.json().catch(() => ({ data: [] }));
      setCoverageGaps(Array.isArray(coveragePayload?.data) ? coveragePayload.data : []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar inventario"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInventory();
  }, []);

  const locationOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const item of items) {
      map.set(item.location_code, item.location_name);
    }

    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [items]);

  useEffect(() => {
    if (locationFilter !== "all") {
      return;
    }

    const defaultCode =
      defaultLocation?.code ||
      locationAssignments.find((assignment) => assignment.is_default)?.location.code ||
      null;

    if (defaultCode && locationOptions.some((location) => location.code === defaultCode)) {
      setLocationFilter(defaultCode);
    }
  }, [defaultLocation?.code, locationAssignments, locationFilter, locationOptions]);

  const groupedRows = useMemo(() => buildGroupedRows(items), [items]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return groupedRows.filter((row) => {
      const matchesLocation = locationFilter === "all" || row.locationCode === locationFilter;
      const matchesQuery =
        !normalizedQuery ||
        row.styleCode.toLowerCase().includes(normalizedQuery) ||
        row.styleName.toLowerCase().includes(normalizedQuery) ||
        row.locationName.toLowerCase().includes(normalizedQuery) ||
        (row.garmentTypeName || "").toLowerCase().includes(normalizedQuery);

      return matchesLocation && matchesQuery;
    });
  }, [groupedRows, locationFilter, query]);

  useEffect(() => {
    setPage(1);
  }, [query, locationFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const paginatedRows = filteredRows.slice(pageStart, pageStart + PAGE_SIZE);
  const visibleFrom = filteredRows.length ? pageStart + 1 : 0;
  const visibleTo = filteredRows.length
    ? Math.min(pageStart + PAGE_SIZE, filteredRows.length)
    : 0;
  const hasActiveFilters = Boolean(query.trim()) || locationFilter !== "all";

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  const totals = useMemo(() => {
    const uniqueProducts = new Set(filteredRows.map((row) => row.styleCode)).size;
    const totalUnits = filteredRows.reduce((acc, row) => acc + row.totalQty, 0);
    const uniqueLocations = new Set(filteredRows.map((row) => row.locationId)).size;

    return { uniqueProducts, totalUnits, uniqueLocations };
  }, [filteredRows]);

  const stylesWithoutCommercialPrice = useMemo(
    () => new Set(coverageGaps.map((gap) => gap.style_code)),
    [coverageGaps]
  );

  return (
    <TooltipProvider delayDuration={120}>
      <section className="ops-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
          <PosHeader
            eyebrow="Control de stock"
            title="Inventario"
            actions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={loadInventory}
              >
                <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Actualizar
              </Button>
            }
          />

          <div className="flex flex-wrap items-center gap-2">
            <span className="ops-metric-pill inline-flex rounded-full px-3 py-2 text-sm font-semibold">
              Productos visibles: {totals.uniqueProducts}
            </span>
            <span className="ops-metric-pill inline-flex rounded-full px-3 py-2 text-sm font-semibold">
              Unidades visibles: {totals.totalUnits}
            </span>
            <span className="ops-metric-pill inline-flex rounded-full px-3 py-2 text-sm font-semibold">
              Sedes visibles: {totals.uniqueLocations}
            </span>
          </div>

          <div className="space-y-4 border-t border-[var(--ops-border-strong)] pt-4">
            {coverageGaps.length > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                Styles con stock sin precio comercial:{" "}
                <span className="font-semibold">
                  {coverageGaps.map((gap) => gap.style_code).join(", ")}
                </span>
              </div>
            ) : null}

            <div className="grid gap-2.5 lg:grid-cols-[1.4fr_0.8fr_auto] lg:items-end">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ops-text-muted)]" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por producto, codigo o ubicacion"
                  className="ops-surface h-10 rounded-lg border py-2 pl-9 text-sm"
                />
              </div>

              <div>
                <label htmlFor="location-filter" className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  Ubicacion
                </label>
                <select
                  id="location-filter"
                  value={locationFilter}
                  onChange={(event) => setLocationFilter(event.target.value)}
                  className="ops-surface h-10 w-full cursor-pointer rounded-lg border px-3 text-sm outline-none transition hover:bg-[var(--ops-surface-muted)] bg-[var(--ops-surface)]"
                >
                  <option value="all">Todas</option>
                  {locationOptions.map((location) => (
                    <option key={location.code} value={location.code}>
                      {location.code} - {location.name}
                    </option>
                  ))}
                </select>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="h-10 w-10 self-start rounded-lg lg:self-end"
                    onClick={() => {
                      setQuery("");
                      setLocationFilter(defaultLocation?.code || "all");
                    }}
                    disabled={!hasActiveFilters}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Limpiar filtros</TooltipContent>
              </Tooltip>
            </div>

            {error ? (
              <div role="alert" aria-live="polite" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <div className="min-w-[820px] border-y border-[var(--ops-border-strong)]">
                <div className="grid grid-cols-[1.4fr_0.9fr_0.8fr_1fr_90px] gap-3 bg-[var(--ops-surface-muted)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  <span>Producto</span>
                  <span>Codigo</span>
                  <span>Variantes</span>
                  <span>Ubicacion</span>
                  <span className="text-right">Stock</span>
                </div>

                <div className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                  {loading ? (
                    <div className="ops-text-muted flex min-h-56 items-center justify-center px-4 py-10 text-sm">
                      <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                      Cargando inventario...
                    </div>
                  ) : paginatedRows.length ? (
                    paginatedRows.map((row) => (
                      <article
                        key={row.rowKey}
                        className="grid grid-cols-[1.4fr_0.9fr_0.8fr_1fr_90px] gap-3 px-4 py-[var(--ops-row-py)] transition-colors hover:bg-[var(--ops-surface-muted)]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--ops-text)]">{row.styleName}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <p className="truncate text-[11px] text-[var(--ops-text-muted)]">
                              {row.garmentTypeName || "Sin tipo"}
                            </p>
                            {stylesWithoutCommercialPrice.has(row.styleCode) ? (
                              <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                                Sin precio
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="text-sm font-semibold text-[var(--ops-text)]">
                          {row.styleCode}
                        </div>

                        <div className="text-sm text-[var(--ops-text)]">
                          {row.variantsCount}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-[var(--ops-text)]">
                          <MapPin className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />
                          <span className="truncate">{row.locationName}</span>
                        </div>

                        <div className="text-right text-sm font-semibold text-[var(--ops-text)]">
                          {row.totalQty}
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                      No se encontraron registros de inventario con los filtros actuales.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-1 md:flex-row md:items-center md:justify-between">
              <span className="ops-secondary-text text-[var(--ops-text-muted)]">
                {filteredRows.length ? `${visibleFrom}-${visibleTo} de ${filteredRows.length}` : "0 resultados"}
              </span>
              <Pagination
                page={safePage}
                totalPages={totalPages}
                onPageChange={setPage}
                className="self-end md:self-auto"
              />
            </div>
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}
