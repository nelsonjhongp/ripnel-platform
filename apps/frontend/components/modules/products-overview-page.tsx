"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CircleAlert,
  Eye,
  Info,
  LoaderCircle,
  PencilLine,
  ReceiptText,
  RefreshCw,
  Search,
  Shapes,
} from "lucide-react";
import { buildApiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ProductStatus =
  | "inactive"
  | "draft"
  | "pending_variants"
  | "pending_prices"
  | "ready_no_stock"
  | "ready";

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

function getVisibleSizeCodes(sizeCodes: string[]) {
  return sizeCodes.slice(0, 4);
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

function InfoHint({
  content,
  label,
}: {
  content: string;
  label: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-[var(--ops-text-muted)] transition hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)]"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8} className="max-w-72 text-left leading-5">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ProductsOverviewPage() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  async function loadProducts() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl("/api/products"), {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "No se pudo cargar el resumen de productos");
      }

      setProducts(payload.data || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar el resumen de productos"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const metrics = useMemo(() => {
    const readyCount = products.filter((product) => product.status === "ready").length;
    const attentionCount = products.filter(
      (product) =>
        product.status === "draft" ||
        product.status === "pending_variants" ||
        product.status === "pending_prices" ||
        product.warnings.stock_without_retail_price
    ).length;
    const noStockCount = products.filter(
      (product) => product.status === "ready_no_stock"
    ).length;
    const inactiveCount = products.filter(
      (product) => product.status === "inactive"
    ).length;

    return {
      readyCount,
      attentionCount,
      noStockCount,
      inactiveCount,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter((product) => {
      if (filterMode === "attention") {
        const requiresAttention =
          product.status === "draft" ||
          product.status === "pending_variants" ||
          product.status === "pending_prices" ||
          product.warnings.stock_without_retail_price;

        if (!requiresAttention) {
          return false;
        }
      }

      if (filterMode === "ready") {
        if (product.status !== "ready" && product.status !== "ready_no_stock") {
          return false;
        }
      }

      if (filterMode === "inactive" && product.status !== "inactive") {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        product.name,
        product.style_code,
        product.garment_type_name,
        product.fabric_name,
        product.target_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [filterMode, products, search]);

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

          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={loadProducts}>
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </header>

        <div className="flex flex-wrap gap-2 border-t border-[color:var(--ops-border-soft)] pt-4">
          <span className="ops-metric-pill inline-flex rounded-full px-3 py-1 text-xs font-semibold">
            {products.length} styles
          </span>
          <span className="ops-metric-pill inline-flex rounded-full px-3 py-1 text-xs font-semibold">
            {metrics.readyCount} listos
          </span>
          <span className="ops-metric-pill inline-flex rounded-full px-3 py-1 text-xs font-semibold">
            {metrics.attentionCount} por completar
          </span>
          <span className="ops-metric-pill inline-flex rounded-full px-3 py-1 text-xs font-semibold">
            {metrics.noStockCount} sin stock
          </span>
        </div>

        <article className="ops-surface rounded-3xl border p-4 md:p-5">
          <div className="flex flex-col gap-3 border-b border-[color:var(--ops-border-soft)] pb-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="ops-text-muted text-[11px] font-semibold uppercase tracking-[0.18em]">
                Vista general
              </p>
              <div className="mt-1 flex items-center gap-2">
                <h2 className="ops-title text-lg font-semibold">
                  Seguimiento del flujo
                </h2>
                <InfoHint
                  label="Informacion sobre productos y variantes"
                  content="El nombre visible sale del producto creado en Estilos. Variantes significa combinaciones de talla y color generadas para ese producto, pero ese detalle no se muestra como columna aqui."
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 lg:items-end">
              <label className="relative w-full min-w-[260px] max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ops-text-muted)]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por codigo, nombre o tipo"
                  className="ops-surface h-10 rounded-2xl border pl-9"
                />
              </label>

              <div className="flex items-center gap-2 text-sm">
                <span className="ops-text-muted text-xs font-medium uppercase tracking-[0.18em]">
                  Filtro
                </span>
                <select
                  value={filterMode}
                  onChange={(event) => setFilterMode(event.target.value as FilterMode)}
                  className="ops-surface h-10 cursor-pointer rounded-2xl border px-3 text-sm outline-none"
                >
                  <option value="all">Todos</option>
                  <option value="attention">Por completar</option>
                  <option value="ready">Listos</option>
                  <option value="inactive">Inactivos</option>
                </select>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="ops-text-muted flex min-h-40 items-center justify-center">
              <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
              Cargando productos...
            </div>
          ) : filteredProducts.length ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-[color:var(--ops-border-soft)]">
              <div className="hidden grid-cols-[minmax(0,2fr)_0.95fr_1.5fr_0.8fr_0.8fr_1fr_112px] gap-3 bg-[var(--ops-surface-muted)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)] lg:grid">
                <div>Producto</div>
                <div>Codigo</div>
                <div>Tallas</div>
                <div>Colores</div>
                <div>Stock</div>
                <div>Estado</div>
                <div className="text-right">Acciones</div>
              </div>

              <div className="divide-y divide-[color:var(--ops-border-soft)]">
                {filteredProducts.map((product) => {
                  const statusMeta = STATUS_META[product.status];
                  const visibleSizeCodes = getVisibleSizeCodes(product.size_codes || []);
                  const extraSizesCount = Math.max(
                    0,
                    (product.size_codes || []).length - visibleSizeCodes.length
                  );

                  return (
                    <article
                      key={product.style_id}
                      className="px-4 py-2.5 transition hover:bg-[var(--ops-surface-muted)]"
                    >
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_0.95fr_1.5fr_0.8fr_0.8fr_1fr_112px] lg:items-center">
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
                          <div className="ops-text-muted lg:hidden text-[11px] font-semibold uppercase tracking-[0.18em]">
                            Codigo
                          </div>
                          <p className="font-semibold text-[var(--ops-text)]">
                            {product.style_code || "-"}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm lg:block lg:text-sm">
                          <div className="ops-text-muted lg:hidden text-[11px] font-semibold uppercase tracking-[0.18em]">
                            Tallas
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {visibleSizeCodes.length ? (
                              <>
                                {visibleSizeCodes.map((sizeCode) => (
                                  <span
                                    key={`${product.style_id}-${sizeCode}`}
                                    className="ops-metric-pill rounded-full px-2 py-0.5 text-[11px] font-semibold"
                                  >
                                    {sizeCode}
                                  </span>
                                ))}
                                {extraSizesCount > 0 ? (
                                  <span className="ops-metric-pill rounded-full px-2 py-0.5 text-[11px] font-semibold">
                                    +{extraSizesCount}
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              <span className="ops-title text-sm font-semibold">
                                {product.configured_size_count}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm lg:block">
                          <div className="ops-text-muted lg:hidden text-[11px] font-semibold uppercase tracking-[0.18em]">
                            Colores
                          </div>
                          <p className="ops-title font-semibold">
                            {product.configured_color_count}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm lg:block">
                          <div className="ops-text-muted lg:hidden text-[11px] font-semibold uppercase tracking-[0.18em]">
                            Stock
                          </div>
                          <p className="ops-title font-semibold">{product.total_stock_qty}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm lg:block">
                          <div className="ops-text-muted lg:hidden text-[11px] font-semibold uppercase tracking-[0.18em]">
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
            <div className="ops-empty-state-compact mt-4 rounded-[24px] p-8 text-center">
              <h3 className="ops-title text-lg font-semibold">
                {products.length ? "No hay styles para este filtro" : "Aun no hay styles"}
              </h3>
              <p className="ops-text-muted mt-2 text-sm leading-6">
                {products.length
                  ? "Prueba otra busqueda o cambia el filtro."
                  : "Primero registra un style base y luego completa variantes y precios."}
              </p>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
