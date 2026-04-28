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
      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
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
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
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
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f8fafc_28%,#ffffff_68%,#eef2ff_100%)] p-4 md:p-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <header className="rounded-[28px] border border-slate-200 bg-white/95 px-5 py-4 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] backdrop-blur md:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-500">
                Productos
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-950">
                Resumen de productos
              </h1>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                <span>
                  <span className="font-semibold text-slate-700">{products.length}</span> styles
                </span>
                <span>
                  <span className="font-semibold text-emerald-700">{metrics.readyCount}</span> listos
                </span>
                <span>
                  <span className="font-semibold text-amber-700">{metrics.attentionCount}</span> por completar
                </span>
                <span>
                  <span className="font-semibold text-sky-700">{metrics.noStockCount}</span> sin stock
                </span>
                <span>
                  <span className="font-semibold text-slate-700">{metrics.inactiveCount}</span> inactivos
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={loadProducts}
              className="inline-flex items-center gap-2 self-start rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <RefreshCw className="h-4 w-4" />
              Recargar
            </button>
          </div>
        </header>

        <article className="rounded-[28px] border border-slate-200 bg-white/95 px-5 py-4 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] backdrop-blur md:px-6">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Vista operativa
              </p>
              <div className="mt-1 flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-950">
                  Seguimiento de productos
                </h2>
                <InfoHint
                  label="Informacion sobre productos y variantes"
                  content="El nombre visible sale del producto creado en Estilos. Variantes significa combinaciones de talla y color generadas para ese producto, pero ese detalle no se muestra como columna aqui."
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 lg:items-end">
              <label className="relative w-full min-w-[260px] max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por codigo, nombre o tipo"
                  className="w-full rounded-2xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-violet-400"
                />
              </label>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  Filtro
                </span>
                <select
                  value={filterMode}
                  onChange={(event) => setFilterMode(event.target.value as FilterMode)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none transition focus:border-violet-400"
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
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="flex min-h-40 items-center justify-center text-slate-500">
              <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
              Cargando productos...
            </div>
          ) : filteredProducts.length ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
              <div className="hidden grid-cols-[minmax(0,2fr)_0.95fr_1.5fr_0.8fr_0.8fr_1fr_112px] gap-3 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 lg:grid">
                <div>Producto</div>
                <div>Codigo</div>
                <div>Tallas</div>
                <div>Colores</div>
                <div>Stock</div>
                <div>Estado</div>
                <div className="text-right">Acciones</div>
              </div>

              <div className="divide-y divide-slate-200">
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
                      className="bg-white px-4 py-2.5 transition hover:bg-slate-50/80"
                    >
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_0.95fr_1.5fr_0.8fr_0.8fr_1fr_112px] lg:items-center">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-slate-950">
                            {product.name}
                          </h3>

                          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500 lg:hidden">
                            <span>{product.garment_type_name}</span>
                            {product.configured_color_count > 0 ? (
                              <span>{product.configured_color_count} colores</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm lg:block">
                          <div className="lg:hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Codigo
                          </div>
                          <p className="font-semibold text-slate-700">
                            {product.style_code || "-"}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm lg:block lg:text-sm">
                          <div className="lg:hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Tallas
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {visibleSizeCodes.length ? (
                              <>
                                {visibleSizeCodes.map((sizeCode) => (
                                  <span
                                    key={`${product.style_id}-${sizeCode}`}
                                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                                  >
                                    {sizeCode}
                                  </span>
                                ))}
                                {extraSizesCount > 0 ? (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                    +{extraSizesCount}
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              <span className="text-sm font-semibold text-slate-900">
                                {product.configured_size_count}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm lg:block">
                          <div className="lg:hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Colores
                          </div>
                          <p className="font-semibold text-slate-900">
                            {product.configured_color_count}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm lg:block">
                          <div className="lg:hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Stock
                          </div>
                          <p className="font-semibold text-slate-900">{product.total_stock_qty}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm lg:block">
                          <div className="lg:hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
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
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                May.
                              </span>
                            ) : null}
                            {product.warnings.stock_without_retail_price ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
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
            <div className="mt-4 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <h3 className="text-lg font-semibold text-slate-950">
                {products.length ? "No hay styles para este filtro" : "Aun no hay styles"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
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
