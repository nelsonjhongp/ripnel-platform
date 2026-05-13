"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  ClipboardList,
  LoaderCircle,
  MapPin,
  PackageCheck,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { AdminRowActionsMenu } from "@/components/admin/admin-ui";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Button } from "@/components/ui/button";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { Pagination } from "@/components/ui/pagination";
import { InlineStatusCard } from "@/components/feedback/status-page";
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
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { buildApiUrl } from "@/lib/api";
import { appRoutes } from "@/lib/routes";

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
  sizeStock: Array<{
    sizeCode: string;
    totalQty: number;
    variantCount: number;
    colorCount: number;
  }>;
  searchableText: string;
};

const PAGE_SIZE = 10;

function buildGroupedRows(items: InventoryItem[]) {
  const map = new Map<string, InventoryGroupedRow>();
  const variantsByRow = new Map<string, Set<string>>();
  const searchTermsByRow = new Map<string, Set<string>>();
  const sizeStockByRow = new Map<
    string,
    Map<string, { totalQty: number; variantIds: Set<string>; colorIds: Set<string> }>
  >();

  for (const item of items) {
    const rowKey = `${item.style_id}|${item.location_id}`;
    const existing = map.get(rowKey);
    const searchableTerms = [
      item.style_code,
      item.style_name,
      item.location_code,
      item.location_name,
      item.garment_type_name || "",
      item.sku,
      item.size_code,
      item.color_name,
    ];

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
        totalQty: 0,
        sizeStock: [],
        searchableText: searchableTerms.join(" ").toLowerCase(),
      });
      variantsByRow.set(rowKey, new Set([item.variant_id]));
      searchTermsByRow.set(rowKey, new Set(searchableTerms.filter(Boolean)));
    }

    const row = map.get(rowKey);
    if (!row) {
      continue;
    }

    const rowVariants = variantsByRow.get(rowKey) || new Set<string>();
    rowVariants.add(item.variant_id);
    variantsByRow.set(rowKey, rowVariants);

    const rowTerms = searchTermsByRow.get(rowKey) || new Set<string>();
    for (const term of searchableTerms) {
      if (term) {
        rowTerms.add(term);
      }
    }
    searchTermsByRow.set(rowKey, rowTerms);

    const sizeMap = sizeStockByRow.get(rowKey) || new Map();
    const sizeEntry =
      sizeMap.get(item.size_code) || {
        totalQty: 0,
        variantIds: new Set<string>(),
        colorIds: new Set<string>(),
      };
    sizeEntry.totalQty += item.qty;
    sizeEntry.variantIds.add(item.variant_id);
    sizeEntry.colorIds.add(item.color_id);
    sizeMap.set(item.size_code, sizeEntry);
    sizeStockByRow.set(rowKey, sizeMap);

    row.variantsCount = rowVariants.size;
    row.totalQty += item.qty;
    row.searchableText = Array.from(rowTerms).join(" ").toLowerCase();
  }

  return Array.from(map.values()).map((row) => ({
    ...row,
    sizeStock: Array.from(sizeStockByRow.get(row.rowKey)?.entries() || []).map(
      ([sizeCode, value]) => ({
        sizeCode,
        totalQty: value.totalQty,
        variantCount: value.variantIds.size,
        colorCount: value.colorIds.size,
      })
    ),
  }));
}

export default function InventoryPage() {
  const router = useRouter();
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
        row.searchableText.includes(normalizedQuery);

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

  function goToMovements(row: InventoryGroupedRow) {
    const params = new URLSearchParams({
      query: row.styleCode,
      location: row.locationCode,
    });
    router.push(`/kardex?${params.toString()}`);
  }

  function goToAdjustment(row: InventoryGroupedRow) {
    const params = new URLSearchParams({
      location_id: row.locationId,
      query: row.styleCode,
    });
    router.push(`${appRoutes.inventoryAdjustments}/nuevo?${params.toString()}`);
  }

  function goToTransfer(row: InventoryGroupedRow) {
    const params = new URLSearchParams({
      origin_id: row.locationId,
    });
    router.push(`/transferencias/crear-transferencia?${params.toString()}`);
  }

  return (
    <TooltipProvider delayDuration={120}>
      <OpsPageShell width="wide">
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
            <OpsMetricPill label="Productos" value={totals.uniqueProducts} />
            <OpsMetricPill label="Unidades" value={totals.totalUnits} tone="accent" />
            <OpsMetricPill label="Sedes" value={totals.uniqueLocations} />
          </div>

          <OpsSectionDivider>
            {coverageGaps.length > 0 ? (
              <InlineStatusCard
                title="Hay stock sin precio comercial"
                description={`Revisar ${coverageGaps.length} style${coverageGaps.length === 1 ? "" : "s"}: ${coverageGaps
                  .map((gap) => gap.style_code)
                  .join(", ")}`}
                tone="warning"
                variant="ops"
              />
            ) : null}

            <OpsTableBlock>
              <OpsFiltersRow className="lg:grid-cols-[minmax(0,1.4fr)_0.8fr_auto]">
                <OpsSearchField
                  value={query}
                  onChange={setQuery}
                  placeholder="Buscar por producto, SKU, sede o tipo"
                  ariaLabel="Buscar inventario"
                />

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
              </OpsFiltersRow>
              <OpsTableWrap minWidth="1080px">
                <table className="w-full border-collapse">
                  <thead className="bg-[var(--ops-surface-muted)]">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3">Codigo</th>
                      <th className="px-4 py-3">Tallas</th>
                      <th className="px-4 py-3">Ubicacion</th>
                      <th className="px-4 py-3 text-right">Stock</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                          <LoaderCircle className="mr-2 inline-block h-5 w-5 animate-spin" />
                          Cargando inventario...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6">
                          <InlineStatusCard
                            title="No pudimos cargar inventario"
                            description={error}
                            tone="danger"
                            variant="ops"
                          />
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
                            <div className="flex max-w-[300px] flex-wrap gap-1.5">
                              {row.sizeStock.map((size) => (
                                <span
                                  key={`${row.rowKey}-${size.sizeCode}`}
                                  className="inline-flex items-center gap-1 rounded-full border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] px-2 py-0.5 text-[11px] font-semibold text-[var(--ops-text-muted)]"
                                  title={`${size.variantCount} variante${size.variantCount === 1 ? "" : "s"} · ${size.colorCount} color${size.colorCount === 1 ? "" : "es"}`}
                                >
                                  <span>{size.sizeCode}</span>
                                  <span className="tabular-nums text-[var(--ops-text)]">
                                    {size.totalQty}
                                  </span>
                                </span>
                              ))}
                            </div>
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
                          <td className="px-4 py-[var(--ops-row-py)] text-right">
                            <AdminRowActionsMenu
                              ariaLabel={`Acciones para ${row.styleName}`}
                              items={[
                                {
                                  label: "Ver movimientos",
                                  icon: <ClipboardList className="h-4 w-4" />,
                                  onSelect: () => goToMovements(row),
                                },
                                {
                                  label: "Ajustar stock",
                                  icon: <PackageCheck className="h-4 w-4" />,
                                  onSelect: () => goToAdjustment(row),
                                },
                                {
                                  label: "Transferir",
                                  icon: <ArrowRightLeft className="h-4 w-4" />,
                                  onSelect: () => goToTransfer(row),
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]">
                          {items.length === 0
                            ? "No hay inventario disponible para la ubicación actual."
                            : "No se encontraron registros con los filtros actuales."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
            </OpsTableWrap>

            <OpsTableFooter>
              <span className="text-sm text-[var(--ops-text-muted)]">
                {filteredRows.length
                  ? `${visibleFrom}-${visibleTo} de ${filteredRows.length}`
                  : "0 resultados"}
              </span>
              <Pagination
                page={safePage}
                totalPages={totalPages}
                onPageChange={setPage}
                className="self-end md:self-auto"
              />
            </OpsTableFooter>
            </OpsTableBlock>
          </OpsSectionDivider>
      </OpsPageShell>
    </TooltipProvider>
  );
}
