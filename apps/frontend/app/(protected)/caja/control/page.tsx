"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Info,
  LineChart,
  MapPinned,
  RefreshCw,
  ShieldCheck,
} from "lucide-react"
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
} from "recharts"

import { PermissionGuard } from "@/components/auth/PermissionGuard"
import {
  ErrorPage,
  InlineStatusCard,
  LoadingPage,
} from "@/components/feedback/status-page"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ApiError, apiFetch } from "@/lib/api"
import {
  CashAdminSessionsResponse,
  CashAdminSummaryResponse,
  LocationOption,
  formatAmount,
  formatBusinessDate,
  formatDateTime,
  getCashStatusLabel,
  getCashStatusTone,
} from "@/lib/cash"

const PAGE_SIZE = 20
const ADMIN_ALLOWED_ROLES = ["ADMIN"]

type RangeFilter = "7d" | "30d"
type StatusFilter = "all" | "open" | "closed"

function HelpTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--ops-text-muted)] transition hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)]"
          aria-label="Más información"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} className="max-w-72">
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

function CashStatusBadge({ status }: { status: "open" | "closed" }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getCashStatusTone(status)}`}
    >
      {getCashStatusLabel(status)}
    </span>
  )
}

function explainControlError(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : fallback
  }

  if (error.status === 403) {
    return "Solo ADMIN puede acceder al control transversal de cajas."
  }

  return error.message || fallback
}

function buildQuery(params: {
  range: RangeFilter
  status: StatusFilter
  locationId: string
  page?: number
}) {
  const query = new URLSearchParams({
    range: params.range,
  })

  if (params.status !== "all") {
    query.set("status", params.status)
  }

  if (params.locationId !== "all") {
    query.set("locationId", params.locationId)
  }

  if (params.page) {
    query.set("page", String(params.page))
    query.set("pageSize", String(PAGE_SIZE))
  }

  return query.toString()
}

export default function CashControlPage() {
  const [summary, setSummary] = useState<CashAdminSummaryResponse | null>(null)
  const [sessions, setSessions] = useState<CashAdminSessionsResponse | null>(null)
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<RangeFilter>("7d")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [locationId, setLocationId] = useState("all")
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    async function loadLocations() {
      try {
        const data = await apiFetch<LocationOption[]>("/api/locations", {
          cache: "no-store",
        })

        if (active) {
          const normalized = Array.isArray(data)
            ? data.filter((item) => item.active !== false)
            : []
          setLocations(normalized)
        }
      } catch {
        if (active) {
          setLocations([])
        }
      }
    }

    loadLocations()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    // defer setPage to avoid synchronous setState inside effect
    void Promise.resolve().then(() => setPage(1));
  }, [range, status, locationId])

  useEffect(() => {
    let active = true

    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        const summaryQuery = buildQuery({ range, status, locationId })
        const sessionsQuery = buildQuery({ range, status, locationId, page })

        const [summaryData, sessionsData] = await Promise.all([
          apiFetch<CashAdminSummaryResponse>(`/api/cash/admin/summary?${summaryQuery}`, {
            cache: "no-store",
          }),
          apiFetch<CashAdminSessionsResponse>(`/api/cash/admin/sessions?${sessionsQuery}`, {
            cache: "no-store",
          }),
        ])

        if (active) {
          setSummary(summaryData)
          setSessions(sessionsData)
        }
      } catch (loadError) {
        if (active) {
          setSummary(null)
          setSessions(null)
          setError(explainControlError(loadError, "No se pudo cargar el control de cajas."))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [range, status, locationId, page, reloadKey])

  const trendData = useMemo(() => {
    return (summary?.trend || []).map((item) => ({
      ...item,
      short_date: formatBusinessDate(item.business_date).slice(0, 5),
    }))
  }, [summary])

  const locationChartData = useMemo(() => {
    return (summary?.by_location || []).slice(0, 6).map((item) => ({
      ...item,
      short_name:
        item.location_name.length > 14 ? `${item.location_name.slice(0, 14)}…` : item.location_name,
    }))
  }, [summary])

  if (loading && !summary && !sessions) {
    return (
      <LoadingPage
        title="Cargando control de cajas"
        description="Estamos reuniendo sesiones, sedes y alertas operativas para la vista administrativa."
        variant="ops"
      />
    )
  }

  if (error && !summary && !sessions) {
    return (
      <ErrorPage
        title="No pudimos abrir el control de cajas"
        description={error}
        variant="ops"
      />
    )
  }

  const stats = summary?.stats
  const pagination = sessions?.pagination

  return (
    <PermissionGuard allowedRoles={ADMIN_ALLOWED_ROLES}>
      <TooltipProvider delayDuration={120}>
        <section className="sales-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
          <div className="mx-auto max-w-7xl space-y-5">
            <header className="sales-panel rounded-lg p-5 shadow-sm md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs uppercase tracking-wide text-[var(--ripnel-accent-hover)]">Caja</p>
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
              <div role="alert" aria-live="polite" className="sales-chip sales-chip-danger rounded-xl px-4 py-3 text-sm">
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

                <select
                  value={locationId}
                  onChange={(event) => setLocationId(event.target.value)}
                  className="sales-field rounded-xl px-3 py-2 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--ripnel-accent)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_72%,transparent)]"
                >
                  <option value="all">Todas las sedes</option>
                  {locations.map((location) => (
                    <option key={location.location_id} value={location.location_id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="ops-metric-pill rounded-xl p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-wide text-[var(--ops-text-muted)]">Sesiones</p>
                <p className="mt-2 text-2xl font-bold text-[var(--ops-text)]">{stats?.session_count || 0}</p>
              </article>
              <article className="sales-chip sales-chip-warning rounded-xl p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-wide text-amber-700">
                  Pendientes de cierre
                </p>
                <p className="mt-2 text-2xl font-bold text-amber-800">{stats?.open_count || 0}</p>
              </article>
              <article className="sales-chip sales-chip-success rounded-xl p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-wide">Sedes abiertas</p>
                <p className="mt-2 text-2xl font-bold">
                  {stats?.open_location_count || 0}
                </p>
              </article>
              <article className="sales-chip sales-chip-accent rounded-xl p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-wide">Total registrado</p>
                <p className="mt-2 text-2xl font-bold">
                  {formatAmount(stats?.total_registered || 0)}
                </p>
              </article>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <article className="sales-panel rounded-lg p-5 shadow-sm md:p-6">
                <div className="flex items-center gap-2">
                  <LineChart className="h-4 w-4 text-sky-600" />
                  <h2 className="text-sm font-semibold text-[var(--ops-text)]">Tendencia diaria</h2>
                </div>

                <div className="mt-4 h-64">
                  {trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="cashTrend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--ops-border-strong)" strokeDasharray="3 3" />
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
                  <h2 className="text-sm font-semibold text-[var(--ops-text)]">Comparativo por sede</h2>
                </div>

                <div className="mt-4 h-64">
                  {locationChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={locationChartData} layout="vertical" margin={{ left: 24 }}>
                        <CartesianGrid
                          stroke="var(--ops-border-strong)"
                          strokeDasharray="3 3"
                          horizontal={false}
                        />
                        <XAxis type="number" tick={{ fontSize: 12, fill: "var(--ops-text-muted)" }} />
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
                  <h2 className="text-sm font-semibold text-[var(--ops-text)]">Sesiones multi-sede</h2>
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
                             <p className="font-medium text-[var(--ops-text)]">{closing.location_name}</p>
                            <p>{closing.opened_by_name || "Usuario no identificado"}</p>
                          </div>

                           <div className="space-y-1 text-sm text-[var(--ops-text-muted)]">
                            <p>Apertura: {formatDateTime(closing.created_at)}</p>
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
                              <p className="text-xs text-amber-700">
                                Dif. {formatAmount(closing.difference)}
                              </p>
                            ) : (
                              <p className="text-xs text-emerald-700">Consistencia OK</p>
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
                        Página {pagination?.page || 1} de {pagination?.total_pages || 1}
                      </p>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPage((current) => Math.max(current - 1, 1))}
                          disabled={!pagination || pagination.page <= 1}
                          className="sales-field sales-field-interactive rounded-xl px-3 py-2 text-sm font-medium text-[var(--ops-text)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Anterior
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPage((current) =>
                              Math.min(current + 1, pagination?.total_pages || current)
                            )
                          }
                          disabled={!pagination || pagination.page >= pagination.total_pages}
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
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <h2 className="text-sm font-semibold text-[var(--ops-text)]">Alertas operativas</h2>
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
                             <span className="text-sm text-[var(--ops-text)]">{location.location_name}</span>
                            <span className="text-sm font-semibold text-amber-700">
                              {location.open_count}
                            </span>
                          </div>
                        ))
                      ) : (
                         <p className="text-sm text-[var(--ops-text-muted)]">No hay sedes pendientes con estos filtros.</p>
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
                            <span className="text-sm font-semibold text-amber-700">
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
          </div>
        </section>
      </TooltipProvider>
    </PermissionGuard>
  )
}
