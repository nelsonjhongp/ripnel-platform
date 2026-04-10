"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ArrowRightLeft,
  Banknote,
  CheckCircle2,
  ChevronRight,
  Clock,
  RefreshCw,
  Smartphone,
  X,
} from "lucide-react"

import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { InlineStatusCard } from "@/components/feedback/status-page"
import { useAuth } from "@/components/auth/AuthProvider"
import { ApiError, apiFetch } from "@/lib/api"

type PaymentTotals = {
  cash: number
  yape: number
  plin: number
  transfer: number
  all: number
}

type CashClosing = {
  cash_closing_id: string
  location_id: string
  location_name: string
  business_date: string
  status: "open" | "closed"
  opened_by: string | null
  opened_by_name: string | null
  closed_by: string | null
  closed_by_name: string | null
  total_cash: number
  total_yape: number
  total_plin: number
  total_transfer: number
  total_all: number
  notes: string | null
  created_at: string
  closed_at: string | null
}

type SalesConsistency = {
  payment_total: number
  difference: number
  is_consistent: boolean
}

type SalesSummary = {
  sale_count: number
  grand_total: number
  by_method: PaymentTotals
  consistency: SalesConsistency
}

type CurrentCashResponse = {
  closing: CashClosing | null
  business_date: string
  sales_summary: SalesSummary
}

const CASH_ALLOWED_ROLES = ["ADMIN", "CAJA"]

const METHOD_CONFIG = [
  { key: "cash" as const, label: "Efectivo", icon: Banknote, color: "emerald" },
  { key: "yape" as const, label: "Yape", icon: Smartphone, color: "violet" },
  { key: "plin" as const, label: "Plin", icon: Smartphone, color: "sky" },
  { key: "transfer" as const, label: "Transferencia", icon: ArrowRightLeft, color: "amber" },
]

const COLOR_MAP: Record<
  string,
  { card: string; label: string; value: string; icon: string }
> = {
  emerald: {
    card: "border-emerald-200 bg-emerald-50",
    label: "text-emerald-700",
    value: "text-emerald-900",
    icon: "text-emerald-600",
  },
  violet: {
    card: "border-violet-200 bg-violet-50",
    label: "text-violet-700",
    value: "text-violet-900",
    icon: "text-violet-600",
  },
  sky: {
    card: "border-sky-200 bg-sky-50",
    label: "text-sky-700",
    value: "text-sky-900",
    icon: "text-sky-600",
  },
  amber: {
    card: "border-amber-200 bg-amber-50",
    label: "text-amber-700",
    value: "text-amber-900",
    icon: "text-amber-600",
  },
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-")
  return `${day}/${month}/${year}`
}

function formatAmount(value: number | string | undefined) {
  return `S/. ${Number(value || 0).toFixed(2)}`
}

function explainCashError(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : fallback
  }

  if (error.status === 409) {
    return error.message
  }

  if (error.status === 403) {
    return "Solo los roles CAJA o ADMIN pueden operar este modulo."
  }

  return error.message || fallback
}

export default function CajaPage() {
  const { defaultLocation } = useAuth()
  const [current, setCurrent] = useState<CurrentCashResponse | null>(null)
  const [history, setHistory] = useState<CashClosing[]>([])
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

  const fetchHistory = useCallback(async () => {
    if (!locationId) return

    try {
      const data = await apiFetch<CashClosing[]>("/api/cash", {
        cache: "no-store",
      })
      setHistory(Array.isArray(data) ? data : [])
    } catch {
      setHistory([])
    }
  }, [locationId])

  useEffect(() => {
    fetchCurrent()
    fetchHistory()
  }, [fetchCurrent, fetchHistory])

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
      await fetchHistory()
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
      await fetchHistory()
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

  return (
    <PermissionGuard allowedRoles={CASH_ALLOWED_ROLES}>
      <section className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_35%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
        <div className="mx-auto max-w-4xl space-y-5">
          <header className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
            <p className="text-xs uppercase tracking-wide text-violet-600">Operaciones de caja</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">Caja y cierre diario</h1>
            <p className="mt-1 text-sm text-slate-600">
              {defaultLocation.name}
              {businessDate ? (
                <span className="ml-2 font-medium text-slate-800">• {formatDate(businessDate)}</span>
              ) : null}
            </p>
          </header>

          {error ? (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <X className="h-4 w-4 shrink-0" />
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-auto text-rose-600 hover:text-rose-800"
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
                      <Clock className="h-6 w-6 text-amber-600" />
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
                        {isOpen ? "Caja abierta" : isClosed ? "Caja cerrada" : "Sin apertura"}
                      </p>
                      {isOpen && current?.closing?.opened_by_name ? (
                        <p className="text-xs text-emerald-700">
                          Aperturada por {current.closing.opened_by_name}
                        </p>
                      ) : null}
                      {isClosed && current?.closing?.closed_by_name ? (
                        <p className="text-xs text-slate-600">
                          Cerrada por {current.closing.closed_by_name}
                          {current.closing.closed_at ? (
                            <> • {new Date(current.closing.closed_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</>
                          ) : null}
                        </p>
                      ) : null}
                      {hasNoClosing ? (
                        <p className="text-xs text-amber-700">
                          No existe caja abierta para la sede activa en la fecha actual.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex gap-2">
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
                        className="rounded-2xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        Cerrar caja
                      </button>
                    ) : null}

                    <button
                      onClick={() => {
                        fetchCurrent()
                        fetchHistory()
                      }}
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
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                    {METHOD_CONFIG.map((method) => {
                      const cc = COLOR_MAP[method.color]
                      const Icon = method.icon
                      const value = summary.by_method[method.key]

                      return (
                        <article
                          key={method.key}
                          className={`rounded-2xl border p-4 shadow-sm ${cc.card}`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${cc.icon}`} />
                            <p className={`text-xs uppercase tracking-wide ${cc.label}`}>{method.label}</p>
                          </div>
                          <p className={`mt-2 text-xl font-bold ${cc.value}`}>{formatAmount(value)}</p>
                        </article>
                      )
                    })}
                  </div>

                  <article className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Total del dia</p>
                      <p className="mt-1 text-3xl font-bold text-slate-900">
                        {formatAmount(summary.grand_total)}
                      </p>
                    </div>
                    <div className="flex flex-col justify-center sm:items-end">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Ventas confirmadas</p>
                      <p className="mt-1 text-2xl font-bold text-violet-700">{summary.sale_count}</p>
                    </div>
                  </article>

                  <article
                    className={`rounded-2xl border p-4 shadow-sm ${
                      summary.consistency.is_consistent
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <p
                      className={`text-xs uppercase tracking-wide ${
                        summary.consistency.is_consistent ? "text-emerald-700" : "text-amber-700"
                      }`}
                    >
                      Consistencia contra ventas
                    </p>
                    <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                      <div>
                        <p className="text-slate-500">Total ventas</p>
                        <p className="font-semibold text-slate-900">{formatAmount(summary.grand_total)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Total pagos</p>
                        <p className="font-semibold text-slate-900">
                          {formatAmount(summary.consistency.payment_total)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Diferencia</p>
                        <p
                          className={`font-semibold ${
                            summary.consistency.is_consistent
                              ? "text-emerald-800"
                              : "text-amber-800"
                          }`}
                        >
                          {formatAmount(summary.consistency.difference)}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`mt-3 text-sm ${
                        summary.consistency.is_consistent
                          ? "text-emerald-800"
                          : "text-amber-800"
                      }`}
                    >
                      {summary.consistency.is_consistent
                        ? "Los pagos del dia coinciden con el total de ventas confirmadas."
                        : "Existe diferencia entre ventas confirmadas y pagos registrados. Conviene revisar antes de tomar el cierre como referencia final."}
                    </p>
                  </article>
                </div>
              ) : null}
            </>
          )}

          {history.length > 0 ? (
            <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
              <p className="mb-3 text-sm font-semibold text-slate-800">Historial de cierres</p>
              <div className="divide-y divide-slate-100">
                {history.map((closing) => (
                  <div key={closing.cash_closing_id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{formatDate(closing.business_date)}</p>
                      <p className="text-xs text-slate-500">{closing.location_name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatAmount(closing.total_all)}
                      </p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                          closing.status === "open"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {closing.status === "open" ? "Abierta" : "Cerrada"}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ) : null}
        </div>

        {showCloseConfirm ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-slate-900">Confirmar cierre de caja</h2>
              <p className="mt-1 text-sm text-slate-600">
                Se calcularan los totales de ventas confirmadas del dia y se cerrara la caja.
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
      </section>
    </PermissionGuard>
  )
}
