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
import { OpsPageShell, OpsFiltersRow } from "@/components/ui/ops-page-shell";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { OpsPanel } from "@/components/ui/ops-panel";
import { OpsAttentionRow } from "@/components/ui/ops-attention-row";
import { OpsMetricCard } from "@/components/ui/ops-metric-card";
import { OpsDataTable, type OpsDataTableColumn } from "@/components/ui/ops-data-table";
import { DashboardChartCard } from "@/components/dashboard/dashboard-chart-card";
import { OpsSelect, type OpsOption } from "@/components/ui/ops-selection";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { OpsDialog } from "@/components/ui/ops-dialog";
import { OpsFormField } from "@/components/ui/ops-form-field";
import { AdminActionButton } from "@/components/admin/admin-ui";
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
        <OpsPageShell width="wide">
          <PosHeader
            eyebrow="Caja"
            title="Control de cajas"

            actions={
              <>
                <Link
                  href="/caja"
                  className="sales-field sales-field-interactive inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--ops-text)] shadow-sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Caja del día
                </Link>
                <AdminActionButton
                  onClick={() => setReloadKey((current) => current + 1)}
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualizar
                </AdminActionButton>
              </>
            }
          />

          {error ? (
            <InlineStatusCard
              title="Error"
              description={error}
              tone="danger"
              variant="ops"
            />
          ) : null}

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

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <OpsMetricCard
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Sesiones"
              value={stats?.session_count || 0}
            />
            <OpsMetricCard
              icon={<LineChart className="h-4 w-4" />}
              label="Total registrado"
              value={formatAmount(stats?.total_registered || 0)}
              tone="accent"
            />
            <OpsMetricCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Pendientes de cierre"
              value={stats?.open_count || 0}
              tone="warning"
            />
            <OpsMetricCard
              icon={<MapPinned className="h-4 w-4" />}
              label="Sedes abiertas"
              value={stats?.open_location_count || 0}
              tone="success"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <DashboardChartCard
              title="Tendencia diaria"
              subtitle="Evolución del total registrado por fecha"
              height={260}
            >
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
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
                          stopColor="var(--ripnel-accent)"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--ripnel-accent)"
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
                      stroke="var(--ripnel-accent)"
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
            </DashboardChartCard>

            <DashboardChartCard
              title="Comparativo por sede"
              subtitle="Top 6 sedes por total registrado"
              height={260}
            >
              {locationChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
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
            </DashboardChartCard>
          </div>

          {/* Title - spans both columns */}
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--ops-text-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--ops-text)]">
              Sesiones multi-sede
            </h2>
          </div>

          {/* Sub-grid for table + alerts side by side */}
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="min-w-0">
              <OpsDataTable
                columns={tableColumns}
                isEmpty={!sessions || sessions.items.length === 0}
                emptyMessage="No hay sesiones registradas para los filtros seleccionados."
                footer={
                  sessions && sessions.items.length > 0 ? (
                    <Pagination
                      page={pagination?.page || 1}
                      totalPages={pagination?.total_pages || 1}
                      onPageChange={setPage}
                    />
                  ) : undefined
                }
              >
                {sessions?.items.map((closing) => (
                  <tr
                    key={closing.cash_closing_id}
                    className="text-sm text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
                  >
                    <td className="px-4 py-[var(--ops-row-py)]">
                      <div className="space-y-2">
                        <p className="font-semibold">
                          {formatBusinessDate(closing.business_date)}
                        </p>
                        <CashStatusBadge status={closing.status} />
                      </div>
                    </td>
                    <td className="px-4 py-[var(--ops-row-py)] text-[var(--ops-text-muted)]">
                      <p className="font-medium text-[var(--ops-text)]">
                        {closing.location_name}
                      </p>
                      <p>
                        {closing.opened_by_name ||
                          "Usuario no identificado"}
                      </p>
                    </td>
                    <td className="px-4 py-[var(--ops-row-py)] text-[var(--ops-text-muted)]">
                      <p>
                        Apertura: {formatDateTime(closing.created_at)}
                      </p>
                      <p>
                        {closing.closed_at
                          ? `Cierre: ${formatDateTime(closing.closed_at)}`
                          : "Cierre pendiente"}
                      </p>
                    </td>
                    <td className="px-4 py-[var(--ops-row-py)]">
                      <p className="font-semibold">
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
                    </td>
                    <td className="px-4 py-[var(--ops-row-py)]">
                      <div className="flex items-center gap-2">
                        {canReopenCash && closing.status === "closed" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            disabled={reopeningCash}
                            onClick={() => {
                              setReopenNotes("")
                              setReopenTarget(closing.cash_closing_id)
                            }}
                          >
                            Reabrir
                          </Button>
                        ) : null}
                        <Link
                          href={`/caja/historial/${closing.cash_closing_id}`}
                          className="inline-flex items-center text-[var(--ops-text-muted)] transition hover:text-[var(--ops-text)]"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </OpsDataTable>
            </div>

            <OpsPanel>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[var(--ops-tone-warning-text)]" />
                <h2 className="text-sm font-semibold text-[var(--ops-text)]">
                  Alertas operativas
                </h2>
              </div>

              <div className="mt-4 space-y-2">
                {summary && summary.alerts.open_locations.length > 0 &&
                  summary.alerts.open_locations.map((location) => (
                    <OpsAttentionRow
                      key={location.location_id}
                      icon={<AlertTriangle className="h-4 w-4" />}
                      title={location.location_name}
                      description={`${location.open_count} sesión abierta`}
                      ctaLabel="Ver"
                      href={`/caja/historial`}
                      highlightValue={String(location.open_count)}
                      badge="Pendiente"
                      tone="warning"
                      embedded
                    />
                  ))}
                {summary && summary.alerts.inconsistent_sessions.length > 0 &&
                  summary.alerts.inconsistent_sessions.map((session) => (
                    <OpsAttentionRow
                      key={session.cash_closing_id}
                      icon={<AlertTriangle className="h-4 w-4" />}
                      title={session.location_name}
                      description={formatBusinessDate(session.business_date)}
                      ctaLabel="Revisar"
                      href={`/caja/historial/${session.cash_closing_id}`}
                      highlightValue={formatAmount(session.difference)}
                      tone="danger"
                      embedded
                    />
                  ))}
                {!summary || (summary.alerts.open_locations.length === 0 &&
                  summary.alerts.inconsistent_sessions.length === 0) && (
                  <p className="text-sm text-[var(--ops-text-muted)]">
                    No hay alertas operativas con estos filtros.
                  </p>
                )}
              </div>
            </OpsPanel>
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
