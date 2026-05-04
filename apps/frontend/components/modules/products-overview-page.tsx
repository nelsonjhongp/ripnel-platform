"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  CircleAlert,
  Eye,
  LoaderCircle,
  PencilLine,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Shapes,
} from "lucide-react";
import { ApiEnvelope, apiFetch, unwrapApiData } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/components/auth/AuthProvider";

type ProductStatus =
  | "inactive"
  | "draft"
  | "pending_variants"
  | "pending_prices"
  | "ready_no_stock"
  | "ready";

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
    className: "bg-slate-200 text-slate-700",
  },
  draft: {
    label: "Borrador",
    className: "bg-slate-900 text-white",
  },
  pending_variants: {
    label: "Faltan variantes",
    className: "bg-amber-100 text-amber-800",
  },
  pending_prices: {
    label: "Faltan precios",
    className: "bg-rose-100 text-rose-700",
  },
  ready_no_stock: {
    label: "Sin stock",
    className: "bg-sky-100 text-sky-700",
  },
  ready: {
    label: "Listo",
    className: "bg-emerald-100 text-emerald-700",
  },
};

const PAGE_SIZE = 10;

function getVisibleSizeStock(sizeStock: ProductSizeStock[]) {
  return sizeStock.slice(0, 4);
}

function buildStyleHref(path: string, styleId: string) {
  return `${path}?style_id=${encodeURIComponent(styleId)}`;
}

function ActionIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="ops-surface inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border text-[var(--ops-text-muted)] transition hover:border-[color:var(--ripnel-accent)] hover:text-[var(--ops-text)]"
    >
      {children}
    </Link>
  );
}

function formatExtraSizes(extraSizes: ProductSizeStock[]) {
  return extraSizes.map((size) => `${size.size_code}: ${size.qty}`).join(" · ");
}

export function ProductsOverviewPage() {
  const { defaultLocation, locationAssignments, locationsLoading } = useAuth();
  const [response, setResponse] = useState<ProductsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [page, setPage] = useState(1);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const deferredSearch = useDeferredValue(search.trim());

  useEffect(() => {
    if (!locationAssignments.length) {
      return;
    }

    const hasCurrentSelection = locationAssignments.some(
      (assignment) => assignment.location_id === selectedLocationId
    );

    if (hasCurrentSelection) {
      return;
    }

    const nextLocationId =
      defaultLocation?.location_id || locationAssignments[0]?.location_id || "";

    if (nextLocationId) {
      setSelectedLocationId(nextLocationId);
    }
  }, [defaultLocation?.location_id, locationAssignments, selectedLocationId]);

  const loadProducts = useCallback(async () => {
    if (!selectedLocationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
        filter_mode: filterMode,
        location_id: selectedLocationId,
      });

      if (deferredSearch) {
        params.set("q", deferredSearch);
      }

      const apiResponse = await apiFetch<ApiEnvelope<ProductsResponse> | ProductsResponse>(
        `/api/products?${params.toString()}`
      );
      const payload = unwrapApiData(apiResponse);

      setResponse(payload);
      if (payload.pagination?.page && payload.pagination.page !== page) {
        setPage(payload.pagination.page);
      }

      if (!selectedLocationId && payload.active_location?.location_id) {
        setSelectedLocationId(payload.active_location.location_id);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar el resumen de productos"
      );
    } finally {
      setLoading(false);
    }
  }, [deferredSearch, filterMode, page, selectedLocationId]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const products = useMemo(() => response?.items ?? [], [response?.items]);
  const totalItems = response?.pagination.total_items || 0;
  const totalPages = response?.pagination.total_pages || 1;
  const visibleFrom = totalItems ? (page - 1) * PAGE_SIZE + 1 : 0;
  const visibleTo = totalItems ? visibleFrom + products.length - 1 : 0;

  return (
    <section className="ops-page min-h-screen p-4 md:p-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--ripnel-accent-hover)]">
              Productos
            </p>
            <h1 className="ops-title mt-1 text-2xl font-semibold">
              Maestro de producto
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="accent" size="sm" className="rounded-lg">
              <Link href="/productos/nuevo">
                <Plus className="h-4 w-4" />
                Nuevo
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={loadProducts}
              disabled={loading || !selectedLocationId}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Actualizar
            </Button>
          </div>
        </header>

        <div className="space-y-3 border-t border-[color:var(--ops-border-soft)] pt-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_180px_220px] xl:items-end">
                <label className="relative w-full">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ops-text-muted)]" />
                  <Input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Buscar por codigo, nombre o tipo"
                    className="ops-surface h-10 rounded-lg border pl-9"
                  />
                </label>

                <div>
                  <label htmlFor="filter-mode" className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                    Filtro
                  </label>
                  <select
                    id="filter-mode"
                    value={filterMode}
                    onChange={(event) => {
                      setFilterMode(event.target.value as FilterMode);
                      setPage(1);
                    }}
                    className="ops-surface h-10 w-full cursor-pointer rounded-lg border px-3 text-sm outline-none bg-[var(--ops-surface)]"
                  >
                    <option value="all">Todos</option>
                    <option value="attention">Por completar</option>
                    <option value="ready">Listos</option>
                    <option value="inactive">Inactivos</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="location-select" className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                    Sede activa
                  </label>
                  <select
                    id="location-select"
                    value={selectedLocationId}
                    onChange={(event) => {
                      setSelectedLocationId(event.target.value);
                      setPage(1);
                    }}
                    disabled={locationsLoading || !locationAssignments.length}
                    className="ops-surface h-10 w-full cursor-pointer rounded-lg border px-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-70 bg-[var(--ops-surface)]"
                  >
                    {!locationAssignments.length ? (
                      <option value="">Sin sedes asignadas</option>
                    ) : null}
                    {locationAssignments.map((assignment) => (
                      <option key={assignment.location_id} value={assignment.location_id}>
                        {assignment.location.name}
                        {assignment.is_default ? " · Predeterminada" : ""}
                      </option>
                    ))}
                  </select>
                </div>
          </div>

          {error ? (
            <div role="alert" aria-live="polite" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="ops-text-muted flex min-h-40 items-center justify-center">
              <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
              Cargando productos...
            </div>
          ) : !selectedLocationId && !locationAssignments.length ? (
              <div className="ops-empty-state-compact mt-4 rounded-lg p-8 text-center">
              <h3 className="ops-title text-lg font-semibold">No hay sede operativa</h3>
              <p className="ops-text-muted mt-2 text-sm leading-6">
                Asigna al menos una sede al usuario para ver stock por talla.
              </p>
            </div>
          ) : products.length ? (
            <div className="overflow-hidden rounded-lg border border-[color:var(--ops-border-soft)]">
              <div className="hidden grid-cols-[minmax(0,2fr)_0.95fr_1.8fr_0.8fr_0.8fr_1fr_112px] gap-3 bg-[var(--ops-surface-muted)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)] lg:grid">
                <div>Producto</div>
                <div>Codigo</div>
                <div>Tallas</div>
                <div>Colores</div>
                <div>Stock</div>
                <div>Estado</div>
                <div className="text-right">Acciones</div>
              </div>

              <div className="divide-y divide-[color:var(--ops-border-soft)]">
                {products.map((product) => {
                  const statusMeta = STATUS_META[product.status];
                  const visibleSizeStock = getVisibleSizeStock(product.size_stock || []);
                  const extraSizes = (product.size_stock || []).slice(visibleSizeStock.length);

                  return (
                    <article
                      key={product.style_id}
                      className="px-4 py-2.5 transition hover:bg-[var(--ops-surface-muted)]"
                    >
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_0.95fr_1.8fr_0.8fr_0.8fr_1fr_112px] lg:items-center">
                        <div className="min-w-0">
                          <h3 className="ops-title truncate text-sm font-semibold">
                            {product.name}
                          </h3>

                          <div className="ops-text-muted mt-1 flex flex-wrap gap-2 text-[11px] lg:hidden">
                            <span>{product.garment_type_name}</span>
                            {product.configured_color_count > 0 ? (
                              <span>{product.configured_color_count} colores</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm lg:block">
                          <div className="ops-text-muted text-[11px] font-semibold uppercase tracking-[0.18em] lg:hidden">
                            Codigo
                          </div>
                          <p className="font-semibold text-[var(--ops-text)]">
                            {product.style_code || "-"}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm lg:block">
                          <div className="ops-text-muted text-[11px] font-semibold uppercase tracking-[0.18em] lg:hidden">
                            Tallas
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {visibleSizeStock.length ? (
                              <>
                                {visibleSizeStock.map((size) => (
                                  <span
                                    key={`${product.style_id}-${size.size_id}`}
                                    className="ops-metric-pill rounded-full px-2 py-0.5 text-[11px] font-semibold"
                                  >
                                    {size.size_code}: {size.qty}
                                  </span>
                                ))}
                                {extraSizes.length > 0 ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="ops-metric-pill cursor-help rounded-full px-2 py-0.5 text-[11px] font-semibold">
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
                              <span className="ops-text-muted text-sm">Sin tallas configuradas</span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm lg:block">
                          <div className="ops-text-muted text-[11px] font-semibold uppercase tracking-[0.18em] lg:hidden">
                            Colores
                          </div>
                          <p className="ops-title font-semibold">
                            {product.configured_color_count}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm lg:block">
                          <div className="ops-text-muted text-[11px] font-semibold uppercase tracking-[0.18em] lg:hidden">
                            Stock
                          </div>
                          <p className="ops-title font-semibold">{product.total_stock_qty}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm lg:block">
                          <div className="ops-text-muted text-[11px] font-semibold uppercase tracking-[0.18em] lg:hidden">
                            Estado
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                statusMeta.className
                              )}
                            >
                              {statusMeta.label}
                            </span>
                            {product.missing_wholesale_size_count > 0 ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                                May.
                              </span>
                            ) : null}
                            {product.warnings.stock_without_retail_price ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                                <CircleAlert className="h-3 w-3" />
                                Stock sin retail
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-1">
                          <ActionIcon
                            href={buildStyleHref("/productos/estilos", product.style_id)}
                            label="Editar style"
                          >
                            <PencilLine className="h-4 w-4" />
                          </ActionIcon>
                          <ActionIcon
                            href={buildStyleHref("/productos/variantes", product.style_id)}
                            label="Variantes"
                          >
                            <Shapes className="h-4 w-4" />
                          </ActionIcon>
                          <ActionIcon
                            href={buildStyleHref("/precios/crear-y-editar-precio", product.style_id)}
                            label="Precios"
                          >
                            <ReceiptText className="h-4 w-4" />
                          </ActionIcon>
                          <ActionIcon
                            href={buildStyleHref("/precios/listado-de-precios", product.style_id)}
                            label="Historial"
                          >
                            <Eye className="h-4 w-4" />
                          </ActionIcon>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="ops-empty-state-compact mt-4 rounded-lg p-8 text-center">
              <h3 className="ops-title text-lg font-semibold">
                {totalItems ? "No hay styles para este filtro" : "No hay productos en esta sede"}
              </h3>
              <p className="ops-text-muted mt-2 text-sm leading-6">
                {totalItems
                  ? "Prueba otra busqueda, sede o filtro."
                  : "La sede activa no tiene productos para los criterios seleccionados."}
              </p>
            </div>
          )}

          {!loading && totalItems ? (
            <div className="flex flex-col gap-3 pt-1 md:flex-row md:items-center md:justify-between">
              <span className="ops-secondary-text text-[var(--ops-text-muted)]">
                {visibleFrom}-{visibleTo} de {totalItems}
              </span>
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                className="self-end md:self-auto"
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
