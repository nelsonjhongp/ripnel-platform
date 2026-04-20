"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowUpRight,
  Banknote,
  Boxes,
  CircleAlert,
  ClipboardList,
  CreditCard,
  PackageSearch,
  ReceiptText,
  RefreshCw,
  ShoppingCart,
  Truck,
  Wallet,
} from "lucide-react"

import { useAuth } from "@/components/auth/AuthProvider"
import { ErrorPage, InlineStatusCard, LoadingPage } from "@/components/feedback/status-page"
import { ApiError, apiFetch } from "@/lib/api"

type DashboardLocation = {
  location_id: string
  name: string
  code: string | null
  type: string
}

type DashboardContext = {
  generated_at: string
  business_date: string
  location: DashboardLocation
  user: {
    user_id: string
    full_name: string
    role_name: string | null
  }
}

type DashboardSections = {
  sales: boolean
  cash: boolean
  receipts: boolean
  postsales: boolean
  inventory: boolean
  transfers: boolean
}

type PaymentTotals = {
  cash: number
  yape: number
  plin: number
  transfer: number
  all: number
}

type SalesToday = {
  visible: boolean
  sale_count?: number
  total_amount?: number
  last_confirmed_at?: string | null
  by_method?: PaymentTotals
}

type CashClosing = {
  cash_closing_id: string
  business_date: string
  status: "open" | "closed"
  total_all: number
  location_name: string
  opened_by_name?: string | null
  closed_by_name?: string | null
  closed_at?: string | null
}

type CashSummary = {
  sale_count: number
  grand_total: number
  by_method: PaymentTotals
  consistency: {
    sales_total: number
    payment_total: number
    difference: number
    is_consistent: boolean
  }
}

type CashSection = {
  visible: boolean
  closing?: CashClosing | null
  sales_summary?: CashSummary
}

type ReceiptQueueItem = {
  sale_id: string
  sale_number: string | null
  document_type: string
  customer_name_text: string | null
  total_amount: number
  currency: string
  queued_at: string
  queue_status: "missing" | "pending" | "error"
  sunat_message: string | null
}

type ReceiptsSection = {
  visible: boolean
  open_count?: number
  missing_count?: number
  pending_count?: number
  error_count?: number
  latest?: ReceiptQueueItem[]
}

type PostsalesItem = {
  sale_id: string
  sale_number: string | null
  customer_name_text: string | null
  total_amount: number
  currency: string
  business_date: string
  occurred_at: string
  cash_status: "open" | "closed" | "missing"
  exchange_allowed: boolean
  cancel_allowed: boolean
}

type PostsalesSection = {
  visible: boolean
  recent_window_days?: number
  total_recent_confirmed?: number
  eligible_exchange_count?: number
  eligible_cancel_count?: number
  blocked_cancel_count?: number
  latest?: PostsalesItem[]
}

type TransferItem = {
  transfer_id: string
  transfer_number: string | null
  status: string
  from_location_name: string
  to_location_name: string
  shipped_at: string | null
  updated_at: string
  qty_shipped_total: number
}

type TransfersSection = {
  visible: boolean
  pending_receipts_count?: number
  draft_outgoing_count?: number
  latest?: TransferItem[]
}

type InventoryItem = {
  variant_id: string
  sku: string
  style_name: string
  style_code: string
  size_code: string
  color_code: string
  qty: number
}

type InventorySection = {
  visible: boolean
  low_stock_threshold?: number
  zero_stock_count?: number
  low_stock_count?: number
  critical_variants?: InventoryItem[]
}

type Shortcut = {
  key: string
  label: string
  href: string
  description: string
}

type DashboardOverview = {
  context: DashboardContext
  sections: DashboardSections
  sales_today: SalesToday
  cash: CashSection
  receipts_queue: ReceiptsSection
  postsales: PostsalesSection
  transfers: TransfersSection
  inventory: InventorySection
  shortcuts: Shortcut[]
}

type ActivityItem = {
  id: string
  type: string
  occurred_at: string
  title: string
  subtitle: string
  status: string
  href: string
}

type DashboardActivity = {
  items: ActivityItem[]
}

type OperationalPriority = {
  key: string
  title: string
  description: string
  href: string
  tone: "warning" | "danger" | "neutral"
}

function formatCurrency(value: number | null | undefined) {
  return `S/. ${Number(value || 0).toFixed(2)}`
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-"

  return new Date(value).toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-"

  return new Date(`${value}T00:00:00`).toLocaleDateString("es-PE", {
    dateStyle: "medium",
  })
}

function explainDashboardError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "No pudimos preparar el dashboard operativo."
  }

  if (error.status === 409) {
    return "Necesitas una sede default activa para cargar el dashboard operativo."
  }

  if (error.status === 401) {
    return "Tu sesion ya no es valida. Vuelve a iniciar sesion."
  }

  return error.message || "No pudimos preparar el dashboard operativo."
}

function queueTone(status: string) {
  if (status === "error") return "border-rose-200 bg-rose-50 text-rose-700"
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-700"
  return "border-slate-200 bg-slate-50 text-slate-700"
}

function cashTone(status: string | null | undefined) {
  if (status === "open") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "closed") return "border-slate-200 bg-slate-100 text-slate-700"
  return "border-amber-200 bg-amber-50 text-amber-700"
}

function priorityToneClasses(tone: OperationalPriority["tone"]) {
  if (tone === "danger") return "border-rose-200 bg-rose-50 text-rose-900"
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-900"
  return "border-slate-200 bg-slate-50 text-slate-900"
}

export default function DashboardPage() {
  const { loading: authLoading } = useAuth()
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [activity, setActivity] = useState<DashboardActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadDashboard(options: { silent?: boolean } = {}) {
    const isSilent = options.silent === true

    if (isSilent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError(null)

    try {
      const [overviewData, activityData] = await Promise.all([
        apiFetch<DashboardOverview>("/api/dashboard/overview", { cache: "no-store" }),
        apiFetch<DashboardActivity>("/api/dashboard/activity", { cache: "no-store" }),
      ])

      setOverview(overviewData)
      setActivity(activityData)
    } catch (loadError) {
      setError(explainDashboardError(loadError))
      if (!isSilent) {
        setOverview(null)
        setActivity(null)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const alerts = useMemo(() => {
    if (!overview) return []

    const nextAlerts: Array<{
      key: string
      title: string
      description: string
      href: string
      tone: "warning" | "danger"
    }> = []

    if (overview.cash.visible && !overview.cash.closing) {
      nextAlerts.push({
        key: "cash-missing",
        title: "La caja del dia aun no fue aperturada",
        description:
          "Antes de tomar este dashboard como referencia de caja conviene abrir la caja de la sede activa.",
        href: "/caja",
        tone: "warning",
      })
    }

    if (overview.receipts_queue.visible && Number(overview.receipts_queue.open_count || 0) > 0) {
      nextAlerts.push({
        key: "receipts-open",
        title: "Hay comprobantes pendientes o con error",
        description: `${overview.receipts_queue.open_count} venta(s) requieren seguimiento en emision o reintento.`,
        href: "/transaction-history",
        tone: "warning",
      })
    }

    if (overview.inventory.visible && Number(overview.inventory.zero_stock_count || 0) > 0) {
      nextAlerts.push({
        key: "inventory-zero",
        title: "Existen variantes sin stock",
        description: `${overview.inventory.zero_stock_count} variante(s) quedaron en cero y conviene revisar reposicion o ajuste.`,
        href: "/inventory",
        tone: "danger",
      })
    }

    if (overview.transfers.visible && Number(overview.transfers.pending_receipts_count || 0) > 0) {
      nextAlerts.push({
        key: "transfers-pending",
        title: "Hay transferencias pendientes de recepcion",
        description: `${overview.transfers.pending_receipts_count} transferencia(s) esperan recepcion en la sede actual.`,
        href: "/transferencias/recepciones-pendientes",
        tone: "warning",
      })
    }

    return nextAlerts
  }, [overview])

  const primaryPriority = useMemo<OperationalPriority>(() => {
    if (!overview) {
      return {
        key: "loading",
        title: "Preparando el contexto operativo",
        description: "Estamos consolidando la información del día para esta sede.",
        href: "/dashboard",
        tone: "neutral",
      }
    }

    if (overview.cash.visible && !overview.cash.closing) {
      return {
        key: "cash-open",
        title: "Abrir caja es la primera prioridad",
        description:
          "La sede aún no tiene caja del día aperturada. Conviene resolverlo antes de usar los totales comerciales como referencia.",
        href: "/caja",
        tone: "warning",
      }
    }

    if (overview.receipts_queue.visible && Number(overview.receipts_queue.error_count || 0) > 0) {
      return {
        key: "receipt-errors",
        title: "Revisar comprobantes con error",
        description: `${overview.receipts_queue.error_count} comprobante(s) requieren seguimiento manual o reintento.`,
        href: "/transaction-history",
        tone: "danger",
      }
    }

    if (overview.inventory.visible && Number(overview.inventory.zero_stock_count || 0) > 0) {
      return {
        key: "zero-stock",
        title: "Resolver quiebres de stock",
        description: `${overview.inventory.zero_stock_count} variante(s) ya no tienen stock en la sede activa.`,
        href: "/inventory",
        tone: "danger",
      }
    }

    if (
      overview.transfers.visible &&
      Number(overview.transfers.pending_receipts_count || 0) > 0
    ) {
      return {
        key: "pending-transfers",
        title: "Confirmar recepciones pendientes",
        description: `${overview.transfers.pending_receipts_count} transferencia(s) siguen pendientes de recepción en tienda.`,
        href: "/transferencias/recepciones-pendientes",
        tone: "warning",
      }
    }

    if (
      overview.cash.visible &&
      overview.cash.sales_summary &&
      !overview.cash.sales_summary.consistency.is_consistent
    ) {
      return {
        key: "cash-difference",
        title: "Revisar diferencia entre ventas y pagos",
        description: `Existe una diferencia de ${formatCurrency(
          overview.cash.sales_summary.consistency.difference
        )} entre ventas confirmadas y pagos registrados.`,
        href: "/caja",
        tone: "warning",
      }
    }

    return {
      key: "stable",
      title: "Operación del día estable",
      description:
        "No hay alertas críticas inmediatas. Puedes usar el dashboard para seguimiento comercial y operativo.",
      href: "/dashboard",
      tone: "neutral",
    }
  }, [overview])

  if ((loading || authLoading) && !overview) {
    return (
      <LoadingPage
        title="Cargando dashboard operativo"
        description="Estamos consolidando caja, ventas, comprobantes, inventario y actividad reciente."
      />
    )
  }

  if (!overview) {
    return (
      <ErrorPage
        title="No pudimos abrir el dashboard"
        description={error || "El dashboard operativo no esta disponible en este momento."}
      />
    )
  }

  const salesToday = overview.sales_today.visible ? overview.sales_today : null
  const cash = overview.cash.visible ? overview.cash : null
  const receipts = overview.receipts_queue.visible ? overview.receipts_queue : null
  const postsales = overview.postsales.visible ? overview.postsales : null
  const transfers = overview.transfers.visible ? overview.transfers : null
  const inventory = overview.inventory.visible ? overview.inventory : null
  const activityItems = activity?.items || []

  const headlineCards = [
    salesToday
      ? {
          key: "sales",
          label: "Ventas del dia",
          value: formatCurrency(salesToday.total_amount),
          meta: `${salesToday.sale_count || 0} venta(s) confirmadas`,
          href: "/transaction-history",
          icon: ShoppingCart,
          tone: "border-violet-200 bg-violet-50 text-violet-900",
        }
      : null,
    cash
      ? {
          key: "payments",
          label: "Pagos registrados",
          value: formatCurrency(cash.sales_summary?.consistency.payment_total),
          meta: cash.closing
            ? `Caja ${cash.closing.status === "open" ? "abierta" : "cerrada"}`
            : "Sin apertura",
          href: "/caja",
          icon: Wallet,
          tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
        }
      : null,
    receipts
      ? {
          key: "receipts",
          label: "Comprobantes abiertos",
          value: String(receipts.open_count || 0),
          meta: `${receipts.error_count || 0} error · ${receipts.pending_count || 0} pending`,
          href: "/transaction-history",
          icon: ReceiptText,
          tone: "border-amber-200 bg-amber-50 text-amber-900",
        }
      : null,
    inventory
      ? {
          key: "inventory",
          label: "Stock critico",
          value: String(
            Number(inventory.zero_stock_count || 0) + Number(inventory.low_stock_count || 0)
          ),
          meta: `${inventory.zero_stock_count || 0} en cero · ${inventory.low_stock_count || 0} bajo minimo`,
          href: "/inventory",
          icon: Boxes,
          tone: "border-rose-200 bg-rose-50 text-rose-900",
        }
      : null,
    transfers
      ? {
          key: "transfers",
          label: "Recepciones pendientes",
          value: String(transfers.pending_receipts_count || 0),
          meta: `${transfers.draft_outgoing_count || 0} salida(s) aun en borrador`,
          href: "/transferencias/recepciones-pendientes",
          icon: Truck,
          tone: "border-sky-200 bg-sky-50 text-sky-900",
        }
      : null,
    postsales
      ? {
          key: "postsales",
          label: "Postventa reciente",
          value: String(postsales.eligible_exchange_count || 0),
          meta: `${postsales.eligible_cancel_count || 0} anulable(s) en ${postsales.recent_window_days} dias`,
          href: "/postventa",
          icon: PackageSearch,
          tone: "border-orange-200 bg-orange-50 text-orange-900",
        }
      : null,
  ].filter(Boolean)

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_22%,#f8fafc_52%,#eef2ff_100%)] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                Dashboard operativo
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
                {overview.context.location.name}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {overview.context.location.code || "Sin codigo"} · {formatDate(overview.context.business_date)} ·{" "}
                {overview.context.user.full_name}
                {overview.context.user.role_name ? ` · ${overview.context.user.role_name}` : ""}
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Esta portada resume la operacion critica del dia para la sede activa: caja,
                ventas, comprobantes, postventa, transferencias, stock critico y actividad reciente.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/bi"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowUpRight className="h-4 w-4" />
                Abrir BI
              </Link>
              <button
                type="button"
                onClick={() => loadDashboard({ silent: true })}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Actualizando..." : "Actualizar"}
              </button>
            </div>
          </div>
        </header>

        <article
          className={`rounded-3xl border p-5 shadow-sm ${priorityToneClasses(primaryPriority.tone)}`}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-current/70">
                Foco del día
              </p>
              <h2 className="mt-1 text-xl font-semibold text-current">{primaryPriority.title}</h2>
              <p className="mt-2 text-sm leading-6 text-current/80">
                {primaryPriority.description}
              </p>
            </div>
            <Link
              href={primaryPriority.href}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/80 px-4 py-2.5 text-sm font-semibold text-current transition hover:bg-white"
            >
              Ir al módulo
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </article>

        {alerts.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {alerts.map((alert) => {
              const toneClasses =
                alert.tone === "danger"
                  ? "border-rose-200 bg-rose-50 text-rose-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"

              return (
                <Link
                  key={alert.key}
                  href={alert.href}
                  className={`rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${toneClasses}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-white/70 p-2.5 text-current">
                        <CircleAlert className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-current">{alert.title}</p>
                        <p className="mt-1 text-sm leading-6 text-current/80">{alert.description}</p>
                      </div>
                    </div>
                    <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-current/70" />
                  </div>
                </Link>
              )
            })}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {headlineCards.map((card) => {
            if (!card) return null

            const Icon = card.icon

            return (
              <Link
                key={card.key}
                href={card.href}
                className={`rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${card.tone}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-current/70">
                      {card.label}
                    </p>
                    <p className="mt-3 text-3xl font-bold text-current">{card.value}</p>
                    <p className="mt-2 text-sm text-current/75">{card.meta}</p>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-3">
                    <Icon className="h-5 w-5 text-current" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            {salesToday ? (
              <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">
                      Ventas y cobro del dia
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">
                      Flujo comercial de la sede activa
                    </h2>
                  </div>
                  <Link
                    href="/purchase-system"
                    className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-100"
                  >
                    Nueva venta
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5">
                    <p className="text-sm font-semibold text-violet-800">Resumen rapido</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white/80 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total vendido</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">
                          {formatCurrency(salesToday.total_amount)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/80 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ventas confirmadas</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">
                          {salesToday.sale_count || 0}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-violet-900/80">
                      Ultima confirmacion: {formatDateTime(salesToday.last_confirmed_at)}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-semibold text-slate-800">Metodos de pago</p>
                    <div className="mt-4 space-y-3">
                      {[
                        { key: "cash", label: "Efectivo" },
                        { key: "yape", label: "Yape" },
                        { key: "plin", label: "Plin" },
                        { key: "transfer", label: "Transferencia" },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                          <span className="text-sm text-slate-600">{item.label}</span>
                          <span className="text-sm font-semibold text-slate-900">
                            {formatCurrency(salesToday.by_method?.[item.key as keyof PaymentTotals] as number)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ) : null}

            {cash && !cash.sales_summary?.consistency.is_consistent ? (
              <InlineStatusCard
                title="Caja con diferencia pendiente"
                description={`Ventas y pagos no cierran exactamente hoy. La diferencia actual es ${formatCurrency(
                  cash.sales_summary?.consistency.difference
                )}. Conviene revisar antes de tomar el cierre como referencia final.`}
                tone="warning"
                icon={<Wallet className="h-5 w-5" />}
              />
            ) : null}

            {cash ? (
              <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                      Caja del dia
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">
                      Estado y consistencia operativa
                    </h2>
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${cashTone(
                      cash.closing?.status
                    )}`}
                  >
                    {cash.closing
                      ? cash.closing.status === "open"
                        ? "Caja abierta"
                        : "Caja cerrada"
                      : "Sin apertura"}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-emerald-600" />
                      <p className="text-sm font-semibold text-slate-800">Ventas vs pagos</p>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <div className="flex justify-between">
                        <span>Total ventas</span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(cash.sales_summary?.consistency.sales_total)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total pagos</span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(cash.sales_summary?.consistency.payment_total)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Diferencia</span>
                        <span
                          className={`font-semibold ${
                            cash.sales_summary?.consistency.is_consistent
                              ? "text-emerald-700"
                              : "text-amber-700"
                          }`}
                        >
                          {formatCurrency(cash.sales_summary?.consistency.difference)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-sky-600" />
                      <p className="text-sm font-semibold text-slate-800">Actividad del cierre</p>
                    </div>
                    <p className="mt-4 text-2xl font-bold text-slate-900">
                      {cash.sales_summary?.sale_count || 0}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">venta(s) confirmadas hoy</p>
                    <p className="mt-4 text-sm text-slate-600">
                      {cash.closing
                        ? `Registro ${cash.closing.status === "open" ? "abierto" : "cerrado"} para ${formatDate(
                            cash.closing.business_date
                          )}.`
                        : "Aun no existe una caja abierta para la fecha de negocio."}
                    </p>
                  </div>

                  <Link
                    href="/caja"
                    className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-emerald-700" />
                      <p className="text-sm font-semibold text-emerald-800">Ir a caja</p>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-emerald-900/80">
                      Abrir, revisar o cerrar caja con el detalle consolidado del dia.
                    </p>
                  </Link>
                </div>
              </article>
            ) : null}

            <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Accesos rapidos
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    Atajos para la operacion
                  </h2>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {overview.shortcuts.map((shortcut) => (
                  <Link
                    key={shortcut.key}
                    href={shortcut.href}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{shortcut.label}</p>
                      <ArrowUpRight className="h-4 w-4 text-slate-400" />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{shortcut.description}</p>
                  </Link>
                ))}
              </div>
            </article>
          </div>

          <div className="space-y-5">
            {receipts ? (
              <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur">
                <div className="flex items-center gap-2">
                  <ReceiptText className="h-4 w-4 text-amber-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Comprobantes</h2>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Open</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{receipts.open_count || 0}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Missing</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{receipts.missing_count || 0}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Error</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{receipts.error_count || 0}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {(receipts.latest || []).length > 0 ? (
                    receipts.latest?.map((item) => (
                      <Link
                        key={`${item.sale_id}-${item.queue_status}`}
                        href={`/purchase-system/${item.sale_id}`}
                        className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-white"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {item.sale_number || "Sin correlativo"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {item.customer_name_text || "Cliente general"} · {item.document_type}
                            </p>
                          </div>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${queueTone(
                              item.queue_status
                            )}`}
                          >
                            {item.queue_status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {formatCurrency(item.total_amount)} · {formatDateTime(item.queued_at)}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      No hay comprobantes abiertos en este momento.
                    </p>
                  )}
                </div>
              </article>
            ) : null}

            {postsales ? (
              <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur">
                <div className="flex items-center gap-2">
                  <PackageSearch className="h-4 w-4 text-orange-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Postventa reciente</h2>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cambio</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {postsales.eligible_exchange_count || 0}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Anulable</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {postsales.eligible_cancel_count || 0}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Bloqueada</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {postsales.blocked_cancel_count || 0}
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {(postsales.latest || []).length > 0 ? (
                    postsales.latest?.map((item) => (
                      <Link
                        key={item.sale_id}
                        href={`/postventa/${item.sale_id}`}
                        className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-white"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {item.sale_number || "Sin correlativo"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {item.customer_name_text || "Cliente general"} ·{" "}
                              {formatCurrency(item.total_amount)}
                            </p>
                          </div>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cashTone(
                              item.cash_status
                            )}`}
                          >
                            Caja {item.cash_status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {item.cancel_allowed
                            ? "Permite cambio y anulacion."
                            : "Permite cambio simple, pero la anulacion esta bloqueada."}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      No encontramos ventas recientes listas para postventa.
                    </p>
                  )}
                </div>
              </article>
            ) : null}

            {inventory ? (
              <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur">
                <div className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-rose-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Inventario critico</h2>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Se consideran criticas las variantes con stock `0` o menor/igual a{" "}
                  {inventory.low_stock_threshold || 0}.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">En cero</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {inventory.zero_stock_count || 0}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Bajo minimo</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {inventory.low_stock_count || 0}
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {(inventory.critical_variants || []).length > 0 ? (
                    inventory.critical_variants?.map((item) => (
                      <Link
                        key={item.variant_id}
                        href="/inventory"
                        className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-white"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{item.style_name}</p>
                            <p className="text-xs text-slate-500">
                              {item.sku} · {item.size_code} / {item.color_code}
                            </p>
                          </div>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                              Number(item.qty || 0) === 0
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-amber-200 bg-amber-50 text-amber-700"
                            }`}
                          >
                            Stock {item.qty}
                          </span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      No hay variantes criticas para la sede operativa.
                    </p>
                  )}
                </div>
              </article>
            ) : null}

            {transfers ? (
              <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-sky-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Transferencias por recibir</h2>
                </div>
                <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-700">Pendientes</p>
                  <p className="mt-2 text-3xl font-bold text-sky-900">
                    {transfers.pending_receipts_count || 0}
                  </p>
                </div>
                <div className="mt-4 space-y-3">
                  {(transfers.latest || []).length > 0 ? (
                    transfers.latest?.map((item) => (
                      <Link
                        key={item.transfer_id}
                        href={`/transferencias/${item.transfer_id}`}
                        className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-white"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {item.transfer_number || "Sin correlativo"}
                            </p>
                            <p className="text-xs text-slate-500">
                              Desde {item.from_location_name} · {item.qty_shipped_total} und
                            </p>
                          </div>
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          Actualizado {formatDateTime(item.shipped_at || item.updated_at)}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      No hay recepciones pendientes en este momento.
                    </p>
                  )}
                </div>
              </article>
            ) : null}
          </div>
        </div>

        <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Actividad reciente</h2>
          </div>
          <div className="mt-4 space-y-3">
            {activityItems.length > 0 ? (
              activityItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-white md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.subtitle}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {item.type}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {item.status}
                    </span>
                    <span className="text-xs text-slate-500">{formatDateTime(item.occurred_at)}</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Aun no hay actividad reciente visible para tu rol en esta sede.
              </p>
            )}
          </div>
        </article>
      </div>
    </section>
  )
}
