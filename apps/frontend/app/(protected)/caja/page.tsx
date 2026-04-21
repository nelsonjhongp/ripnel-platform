"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ArrowRightLeft,
  Banknote,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Info,
  RefreshCw,
  Smartphone,
  X,
} from "lucide-react"

import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { InlineStatusCard } from "@/components/feedback/status-page"
import { useAuth } from "@/components/auth/AuthProvider"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ApiError, apiFetch } from "@/lib/api"
import { CurrentCashResponse, formatAmount, formatBusinessDate } from "@/lib/cash"

const CASH_ALLOWED_ROLES = ["ADMIN", "CAJA"]

const METHOD_CONFIG = [
  {
    key: "cash" as const,
    label: "Efectivo",
    icon: Banknote,
    valueClass: "text-emerald-900",
  },
  {
    key: "yape" as const,
    label: "Yape",
    icon: Smartphone,
    valueClass: "text-violet-900",
  },
  {
    key: "plin" as const,
    label: "Plin",
    icon: Smartphone,
    valueClass: "text-sky-900",
  },
  {
    key: "transfer" as const,
    label: "Transferencia",
    icon: ArrowRightLeft,
    valueClass: "text-amber-900",
  },
]

function explainCashError(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : fallback
  }

  if (error.status === 409) {
    return error.message
  }

  if (error.status === 403) {
    return "Solo los roles CAJA o ADMIN pueden operar este módulo."
  }

  return error.message || fallback
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

export default function CajaPage() {
  const { defaultLocation } = useAuth()
  const [current, setCurrent] = useState<CurrentCashResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [closeNotes, setCloseNotes] = useState("")
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const locationId = defaultLocation?.location_id

  const fetchCurrent = useCallback(async () => {
    if (!locationId) return

    setLoading(true)
    setError(null)

    try {
      const data = await apiFetch<CurrentCashResponse>("/api/cash/current", {
        cache: "no-store",
      })
      setCurrent(data)
    } catch (err) {
      setError(explainCashError(err, "Error al cargar caja"))
    } finally {
      setLoading(false)
    }
  }, [locationId])

  useEffect(() => {
    fetchCurrent()
  }, [fetchCurrent])

  async function handleOpen() {
    if (!locationId) return

    setActionLoading(true)
    setError(null)

    try {
      await apiFetch("/api/cash/open", {
        method: "POST",
        body: JSON.stringify({ location_id: locationId }),
      })
      await fetchCurrent()
    } catch (err) {
      setError(explainCashError(err, "Error al abrir caja"))
    } finally {
      setActionLoading(false)
    }
  }

  async function handleClose() {
    if (!current?.closing) return

    setActionLoading(true)
    setError(null)

    try {
      await apiFetch(`/api/cash/${current.closing.cash_closing_id}/close`, {
        method: "PATCH",
        body: JSON.stringify({ notes: closeNotes || undefined }),
      })
      setShowCloseConfirm(false)
      setCloseNotes("")
      await fetchCurrent()
    } catch (err) {
      setError(explainCashError(err, "Error al cerrar caja"))
    } finally {
      setActionLoading(false)
    }
  }

  if (!locationId) {
    return (
      <PermissionGuard allowedRoles={CASH_ALLOWED_ROLES}>
        <section className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_35%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
          <div className="mx-auto max-w-4xl">
            <InlineStatusCard
              title="Sin sede asignada"
              description="Tu usuario no tiene una sede default configurada. Contacta a un administrador antes de aperturar caja."
              tone="warning"
            />
          </div>
        </section>
      </PermissionGuard>
    )
  }

  const isClosed = current?.closing?.status === "closed"
  const isOpen = current?.closing?.status === "open"
  const hasNoClosing = current !== null && current.closing === null
  const summary = current?.sales_summary
  const businessDate = current?.business_date
  const consistencyOk = summary?.consistency.is_consistent ?? true

  return (
    <PermissionGuard allowedRoles={CASH_ALLOWED_ROLES}>
      <TooltipProvider delayDuration={120}>
        <section className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_35%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
          <div className="mx-auto max-w-5xl space-y-5">
            <header className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
              <p className="text-xs uppercase tracking-wide text-violet-600">Operaciones de caja</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">Caja del día</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span>{defaultLocation.name}</span>
                {businessDate ? (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="font-medium text-slate-800">
                      {formatBusinessDate(businessDate)}
                    </span>
                    <HelpTooltip content="La fecha operativa corresponde al día de trabajo de la sede actual en horario de Lima." />
                  </>
                ) : null}
              </div>
            </header>

            {error ? (
              <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                <X className="h-4 w-4 shrink-0" />
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-rose-600 transition hover:text-rose-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : null}

            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-500">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span className="ml-2 text-sm">Cargando caja...</span>
              </div>
            ) : (
              <>
                <article
                  className={`rounded-3xl border p-5 shadow-md md:p-6 ${
                    isOpen
                      ? "border-emerald-200 bg-emerald-50/80"
                      : isClosed
                        ? "border-slate-200 bg-slate-50"
                        : "border-amber-200 bg-amber-50/80"
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      {isOpen ? (
                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                      ) : isClosed ? (
                        <X className="h-6 w-6 text-slate-500" />
                      ) : (
                        <Clock3 className="h-6 w-6 text-amber-600" />
                      )}

                      <div>
                        <p
                          className={`text-lg font-semibold ${
                            isOpen
                              ? "text-emerald-800"
                              : isClosed
                                ? "text-slate-700"
                                : "text-amber-800"
                          }`}
                        >
                          {isOpen
                            ? "Caja operativa abierta"
                            : isClosed
                              ? "Caja operativa cerrada"
                              : "Aún no se abrió caja"}
                        </p>

                        {isOpen && current?.closing?.opened_by_name ? (
                          <p className="text-sm text-emerald-800/80">
                            Aperturada por{" "}
                            <span className="font-medium">{current.closing.opened_by_name}</span>
                          </p>
                        ) : null}

                        {isClosed && current?.closing?.closed_by_name ? (
                          <p className="text-sm text-slate-700/80">
                            Cerrada por{" "}
                            <span className="font-medium">{current.closing.closed_by_name}</span>
                          </p>
                        ) : null}

                        {hasNoClosing ? (
                          <p className="text-sm text-amber-800/80">
                            Abre caja para habilitar ventas en esta sede.
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {hasNoClosing ? (
                        <button
                          onClick={handleOpen}
                          disabled={actionLoading}
                          className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {actionLoading ? "Abriendo..." : "Abrir caja"}
                        </button>
                      ) : null}

                      {isOpen ? (
                        <button
                          onClick={() => setShowCloseConfirm(true)}
                          disabled={actionLoading}
                          className="rounded-2xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-slate-900 disabled:opacity-60"
                        >
                          Cerrar caja
                        </button>
                      ) : null}

                      <button
                        onClick={fetchCurrent}
                        disabled={loading || actionLoading}
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                        title="Actualizar"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>

                {summary ? (
                  <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                    <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs uppercase tracking-wide text-slate-500">
                              Total del día
                            </p>
                            <HelpTooltip content="Suma las ventas confirmadas de la sede en la fecha operativa actual." />
                          </div>
                          <p className="mt-2 text-4xl font-bold text-slate-900">
                            {formatAmount(summary.grand_total)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <p className="text-[11px] uppercase tracking-wide text-violet-700">
                              Ventas confirmadas
                            </p>
                            <HelpTooltip content="Cantidad de ventas confirmadas para la sede actual en esta fecha operativa." />
                          </div>
                          <p className="mt-1 text-2xl font-bold text-violet-800">
                            {summary.sale_count}
                          </p>
                        </div>
                      </div>
                    </article>

                    <Collapsible className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs uppercase tracking-wide text-slate-500">
                              Pagos del sistema
                            </p>
                            <HelpTooltip content="Total de pagos registrados en el sistema para la fecha operativa actual." />
                          </div>
                          <p className="mt-1 text-2xl font-bold text-slate-900">
                            {formatAmount(summary.consistency.payment_total)}
                          </p>
                        </div>

                        <CollapsibleTrigger className="group inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                          Ver medios de pago
                          <ChevronDown className="h-4 w-4 transition group-data-[state=open]:rotate-180" />
                        </CollapsibleTrigger>
                      </div>

                      <CollapsibleContent className="mt-4 space-y-2">
                        {METHOD_CONFIG.map((method) => {
                          const Icon = method.icon
                          const value = summary.by_method[method.key]

                          return (
                            <div
                              key={method.key}
                              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                            >
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-slate-500" />
                                <span className="text-sm font-medium text-slate-700">
                                  {method.label}
                                </span>
                              </div>
                              <span className={`text-sm font-semibold ${method.valueClass}`}>
                                {formatAmount(value)}
                              </span>
                            </div>
                          )
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                ) : null}

                {summary ? (
                  <article
                    className={`rounded-3xl border p-4 shadow-md md:px-5 md:py-4 ${
                      consistencyOk
                        ? "border-emerald-200 bg-emerald-50/80"
                        : "border-amber-200 bg-amber-50/90"
                    }`}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-xs uppercase tracking-wide ${
                              consistencyOk ? "text-emerald-700" : "text-amber-700"
                            }`}
                          >
                            {consistencyOk ? "Caja cuadra" : "Revisar diferencia"}
                          </p>
                          <HelpTooltip content="La diferencia compara ventas confirmadas contra pagos registrados en el sistema. No representa conteo físico." />
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3 md:min-w-[28rem]">
                        <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Ventas</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">
                            {formatAmount(summary.grand_total)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Pagos</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">
                            {formatAmount(summary.consistency.payment_total)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">
                            Diferencia
                          </p>
                          <p
                            className={`mt-1 text-lg font-semibold ${
                              consistencyOk ? "text-emerald-800" : "text-amber-800"
                            }`}
                          >
                            {formatAmount(summary.consistency.difference)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                ) : null}
              </>
            )}

            {showCloseConfirm ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                  <h2 className="text-lg font-bold text-slate-900">Confirmar cierre de caja</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Se consolidarán los pagos registrados y ventas confirmadas de la fecha operativa
                    actual para esta sede.
                  </p>

                  {summary ? (
                    <div className="mt-4 space-y-1 rounded-2xl bg-slate-50 p-4">
                      {METHOD_CONFIG.map((method) => (
                        <div key={method.key} className="flex justify-between text-sm">
                          <span className="text-slate-600">{method.label}</span>
                          <span className="font-medium text-slate-900">
                            {formatAmount(summary.by_method[method.key])}
                          </span>
                        </div>
                      ))}
                      <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-sm font-semibold">
                        <span className="text-slate-800">Total</span>
                        <span className="text-slate-900">{formatAmount(summary.grand_total)}</span>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4">
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Observaciones (opcional)
                    </label>
                    <textarea
                      value={closeNotes}
                      onChange={(event) => setCloseNotes(event.target.value)}
                      rows={2}
                      placeholder="Ej: Sin novedades"
                      className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                  </div>

                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={() => setShowCloseConfirm(false)}
                      disabled={actionLoading}
                      className="flex-1 rounded-2xl border border-slate-200 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleClose}
                      disabled={actionLoading}
                      className="flex-1 rounded-2xl bg-slate-800 py-2 text-sm font-semibold text-white shadow transition hover:bg-slate-900 disabled:opacity-60"
                    >
                      {actionLoading ? "Cerrando..." : "Cerrar caja"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </TooltipProvider>
    </PermissionGuard>
  )
}
