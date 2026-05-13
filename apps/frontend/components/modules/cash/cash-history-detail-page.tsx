"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  ArrowRightLeft,
  Banknote,
  CheckCircle2,
  Info,
  Smartphone,
} from "lucide-react"

import { PermissionGuard } from "@/components/auth/PermissionGuard"
import {
  ErrorPage,
  ForbiddenPage,
  LoadingPage,
  NotFoundPage,
} from "@/components/feedback/status-page"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ApiError, apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  CashClosingDetail,
  formatAmount,
  formatBusinessDate,
  formatDateTime,
  getCashStatusLabel,
  getCashStatusTone,
} from "@/lib/cash"

const CASH_ALLOWED_ROLES = ["ADMIN", "CAJA"]

const METHOD_CONFIG = [
  { key: "cash" as const, label: "Efectivo", icon: Banknote },
  { key: "yape" as const, label: "Yape", icon: Smartphone },
  { key: "plin" as const, label: "Plin", icon: Smartphone },
  { key: "transfer" as const, label: "Transferencia", icon: ArrowRightLeft },
]

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

function MetricPill({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string | number
  tone?: "default" | "accent" | "warning"
}) {
  const toneClass =
    tone === "accent"
      ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_88%,var(--ops-surface))] text-[var(--ops-text)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--ripnel-accent)_14%,transparent)]"
      : tone === "warning"
        ? "border-[color:color-mix(in_srgb,#f59e0b_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#f59e0b_78%,var(--ops-text))]"
        : "border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_66%,var(--ops-surface))] text-[var(--ops-text)]"
  const labelClass =
    tone === "accent"
      ? "text-[color:color-mix(in_srgb,var(--ripnel-accent)_72%,var(--ops-text))]"
      : tone === "warning"
        ? "text-[color:color-mix(in_srgb,#f59e0b_82%,var(--ops-text))]"
        : "text-[var(--ops-text-muted)]"
  const valueClass =
    tone === "accent"
      ? "text-[var(--ops-text)]"
      : tone === "warning"
        ? "text-[color:color-mix(in_srgb,#f59e0b_78%,var(--ops-text))]"
        : "text-[var(--ops-text)]"

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full border px-3 py-2",
        toneClass
      )}
    >
      <span className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", labelClass)}>
        {label}
      </span>
      <span className={cn("text-base font-semibold leading-none", valueClass)}>{value}</span>
    </div>
  )
}

export default function CashHistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [cashId, setCashId] = useState<string | null>(null)
  const [closing, setClosing] = useState<CashClosingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let active = true

    params.then(({ id }) => {
      if (active) {
        setCashId(id)
      }
    })

    return () => {
      active = false
    }
  }, [params])

  useEffect(() => {
    if (!cashId) return

    let active = true

    async function loadClosing() {
      setLoading(true)
      setError(null)

      try {
        const data = await apiFetch<CashClosingDetail>(`/api/cash/${cashId}`, {
          cache: "no-store",
        })

        if (active) {
          setClosing(data)
        }
      } catch (loadError) {
        if (active) {
          setClosing(null)
          setError(loadError instanceof Error ? loadError : new Error("No se pudo cargar la caja."))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadClosing()

    return () => {
      active = false
    }
  }, [cashId])

  const consistencyTone = useMemo(() => {
    if (!closing?.sales_summary.consistency.is_consistent) {
      return "border-amber-300/70 bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))]"
    }

    return "border-emerald-300/70 bg-[color:color-mix(in_srgb,#22c55e_12%,var(--ops-surface))]"
  }, [closing])

  if (loading) {
    return (
      <LoadingPage
        title="Cargando detalle de caja"
        description="Estamos recuperando la sesión de caja, sus montos y la consistencia operativa."
        variant="ops"
      />
    )
  }

  if (error instanceof ApiError && error.status === 404) {
    return <NotFoundPage variant="ops" />
  }

  if (error instanceof ApiError && error.status === 403) {
    return <ForbiddenPage variant="ops" />
  }

  if (error || !closing) {
    return (
      <ErrorPage
        title="No pudimos abrir el detalle de caja"
        description={error?.message || "La sesión solicitada no está disponible para esta sede."}
        variant="ops"
      />
    )
  }

  return (
    <PermissionGuard allowedRoles={CASH_ALLOWED_ROLES}>
      <TooltipProvider delayDuration={120}>
        <section className="sales-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
          <div className="mx-auto max-w-6xl space-y-5">
            <Link
              href="/caja/historial"
              className="sales-field sales-field-interactive inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--ops-text)] shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al historial
            </Link>

            <header className="px-1 space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs uppercase tracking-wide text-[var(--ripnel-accent-hover)]">Detalle de caja</p>
                    <HelpTooltip content="Vista detallada de la sesión elegida, con auditoría, montos y consistencia del sistema." />
                  </div>
                  <h1 className="mt-1 text-2xl font-semibold text-[var(--ops-text)] md:text-[1.75rem]">
                    {closing.location_name} • {formatBusinessDate(closing.business_date)}
                  </h1>
                </div>

                <span
                  className={`inline-flex rounded-full border px-3 py-1.5 text-sm font-semibold ${getCashStatusTone(closing.status)}`}
                >
                  {getCashStatusLabel(closing.status)}
                </span>
              </div>
            </header>

            <div className="flex flex-wrap items-center gap-2">
              <MetricPill label="Total caja" value={formatAmount(closing.total_all)} tone="accent" />
              <MetricPill label="Ventas" value={closing.sales_summary.sale_count} tone="accent" />
              <MetricPill label="Apertura" value={formatDateTime(closing.created_at)} />
              <MetricPill label="Cierre" value={closing.closed_at ? formatDateTime(closing.closed_at) : "Pendiente"} />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <article className="sales-panel rounded-lg p-5 shadow-sm md:p-6">
                <h2 className="text-lg font-semibold text-[var(--ops-text)]">Auditoría de la sesión</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="sales-panel-muted rounded-xl px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--ops-text-muted)]">Aperturada por</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--ops-text)]">
                      {closing.opened_by_name || "Usuario no identificado"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                      {formatDateTime(closing.created_at)}
                    </p>
                  </div>
                  <div className="sales-panel-muted rounded-xl px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--ops-text-muted)]">Cerrada por</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--ops-text)]">
                      {closing.closed_by_name || "Aún sin cierre"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                      {closing.closed_at ? formatDateTime(closing.closed_at) : "Pendiente"}
                    </p>
                  </div>
                </div>

                {closing.notes ? (
                  <div className="sales-field mt-4 rounded-xl px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--ops-text-muted)]">Observaciones</p>
                    <p className="mt-2 text-sm text-[var(--ops-text)]">{closing.notes}</p>
                  </div>
                ) : null}
              </article>

              <article className="sales-panel rounded-lg p-5 shadow-sm md:p-6">
                <h2 className="text-lg font-semibold text-[var(--ops-text)]">Montos por método</h2>
                <div className="mt-4 space-y-2">
                  {METHOD_CONFIG.map((method) => {
                    const Icon = method.icon
                    const field = `total_${method.key}` as const
                    const value = closing[field]

                    return (
                      <div
                        key={method.key}
                        className="sales-panel-muted flex items-center justify-between rounded-xl px-4 py-3"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-[var(--ops-text-muted)]" />
                          <span className="text-sm font-medium text-[var(--ops-text)]">{method.label}</span>
                        </div>
                        <span className="text-sm font-semibold text-[var(--ops-text)]">
                          {formatAmount(value)}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="sales-chip sales-chip-accent mt-4 rounded-xl px-4 py-4">
                  <p className="text-xs uppercase tracking-wide">Total consolidado</p>
                  <p className="mt-2 text-3xl font-bold">
                    {formatAmount(closing.total_all)}
                  </p>
                </div>
              </article>
            </div>

            <article className={`sales-panel rounded-lg p-5 shadow-sm md:p-6 ${consistencyTone}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-[var(--ops-text)]">Consistencia operativa</h2>
                    <HelpTooltip content="La diferencia compara ventas confirmadas vs pagos registrados en el sistema. No representa arqueo físico." />
                  </div>
                  <p className="mt-2 text-sm text-[var(--ops-text-muted)]">
                    {closing.sales_summary.consistency.is_consistent
                      ? "Los pagos del sistema coinciden con el total de ventas confirmadas para esta fecha operativa."
                      : "Hay diferencia entre ventas y pagos registrados. Conviene revisar los movimientos antes de usar este cierre como referencia final."}
                  </p>
                </div>

                {closing.sales_summary.consistency.is_consistent ? (
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-[color:color-mix(in_srgb,#059669_80%,var(--ops-text))]" />
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="sales-panel-muted rounded-xl px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--ops-text-muted)]">Total ventas</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--ops-text)]">
                    {formatAmount(closing.sales_summary.grand_total)}
                  </p>
                </div>
                <div className="sales-panel-muted rounded-xl px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--ops-text-muted)]">Total pagos</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--ops-text)]">
                    {formatAmount(closing.sales_summary.consistency.payment_total)}
                  </p>
                </div>
                <div className="sales-panel-muted rounded-xl px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--ops-text-muted)]">Diferencia</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--ops-text)]">
                    {formatAmount(closing.sales_summary.consistency.difference)}
                  </p>
                </div>
              </div>
            </article>
          </div>
        </section>
      </TooltipProvider>
    </PermissionGuard>
  )
}
