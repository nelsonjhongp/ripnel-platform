"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronRight, History, Info, RefreshCw } from "lucide-react"

import { PermissionGuard } from "@/components/auth/PermissionGuard"
import {
  ErrorPage,
  InlineStatusCard,
  LoadingPage,
} from "@/components/feedback/status-page"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ApiError, apiFetch } from "@/lib/api"
import {
  CashClosing,
  formatAmount,
  formatBusinessDate,
  formatDateTime,
  getCashStatusLabel,
  getCashStatusTone,
} from "@/lib/cash"

const CASH_ALLOWED_ROLES = ["ADMIN", "CAJA"]
const PAGE_SIZE = 20

type RangeFilter = "7d" | "30d"
type StatusFilter = "all" | "open" | "closed"

function explainCashHistoryError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "No se pudo cargar el historial de caja."
  }

  if (error.status === 403) {
    return "Tu rol no tiene acceso al historial de caja."
  }

  return error.message || "No se pudo cargar el historial de caja."
}

function HelpTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
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

function CashStatusBadge({ status }: { status: CashClosing["status"] }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getCashStatusTone(status)}`}
    >
      {getCashStatusLabel(status)}
    </span>
  )
}

function SummaryMetric({
  label,
  value,
  valueClassName = "text-slate-900",
}: {
  label: string
  value: string | number
  valueClassName?: string
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[11px] uppercase tracking-wide text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${valueClassName}`}>{value}</span>
    </div>
  )
}

export default function CashHistoryPage() {
  const [history, setHistory] = useState<CashClosing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<RangeFilter>("7d")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [page, setPage] = useState(1)

  const loadHistory = useCallback(async (nextRange = range, nextStatus = status) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ range: nextRange })
      if (nextStatus !== "all") {
        params.set("status", nextStatus)
      }

      const data = await apiFetch<CashClosing[]>(`/api/cash?${params.toString()}`, {
        cache: "no-store",
      })
      setHistory(Array.isArray(data) ? data : [])
    } catch (loadError) {
      setHistory([])
      setError(explainCashHistoryError(loadError))
    } finally {
      setLoading(false)
    }
  }, [range, status])

  useEffect(() => {
    // defer loadHistory to avoid synchronous setState inside effect
    void Promise.resolve().then(() => loadHistory(range, status));
  }, [range, status, loadHistory])

  useEffect(() => {
    // defer setPage to avoid synchronous setState inside effect
    void Promise.resolve().then(() => setPage(1));
  }, [range, status])

  const stats = useMemo(() => {
    const openCount = history.filter((item) => item.status === "open").length
    const closedCount = history.filter((item) => item.status === "closed").length
    const totalRegistered = history.reduce((acc, item) => acc + Number(item.total_all || 0), 0)

    return {
      count: history.length,
      openCount,
      closedCount,
      totalRegistered,
    }
  }, [history])

  const totalPages = Math.max(Math.ceil(history.length / PAGE_SIZE), 1)
  const visibleRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return history.slice(start, start + PAGE_SIZE)
  }, [history, page])

  useEffect(() => {
    void Promise.resolve().then(() => {
      if (page > totalPages) {
        setPage(totalPages)
      }
    })
  }, [page, totalPages])

  if (loading) {
    return (
      <LoadingPage
        title="Cargando historial de caja"
        description="Estamos recuperando las sesiones de caja registradas para tu sede operativa."
      />
    )
  }

  if (error) {
    return (
      <ErrorPage
        title="No pudimos abrir el historial de caja"
        description={error}
      />
    )
  }

  return (
    <PermissionGuard allowedRoles={CASH_ALLOWED_ROLES}>
      <TooltipProvider delayDuration={120}>
        <section className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_35%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
          <div className="mx-auto max-w-6xl space-y-5">
            <header className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs uppercase tracking-wide text-violet-600">Caja</p>
                    <HelpTooltip content="Aquí revisas las sesiones diarias registradas de la sede actual, con su estado y total consolidado." />
                  </div>
                  <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
                    Historial de caja
                  </h1>
                </div>

                <button
                  type="button"
                  onClick={() => loadHistory(range, status)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualizar
                </button>
              </div>
            </header>

            <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-md backdrop-blur md:flex-row md:items-center md:justify-between">
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
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

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
                        ? "bg-violet-600 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/95 px-4 py-3 shadow-md backdrop-blur">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <SummaryMetric label="Sesiones" value={stats.count} />
                <SummaryMetric
                  label="Pendientes"
                  value={stats.openCount}
                  valueClassName="text-amber-700"
                />
                <SummaryMetric label="Cerradas" value={stats.closedCount} />
                <SummaryMetric
                  label="Total registrado"
                  value={formatAmount(stats.totalRegistered)}
                  valueClassName="text-violet-700"
                />
              </div>
            </div>

            <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-violet-600" />
                <p className="text-sm font-semibold text-slate-900">Sesiones registradas</p>
              </div>

              {history.length === 0 ? (
                <div className="mt-4">
                  <InlineStatusCard
                    title="Sin sesiones registradas"
                    description="No se encontraron aperturas o cierres de caja para los filtros elegidos."
                    tone="neutral"
                  />
                </div>
              ) : (
                <>
                  <div className="mt-4 hidden grid-cols-[1.15fr_1fr_1fr_0.7fr_28px] items-center gap-3 border-b border-slate-200 px-3 pb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:grid">
                    <span>Sesión</span>
                    <span>Movimiento</span>
                    <span>Responsable</span>
                    <span className="text-right">Total</span>
                    <span />
                  </div>

                  <div className="divide-y divide-slate-100">
                    {visibleRows.map((closing) => (
                      <Link
                        key={closing.cash_closing_id}
                        href={`/caja/historial/${closing.cash_closing_id}`}
                        className="grid gap-3 px-3 py-4 transition hover:bg-slate-50 md:grid-cols-[1.15fr_1fr_1fr_0.7fr_28px] md:items-center"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              {formatBusinessDate(closing.business_date)}
                            </p>
                            <CashStatusBadge status={closing.status} />
                          </div>
                          <p className="text-sm text-slate-700">{closing.location_name}</p>
                        </div>

                        <div className="space-y-1 text-sm text-slate-600">
                          <p>
                            Apertura:{" "}
                            <span className="font-medium text-slate-700">
                              {formatDateTime(closing.created_at)}
                            </span>
                          </p>
                          <p>
                            {closing.closed_at ? (
                              <>
                                Cierre:{" "}
                                <span className="font-medium text-slate-700">
                                  {formatDateTime(closing.closed_at)}
                                </span>
                              </>
                            ) : (
                              "Cierre pendiente"
                            )}
                          </p>
                        </div>

                        <div className="space-y-1 text-sm text-slate-600">
                          <p className="font-medium text-slate-700">
                            {closing.opened_by_name || "Usuario no identificado"}
                          </p>
                          {closing.is_consistent === false ? (
                            <p className="text-amber-700">
                              Diferencia {formatAmount(closing.difference)}
                            </p>
                          ) : (
                            <p className="text-emerald-700">Consistencia OK</p>
                          )}
                        </div>

                        <div className="text-left md:text-right">
                          <p className="text-base font-semibold text-slate-900">
                            {formatAmount(closing.total_all)}
                          </p>
                        </div>

                        <div className="flex items-center justify-end text-slate-400">
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </Link>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm text-slate-500">
                      Página {page} de {totalPages}
                    </p>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((current) => Math.max(current - 1, 1))}
                        disabled={page <= 1}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
                        disabled={page >= totalPages}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                </>
              )}
            </article>
          </div>
        </section>
      </TooltipProvider>
    </PermissionGuard>
  )
}
