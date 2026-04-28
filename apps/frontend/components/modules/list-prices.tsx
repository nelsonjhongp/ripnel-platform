"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Info,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { buildApiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type PriceMode = "list" | "editor" | "rules";
type PriceType = "retail" | "wholesale";
type ValidityStatus = "active" | "scheduled" | "expired" | "inactive";
type ProductStatus =
  | "inactive"
  | "draft"
  | "pending_variants"
  | "pending_prices"
  | "ready_no_stock"
  | "ready";

type PriceRow = {
  style_size_price_id: string;
  style_id: string;
  style_code: string;
  style_name: string;
  size_id: string;
  size_code: string;
  size_name: string;
  price_type: PriceType;
  price: number;
  start_date: string;
  end_date: string | null;
  active: boolean;
  validity_status: ValidityStatus;
};

type PricingRuleRow = {
  rule_id: string;
  rule_type: string;
  min_qty: number;
  active: boolean;
  valid_from: string | null;
  valid_to: string | null;
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
  configured_color_count: number;
  expected_variant_count: number;
  variant_count: number;
  retail_sizes_covered_count: number;
  wholesale_sizes_covered_count: number;
  missing_retail_size_count: number;
  missing_wholesale_size_count: number;
  total_stock_qty: number;
  status: ProductStatus;
  next_step_label: string;
  warnings: {
    missing_wholesale_prices: boolean;
    stock_without_retail_price: boolean;
  };
};

type WorkspaceSize = {
  size_id: string;
  code: string;
  name: string;
  sort_order: number;
  active: boolean;
  has_current_retail_price: boolean;
  has_current_wholesale_price: boolean;
  retail_price_count: number;
  wholesale_price_count: number;
  current_retail_price: number | null;
  current_wholesale_price: number | null;
  stock_qty: number;
  has_stock: boolean;
};

type ProductWorkspace = {
  product: ProductSummary;
  configured_sizes: WorkspaceSize[];
};

type PriceCoverageGap = {
  style_id: string;
  style_code: string;
  style_name: string;
  variant_count: number;
  inventory_row_count: number;
  price_row_count: number;
  configured_size_count: number;
  retail_sizes_covered_count: number;
  missing_retail_size_count: number;
  sizes_with_stock_without_retail_count: number;
  total_stock_qty: number;
  status: ProductStatus;
};

type GroupedStyleRow = {
  style_id: string;
  style_code: string;
  style_name: string;
  latestStartDate: string | null;
  rowsByType: Record<PriceType, PriceRow[]>;
};

type MetricCardTone = "neutral" | "warning" | "success";

const STATUS_META: Record<ProductStatus, { label: string; className: string }> = {
  inactive: { label: "Inactivo", className: "bg-slate-200 text-slate-700" },
  draft: { label: "Borrador", className: "bg-slate-900 text-white" },
  pending_variants: {
    label: "Faltan variantes",
    className: "bg-amber-100 text-amber-700",
  },
  pending_prices: {
    label: "Faltan precios",
    className: "bg-rose-100 text-rose-700",
  },
  ready_no_stock: {
    label: "Listo sin stock",
    className: "bg-sky-100 text-sky-700",
  },
  ready: { label: "Listo", className: "bg-emerald-100 text-emerald-700" },
};

function buildStyleHref(path: string, styleId: string) {
  return `${path}?style_id=${encodeURIComponent(styleId)}`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dateStr));
}

function formatCurrency(amount: number | null) {
  if (amount === null || amount === undefined) {
    return "-";
  }

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatPriceTypeLabel(priceType: PriceType) {
  return priceType === "retail" ? "Minorista" : "Mayorista";
}

function getValidityLabel(status: ValidityStatus | string) {
  if (status === "active") return "vigente";
  if (status === "scheduled") return "programado";
  if (status === "expired") return "vencido";
  if (status === "inactive") return "inactivo";
  return status;
}

function getTodayInputValue() {
  const current = new Date();
  const year = current.getFullYear();
  const month = String(current.getMonth() + 1).padStart(2, "0");
  const day = String(current.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function StatusBadge({ status }: { status: ValidityStatus | string }) {
  const className =
    status === "active"
      ? "bg-emerald-100 text-emerald-700"
      : status === "scheduled"
        ? "bg-amber-100 text-amber-700"
        : status === "expired"
          ? "bg-rose-100 text-rose-700"
          : "bg-slate-200 text-slate-600";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {getValidityLabel(status)}
    </span>
  );
}

function InfoHint({
  content,
  label = "Mas informacion",
}: {
  content: string;
  label?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent sideOffset={8} className="max-w-56 text-left leading-5">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function MetricCard({
  title,
  value,
  info,
  tone = "neutral",
}: {
  title: string;
  value: number;
  info: string;
  tone?: MetricCardTone;
}) {
  const toneClassName =
    tone === "warning"
      ? value > 0
        ? "border-amber-200 bg-amber-50"
        : "border-slate-200 bg-slate-50"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50"
        : "border-slate-200 bg-slate-50";

  const titleClassName =
    tone === "warning" && value > 0
      ? "text-amber-700"
      : tone === "success"
        ? "text-emerald-700"
        : "text-slate-500";

  return (
    <article className={`rounded-2xl border p-4 ${toneClassName}`}>
      <div className="flex items-center gap-2">
        <p className={`text-xs font-semibold uppercase tracking-wide ${titleClassName}`}>
          {title}
        </p>
        <InfoHint content={info} label={`Informacion sobre ${title}`} />
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </article>
  );
}

function usePriceCoverageGaps() {
  const [coverageGaps, setCoverageGaps] = useState<PriceCoverageGap[]>([]);
  const [coverageLoading, setCoverageLoading] = useState(true);

  useEffect(() => {
    fetch(buildApiUrl("/api/prices/coverage-gaps"), { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        setCoverageGaps(payload.data || []);
      })
      .catch(console.error)
      .finally(() => setCoverageLoading(false));
  }, []);

  return {
    coverageGaps,
    coverageLoading,
  };
}

function PriceCoverageBanner({
  coverageGaps,
  coverageLoading,
  filterStyleId,
}: {
  coverageGaps: PriceCoverageGap[];
  coverageLoading: boolean;
  filterStyleId?: string | null;
}) {
  const visibleCoverageGaps = useMemo(
    () =>
      filterStyleId
        ? coverageGaps.filter((gap) => gap.style_id === filterStyleId)
        : coverageGaps,
    [coverageGaps, filterStyleId]
  );

  if (coverageLoading || visibleCoverageGaps.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-800">
        Styles con cobertura retail incompleta
      </p>
      <p className="mt-1 text-sm text-amber-700">
        Revisa primero las tallas con stock o variantes ya creadas para evitar fallas al vender.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {visibleCoverageGaps.map((gap) => (
          <span
            key={gap.style_id}
            className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800"
          >
            {gap.style_code} · retail {gap.retail_sizes_covered_count}/
            {gap.configured_size_count}
            {gap.sizes_with_stock_without_retail_count > 0
              ? ` · ${gap.sizes_with_stock_without_retail_count} con stock`
              : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "No se pudo completar la solicitud");
  }

  return payload.data;
}

function groupPriceRows(rows: PriceRow[]) {
  const groupedMap = new Map<string, GroupedStyleRow>();

  rows.forEach((row) => {
    const group = groupedMap.get(row.style_id) || {
      style_id: row.style_id,
      style_code: row.style_code,
      style_name: row.style_name,
      latestStartDate: null,
      rowsByType: {
        retail: [],
        wholesale: [],
      },
    };

    group.rowsByType[row.price_type].push(row);

    if (!group.latestStartDate || row.start_date > group.latestStartDate) {
      group.latestStartDate = row.start_date;
    }

    groupedMap.set(row.style_id, group);
  });

  return Array.from(groupedMap.values())
    .map((group) => ({
      ...group,
      rowsByType: {
        retail: [...group.rowsByType.retail].sort((left, right) =>
          right.start_date.localeCompare(left.start_date)
        ),
        wholesale: [...group.rowsByType.wholesale].sort((left, right) =>
          right.start_date.localeCompare(left.start_date)
        ),
      },
    }))
    .sort((left, right) => left.style_name.localeCompare(right.style_name, "es"));
}

function PriceListView({ initialStyleId }: { initialStyleId?: string | null }) {
  const [priceRows, setPriceRows] = useState<PriceRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedStyles, setExpandedStyles] = useState<Record<string, boolean>>({});
  const { coverageGaps, coverageLoading } = usePriceCoverageGaps();

  const loadPriceRows = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (initialStyleId) {
        params.set("style_id", initialStyleId);
      }

      const query = params.toString();
      const data = await requestJson<PriceRow[]>(`/api/prices${query ? `?${query}` : ""}`);
      setPriceRows(data || []);
    } catch (error) {
      console.error(error);
      setPriceRows([]);
    } finally {
      setLoading(false);
    }
  }, [initialStyleId]);

  useEffect(() => {
    loadPriceRows();
  }, [loadPriceRows]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return priceRows;
    }

    return priceRows.filter((row) => {
      return (
        row.style_code.toLowerCase().includes(normalizedSearch) ||
        row.style_name.toLowerCase().includes(normalizedSearch) ||
        row.size_code.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [priceRows, search]);

  const groupedStyles = useMemo(() => groupPriceRows(filteredRows), [filteredRows]);

  const coverageGapByStyle = useMemo(
    () =>
      new Map(
        coverageGaps.map((gap) => [gap.style_id, gap] as const)
      ),
    [coverageGaps]
  );

  const activePriceCount = useMemo(
    () => filteredRows.filter((row) => row.validity_status === "active").length,
    [filteredRows]
  );

  const scheduledPriceCount = useMemo(
    () => filteredRows.filter((row) => row.validity_status === "scheduled").length,
    [filteredRows]
  );

  const alertCount = useMemo(() => {
    if (initialStyleId) {
      return coverageGaps.some((gap) => gap.style_id === initialStyleId) ? 1 : 0;
    }

    return coverageGaps.length;
  }, [coverageGaps, initialStyleId]);

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] backdrop-blur md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500">
              Precios
            </p>
            <div className="mt-2 flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-950">Listado de precios</h1>
              <InfoHint
                content="Consulta las vigencias registradas por style y detecta huecos de cobertura retail antes de vender."
                label="Informacion del listado de precios"
              />
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 lg:max-w-xl lg:items-end">
            <label className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por style o talla"
                className="w-full rounded-2xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-400"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {initialStyleId ? (
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  Vista filtrada por style
                </span>
              ) : null}
              <button
                type="button"
                onClick={loadPriceRows}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Recargar
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Styles con precio"
            value={groupedStyles.length}
            info="Cantidad de styles que tienen al menos un registro de precio dentro del filtro actual."
          />
          <MetricCard
            title="Vigentes"
            value={activePriceCount}
            info="Registros listos para uso comercial en la fecha actual."
            tone="success"
          />
          <MetricCard
            title="Programados"
            value={scheduledPriceCount}
            info="Precios futuros ya cargados pero que todavia no entran en vigencia."
          />
          <MetricCard
            title="Alertas retail"
            value={alertCount}
            info="Styles con tallas operativas sin precio retail vigente."
            tone="warning"
          />
        </div>

        <div className="mt-5">
          <PriceCoverageBanner
            coverageGaps={coverageGaps}
            coverageLoading={coverageLoading}
            filterStyleId={initialStyleId}
          />
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] backdrop-blur md:p-6">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Vista operativa
            </p>
            <span className="text-slate-300">/</span>
            <h2 className="text-xl font-semibold text-slate-950">Resumen por style</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {groupedStyles.length} styles
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {filteredRows.length} registros
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center text-slate-500">
            <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
            Cargando precios...
          </div>
        ) : groupedStyles.length ? (
          <div className="mt-4 space-y-4">
            {groupedStyles.map((group) => {
              const coverageGap = coverageGapByStyle.get(group.style_id);
              const resolvedOpen = expandedStyles[group.style_id] ?? Boolean(coverageGap);

              return (
                <Collapsible
                  key={group.style_id}
                  open={resolvedOpen}
                  onOpenChange={(open) =>
                    setExpandedStyles((current) => ({
                      ...current,
                      [group.style_id]: open,
                    }))
                  }
                >
                  <article className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 transition hover:border-slate-300 md:p-5">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-lg font-semibold text-slate-950">
                              {group.style_name}
                            </h3>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              {group.style_code}
                            </span>
                            {coverageGap ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                <CircleAlert className="h-3.5 w-3.5" />
                                retail {coverageGap.retail_sizes_covered_count}/
                                {coverageGap.configured_size_count}
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-2 text-sm text-slate-500">
                            Ultima vigencia registrada: {formatDate(group.latestStartDate)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                          <Link
                            href={buildStyleHref("/precios/crear-y-editar-precio", group.style_id)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            Editar precios
                          </Link>

                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                            >
                              {resolvedOpen ? "Ocultar detalle" : "Ver detalle"}
                              {resolvedOpen ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </CollapsibleTrigger>
                        </div>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-2">
                        {(["retail", "wholesale"] as PriceType[]).map((priceType) => {
                          const typeRows = group.rowsByType[priceType];
                          const latestRow = typeRows[0] || null;

                          return (
                            <section
                              key={`${group.style_id}-${priceType}`}
                              className="rounded-2xl border border-slate-200 bg-white p-4"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    {formatPriceTypeLabel(priceType)}
                                  </p>
                                  <p className="mt-1 text-base font-semibold text-slate-950">
                                    {latestRow ? formatCurrency(latestRow.price) : "Sin registros"}
                                  </p>
                                </div>
                                {latestRow ? (
                                  <StatusBadge status={latestRow.validity_status} />
                                ) : (
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                    Pendiente
                                  </span>
                                )}
                              </div>

                              <p className="mt-2 text-sm text-slate-500">
                                {latestRow
                                  ? `${typeRows.length} vigencias registradas`
                                  : "Todavia no hay historial para este tipo de precio."}
                              </p>
                            </section>
                          );
                        })}
                      </div>

                      <CollapsibleContent>
                        <div className="grid gap-3 pt-1 lg:grid-cols-2">
                          {(["retail", "wholesale"] as PriceType[]).map((priceType) => {
                            const typeRows = group.rowsByType[priceType];

                            return (
                              <div
                                key={`${group.style_id}-${priceType}-details`}
                                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                              >
                                <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                                  <h4 className="text-sm font-semibold text-slate-900">
                                    {formatPriceTypeLabel(priceType)}
                                  </h4>
                                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                                    {typeRows.length}
                                  </span>
                                </div>

                                {typeRows.length ? (
                                  <div className="mt-3 space-y-3">
                                    {typeRows.map((row) => (
                                      <div
                                        key={row.style_size_price_id}
                                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                                      >
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="text-sm font-semibold text-slate-900">
                                            Talla {row.size_code}
                                          </p>
                                          <StatusBadge status={row.validity_status} />
                                        </div>
                                        <p className="mt-2 text-sm text-slate-500">
                                          {formatCurrency(row.price)} · {formatDate(row.start_date)} -{" "}
                                          {formatDate(row.end_date)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-500">
                                    Sin registros para este tipo de precio.
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </article>
                </Collapsible>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <h3 className="text-lg font-semibold text-slate-950">
              No hay precios para este contexto
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {initialStyleId
                ? "Este style aun no tiene historial de precios. Puedes crear el primer registro desde el editor."
                : "Todavia no existen registros de precios cargados."}
            </p>
            <Link
              href={
                initialStyleId
                  ? buildStyleHref("/precios/crear-y-editar-precio", initialStyleId)
                  : "/precios/crear-y-editar-precio"
              }
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Crear precio
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function PriceEditorView({ initialStyleId }: { initialStyleId?: string | null }) {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState<ProductWorkspace | null>(null);
  const [priceRows, setPriceRows] = useState<PriceRow[]>([]);
  const [styleSearch, setStyleSearch] = useState("");
  const [selectedSizeId, setSelectedSizeId] = useState("");
  const [selectedPriceType, setSelectedPriceType] = useState<PriceType>("retail");
  const [selectedPriceId, setSelectedPriceId] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [startDateInput, setStartDateInput] = useState(getTodayInputValue());
  const [endDateInput, setEndDateInput] = useState("");
  const [activeInput, setActiveInput] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { coverageGaps, coverageLoading } = usePriceCoverageGaps();
  const hasAppliedInitialSelection = useRef(false);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    setError(null);

    try {
      const data = await requestJson<ProductSummary[]>("/api/products");
      setProducts(data || []);

      if (data.length) {
        const preferredStyle =
          initialStyleId && data.find((product) => product.style_id === initialStyleId)?.style_id;

        setSelectedStyleId((current) => current || preferredStyle || data[0].style_id);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar la base de precios"
      );
    } finally {
      setLoadingProducts(false);
    }
  }, [initialStyleId]);

  async function loadWorkspace(styleId: string) {
    setLoadingWorkspace(true);
    setError(null);

    try {
      const [workspace, rows] = await Promise.all([
        requestJson<ProductWorkspace>(`/api/products/${styleId}/workspace`),
        requestJson<PriceRow[]>(`/api/prices?style_id=${encodeURIComponent(styleId)}`),
      ]);

      setSelectedWorkspace(workspace);
      setPriceRows(rows || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar el workspace del style"
      );
      setSelectedWorkspace(null);
      setPriceRows([]);
    } finally {
      setLoadingWorkspace(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (
      hasAppliedInitialSelection.current ||
      !initialStyleId ||
      !products.some((product) => product.style_id === initialStyleId)
    ) {
      return;
    }

    hasAppliedInitialSelection.current = true;
    setSelectedStyleId(initialStyleId);
  }, [initialStyleId, products]);

  useEffect(() => {
    if (!selectedStyleId) {
      setSelectedWorkspace(null);
      setPriceRows([]);
      return;
    }

    loadWorkspace(selectedStyleId);
  }, [selectedStyleId]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = styleSearch.trim().toLowerCase();

    return products.filter((product) => {
      if (!normalizedSearch) {
        return true;
      }

      return [
        product.name,
        product.style_code,
        product.garment_type_name,
        product.fabric_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [products, styleSearch]);

  useEffect(() => {
    const configuredSizes = selectedWorkspace?.configured_sizes || [];

    if (!configuredSizes.length) {
      setSelectedSizeId("");
      return;
    }

    const sizeStillExists = configuredSizes.some((size) => size.size_id === selectedSizeId);

    if (!sizeStillExists) {
      setSelectedSizeId(configuredSizes[0].size_id);
    }
  }, [selectedSizeId, selectedWorkspace?.configured_sizes]);

  const matchingRows = useMemo(() => {
    return priceRows
      .filter(
        (row) =>
          row.size_id === selectedSizeId && row.price_type === selectedPriceType
      )
      .sort((left, right) => right.start_date.localeCompare(left.start_date));
  }, [priceRows, selectedPriceType, selectedSizeId]);

  useEffect(() => {
    if (!matchingRows.length) {
      if (selectedPriceId) {
        setSelectedPriceId("");
      }
      return;
    }

    const stillExists = matchingRows.some(
      (row) => row.style_size_price_id === selectedPriceId
    );

    if (stillExists) {
      return;
    }

    const preferredRow =
      matchingRows.find((row) => row.validity_status === "active") || matchingRows[0];
    setSelectedPriceId(preferredRow.style_size_price_id);
  }, [matchingRows, selectedPriceId]);

  const selectedRow =
    matchingRows.find((row) => row.style_size_price_id === selectedPriceId) || null;

  useEffect(() => {
    setSaveMessage(null);
    setSaveError(null);

    if (selectedRow) {
      setPriceInput(String(selectedRow.price));
      setStartDateInput(selectedRow.start_date?.slice(0, 10) || getTodayInputValue());
      setEndDateInput(selectedRow.end_date?.slice(0, 10) || "");
      setActiveInput(selectedRow.active);
      return;
    }

    setPriceInput("");
    setStartDateInput(getTodayInputValue());
    setEndDateInput("");
    setActiveInput(true);
  }, [selectedRow, selectedSizeId, selectedPriceType]);

  const selectedWorkspaceSize =
    selectedWorkspace?.configured_sizes.find((size) => size.size_id === selectedSizeId) || null;

  async function handleSavePrice() {
    if (!selectedStyleId || !selectedSizeId) {
      return;
    }

    const payload = {
      price: Number(priceInput),
      start_date: startDateInput,
      end_date: endDateInput || null,
      active: activeInput,
    };

    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      if (selectedRow) {
        await requestJson<PriceRow>(`/api/prices/${selectedRow.style_size_price_id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        const created = await requestJson<PriceRow>("/api/prices", {
          method: "POST",
          body: JSON.stringify({
            style_id: selectedStyleId,
            size_id: selectedSizeId,
            price_type: selectedPriceType,
            ...payload,
          }),
        });
        setSelectedPriceId(created.style_size_price_id);
      }

      await Promise.all([loadWorkspace(selectedStyleId), loadProducts()]);
      setSaveMessage(
        selectedRow
          ? "Precio actualizado correctamente."
          : "Primer precio creado correctamente."
      );
    } catch (requestError) {
      setSaveError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo guardar el precio"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-500">
              Precios
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              Crear y editar precio
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Selecciona un style, revisa cobertura por talla y crea el primer precio
              cuando aun no exista historial.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void Promise.all([
                loadProducts(),
                selectedStyleId ? loadWorkspace(selectedStyleId) : Promise.resolve(),
              ]);
            }}
            className="inline-flex items-center gap-2 self-start rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <RefreshCw className="h-4 w-4" />
            Recargar
          </button>
        </div>

        <div className="mt-5">
          <PriceCoverageBanner
            coverageGaps={coverageGaps}
            coverageLoading={coverageLoading}
            filterStyleId={selectedStyleId || initialStyleId}
          />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Styles base
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                Seleccionar style
              </h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {filteredProducts.length}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={styleSearch}
                onChange={(event) => setStyleSearch(event.target.value)}
                placeholder="Buscar por codigo, nombre o tela"
                className="w-full bg-transparent outline-none placeholder:text-slate-400"
              />
            </label>
          </div>

          {loadingProducts ? (
            <div className="flex min-h-56 items-center justify-center text-slate-500">
              <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
              Cargando styles...
            </div>
          ) : filteredProducts.length ? (
            <div className="mt-4 space-y-3">
              {filteredProducts.map((product) => {
                const isSelected = product.style_id === selectedStyleId;
                const statusMeta = STATUS_META[product.status];

                return (
                  <button
                    key={product.style_id}
                    type="button"
                    onClick={() => {
                      setSelectedStyleId(product.style_id);
                      setSaveMessage(null);
                      setSaveError(null);
                    }}
                    className={cn(
                      "w-full rounded-2xl border p-4 text-left transition",
                      isSelected
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                          {product.style_code ? (
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                              {product.style_code}
                            </span>
                          ) : null}
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
                          >
                            {statusMeta.label}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          retail {product.retail_sizes_covered_count}/
                          {product.configured_size_count} · mayorista{" "}
                          {product.wholesale_sizes_covered_count}/
                          {product.configured_size_count}
                        </p>
                      </div>

                      {product.warnings.stock_without_retail_price ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                          <CircleAlert className="h-3.5 w-3.5" />
                          Stock sin retail
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No hay styles para este filtro.
            </div>
          )}
        </article>

        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
          {loadingWorkspace ? (
            <div className="flex min-h-56 items-center justify-center text-slate-500">
              <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
              Cargando workspace...
            </div>
          ) : selectedWorkspace ? (
            <div className="space-y-5">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-slate-950">
                        {selectedWorkspace.product.name}
                      </h2>
                      {selectedWorkspace.product.style_code ? (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                          {selectedWorkspace.product.style_code}
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          STATUS_META[selectedWorkspace.product.status].className
                        }`}
                      >
                        {STATUS_META[selectedWorkspace.product.status].label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {selectedWorkspace.product.garment_type_name}
                      {selectedWorkspace.product.fabric_name
                        ? ` · ${selectedWorkspace.product.fabric_name}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={buildStyleHref("/productos/variantes", selectedWorkspace.product.style_id)}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Variantes
                    </Link>
                    <Link
                      href={buildStyleHref("/precios/listado-de-precios", selectedWorkspace.product.style_id)}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Historial
                    </Link>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <article className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Retail
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {selectedWorkspace.product.retail_sizes_covered_count}/
                      {selectedWorkspace.product.configured_size_count}
                    </p>
                  </article>
                  <article className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Mayorista
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {selectedWorkspace.product.wholesale_sizes_covered_count}/
                      {selectedWorkspace.product.configured_size_count}
                    </p>
                  </article>
                  <article className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Variantes
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {selectedWorkspace.product.variant_count}/
                      {selectedWorkspace.product.expected_variant_count}
                    </p>
                  </article>
                  <article className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Stock
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {selectedWorkspace.product.total_stock_qty}
                    </p>
                  </article>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedWorkspace.product.missing_retail_size_count > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                      <CircleAlert className="h-3.5 w-3.5" />
                      Faltan {selectedWorkspace.product.missing_retail_size_count} tallas retail
                    </span>
                  ) : null}
                  {selectedWorkspace.product.warnings.missing_wholesale_prices ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      Mayorista incompleto
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Tallas configuradas
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-950">
                      Cobertura por talla
                    </h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {selectedWorkspace.configured_sizes.length} tallas
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {selectedWorkspace.configured_sizes.map((size) => {
                    const isSelected = size.size_id === selectedSizeId;

                    return (
                      <button
                        key={size.size_id}
                        type="button"
                        onClick={() => setSelectedSizeId(size.size_id)}
                        className={cn(
                          "rounded-2xl border p-4 text-left transition",
                          isSelected
                            ? "border-indigo-300 bg-indigo-50"
                            : "border-slate-200 bg-slate-50 hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {size.code} - {size.name}
                          </p>
                          {size.has_stock ? (
                            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                              Stock {size.stock_qty}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              size.has_current_retail_price
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {size.has_current_retail_price ? "Retail listo" : "Retail pendiente"}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              size.has_current_wholesale_price
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {size.has_current_wholesale_price
                              ? "Mayorista listo"
                              : "Mayorista pendiente"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Editor
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-950">
                      {selectedWorkspaceSize
                        ? `Talla ${selectedWorkspaceSize.code}`
                        : "Selecciona una talla"}
                    </h3>
                    {selectedWorkspaceSize ? (
                      <p className="mt-2 text-sm text-slate-500">
                        Actual minorista {formatCurrency(selectedWorkspaceSize.current_retail_price)} ·
                        mayorista {formatCurrency(selectedWorkspaceSize.current_wholesale_price)}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(["retail", "wholesale"] as PriceType[]).map((priceType) => (
                      <button
                        key={priceType}
                        type="button"
                        onClick={() => setSelectedPriceType(priceType)}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                          selectedPriceType === priceType
                            ? "bg-slate-900 text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        {formatPriceTypeLabel(priceType)}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedWorkspaceSize ? (
                  <div className="mt-4 space-y-4">
                    {matchingRows.length ? (
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">
                          Vigencia a editar
                        </label>
                        <select
                          value={selectedRow?.style_size_price_id || ""}
                          onChange={(event) => setSelectedPriceId(event.target.value)}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                        >
                          {matchingRows.map((row) => (
                            <option
                              key={row.style_size_price_id}
                              value={row.style_size_price_id}
                            >
                              {formatCurrency(row.price)} · {formatDate(row.start_date)} ·{" "}
                              {getValidityLabel(row.validity_status)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        No existe historial para esta talla y tipo. Puedes crear el primer precio
                        desde aqui.
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Precio</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={priceInput}
                          onChange={(event) => setPriceInput(event.target.value)}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">
                          Estado del registro
                        </label>
                        <label className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={activeInput}
                            onChange={(event) => setActiveInput(event.target.checked)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          Activo
                        </label>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">
                          Inicio de vigencia
                        </label>
                        <input
                          type="date"
                          value={startDateInput}
                          onChange={(event) => setStartDateInput(event.target.value)}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">
                          Fin de vigencia
                        </label>
                        <input
                          type="date"
                          value={endDateInput}
                          onChange={(event) => setEndDateInput(event.target.value)}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                        />
                      </div>
                    </div>

                    {saveMessage ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {saveMessage}
                      </div>
                    ) : null}

                    {saveError ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {saveError}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={handleSavePrice}
                      disabled={saving || !selectedSizeId}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : selectedRow ? (
                        <>
                          <PencilLine className="h-4 w-4" />
                          Guardar cambios
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Crear primer precio
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    Selecciona una talla configurada para continuar.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex min-h-56 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Selecciona un style</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Primero elige un style para revisar su cobertura de precios por talla.
                </p>
              </div>
            </div>
          )}

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </article>
      </div>
    </div>
  );
}

function WholesaleRulesView() {
  const [rules, setRules] = useState<PricingRuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [minQtyInput, setMinQtyInput] = useState("3");
  const [activeInput, setActiveInput] = useState(true);
  const [validFromInput, setValidFromInput] = useState("");
  const [validToInput, setValidToInput] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedRule =
    rules.find((rule) => rule.rule_type === "WHOLESALE_MIN_QTY_TOTAL") || rules[0] || null;

  useEffect(() => {
    fetch(buildApiUrl("/api/pricing-rules"), { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        setRules(payload.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedRule) {
      return;
    }

    setMinQtyInput(String(selectedRule.min_qty));
    setActiveInput(selectedRule.active);
    setValidFromInput(selectedRule.valid_from?.slice(0, 10) || "");
    setValidToInput(selectedRule.valid_to?.slice(0, 10) || "");
    setSaveMessage(null);
    setSaveError(null);
  }, [selectedRule]);

  async function handleSaveRule() {
    const payload = {
      min_qty: Number(minQtyInput),
      active: activeInput,
      valid_from: validFromInput || null,
      valid_to: validToInput || null,
    };

    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      if (selectedRule) {
        const response = await fetch(
          buildApiUrl(`/api/pricing-rules/${selectedRule.rule_id}`),
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message || "No se pudo actualizar la regla");
        }

        setRules((currentRules) =>
          currentRules.map((rule) =>
            rule.rule_id === selectedRule.rule_id ? result.data : rule
          )
        );
      } else {
        const response = await fetch(buildApiUrl("/api/pricing-rules"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rule_type: "WHOLESALE_MIN_QTY_TOTAL",
            ...payload,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message || "No se pudo crear la regla");
        }

        setRules((currentRules) => [...currentRules, result.data]);
      }

      setSaveMessage("Regla mayorista guardada correctamente");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar la regla");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-500">
          Precios
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Regla mayorista</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Configura la condicion central para el precio mayorista sin recargar la operacion diaria.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
          <div className="border-b border-slate-200 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Regla base
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Nueva condicion</h2>
          </div>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Nombre</label>
              <input
                defaultValue="Mayorista 3+ prendas"
                disabled
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Cantidad minima</label>
                <input
                  type="number"
                  min={1}
                  value={minQtyInput}
                  onChange={(event) => setMinQtyInput(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Estado</label>
                <label className="inline-flex h-10.5 items-center gap-2 rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={activeInput}
                    onChange={(event) => setActiveInput(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Activa
                </label>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Valida desde</label>
                <input
                  type="date"
                  value={validFromInput}
                  onChange={(event) => setValidFromInput(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Valida hasta</label>
                <input
                  type="date"
                  value={validToInput}
                  onChange={(event) => setValidToInput(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                />
              </div>
            </div>

            <button
              onClick={handleSaveRule}
              disabled={loading || saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PencilLine className="h-4 w-4" />
              {saving ? "Guardando..." : "Guardar regla"}
            </button>

            {saveMessage ? <p className="text-sm text-emerald-700">{saveMessage}</p> : null}
            {saveError ? <p className="text-sm text-rose-700">{saveError}</p> : null}
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Reglas actuales
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">pricing_rules</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {rules.length}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {rules.map((rule) => (
              <article
                key={rule.rule_id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{rule.rule_type}</p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      rule.active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {rule.active ? "Activa" : "Inactiva"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">Minimo: {rule.min_qty} unidades</p>
                <p className="mt-1 text-xs text-slate-500">
                  Vigencia: {formatDate(rule.valid_from)} - {formatDate(rule.valid_to)}
                </p>
              </article>
            ))}

            {!loading && rules.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                No hay reglas creadas todavia.
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  );
}

export function ListPrices({
  mode,
  initialStyleId = null,
}: {
  mode: PriceMode;
  initialStyleId?: string | null;
}) {
  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f8fafc_32%,#ffffff_68%,#eef2ff_100%)] p-4 md:p-5">
      <div className="mx-auto max-w-7xl">
        {mode === "list" ? <PriceListView initialStyleId={initialStyleId} /> : null}
        {mode === "editor" ? <PriceEditorView initialStyleId={initialStyleId} /> : null}
        {mode === "rules" ? <WholesaleRulesView /> : null}
      </div>
    </section>
  );
}
