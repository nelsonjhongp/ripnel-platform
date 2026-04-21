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
      return "border-amber-200 bg-amber-50/90"
    }

    return "border-emerald-200 bg-emerald-50/80"
  }, [closing])

  if (loading) {
    return (
      <LoadingPage
        title="Cargando detalle de caja"
        description="Estamos recuperando la sesión de caja, sus montos y la consistencia operativa."
      />
    )
  }

  if (error instanceof ApiError && error.status === 404) {
    return <NotFoundPage />
  }

  if (error instanceof ApiError && error.status === 403) {
    return <ForbiddenPage />
  }

  if (error || !closing) {
    return (
      <ErrorPage
        title="No pudimos abrir el detalle de caja"
        description={error?.message || "La sesión solicitada no está disponible para esta sede."}
      />
    )
  }

  return (
    <PermissionGuard allowedRoles={CASH_ALLOWED_ROLES}>
      <TooltipProvider delayDuration={120}>
        <section className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_35%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
          <div className="mx-auto max-w-6xl space-y-5">
            <Link
              href="/caja/historial"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al historial
            </Link>

            <header className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs uppercase tracking-wide text-violet-600">Detalle de caja</p>
                    <HelpTooltip content="Vista detallada de la sesión elegida, con auditoría, montos y consistencia del sistema." />
                  </div>
                  <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
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

            <div className="grid gap-4 md:grid-cols-4">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total caja</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatAmount(closing.total_all)}
                </p>
              </article>
              <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-violet-700">Ventas confirmadas</p>
                <p className="mt-2 text-2xl font-bold text-violet-800">
                  {closing.sales_summary.sale_count}
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-600">Apertura</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatDateTime(closing.created_at)}
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-600">Cierre</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {closing.closed_at ? formatDateTime(closing.closed_at) : "Pendiente"}
                </p>
              </article>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
                <h2 className="text-lg font-semibold text-slate-900">Auditoría de la sesión</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Aperturada por</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {closing.opened_by_name || "Usuario no identificado"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(closing.created_at)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Cerrada por</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {closing.closed_by_name || "Aún sin cierre"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {closing.closed_at ? formatDateTime(closing.closed_at) : "Pendiente"}
                    </p>
                  </div>
                </div>

                {closing.notes ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Observaciones</p>
                    <p className="mt-2 text-sm text-slate-700">{closing.notes}</p>
                  </div>
                ) : null}
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
                <h2 className="text-lg font-semibold text-slate-900">Montos por método</h2>
                <div className="mt-4 space-y-2">
                  {METHOD_CONFIG.map((method) => {
                    const Icon = method.icon
                    const field = `total_${method.key}` as const
                    const value = closing[field]

                    return (
                      <div
                        key={method.key}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-slate-500" />
                          <span className="text-sm font-medium text-slate-700">{method.label}</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900">
                          {formatAmount(value)}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-violet-700">Total consolidado</p>
                  <p className="mt-2 text-3xl font-bold text-violet-900">
                    {formatAmount(closing.total_all)}
                  </p>
                </div>
              </article>
            </div>

            <article className={`rounded-3xl border p-5 shadow-md md:p-6 ${consistencyTone}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">Consistencia operativa</h2>
                    <HelpTooltip content="La diferencia compara ventas confirmadas vs pagos registrados en el sistema. No representa arqueo físico." />
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    {closing.sales_summary.consistency.is_consistent
                      ? "Los pagos del sistema coinciden con el total de ventas confirmadas para esta fecha operativa."
                      : "Hay diferencia entre ventas y pagos registrados. Conviene revisar los movimientos antes de usar este cierre como referencia final."}
                  </p>
                </div>

                {closing.sales_summary.consistency.is_consistent ? (
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Total ventas</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {formatAmount(closing.sales_summary.grand_total)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Total pagos</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {formatAmount(closing.sales_summary.consistency.payment_total)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Diferencia</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
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
