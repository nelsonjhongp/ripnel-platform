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
    valueClass: "text-[var(--ops-text)]",
  },
  {
    key: "yape" as const,
    label: "Yape",
    icon: Smartphone,
    valueClass: "text-[var(--ops-text)]",
  },
  {
    key: "plin" as const,
    label: "Plin",
    icon: Smartphone,
    valueClass: "text-[var(--ops-text)]",
  },
  {
    key: "transfer" as const,
    label: "Transferencia",
    icon: ArrowRightLeft,
    valueClass: "text-[var(--ops-text)]",
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
        <section className="sales-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
          <div className="mx-auto max-w-4xl">
            <InlineStatusCard
              title="Sin sede asignada"
              description="Tu usuario no tiene una sede default configurada. Contacta a un administrador antes de aperturar caja."
              tone="warning"
              variant="ops"
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
        <section className="sales-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
          <div className="mx-auto max-w-5xl space-y-5">
            <header className="sales-panel rounded-lg p-5 shadow-sm md:p-6">
              <p className="text-xs uppercase tracking-wide text-[var(--ripnel-accent-hover)]">Operaciones de caja</p>
              <h1 className="mt-1 text-2xl font-semibold text-[var(--ops-text)] md:text-3xl">Caja del día</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--ops-text-muted)]">
                <span>{defaultLocation.name}</span>
                {businessDate ? (
                  <>
                    <span className="text-[var(--ops-border-soft)]">•</span>
                    <span className="font-medium text-[var(--ops-text)]">
                      {formatBusinessDate(businessDate)}
                    </span>
                    <HelpTooltip content="La fecha operativa corresponde al día de trabajo de la sede actual en horario de Lima." />
                  </>
                ) : null}
              </div>
            </header>

            {error ? (
              <div className="sales-chip sales-chip-danger flex items-center gap-3 rounded-xl px-4 py-3 text-sm">
                <X className="h-4 w-4 shrink-0" />
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-current transition hover:opacity-80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : null}

            {loading ? (
              <div className="flex items-center justify-center py-16 text-[var(--ops-text-muted)]">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span className="ml-2 text-sm">Cargando caja...</span>
              </div>
            ) : (
              <>
                <article
                  className={`sales-panel rounded-lg p-5 shadow-sm md:p-6 ${
                    isOpen
                      ? "border-emerald-300/70 bg-[color:color-mix(in_srgb,#22c55e_12%,var(--ops-surface))]"
                      : isClosed
                        ? "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)]"
                        : "border-amber-300/70 bg-[color:color-mix(in_srgb,#f59e0b_13%,var(--ops-surface))]"
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
                              ? "text-emerald-700"
                              : isClosed
                                ? "text-[var(--ops-text)]"
                                : "text-amber-700"
                          }`}
                        >
                          {isOpen
                            ? "Caja operativa abierta"
                            : isClosed
                              ? "Caja operativa cerrada"
                              : "Aún no se abrió caja"}
                        </p>

                        {isOpen && current?.closing?.opened_by_name ? (
                          <p className="text-sm text-emerald-700/90">
                            Aperturada por{" "}
                            <span className="font-medium">{current.closing.opened_by_name}</span>
                          </p>
                        ) : null}

                        {isClosed && current?.closing?.closed_by_name ? (
                          <p className="text-sm text-[var(--ops-text-muted)]">
                            Cerrada por{" "}
                            <span className="font-medium">{current.closing.closed_by_name}</span>
                          </p>
                        ) : null}

                        {hasNoClosing ? (
                          <p className="text-sm text-amber-700/90">
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
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {actionLoading ? "Abriendo..." : "Abrir caja"}
                        </button>
                      ) : null}

                      {isOpen ? (
                        <button
                          onClick={() => setShowCloseConfirm(true)}
                          disabled={actionLoading}
                          className="rounded-xl bg-[var(--ops-text)] px-4 py-2 text-sm font-semibold text-[var(--ops-surface)] shadow-sm transition hover:opacity-90 disabled:opacity-60"
                        >
                          Cerrar caja
                        </button>
                      ) : null}

                      <button
                        onClick={fetchCurrent}
                        disabled={loading || actionLoading}
                        className="sales-field sales-field-interactive rounded-xl px-3 py-2 text-[var(--ops-text-muted)] disabled:opacity-60"
                        title="Actualizar"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>

                {summary ? (
                  <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                    <article className="sales-panel rounded-lg p-5 shadow-sm md:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs uppercase tracking-wide text-[var(--ops-text-muted)]">
                              Total del día
                            </p>
                            <HelpTooltip content="Suma las ventas confirmadas de la sede en la fecha operativa actual." />
                          </div>
                          <p className="mt-2 text-4xl font-bold text-[var(--ops-text)]">
                            {formatAmount(summary.grand_total)}
                          </p>
                        </div>

                        <div className="sales-chip sales-chip-accent rounded-xl px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <p className="text-[11px] uppercase tracking-wide">
                              Ventas confirmadas
                            </p>
                            <HelpTooltip content="Cantidad de ventas confirmadas para la sede actual en esta fecha operativa." />
                          </div>
                          <p className="mt-1 text-2xl font-bold">
                            {summary.sale_count}
                          </p>
                        </div>
                      </div>
                    </article>

                    <Collapsible className="sales-panel rounded-lg p-5 shadow-sm md:p-6">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs uppercase tracking-wide text-[var(--ops-text-muted)]">
                              Pagos del sistema
                            </p>
                            <HelpTooltip content="Total de pagos registrados en el sistema para la fecha operativa actual." />
                          </div>
                          <p className="mt-1 text-2xl font-bold text-[var(--ops-text)]">
                            {formatAmount(summary.consistency.payment_total)}
                          </p>
                        </div>

                        <CollapsibleTrigger className="sales-field sales-field-interactive group inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[var(--ops-text)]">
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
                              className="sales-panel-muted flex items-center justify-between rounded-xl px-4 py-3"
                            >
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-[var(--ops-text-muted)]" />
                                <span className="text-sm font-medium text-[var(--ops-text)]">
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
                    className={`sales-panel rounded-lg p-4 shadow-sm md:px-5 md:py-4 ${
                      consistencyOk
                        ? "border-emerald-300/70 bg-[color:color-mix(in_srgb,#22c55e_12%,var(--ops-surface))]"
                        : "border-amber-300/70 bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))]"
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
                        <div className="sales-panel-muted rounded-xl px-4 py-3">
                          <p className="text-[11px] uppercase tracking-wide text-[var(--ops-text-muted)]">Ventas</p>
                          <p className="mt-1 text-lg font-semibold text-[var(--ops-text)]">
                            {formatAmount(summary.grand_total)}
                          </p>
                        </div>
                        <div className="sales-panel-muted rounded-xl px-4 py-3">
                          <p className="text-[11px] uppercase tracking-wide text-[var(--ops-text-muted)]">Pagos</p>
                          <p className="mt-1 text-lg font-semibold text-[var(--ops-text)]">
                            {formatAmount(summary.consistency.payment_total)}
                          </p>
                        </div>
                        <div className="sales-panel-muted rounded-xl px-4 py-3">
                          <p className="text-[11px] uppercase tracking-wide text-[var(--ops-text-muted)]">
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
              <div className="ops-overlay-backdrop fixed inset-0 z-50 flex items-center justify-center px-4">
                <div className="ops-overlay-panel w-full max-w-md rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-[var(--ops-text)]">Confirmar cierre de caja</h2>
                  <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                    Se consolidarán los pagos registrados y ventas confirmadas de la fecha operativa
                    actual para esta sede.
                  </p>

                  {summary ? (
                    <div className="sales-panel-muted mt-4 space-y-1 rounded-xl p-4">
                      {METHOD_CONFIG.map((method) => (
                        <div key={method.key} className="flex justify-between text-sm">
                          <span className="text-[var(--ops-text-muted)]">{method.label}</span>
                          <span className="font-medium text-[var(--ops-text)]">
                            {formatAmount(summary.by_method[method.key])}
                          </span>
                        </div>
                      ))}
                      <div className="mt-2 flex justify-between border-t border-[var(--ops-border-strong)] pt-2 text-sm font-semibold">
                        <span className="text-[var(--ops-text)]">Total</span>
                        <span className="text-[var(--ops-text)]">{formatAmount(summary.grand_total)}</span>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4">
                    <label className="mb-1 block text-xs font-medium text-[var(--ops-text)]">
                      Observaciones (opcional)
                    </label>
                    <textarea
                      value={closeNotes}
                      onChange={(event) => setCloseNotes(event.target.value)}
                      rows={2}
                      placeholder="Ej: Sin novedades"
                      className="sales-field w-full rounded-xl px-3 py-2 text-sm outline-none transition focus:border-[var(--ripnel-accent)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_72%,transparent)]"
                    />
                  </div>

                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={() => setShowCloseConfirm(false)}
                      disabled={actionLoading}
                      className="sales-field sales-field-interactive flex-1 rounded-xl py-2 text-sm font-medium text-[var(--ops-text)]"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleClose}
                      disabled={actionLoading}
                      className="flex-1 rounded-xl bg-[var(--ops-text)] py-2 text-sm font-semibold text-[var(--ops-surface)] shadow-sm transition hover:opacity-90 disabled:opacity-60"
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
