"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, CircleAlert, Info, PencilLine, Search } from "lucide-react";
import { buildApiUrl } from "@/lib/api";
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

type PriceRow = {
  style_size_price_id: string;
  style_id: string;
  style_code: string;
  style_name: string;
  size_code: string;
  size_name: string;
  price_type: "retail" | "wholesale";
  price: number;
  start_date: string;
  end_date: string | null;
  active: boolean;
  validity_status: "active" | "scheduled" | "expired" | "inactive";
};

type PricingRuleRow = {
  rule_id: string;
  rule_type: string;
  min_qty: number;
  active: boolean;
  valid_from: string | null;
  valid_to: string | null;
};

type PriceCoverageGap = {
  style_id: string;
  style_code: string;
  style_name: string;
  variant_count: number;
  inventory_row_count: number;
  price_row_count: number;
};

type GroupedPriceType = {
  priceType: PriceRow["price_type"];
  entries: Array<{
    style_size_price_id: string;
    size_code: string;
    size_name: string;
    price: number;
    start_date: string;
    end_date: string | null;
    active: boolean;
    validity_status: PriceRow["validity_status"];
  }>;
  latestStartDate: string | null;
  statuses: Set<PriceRow["validity_status"]>;
};

type GroupedStyleRow = {
  style_id: string;
  style_code: string;
  style_name: string;
  priceTypes: Record<PriceRow["price_type"], GroupedPriceType>;
  missingTypes: PriceRow["price_type"][];
  latestStartDate: string | null;
};

type MetricCardTone = "neutral" | "warning";

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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatPriceTypeLabel(priceType: PriceRow["price_type"]) {
  return priceType === "retail" ? "Minorista" : "Mayorista";
}

function getStatusLabel(status: PriceRow["validity_status"] | string) {
  if (status === "active") return "vigente";
  if (status === "scheduled") return "programado";
  if (status === "expired") return "vencido";
  if (status === "inactive") return "inactivo";
  return status;
}

function StatusBadge({ status }: { status: PriceRow["validity_status"] | string }) {
  const styles =
    status === "active"
      ? "bg-emerald-100 text-emerald-700"
      : status === "scheduled"
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-200 text-slate-600";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>
      {getStatusLabel(status)}
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
  const tones =
    tone === "warning"
      ? value > 0
        ? {
            article: "border-rose-200 bg-rose-50",
            title: "text-rose-700",
            value: "text-rose-900",
          }
        : {
            article: "border-slate-200 bg-slate-50",
            title: "text-slate-500",
            value: "text-slate-900",
          }
      : {
          article: "border-slate-200 bg-slate-50",
          title: "text-slate-500",
          value: "text-slate-900",
        };

  return (
    <article className={`rounded-2xl border p-4 ${tones.article}`}>
      <div className="flex items-center gap-2">
        <p className={`text-xs font-semibold uppercase tracking-wide ${tones.title}`}>{title}</p>
        <InfoHint content={info} label={`Informacion sobre ${title}`} />
      </div>
      <p className={`mt-2 text-2xl font-semibold ${tones.value}`}>{value}</p>
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
}: {
  coverageGaps: PriceCoverageGap[];
  coverageLoading: boolean;
}) {
  if (coverageLoading || coverageGaps.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-800">
        Styles con stock o variantes sin precio comercial
      </p>
      <p className="mt-1 text-sm text-amber-700">
        Completa esos precios para evitar huecos operativos antes de venta.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {coverageGaps.map((gap) => (
          <span
            key={gap.style_id}
            className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800"
          >
            {gap.style_code} · {gap.variant_count} variantes · {gap.inventory_row_count} stocks
          </span>
        ))}
      </div>
    </div>
  );
}

function PriceListView() {
  const [priceRows, setPriceRows] = useState<PriceRow[]>([]);
  const [search, setSearch] = useState("");
  const [expandedStyles, setExpandedStyles] = useState<Record<string, boolean>>({});
  const { coverageGaps, coverageLoading } = usePriceCoverageGaps();

  useEffect(() => {
    fetch(buildApiUrl("/api/prices"), { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        setPriceRows(payload.data || []);
      })
      .catch(console.error);
  }, []);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return priceRows;
    }

    return priceRows.filter(
      (row) =>
        row.style_code.toLowerCase().includes(normalizedSearch) ||
        row.style_name.toLowerCase().includes(normalizedSearch)
    );
  }, [priceRows, search]);

  const uniqueStylesWithPrice = useMemo(
    () => new Set(priceRows.map((row) => row.style_id)).size,
    [priceRows]
  );

  const groupedStyles = useMemo<GroupedStyleRow[]>(() => {
    const groupedMap = new Map<string, GroupedStyleRow>();

    filteredRows.forEach((row) => {
      const currentGroup = groupedMap.get(row.style_id) || {
        style_id: row.style_id,
        style_code: row.style_code,
        style_name: row.style_name,
        priceTypes: {
          retail: {
            priceType: "retail",
            entries: [],
            latestStartDate: null,
            statuses: new Set<PriceRow["validity_status"]>(),
          },
          wholesale: {
            priceType: "wholesale",
            entries: [],
            latestStartDate: null,
            statuses: new Set<PriceRow["validity_status"]>(),
          },
        },
        missingTypes: [],
        latestStartDate: null,
      };

      const priceTypeGroup = currentGroup.priceTypes[row.price_type];
      priceTypeGroup.entries.push({
        style_size_price_id: row.style_size_price_id,
        size_code: row.size_code,
        size_name: row.size_name,
        price: row.price,
        start_date: row.start_date,
        end_date: row.end_date,
        active: row.active,
        validity_status: row.validity_status,
      });
      priceTypeGroup.statuses.add(row.validity_status);

      if (!priceTypeGroup.latestStartDate || row.start_date > priceTypeGroup.latestStartDate) {
        priceTypeGroup.latestStartDate = row.start_date;
      }

      if (!currentGroup.latestStartDate || row.start_date > currentGroup.latestStartDate) {
        currentGroup.latestStartDate = row.start_date;
      }

      groupedMap.set(row.style_id, currentGroup);
    });

    return Array.from(groupedMap.values())
      .map((group) => {
        const missingTypes = (["retail", "wholesale"] as PriceRow["price_type"][]).filter(
          (priceType) => group.priceTypes[priceType].entries.length === 0
        );

        return {
          ...group,
          missingTypes,
          priceTypes: {
            retail: {
              ...group.priceTypes.retail,
              entries: [...group.priceTypes.retail.entries].sort((a, b) =>
                a.size_code.localeCompare(b.size_code, "es")
              ),
            },
            wholesale: {
              ...group.priceTypes.wholesale,
              entries: [...group.priceTypes.wholesale.entries].sort((a, b) =>
                a.size_code.localeCompare(b.size_code, "es")
              ),
            },
          },
        };
      })
      .sort((a, b) => a.style_name.localeCompare(b.style_name, "es"));
  }, [filteredRows]);

  const stylesWithAlerts = useMemo(
    () =>
      groupedStyles.filter(
        (group) =>
          group.missingTypes.length > 0 ||
          coverageGaps.some((gap) => gap.style_id === group.style_id)
      ).length,
    [coverageGaps, groupedStyles]
  );

  const activePriceCount = useMemo(
    () => priceRows.filter((row) => row.validity_status === "active").length,
    [priceRows]
  );

  const scheduledPriceCount = useMemo(
    () => priceRows.filter((row) => row.validity_status === "scheduled").length,
    [priceRows]
  );

  const coverageGapByStyle = useMemo(
    () => new Map(coverageGaps.map((gap) => [gap.style_id, gap])),
    [coverageGaps]
  );

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
                content="Consulta precios por style y revisa rapidamente minorista, mayorista y alertas de cobertura."
                label="Informacion general del listado de precios"
              />
            </div>
          </div>

          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por codigo o nombre del style"
              className="w-full rounded-2xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-400"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Styles cubiertos"
            value={uniqueStylesWithPrice}
            info="Cantidad de productos con al menos un precio cargado."
          />
          <MetricCard
            title="Vigentes"
            value={activePriceCount}
            info="Registros de precio activos para uso comercial."
          />
          <MetricCard
            title="Programados"
            value={scheduledPriceCount}
            info="Precios futuros que todavia no entran en vigencia."
          />
          <MetricCard
            title="Alertas"
            value={stylesWithAlerts}
            info="Styles con faltantes de precio o cobertura incompleta respecto a variantes/stock."
            tone="warning"
          />
        </div>

        <div className="mt-5">
          <PriceCoverageBanner
            coverageGaps={coverageGaps}
            coverageLoading={coverageLoading}
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
            <InfoHint
              content="Cada style muestra una fila compacta con sus precios minorista y mayorista. Abre detalle solo si necesitas contexto adicional."
              label="Informacion sobre la vista operativa"
            />
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

        <div className="mt-4 space-y-4">
          {groupedStyles.map((group) => {
            const coverageGap = coverageGapByStyle.get(group.style_id);
            const hasCoverageGap = Boolean(coverageGap);
            const hasMissingPrices = group.missingTypes.length > 0;
            const hasOperationalAlert = hasCoverageGap || hasMissingPrices;
            const resolvedOpen =
              expandedStyles[group.style_id] ?? hasOperationalAlert;
            const groupStatuses = [
              ...group.priceTypes.retail.statuses,
              ...group.priceTypes.wholesale.statuses,
            ];
            const groupStatus =
              groupStatuses.find((status) => status === "active") ||
              groupStatuses[0] ||
              "inactive";

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
                          <h3 className="text-lg font-semibold text-slate-950">
                            {group.style_name}
                          </h3>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {group.style_code}
                          </span>
                          <StatusBadge status={groupStatus} />
                          {hasMissingPrices ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                              <CircleAlert className="h-3.5 w-3.5" />
                              Falta {group.missingTypes.map(formatPriceTypeLabel).join(" y ")}
                            </span>
                          ) : null}
                          {hasCoverageGap ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                              <CircleAlert className="h-3.5 w-3.5" />
                              Cobertura incompleta
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {group.priceTypes.retail.entries.length} minorista ·{" "}
                          {group.priceTypes.wholesale.entries.length} mayorista
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Ultima vigencia
                          </p>
                          <p className="mt-1 font-semibold text-slate-800">
                            {formatDate(group.latestStartDate)}
                          </p>
                        </div>

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

                    <div className="space-y-2.5">
                      {(["retail", "wholesale"] as PriceRow["price_type"][]).map((priceType) => {
                        const priceTypeGroup = group.priceTypes[priceType];

                        return (
                          <section
                            key={`${group.style_id}-${priceType}`}
                            className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 md:grid-cols-[150px_1fr_auto] md:items-center"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {formatPriceTypeLabel(priceType)}
                              </span>
                              <InfoHint
                                content={
                                  priceType === "retail"
                                    ? "Precio de venta unitario disponible para este style."
                                    : "Precio comercial vinculado al esquema mayorista."
                                }
                                label={`Informacion sobre ${formatPriceTypeLabel(priceType)}`}
                              />
                            </div>

                            {priceTypeGroup.entries.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {priceTypeGroup.entries.map((entry) => (
                                  <span
                                    key={entry.style_size_price_id}
                                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                      entry.validity_status === "active"
                                        ? "border-slate-200 bg-white text-slate-700"
                                        : entry.validity_status === "scheduled"
                                          ? "border-amber-200 bg-amber-50 text-amber-700"
                                          : "border-slate-200 bg-slate-100 text-slate-500"
                                    }`}
                                  >
                                    {entry.size_code} · {formatCurrency(entry.price)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-amber-700">
                                Sin precio {formatPriceTypeLabel(priceType).toLowerCase()}
                              </div>
                            )}

                            <div className="text-xs font-medium text-slate-500 md:text-right">
                              {priceTypeGroup.entries.length} tallas
                            </div>
                          </section>
                        );
                      })}
                    </div>

                    <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
                      <div className="grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-2 xl:grid-cols-4">
                        <article className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Vigencia minorista
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-800">
                            {group.priceTypes.retail.latestStartDate
                              ? formatDate(group.priceTypes.retail.latestStartDate)
                              : "Sin precio"}
                          </p>
                        </article>
                        <article className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Vigencia mayorista
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-800">
                            {group.priceTypes.wholesale.latestStartDate
                              ? formatDate(group.priceTypes.wholesale.latestStartDate)
                              : "Sin precio"}
                          </p>
                        </article>
                        <article className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Estado comercial
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-800">
                            {hasOperationalAlert ? "Requiere revision" : "Cobertura completa"}
                          </p>
                        </article>
                        <article className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Observacion
                          </p>
                          <p className="mt-2 text-sm text-slate-700">
                            {coverageGap
                              ? `${coverageGap.variant_count} variantes y ${coverageGap.inventory_row_count} stocks con cobertura por revisar.`
                              : hasMissingPrices
                                ? `Pendiente ${group.missingTypes
                                    .map((type) => formatPriceTypeLabel(type).toLowerCase())
                                    .join(" y ")}.`
                                : "Sin alertas operativas para este style."}
                          </p>
                        </article>
                      </div>
                    </CollapsibleContent>
                  </div>
                </article>
              </Collapsible>
            );
          })}

          {groupedStyles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
              <p className="text-sm font-semibold text-slate-700">
                No encontramos styles para esa busqueda.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Prueba con otro codigo o nombre para revisar la cobertura de precios.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PriceEditorView() {
  const [priceRows, setPriceRows] = useState<PriceRow[]>([]);
  const [selectedPriceId, setSelectedPriceId] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [activeInput, setActiveInput] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { coverageGaps, coverageLoading } = usePriceCoverageGaps();

  useEffect(() => {
    fetch(buildApiUrl("/api/prices"), { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        setPriceRows(payload.data || []);
        setSelectedPriceId((payload.data || [])[0]?.style_size_price_id || "");
      })
      .catch(console.error);
  }, []);

  const selectedRow =
    priceRows.find((row) => row.style_size_price_id === selectedPriceId) || priceRows[0];

  useEffect(() => {
    if (!selectedRow) {
      setPriceInput("");
      setStartDateInput("");
      setEndDateInput("");
      setActiveInput(true);
      return;
    }

    setPriceInput(String(selectedRow.price));
    setStartDateInput(selectedRow.start_date?.slice(0, 10) || "");
    setEndDateInput(selectedRow.end_date?.slice(0, 10) || "");
    setActiveInput(selectedRow.active);
    setSaveMessage(null);
    setSaveError(null);
  }, [selectedRow]);

  async function handleSavePrice() {
    if (!selectedRow) {
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
      const response = await fetch(
        buildApiUrl(`/api/prices/${selectedRow.style_size_price_id}`),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "No se pudo actualizar el precio");
      }

      const updated = result?.data;

      if (!updated) {
        throw new Error("La API no devolvio el precio actualizado");
      }

      setPriceRows((currentRows) =>
        currentRows.map((row) =>
          row.style_size_price_id === selectedRow.style_size_price_id
            ? {
                ...row,
                price: Number(updated.price),
                start_date: updated.start_date,
                end_date: updated.end_date,
                active: updated.active,
              }
            : row
        )
      );

      setSaveMessage("Precio actualizado correctamente");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo actualizar el precio");
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
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Crear y editar precio</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Formulario operativo para mantenimiento puntual de precio por style y talla
          sobre <code>style_size_prices</code>.
        </p>

        <div className="mt-5">
          <PriceCoverageBanner
            coverageGaps={coverageGaps}
            coverageLoading={coverageLoading}
          />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
          <div className="border-b border-slate-200 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Style
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Seleccionar base</h2>
          </div>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Style</label>
              <select
                value={selectedRow?.style_size_price_id || ""}
                onChange={(event) => setSelectedPriceId(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
              >
                {priceRows.map((row) => (
                  <option key={row.style_size_price_id} value={row.style_size_price_id}>
                    {row.style_code} - {row.style_name} - Talla {row.size_code}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Tipo de precio</label>
              <input
                disabled
                value={selectedRow?.price_type || ""}
                className="w-full rounded-2xl border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm capitalize text-slate-600 outline-none"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Inicio de vigencia</label>
                <input
                  type="date"
                  value={startDateInput}
                  onChange={(event) => setStartDateInput(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Fin de vigencia</label>
                <input
                  type="date"
                  value={endDateInput}
                  onChange={(event) => setEndDateInput(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={activeInput}
                onChange={(event) => setActiveInput(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Precio activo
            </label>

            <button
              onClick={handleSavePrice}
              disabled={!selectedRow || saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PencilLine className="h-4 w-4" />
              {saving ? "Guardando..." : "Guardar"}
            </button>

            {saveMessage ? <p className="text-sm text-emerald-700">{saveMessage}</p> : null}
            {saveError ? <p className="text-sm text-rose-700">{saveError}</p> : null}
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Detalle por talla
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                {selectedRow?.style_name}
              </h2>
            </div>
            {selectedRow ? <StatusBadge status={selectedRow.validity_status} /> : null}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Codigo
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{selectedRow?.style_code}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Inicio vigencia
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {formatDate(selectedRow?.start_date ?? null)}
              </p>
            </article>
          </div>

          {selectedRow ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Talla {selectedRow.size_code}
                  </p>
                  <p className="text-xs text-slate-500">
                    Precio {selectedRow.price_type} vigente
                  </p>
                </div>
                <input
                  type="text"
                  value={priceInput}
                  onChange={(event) => setPriceInput(event.target.value)}
                  className="w-28 rounded-xl border border-slate-300 bg-white px-3 py-2 text-right text-sm outline-none transition focus:border-violet-400"
                />
              </div>
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
          Configura la regla comercial mayorista por cantidad minima total.
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

export function ListPrices({ mode }: { mode: PriceMode }) {
  return (
    <section className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_45%,#eef2ff_100%)] p-4 md:p-5">
      <div className="mx-auto max-w-7xl">
        {mode === "list" ? <PriceListView /> : null}
        {mode === "editor" ? <PriceEditorView /> : null}
        {mode === "rules" ? <WholesaleRulesView /> : null}
      </div>
    </section>
  );
}
