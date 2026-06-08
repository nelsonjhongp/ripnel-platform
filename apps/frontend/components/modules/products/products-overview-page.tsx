"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { usePagination } from "@/hooks/use-pagination";
import {
  CircleAlert,
  Eye,
  PencilLine,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Shapes,
} from "lucide-react";
import { AdminRowActionsMenu } from "@/components/admin/admin-ui";
import { ApiEnvelope, apiFetch, unwrapApiData } from "@/lib/api";
import { cn } from "@/lib/utils";
import { OpsMetricPill } from "@/components/ui/ops-metric-pill";
import {
  OpsFiltersRow,
  OpsPageShell,
  OpsSearchField,
  OpsSectionDivider,
} from "@/components/ui/ops-page-shell";
import { OpsDataTable } from "@/components/ui/ops-data-table";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Button } from "@/components/ui/button";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { Pagination } from "@/components/ui/pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/components/auth/AuthProvider";
import type { ProductStatus } from "@/types/products";
import { OpsStatusBadge } from "@/components/ui/ops-status-badge";

type ProductSizeStock = {
  size_id: string;
  size_code: string;
  qty: number;
};

type ProductSummary = {
  style_id: string;
  style_code: string | null;
  name: string;
  description: string | null;
  active: boolean;
  garment_type_name: string;
  fabric_name: string | null;
  target_name: string | null;
  configured_size_count: number;
  size_codes: string[];
  size_stock: ProductSizeStock[];
  configured_color_count: number;
  expected_variant_count: number;
  variant_count: number;
  active_variant_count: number;
  total_stock_qty: number;
  retail_sizes_covered_count: number;
  wholesale_sizes_covered_count: number;
  missing_retail_size_count: number;
  missing_wholesale_size_count: number;
  sizes_with_stock_without_retail_count: number;
  status: ProductStatus;
  warnings: {
    missing_wholesale_prices: boolean;
    stock_without_retail_price: boolean;
  };
};

type FilterMode = "all" | "attention" | "ready" | "inactive";

type ActiveLocation = {
  location_id: string;
  name: string;
  code: string | null;
  type: string;
  address: string | null;
  active: boolean;
};

type ProductsResponse = {
  items: ProductSummary[];
  active_location: ActiveLocation | null;
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
};

const STATUS_META: Record<ProductStatus, { label: string; className: string }> = {
  inactive: {
    label: "Inactivo",
    className:
      "border-[color:color-mix(in_srgb,#94a3b8_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#94a3b8_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#475569_74%,var(--ops-text))]",
  },
  draft: {
    label: "Borrador",
    className:
      "border-[color:color-mix(in_srgb,#334155_60%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#1e293b_90%,var(--ops-surface))] text-[color:color-mix(in_srgb,#f1f5f9_94%,var(--ops-text))]",
  },
  pending_variants: {
    label: "Faltan variantes",
    className:
      "border-[color:color-mix(in_srgb,#f59e0b_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#d97706_74%,var(--ops-text))]",
  },
  pending_prices: {
    label: "Faltan precios",
    className:
      "border-[color:color-mix(in_srgb,#f43f5e_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f43f5e_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#e11d48_74%,var(--ops-text))]",
  },
  ready_no_stock: {
    label: "Sin stock",
    className:
      "border-[color:color-mix(in_srgb,#3b82f6_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#3b82f6_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#2563eb_74%,var(--ops-text))]",
  },
  ready: {
    label: "Listo",
    className:
      "border-[color:color-mix(in_srgb,#10b981_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_74%,var(--ops-text))]",
  },
};

const PAGE_SIZE = 10;

function getVisibleSizeStock(sizeStock: ProductSizeStock[]) {
  return sizeStock.slice(0, 4);
}

function buildStyleHref(path: string, styleId: string) {
  return `${path}?style_id=${encodeURIComponent(styleId)}`;
}

function formatExtraSizes(extraSizes: ProductSizeStock[]) {
  return extraSizes.map((size) => `${size.size_code}: ${size.qty}`).join(" · ");
}

export function ProductsOverviewPage() {
  const router = useRouter();
  const { defaultLocation, locationAssignments } = useAuth();
  const [response, setResponse] = useState<ProductsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const effectiveLocationId = useMemo(() => {
    if (
      selectedLocationId &&
      locationAssignments.some((assignment) => assignment.location_id === selectedLocationId)
    ) {
      return selectedLocationId;
    }

    return defaultLocation?.location_id || locationAssignments[0]?.location_id || "";
  }, [defaultLocation?.location_id, locationAssignments, selectedLocationId]);

  const products = useMemo(() => response?.items ?? [], [response?.items]);
  const totalItems = response?.pagination.total_items || 0;
  const totalPages = response?.pagination.total_pages || 1;

  const paginationSource = useMemo(
    () => Array.from({ length: totalItems }),
    [totalItems]
  );

  const {
    page: safePage,
    firstVisible,
    setPage,
  } = usePagination(paginationSource, PAGE_SIZE);

  const visibleTo = totalItems ? firstVisible + products.length - 1 : 0;

  const loadProducts = useCallback(async () => {
    if (!effectiveLocationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(safePage),
        page_size: String(PAGE_SIZE),
        filter_mode: filterMode,
        location_id: effectiveLocationId,
      });

      if (deferredSearch) {
        params.set("q", deferredSearch);
      }

      const apiResponse = await apiFetch<ApiEnvelope<ProductsResponse> | ProductsResponse>(
        `/api/products?${params.toString()}`
      );
      const payload = unwrapApiData(apiResponse);

      setResponse(payload);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar el resumen de productos"
      );
    } finally {
      setLoading(false);
    }
  }, [deferredSearch, effectiveLocationId, filterMode, safePage]);

  useEffect(() => {
    void Promise.resolve().then(loadProducts);
  }, [loadProducts]);

  const readyCount = useMemo(
    () => products.filter((p) => p.status === "ready").length,
    [products]
  );
  const pendingCount = useMemo(
    () =>
      products.filter(
        (p) =>
          p.status === "draft" ||
          p.status === "pending_variants" ||
          p.status === "pending_prices" ||
          p.status === "ready_no_stock"
      ).length,
    [products]
  );

  const hasActiveFilters = deferredSearch !== "" || filterMode !== "all";

  return (
    <TooltipProvider delayDuration={120}>
      <OpsPageShell width="wide">
          <PosHeader
            eyebrow="Productos"
            title="Maestro de producto"
            actions={
              <>
                <Button asChild variant="accent" size="sm" className="rounded-lg px-3">
                  <Link href="/productos/nuevo">
                    <Plus className="h-4 w-4" />
                    Nuevo
                  </Link>
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="rounded-lg"
                      onClick={loadProducts}
                      disabled={loading || !effectiveLocationId}
                      aria-label="Actualizar"
                    >
                      <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8}>Actualizar</TooltipContent>
                </Tooltip>
              </>
            }
          />

          <div className="flex flex-wrap items-center gap-2">
            <OpsMetricPill label="Total styles" value={totalItems} />
            <OpsMetricPill label="Listos" value={readyCount} tone="success" />
            <OpsMetricPill label="Pendientes" value={pendingCount} tone="warning" />
          </div>

          <OpsSectionDivider className="space-y-4">
            <OpsFiltersRow>
              <OpsSearchField
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder="Buscar por nombre, SKU o tipo de prenda"
                ariaLabel="Buscar productos"
              />

              <FilterDropdown
                label="Filtro"
                value={filterMode}
                options={[
                  { value: "all", label: "Todos" },
                  { value: "attention", label: "Por completar" },
                  { value: "ready", label: "Listos" },
                  { value: "inactive", label: "Inactivos" },
                ]}
                onChange={(v) => {
                  setFilterMode(v as FilterMode);
                  setPage(1);
                }}
              />

              <FilterDropdown
                label="Sede activa"
                value={effectiveLocationId}
                options={locationAssignments.map((assignment) => ({
                  value: assignment.location_id,
                  label: `${assignment.location.name}${assignment.is_default ? " · Predeterminada" : ""}`,
                }))}
                onChange={(v) => {
                  setSelectedLocationId(v);
                  setPage(1);
                }}
              />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setFilterMode("all");
                      setPage(1);
                    }}
                    disabled={!hasActiveFilters}
                    variant="outline"
                    size="icon-sm"
                    className="h-10 w-10 rounded-lg"
                    aria-label="Limpiar filtros"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  Limpiar filtros
                </TooltipContent>
              </Tooltip>
            </OpsFiltersRow>

            {!effectiveLocationId && !locationAssignments.length ? (
              <div className="mt-4 rounded-lg p-8 text-center">
                <h3 className="text-lg font-semibold text-[var(--ops-text)]">No hay sede operativa</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--ops-text-muted)]">
                  Asigna al menos una sede al usuario para ver stock por talla.
                </p>
              </div>
            ) : (
              <OpsDataTable
                columns={[
                  { key: "producto", header: "Producto" },
                  { key: "sku", header: "SKU" },
                  { key: "tipo", header: "Tipo" },
                  { key: "tallas", header: "Tallas" },
                  { key: "stock", header: "Stock" },
                  { key: "estado", header: "Estado" },
                  { key: "acciones", header: "", className: "text-right" },
                ]}
                minWidth="1080px"
                loading={loading}
                loadingMessage="Cargando productos..."
                error={!loading ? error : null}
                errorTitle="No pudimos cargar productos"
                isEmpty={!loading && !error && products.length === 0}
                emptyMessage={
                  totalItems
                    ? "No hay styles para este filtro. Prueba otra busqueda, sede o filtro."
                    : "La sede activa no tiene productos para los criterios seleccionados."
                }
                footer={
                  !loading && totalItems > 0 ? (
                    <>
                      <span className="text-[var(--ops-text-muted)]">
                        {firstVisible}-{visibleTo} de {totalItems}
                      </span>
                      <Pagination
                        page={safePage}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        className="self-end md:self-auto"
                      />
                    </>
                  ) : undefined
                }
              >
                {products.map((product) => {
                  const statusMeta = STATUS_META[product.status];
                  const visibleSizeStock = getVisibleSizeStock(product.size_stock || []);
                  const extraSizes = (product.size_stock || []).slice(visibleSizeStock.length);

                  return (
                    <tr
                      key={product.style_id}
                      className="transition hover:bg-[var(--ops-surface-muted)]"
                    >
                      <td className="px-4 py-[var(--ops-row-py)]">
                        <p className="text-sm font-semibold text-[var(--ops-text)]">{product.name}</p>
                        <p className="mt-1 text-[11px] text-[var(--ops-text-muted)]">{product.garment_type_name}</p>
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)]">
                        <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">{product.style_code || "—"}</span>
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)]">
                        <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">{product.fabric_name || "—"}</span>
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)]">
                        <div className="flex flex-wrap gap-1">
                          {visibleSizeStock.length ? (
                            <>
                              {visibleSizeStock.map((size) => (
                                <span
                                  key={`${product.style_id}-${size.size_id}`}
                                  className="inline-flex rounded-full border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] px-2.5 py-1 text-[11px] font-semibold text-[var(--ops-text)]"
                                >
                                  {size.size_code}: {size.qty}
                                </span>
                              ))}
                              {extraSizes.length > 0 ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex cursor-help rounded-full border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] px-2.5 py-1 text-[11px] font-semibold text-[var(--ops-text-muted)]">
                                        +{extraSizes.length}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      sideOffset={8}
                                      className="max-w-64 text-left"
                                    >
                                      {formatExtraSizes(extraSizes)}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-sm text-[var(--ops-text-muted)]">Sin tallas</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)]">
                        <p className="text-sm font-semibold">{product.total_stock_qty}</p>
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                              statusMeta.className
                            )}
                          >
                            {statusMeta.label}
                          </span>
                          {product.missing_wholesale_size_count > 0 ? (
                            <span className="inline-flex rounded-full border border-[color:color-mix(in_srgb,#f59e0b_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] px-2.5 py-1 text-[11px] font-semibold text-[color:color-mix(in_srgb,#d97706_74%,var(--ops-text))]">
                              May.
                            </span>
                          ) : null}
                          {product.warnings.stock_without_retail_price ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[color:color-mix(in_srgb,#f43f5e_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f43f5e_14%,var(--ops-surface))] px-2.5 py-1 text-[11px] font-semibold text-[color:color-mix(in_srgb,#e11d48_74%,var(--ops-text))]">
                              <CircleAlert className="h-3 w-3" />
                              Stock sin retail
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-[var(--ops-row-py)]">
                        <AdminRowActionsMenu
                          ariaLabel={`Acciones para ${product.name}`}
                          items={[
                            {
                              label: "Editar style",
                              icon: <PencilLine className="h-4 w-4" />,
                              onSelect: () =>
                                router.push(buildStyleHref("/productos/estilos", product.style_id)),
                            },
                            {
                              label: "Variantes",
                              icon: <Shapes className="h-4 w-4" />,
                              onSelect: () =>
                                router.push(buildStyleHref("/productos/variantes", product.style_id)),
                            },
                            {
                              label: "Precios",
                              icon: <ReceiptText className="h-4 w-4" />,
                              onSelect: () =>
                                router.push(
                                  buildStyleHref("/precios/crear", product.style_id)
                                ),
                            },
                            {
                              label: "Historial",
                              icon: <Eye className="h-4 w-4" />,
                              onSelect: () =>
                                router.push(
                                  buildStyleHref("/precios", product.style_id)
                                ),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </OpsDataTable>
            )}
      </OpsSectionDivider>
      </OpsPageShell>
    </TooltipProvider>
  );
}
