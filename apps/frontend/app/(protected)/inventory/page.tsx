"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, MapPin, RefreshCw, RotateCcw, Search } from "lucide-react";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Button } from "@/components/ui/button";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { Pagination } from "@/components/ui/pagination";
import { InlineStatusCard } from "@/components/feedback/status-page";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
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

function MetricPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "accent" | "warning";
}) {
  const toneClass =
    tone === "accent"
      ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_88%,var(--ops-surface))] text-[var(--ops-text)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--ripnel-accent)_14%,transparent)]"
      : tone === "warning"
        ? "border-[color:color-mix(in_srgb,#f59e0b_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#f59e0b_78%,var(--ops-text))]"
        : "border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_66%,var(--ops-surface))] text-[var(--ops-text)]";
  const labelClass =
    tone === "accent"
      ? "text-[color:color-mix(in_srgb,var(--ripnel-accent)_72%,var(--ops-text))]"
      : tone === "warning"
        ? "text-[color:color-mix(in_srgb,#f59e0b_82%,var(--ops-text))]"
        : "text-[var(--ops-text-muted)]";
  const valueClass =
    tone === "accent"
      ? "text-[var(--ops-text)]"
      : tone === "warning"
        ? "text-[color:color-mix(in_srgb,#f59e0b_78%,var(--ops-text))]"
        : "text-[var(--ops-text)]";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full border px-3 py-2",
        toneClass
      )}
    >
      <span className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", labelClass)}>
        {label}
      </span>
      <span className={cn("text-base font-semibold leading-none", valueClass)}>{value}</span>
    </div>
  );
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
        <div className="mx-auto max-w-[1180px] space-y-4">
          <PosHeader
            eyebrow="Control de stock"
            title="Inventario"
            actions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={loadInventory}
              >
                <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Actualizar
              </Button>
            }
          />

          <div className="flex flex-wrap items-center gap-2">
            <MetricPill label="Productos" value={totals.uniqueProducts} />
            <MetricPill label="Unidades" value={totals.totalUnits} tone="accent" />
            <MetricPill label="Sedes" value={totals.uniqueLocations} />
          </div>

          <div className="space-y-4 border-t border-[var(--ops-border-strong)] pt-4">
            {coverageGaps.length > 0 ? (
              <div className="rounded-xl border border-[color:color-mix(in_srgb,#f59e0b_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] px-4 py-3 text-sm text-[color:color-mix(in_srgb,#f59e0b_82%,var(--ops-text))]">
                Styles con stock sin precio comercial:{" "}
                <span className="font-semibold">
                  {coverageGaps.map((gap) => gap.style_code).join(", ")}
                </span>
              </div>
            ) : null}

            <div className="grid gap-2.5 lg:grid-cols-[1.4fr_0.8fr_auto] lg:items-end">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">Buscar</label>
                <div className="sales-field flex h-10 items-center gap-2 rounded-lg px-3 transition hover:bg-[var(--ops-surface-muted)]">
                  <Search className="h-4 w-4 shrink-0 text-[var(--ops-text-muted)]" />
                  <input type="text" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por producto, SKU o tipo" className="h-full w-full bg-transparent text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]" />
                </div>
              </div>

              <FilterDropdown
                label="Ubicacion"
                value={locationFilter}
                options={[
                  { value: "all", label: "Todas" },
                  ...locationOptions.map((location) => ({ value: location.code, label: `${location.code} - ${location.name}` })),
                ]}
                onChange={(v) => { setLocationFilter(v); setPage(1); }}
              />

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
              <InlineStatusCard title="No pudimos cargar inventario" description={error} tone="danger" variant="ops" />
            ) : null}

            <div className="overflow-x-auto">
              <div className="min-w-[820px] border-y border-[var(--ops-border-strong)]">
                <table className="w-full border-collapse">
                  <thead className="bg-[var(--ops-surface-muted)]">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3">Codigo</th>
                      <th className="px-4 py-3">Variantes</th>
                      <th className="px-4 py-3">Ubicacion</th>
                      <th className="px-4 py-3 text-right">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                          <LoaderCircle className="mr-2 inline-block h-5 w-5 animate-spin" />
                          Cargando inventario...
                        </td>
                      </tr>
                    ) : paginatedRows.length ? (
                      paginatedRows.map((row) => (
                        <tr
                          key={row.rowKey}
                          className="transition hover:bg-[var(--ops-surface-muted)]"
                        >
                          <td className="px-4 py-[var(--ops-row-py)]">
                            <p className="truncate text-sm font-semibold text-[var(--ops-text)]">{row.styleName}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <p className="truncate text-[11px] text-[var(--ops-text-muted)]">
                                {row.garmentTypeName || "Sin tipo"}
                              </p>
                              {stylesWithoutCommercialPrice.has(row.styleCode) ? (
                                <span className="inline-flex rounded-full border border-[color:color-mix(in_srgb,#f59e0b_28%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_10%,var(--ops-surface))] px-2 py-0.5 text-[11px] font-semibold text-[color:color-mix(in_srgb,#f59e0b_72%,var(--ops-text))]">
                                  Sin precio
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-[var(--ops-row-py)] text-sm font-semibold text-[var(--ops-text)]">
                            {row.styleCode}
                          </td>
                          <td className="px-4 py-[var(--ops-row-py)] text-sm text-[var(--ops-text)]">
                            {row.variantsCount}
                          </td>
                          <td className="px-4 py-[var(--ops-row-py)] text-sm text-[var(--ops-text)]">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />
                              {row.locationName}
                            </div>
                          </td>
                          <td className="px-4 py-[var(--ops-row-py)] text-right text-sm font-semibold text-[var(--ops-text)]">
                            {row.totalQty}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                          No se encontraron registros de inventario con los filtros actuales.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-1 md:flex-row md:items-center md:justify-between">
              <span className="text-sm text-[var(--ops-text-muted)]">
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
