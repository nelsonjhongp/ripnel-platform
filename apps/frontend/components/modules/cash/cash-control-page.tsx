"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  LineChart,
  MapPinned,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { RotateCw } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ErrorPage,
  InlineStatusCard,
  LoadingPage,
} from "@/components/feedback/status-page";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { OpsPageShell } from "@/components/ui/ops-page-shell";
import { ApiError, apiFetch } from "@/lib/api";
import {
  CashAdminSessionsResponse,
  CashAdminSummaryResponse,
  LocationOption,
  formatAmount,
  formatBusinessDate,
} from "@/lib/cash";
import { formatDateTime } from "@/lib/date-utils";

import { CashStatusBadge } from "./cash-status-badge";
import { explainApiError } from "@/components/modules/sales/pos/pos-utils";
import { showError } from "@/lib/toast";

const PAGE_SIZE = 20;

type RangeFilter = "7d" | "30d" | "60d";
type StatusFilter = "all" | "open" | "closed";

const RANGE_OPTIONS: OpsOption[] = [
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "60d", label: "Últimos 60 días" },
];

const STATUS_OPTIONS: OpsOption[] = [
  { value: "all", label: "Todas" },
  { value: "open", label: "Pendientes" },
  { value: "closed", label: "Cerradas" },
];

const tableColumns: OpsDataTableColumn[] = [
  { key: "fecha", header: "Fecha / estado" },
  { key: "sede", header: "Sede" },
  { key: "movimiento", header: "Apertura / cierre" },
  { key: "total", header: "Total" },
  { key: "accion", header: "" },
];

function buildQuery(params: {
  range: RangeFilter;
  status: StatusFilter;
  locationId: string;
  page?: number;
}) {
  const query = new URLSearchParams({
    range: params.range,
  });

  if (params.status !== "all") {
    query.set("status", params.status);
  }

  if (params.locationId !== "all") {
    query.set("locationId", params.locationId);
  }

  if (params.page) {
    query.set("page", String(params.page));
    query.set("pageSize", String(PAGE_SIZE));
  }

  return query.toString();
}

export default function CashControlPage() {
  const [summary, setSummary] = useState<CashAdminSummaryResponse | null>(null);
  const [sessions, setSessions] = useState<CashAdminSessionsResponse | null>(
    null,
  );
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeFilter>("7d");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [locationId, setLocationId] = useState("all");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const { has } = useAuth();
  const canReopenCash = has("cash.admin.reopen");

  const [reopenTarget, setReopenTarget] = useState<string | null>(null);
  const [reopenNotes, setReopenNotes] = useState("");
  const [reopeningCash, setReopeningCash] = useState(false);

  const handleReopenCash = async () => {
    if (!reopenTarget || reopeningCash) return
    setReopeningCash(true)
    try {
      await apiFetch(`/api/cash/${reopenTarget}/reopen`, {
        method: "PATCH",
        body: JSON.stringify({ reopen_notes: reopenNotes.trim() || null }),
      })
      setReopenTarget(null)
      setReopenNotes("")
      setReloadKey((k) => k + 1)
    } catch (e) {
      showError("Error al reabrir caja", explainApiError(e, "No se pudo reabrir la caja."));
    } finally {
      setReopeningCash(false)
    }
  }

  const locationOptions: OpsOption[] = useMemo(
    () => [
      { value: "all", label: "Todas las sedes" },
      ...locations.map((l) => ({
        value: l.location_id,
        label: l.name,
      })),
    ],
    [locations],
  );

  useEffect(() => {
    let active = true;

    async function loadLocations() {
      try {
        const data = await apiFetch<LocationOption[]>("/api/locations", {
          cache: "no-store",
        });

        if (active) {
          const normalized = Array.isArray(data)
            ? data.filter((item) => item.active !== false)
            : [];
          setLocations(normalized);
        }
      } catch {
        if (active) {
          setLocations([]);
        }
      }
    }

    loadLocations();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => setPage(1));
  }, [range, status, locationId]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const summaryQuery = buildQuery({ range, status, locationId });
        const sessionsQuery = buildQuery({ range, status, locationId, page });

        const [summaryData, sessionsData] = await Promise.all([
          apiFetch<CashAdminSummaryResponse>(
            `/api/cash/admin/summary?${summaryQuery}`,
            { cache: "no-store" },
          ),
          apiFetch<CashAdminSessionsResponse>(
            `/api/cash/admin/sessions?${sessionsQuery}`,
            { cache: "no-store" },
          ),
        ]);

        if (active) {
          setSummary(summaryData);
          setSessions(sessionsData);
        }
      } catch (loadError) {
        if (active) {
          setSummary(null);
          setSessions(null);
          setError(
            explainApiError(
              loadError,
              "No se pudo cargar el control de cajas.",
            ),
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
    }, [range, status, locationId, page, reloadKey]);

  const trendData = useMemo(() => {
    return (summary?.trend || []).map((item) => ({
      ...item,
      short_date: formatBusinessDate(item.business_date).slice(0, 5),
    }));
  }, [summary]);

  const locationChartData = useMemo(() => {
    return (summary?.by_location || []).slice(0, 6).map((item) => ({
      ...item,
      short_name:
        item.location_name.length > 14
          ? `${item.location_name.slice(0, 14)}…`
          : item.location_name,
    }));
  }, [summary]);

  const hasActiveFilters = status !== "all" || locationId !== "all";

  function clearFilters() {
    setRange("7d");
    setStatus("all");
    setLocationId("all");
    setPage(1);
  }

  if (loading && !summary && !sessions) {
    return (
      <LoadingPage
        title="Cargando control de cajas"
        description="Estamos reuniendo sesiones, sedes y alertas operativas para la vista administrativa."
        variant="ops"
      />
    );
  }

  if (error && !summary && !sessions) {
    return (
      <ErrorPage
        title="No pudimos abrir el control de cajas"
        description={error}
        variant="ops"
      />
    );
  }

  const stats = summary?.stats;
  const pagination = sessions?.pagination;

  return (
    <PermissionGuard permission="cash.admin.view">
      <TooltipProvider delayDuration={120}>
        <OpsPageShell width="wide" className="!max-w-7xl space-y-5">
            <header className="sales-panel rounded-lg p-5 shadow-sm md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs uppercase tracking-wide text-[var(--ripnel-accent-hover)]">
                      Caja
                    </p>
                    <HelpTooltip content="Vista administrativa transversal para revisar varias sedes, estados de caja y alertas operativas sin intervenir otras cajas." />
                  </div>
                  <h1 className="mt-1 text-2xl font-semibold text-[var(--ops-text)] md:text-3xl">
                    Control de cajas
                  </h1>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/caja"
                    className="sales-field sales-field-interactive inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--ops-text)] shadow-sm"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Caja del día
                  </Link>
                  <button
                    type="button"
                    onClick={() => setReloadKey((current) => current + 1)}
                    className="sales-field sales-field-interactive inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--ops-text)] shadow-sm"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Actualizar
                  </button>
                </div>
              </div>
            </header>

            {error ? (
              <div
                role="alert"
                aria-live="polite"
                className="sales-chip sales-chip-danger rounded-xl px-4 py-3 text-sm"
              >
                {error}
              </div>
            ) : null}

            <div className="sales-panel rounded-lg p-4 shadow-sm lg:flex lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "7d", label: "7 días" },
                  { value: "30d", label: "30 días" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRange(option.value as RangeFilter)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      range === option.value
                        ? "bg-[var(--ops-text)] text-[var(--ops-surface)]"
                        : "sales-field text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "all", label: "Todas" },
                    { value: "open", label: "Pendientes" },
                    { value: "closed", label: "Cerradas" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStatus(option.value as StatusFilter)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                        status === option.value
                          ? "bg-[var(--ripnel-accent)] text-white"
                          : "sales-field text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <FilterDropdown
                  label="Sede"
                  value={locationId}
                  options={[
                    { value: "all", label: "Todas las sedes" },
                    ...locations.map((loc) => ({
                      value: loc.location_id,
                      label: loc.name,
                    })),
                  ]}
                  onChange={(value) => setLocationId(value)}
                  triggerClassName="h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="ops-metric-pill rounded-xl p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-wide text-[var(--ops-text-muted)]">
                  Sesiones
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--ops-text)]">
                  {stats?.session_count || 0}
                </p>
              </article>
              <article className="sales-chip sales-chip-warning rounded-xl p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-wide text-[var(--ops-tone-warning-text)]">
                  Pendientes de cierre
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--ops-tone-warning-text)]">
                  {stats?.open_count || 0}
                </p>
              </article>
              <article className="sales-chip sales-chip-success rounded-xl p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-wide">
                  Sedes abiertas
                </p>
                <p className="mt-2 text-2xl font-bold">
                  {stats?.open_location_count || 0}
                </p>
              </article>
              <article className="sales-chip sales-chip-accent rounded-xl p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-wide">
                  Total registrado
                </p>
                <p className="mt-2 text-2xl font-bold">
                  {formatAmount(stats?.total_registered || 0)}
                </p>
              </article>
            </div>

          <OpsFiltersRow
            className="lg:grid-cols-[0.92fr_0.84fr_0.95fr_auto]"
          >
            <OpsSelect
              label="Rango"
              value={range}
              options={RANGE_OPTIONS}
              onChange={(v) => { setRange(v as RangeFilter); setPage(1); }}
            />
            <OpsSelect
              label="Estado"
              value={status}
              options={STATUS_OPTIONS}
              onChange={(v) => { setStatus(v as StatusFilter); setPage(1); }}
            />
            <OpsSelect
              label="Sede"
              value={locationId}
              options={locationOptions}
              onChange={(v) => { setLocationId(v); setPage(1); }}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="h-10 w-10 rounded-lg"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  aria-label="Limpiar filtros"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Limpiar filtros</TooltipContent>
            </Tooltip>
          </OpsFiltersRow>

                <div className="mt-4 h-64">
                  {trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient
                            id="cashTrend"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#0ea5e9"
                              stopOpacity={0.35}
                            />
                            <stop
                              offset="100%"
                              stopColor="#0ea5e9"
                              stopOpacity={0.02}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          stroke="var(--ops-border-strong)"
                          strokeDasharray="3 3"
                        />
                        <XAxis
                          dataKey="short_date"
                          tick={{ fontSize: 12, fill: "var(--ops-text-muted)" }}
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: "var(--ops-text-muted)" }}
                          tickFormatter={(value) => `S/. ${value}`}
                          width={72}
                        />
                        <RechartsTooltip
                          formatter={(value: number) => formatAmount(value)}
                          labelFormatter={(label) => `Fecha ${label}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="total_registered"
                          stroke="#0ea5e9"
                          strokeWidth={2}
                          fill="url(#cashTrend)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <InlineStatusCard
                      title="Sin datos para la tendencia"
                      description="Ajusta los filtros o espera nuevas sesiones registradas."
                      tone="neutral"
                      variant="ops"
                    />
                  )}
                </div>
              </article>

              <article className="sales-panel rounded-lg p-5 shadow-sm md:p-6">
                <div className="flex items-center gap-2">
                  <MapPinned className="h-4 w-4 text-violet-600" />
                  <h2 className="text-sm font-semibold text-[var(--ops-text)]">
                    Comparativo por sede
                  </h2>
                </div>

                <div className="mt-4 h-64">
                  {locationChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={locationChartData}
                        layout="vertical"
                        margin={{ left: 24 }}
                      >
                        <CartesianGrid
                          stroke="var(--ops-border-strong)"
                          strokeDasharray="3 3"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 12, fill: "var(--ops-text-muted)" }}
                        />
                        <YAxis
                          type="category"
                          dataKey="short_name"
                          tick={{ fontSize: 12, fill: "var(--ops-text-muted)" }}
                          width={110}
                        />
                        <RechartsTooltip
                          formatter={(value: number) => formatAmount(value)}
                          labelFormatter={(label) => String(label)}
                        />
                        <Bar
                          dataKey="total_registered"
                          fill="var(--ripnel-accent)"
                          radius={[0, 8, 8, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <InlineStatusCard
                      title="Sin datos por sede"
                      description="Todavía no hay suficiente información para comparar sedes con estos filtros."
                      tone="neutral"
                      variant="ops"
                    />
                  )}
                </div>
              </article>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <article className="sales-panel rounded-lg p-5 shadow-sm md:p-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[var(--ops-text-muted)]" />
                  <h2 className="text-sm font-semibold text-[var(--ops-text)]">
                    Sesiones multi-sede
                  </h2>
                </div>

                {!sessions || sessions.items.length === 0 ? (
                  <div className="mt-4">
                    <InlineStatusCard
                      title="Sin sesiones para mostrar"
                      description="No hay sesiones registradas para los filtros seleccionados."
                      tone="neutral"
                      variant="ops"
                    />
                  </div>
                ) : (
                  <>
                    <div className="mt-4 hidden grid-cols-[0.9fr_0.95fr_1fr_0.85fr_36px] items-center gap-3 border-b border-[var(--ops-border-strong)] px-3 pb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--ops-text-muted)] md:grid">
                      <span>Fecha / estado</span>
                      <span>Sede</span>
                      <span>Apertura / cierre</span>
                      <span className="text-right">Total</span>
                      <span />
                    </div>

                    <div className="divide-y divide-[var(--ops-border-strong)]">
                      {sessions.items.map((closing) => (
                        <Link
                          key={closing.cash_closing_id}
                          href={`/caja/historial/${closing.cash_closing_id}`}
                          className="grid gap-3 px-3 py-4 transition hover:bg-[var(--ops-surface-muted)] md:grid-cols-[0.9fr_0.95fr_1fr_0.85fr_36px] md:items-center"
                        >
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-[var(--ops-text)]">
                              {formatBusinessDate(closing.business_date)}
                            </p>
                            <CashStatusBadge status={closing.status} />
                          </div>

                          <div className="space-y-1 text-sm text-[var(--ops-text-muted)]">
                            <p className="font-medium text-[var(--ops-text)]">
                              {closing.location_name}
                            </p>
                            <p>
                              {closing.opened_by_name ||
                                "Usuario no identificado"}
                            </p>
                          </div>

                          <div className="space-y-1 text-sm text-[var(--ops-text-muted)]">
                            <p>
                              Apertura: {formatDateTime(closing.created_at)}
                            </p>
                            <p>
                              {closing.closed_at
                                ? `Cierre: ${formatDateTime(closing.closed_at)}`
                                : "Cierre pendiente"}
                            </p>
                          </div>

                          <div className="text-left md:text-right">
                            <p className="text-sm font-semibold text-[var(--ops-text)]">
                              {formatAmount(closing.total_all)}
                            </p>
                            {closing.is_consistent === false ? (
                              <p className="text-xs text-[var(--ops-tone-warning-text)]">
                                Dif. {formatAmount(closing.difference)}
                              </p>
                            ) : (
                              <p className="text-xs text-[var(--ops-tone-success-text)]">
                                Consistencia OK
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-end text-[var(--ops-text-muted)]">
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </Link>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-col gap-3 border-t border-[var(--ops-border-strong)] pt-4 md:flex-row md:items-center md:justify-between">
                      <p className="text-sm text-[var(--ops-text-muted)]">
                        Página {pagination?.page || 1} de{" "}
                        {pagination?.total_pages || 1}
                      </p>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setPage((current) => Math.max(current - 1, 1))
                          }
                          disabled={!pagination || pagination.page <= 1}
                          className="sales-field sales-field-interactive rounded-xl px-3 py-2 text-sm font-medium text-[var(--ops-text)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Anterior
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPage((current) =>
                              Math.min(
                                current + 1,
                                pagination?.total_pages || current,
                              ),
                            )
                          }
                          disabled={
                            !pagination ||
                            pagination.page >= pagination.total_pages
                          }
                          className="sales-field sales-field-interactive rounded-xl px-3 py-2 text-sm font-medium text-[var(--ops-text)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </article>

              <article className="sales-panel rounded-lg p-5 shadow-sm md:p-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[var(--ops-tone-warning-text)]" />
                  <h2 className="text-sm font-semibold text-[var(--ops-text)]">
                    Alertas operativas
                  </h2>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="sales-panel-muted rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wide text-[var(--ops-text-muted)]">
                      Sedes con caja pendiente
                    </p>
                    <div className="mt-3 space-y-2">
                      {summary?.alerts.open_locations.length ? (
                        summary.alerts.open_locations.map((location) => (
                          <div
                            key={location.location_id}
                            className="sales-field flex items-center justify-between rounded-xl px-3 py-2"
                          >
                            <span className="text-sm text-[var(--ops-text)]">
                              {location.location_name}
                            </span>
                            <span className="text-sm font-semibold text-[var(--ops-tone-warning-text)]">
                              {location.open_count}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-[var(--ops-text-muted)]">
                          No hay sedes pendientes con estos filtros.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="sales-panel-muted rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wide text-[var(--ops-text-muted)]">
                      Diferencias por revisar
                    </p>
                    <div className="mt-3 space-y-2">
                      {summary?.alerts.inconsistent_sessions.length ? (
                        summary.alerts.inconsistent_sessions.map((session) => (
                          <Link
                            key={session.cash_closing_id}
                            href={`/caja/historial/${session.cash_closing_id}`}
                            className="sales-field sales-field-interactive flex items-center justify-between gap-3 rounded-xl px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium text-[var(--ops-text)]">
                                {session.location_name}
                              </p>
                              <p className="text-xs text-[var(--ops-text-muted)]">
                                {formatBusinessDate(session.business_date)}
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-[var(--ops-tone-warning-text)]">
                              {formatAmount(session.difference)}
                            </span>
                          </Link>
                        ))
                      ) : (
                        <p className="text-sm text-[var(--ops-text-muted)]">
                          No hay diferencias activas para revisar.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            </div>
        </OpsPageShell>
      </TooltipProvider>

      <OpsDialog
        open={reopenTarget !== null}
        onOpenChange={(open) => { if (!open) setReopenTarget(null) }}
        title="Reabrir caja"
        description="Confirma la reapertura de esta sesion de caja."
        size="sm"
        bodyClassName="space-y-4"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="sm" className="rounded-lg px-4" onClick={() => setReopenTarget(null)} disabled={reopeningCash}>
              Cancelar
            </Button>
            <Button type="button" variant="accent" size="sm" className="rounded-lg px-4" onClick={handleReopenCash} disabled={reopeningCash || !reopenNotes.trim()}>
              {reopeningCash ? "Reabriendo..." : "Reabrir caja"}
            </Button>
          </div>
        }
      >
        <OpsFormField label="Motivo de reapertura" required density="compact">
          <input
            value={reopenNotes}
            onChange={(event) => setReopenNotes(event.target.value)}
            placeholder="Ej. Error en cierre, venta pendiente de registrar..."
            className="sales-field h-9 w-full rounded-lg px-3 py-2 text-sm"
          />
        </OpsFormField>
        <p className="text-sm text-[var(--ops-text-muted)]">
          Al reabrir la caja se volvera a habilitar el registro de ventas en esa sede para la fecha de la sesion. Esta accion quedara registrada en el historial.
        </p>
      </OpsDialog>
    </PermissionGuard>
  );
}
