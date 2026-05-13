"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowUpRight,
  CircleAlert,
  RefreshCw,
  Wallet,
} from "lucide-react"

import { useAuth } from "@/components/auth/AuthProvider"
import { AdminInlineMessage } from "@/components/admin/admin-ui"
import { ErrorPage, ProtectedLoadingPage } from "@/components/feedback/status-page"
import { OpsMetricPill } from "@/components/ui/ops-metric-pill"
import {
  OpsPageShell,
  OpsSectionDivider,
} from "@/components/ui/ops-page-shell"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { useSidebarTopbarActions } from "@/components/sidebar"
import { DashboardPaymentChart } from "@/components/dashboard/DashboardPaymentChart"
import DashboardPressureChart from "@/components/dashboard/DashboardPressureChart"
import { fetchDashboardOverview } from "@/lib/api-dashboard"
import { appRoutes, buildSaleDetailRoute } from "@/lib/routes"
import type {
  CashSection,
  DashboardOverview,
  InventoryItem,
  InventorySection,
  PaymentBarData,
  PostsalesItem,
  PostsalesSection,
  PressureBarData,
  ReceiptQueueItem,
  ReceiptsSection,
  SalesToday,
  TransferItem,
  TransfersSection,
} from "@/lib/dashboard-types"
import { ApiError } from "@/lib/api"

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
  if (status === "error") return "border-[color:color-mix(in_srgb,#f43f5e_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f43f5e_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#be123c_74%,var(--ops-text))]"
  if (status === "pending") return "border-[color:color-mix(in_srgb,#f59e0b_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]"
  return "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text)]"
}

function cashStatusTone(status: string | null | undefined) {
  if (status === "open") return "border-[color:color-mix(in_srgb,#10b981_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_74%,var(--ops-text))]"
  if (status === "closed") return "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text)]"
  return "border-[color:color-mix(in_srgb,#f59e0b_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]"
}

function todayPeruISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" })
}

export default function DashboardPage() {
  const { loading: authLoading } = useAuth()
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<"today" | "week" | "month">("today")

  const dateRange = useMemo(() => {
    const today = todayPeruISO()
    if (period === "today") return { date_from: today, date_to: today }
    if (period === "week") {
      const d = new Date()
      d.setDate(d.getDate() - 6)
      return { date_from: d.toLocaleDateString("en-CA", { timeZone: "America/Lima" }), date_to: today }
    }
    const d = new Date()
    d.setDate(d.getDate() - 29)
    return { date_from: d.toLocaleDateString("en-CA", { timeZone: "America/Lima" }), date_to: today }
  }, [period])

  const loadDashboard = useCallback(async (options: { silent?: boolean } = {}) => {
    const isSilent = options.silent === true
    if (isSilent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const overviewData = await fetchDashboardOverview({ date_from: dateRange.date_from, date_to: dateRange.date_to })
      setOverview(overviewData)
    } catch (loadError) {
      setError(explainDashboardError(loadError))
      if (!isSilent) {
        setOverview(null)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [dateRange.date_from, dateRange.date_to])

  useEffect(() => {
    void Promise.resolve().then(() => loadDashboard())
  }, [loadDashboard])

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
        href: appRoutes.transactionHistory,
        tone: "warning",
      })
    }

    if (overview.inventory.visible && Number(overview.inventory.zero_stock_count || 0) > 0) {
      nextAlerts.push({
        key: "inventory-zero",
        title: "Existen variantes sin stock",
        description: `${overview.inventory.zero_stock_count} variante(s) quedaron en cero y conviene revisar reposicion o ajuste.`,
        href: appRoutes.inventory,
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

  const dashboardTopbarActions = useMemo(
    () => [
      {
        key: "dashboard-bi",
        label: "Abrir BI",
        href: appRoutes.businessIntelligence,
        icon: <ArrowUpRight className="h-4 w-4" />,
        variant: "outline" as const,
      },
    ],
    []
  )

  useSidebarTopbarActions(dashboardTopbarActions)

  if ((loading || authLoading) && !overview) {
    return (
      <ProtectedLoadingPage
        title="Cargando dashboard operativo…"
        description="Estamos consolidando caja, ventas, comprobantes, inventario y actividad reciente."
      />
    )
  }

  if (!overview) {
    return (
      <ErrorPage
        variant="ops"
        title="No pudimos abrir el dashboard"
        description={error || "El dashboard operativo no esta disponible en este momento."}
        onReset={() => loadDashboard()}
      />
    )
  }

  const sales = overview.sales_today.visible ? overview.sales_today : null
  const cash = overview.cash.visible ? overview.cash : null
  const receipts = overview.receipts_queue.visible ? overview.receipts_queue : null
  const postsales = overview.postsales.visible ? overview.postsales : null
  const transfers = overview.transfers.visible ? overview.transfers : null
  const inventory = overview.inventory.visible ? overview.inventory : null

  const kpiPills = [
    sales
      ? { key: "sales", label: "Ventas del dia", value: formatCurrency(sales.total_amount), tone: "accent" as const, href: appRoutes.transactionHistory }
      : null,
    cash
      ? { key: "payments", label: "Pagos registrados", value: formatCurrency(cash.sales_summary?.consistency.payment_total), tone: "default" as const, href: "/caja" }
      : null,
    receipts
      ? { key: "receipts", label: "Comprobantes abiertos", value: String(receipts.open_count || 0), tone: (receipts.open_count && receipts.open_count > 0 ? "warning" : "default") as "default" | "accent" | "warning" | "success", href: appRoutes.transactionHistory }
      : null,
    inventory
      ? { key: "inventory", label: "Stock critico", value: String(Number(inventory.zero_stock_count || 0) + Number(inventory.low_stock_count || 0)), tone: (Number(inventory.zero_stock_count || 0) > 0 ? "warning" : "default") as "default" | "accent" | "warning" | "success", href: appRoutes.inventory }
      : null,
    transfers
      ? { key: "transfers", label: "Recepciones pendientes", value: String(transfers.pending_receipts_count || 0), tone: (Number(transfers.pending_receipts_count || 0) > 0 ? "warning" : "default") as "default" | "accent" | "warning" | "success", href: "/transferencias/recepciones-pendientes" }
      : null,
    postsales
      ? { key: "postsales", label: "Postventa reciente", value: String(postsales.eligible_exchange_count || 0), tone: "default" as const, href: "/postventa" }
      : null,
  ].filter(Boolean)

  const paymentMix: PaymentBarData[] = sales?.by_method
    ? [
        { key: "cash", label: "Efectivo", amount: Number(sales.by_method.cash || 0) },
        { key: "yape", label: "Yape", amount: Number(sales.by_method.yape || 0) },
        { key: "plin", label: "Plin", amount: Number(sales.by_method.plin || 0) },
        { key: "transfer", label: "Transferencia", amount: Number(sales.by_method.transfer || 0) },
      ]
    : []

  const pressureMix: PressureBarData[] = [
    { key: "receipts", label: "Comprobantes abiertos", value: Number(receipts?.open_count || 0) },
    { key: "inventory", label: "Stock critico", value: Number(inventory?.zero_stock_count || 0) + Number(inventory?.low_stock_count || 0) },
    { key: "transfers", label: "Recepciones pendientes", value: Number(transfers?.pending_receipts_count || 0) },
    { key: "postsales", label: "Postventa habilitada", value: Number(postsales?.eligible_exchange_count || 0) },
  ]

  return (
    <TooltipProvider delayDuration={120}>
      <OpsPageShell width="wide">
        <PosHeader
          eyebrow="Dashboard"
          title={overview.context.location.name}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-[var(--ops-border-strong)]">
                {(["today", "week", "month"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 text-xs font-semibold transition ${
                      period === p
                        ? "bg-[var(--ripnel-accent)] text-white"
                        : "text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)]"
                    } ${p === "today" ? "rounded-l-lg" : ""} ${p === "month" ? "rounded-r-lg" : ""}`}
                  >
                    {p === "today" ? "Hoy" : p === "week" ? "Semana" : "Mes"}
                  </button>
                ))}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="rounded-lg"
                    onClick={() => loadDashboard({ silent: true })}
                    disabled={refreshing}
                    aria-label="Actualizar dashboard"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  Actualizar
                </TooltipContent>
              </Tooltip>
            </div>
          }
        />

        {alerts.length > 0 ? (
          <>
            <div className="flex items-center gap-2">
              <CircleAlert className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />
              <h2 className="text-base font-semibold text-[var(--ops-text)]">Pendientes del momento</h2>
            </div>
            <div className="grid gap-2 lg:grid-cols-2">
              {alerts.map((alert) => (
                <AdminInlineMessage key={alert.key} tone={alert.tone}>
                  <Link href={alert.href} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{alert.title}</p>
                      <p className="mt-1 line-clamp-1 text-sm opacity-80">{alert.description}</p>
                    </div>
                    <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                  </Link>
                </AdminInlineMessage>
              ))}
            </div>
          </>
        ) : null}

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)]">
            Resumen rapido
          </p>
          <h2 className="mt-1 text-base font-semibold text-[var(--ops-text)]">Indicadores del dia</h2>
        </div>

        <div className="flex flex-wrap gap-3">
          {kpiPills.map((pill) =>
            pill ? (
              <OpsMetricPill
                key={pill.key}
                label={pill.label}
                value={pill.value}
                tone={pill.tone}
              />
            ) : null
          )}
        </div>

        <OpsSectionDivider>
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-[var(--ops-text)]">Pulso operativo</h2>
              <p className="mt-0.5 text-sm text-[var(--ops-text-muted)]">Cobro y presion por frente critico</p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)]">
                  Mezcla de cobro
                </p>
                <DashboardPaymentChart data={paymentMix} />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)]">
                  Presion operativa
                </p>
                <DashboardPressureChart data={pressureMix} />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 items-start md:grid-cols-2 md:grid-rows-2 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              {sales ? (
                <SalesSection sales={sales} />
              ) : null}
            </div>

            <div className="space-y-4">
              {receipts ? (
                <ReceiptsSection section={receipts} />
              ) : null}
            </div>

            <div className="space-y-4">
              {cash ? (
                <CashSection section={cash} />
              ) : null}
            </div>

            <div className="space-y-4">
              {postsales ? (
                <PostsalesSection section={postsales} />
              ) : inventory ? (
                <InventorySection section={inventory} />
              ) : null}

              {transfers ? (
                <TransfersSection section={transfers} />
              ) : null}
            </div>
          </div>
        </OpsSectionDivider>
      </OpsPageShell>
    </TooltipProvider>
  )
}

function SalesSection({ sales }: { sales: SalesToday }) {
  return (
    <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">Ventas</p>
      <h3 className="mt-1 text-base font-semibold text-[var(--ops-text)]">Flujo comercial de la sede activa</h3>

      <div className="mt-4 flex flex-wrap gap-3">
        <OpsMetricPill label="Total vendido" value={formatCurrency(sales.total_amount)} tone="accent" />
        <OpsMetricPill label="Ventas confirmadas" value={String(sales.sale_count || 0)} tone="default" />
      </div>

      <p className="mt-3 text-sm text-[var(--ops-text-muted)]">
        Ultima confirmacion: {formatDateTime(sales.last_confirmed_at)}
      </p>

      {sales.by_method ? (
        <div className="mt-4 border-t border-[var(--ops-border-soft)] pt-4 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">Metodos de pago</p>
          {(["cash", "yape", "plin", "transfer"] as const).map((method) => (
            <div key={method} className="flex items-center justify-between text-sm">
              <span className="text-[var(--ops-text-muted)]">
                {method === "cash" ? "Efectivo" : method === "yape" ? "Yape" : method === "plin" ? "Plin" : "Transferencia"}
              </span>
              <span className="font-semibold text-[var(--ops-text)]">
                {formatCurrency(Number(sales.by_method![method] || 0))}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ReceiptsSection({ section }: { section: ReceiptsSection }) {
  return (
    <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">Comprobantes</p>
      <h3 className="mt-1 text-base font-semibold text-[var(--ops-text)]">Cola operativa</h3>

      <div className="mt-4 flex flex-wrap gap-3">
        <OpsMetricPill label="Open" value={String(section.open_count || 0)} tone="default" />
        <OpsMetricPill label="Missing" value={String(section.missing_count || 0)} tone="warning" />
        <OpsMetricPill label="Error" value={String(section.error_count || 0)} tone={Number(section.error_count || 0) > 0 ? "warning" : "default"} />
      </div>

      {section.latest && section.latest.length > 0 ? (
        <div className="mt-4 border-t border-[var(--ops-border-soft)] pt-4 space-y-2">
          {(section.latest as ReceiptQueueItem[]).map((item) => (
            <Link
              key={`${item.sale_id}-${item.queue_status}`}
              href={buildSaleDetailRoute(item.sale_id)}
              className="flex items-start justify-between gap-3 rounded-lg px-3 py-2 transition hover:bg-[var(--ops-surface-muted)]"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--ops-text)] truncate">
                  {item.sale_number || "Sin correlativo"}
                </p>
                <p className="text-xs text-[var(--ops-text-muted)]">
                  {item.customer_name_text || "Cliente general"} · {item.document_type}
                </p>
                <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                  {formatCurrency(item.total_amount)} · {formatDateTime(item.queued_at)}
                </p>
              </div>
              <span className={`shrink-0 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${queueTone(item.queue_status)}`}>
                {item.queue_status}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--ops-text-muted)]">
          No hay comprobantes abiertos en este momento.
        </p>
      )}
    </div>
  )
}

function CashSection({ section }: { section: CashSection }) {
  const summary = section.sales_summary

  return (
    <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">Caja</p>
          <h3 className="mt-1 text-base font-semibold text-[var(--ops-text)]">Estado y consistencia operativa</h3>
        </div>
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${cashStatusTone(section.closing?.status)}`}>
          {section.closing
            ? section.closing.status === "open" ? "Caja abierta" : "Caja cerrada"
            : "Sin apertura"}
        </span>
      </div>

      {summary ? (
        <div className="mt-4 border-t border-[var(--ops-border-soft)] pt-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <OpsMetricPill
              label="Ventas vs pagos"
              value={formatCurrency(summary.consistency.sales_total)}
              tone={summary.consistency.is_consistent ? "success" : "warning"}
            />
            <OpsMetricPill
              label="Diferencia"
              value={formatCurrency(summary.consistency.difference)}
              tone={summary.consistency.is_consistent ? "default" : "warning"}
            />
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--ops-text-muted)]">Total ventas</span>
              <span className="font-semibold text-[var(--ops-text)]">{formatCurrency(summary.consistency.sales_total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--ops-text-muted)]">Total pagos</span>
              <span className="font-semibold text-[var(--ops-text)]">{formatCurrency(summary.consistency.payment_total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--ops-text-muted)]">Ventas confirmadas</span>
              <span className="font-semibold text-[var(--ops-text)]">{summary.sale_count || 0}</span>
            </div>
          </div>

          <p className="text-sm text-[var(--ops-text-muted)]">
            {section.closing
              ? `Registro ${section.closing.status === "open" ? "abierto" : "cerrado"} para ${formatDate(section.closing.business_date)}.`
              : "Aun no existe una caja abierta para la fecha de negocio."}
          </p>

          <Link
            href="/caja"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold border border-[var(--ops-border-strong)] transition hover:bg-[var(--ops-surface-muted)]"
          >
            <Wallet className="h-4 w-4" />
            Ir a caja
          </Link>
        </div>
      ) : null}
    </div>
  )
}

function PostsalesSection({ section }: { section: PostsalesSection }) {
  return (
    <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">Postventa</p>
      <h3 className="mt-1 text-base font-semibold text-[var(--ops-text)]">Ventas recientes con seguimiento</h3>

      <div className="mt-4 flex flex-wrap gap-3">
        <OpsMetricPill label="Cambio" value={String(section.eligible_exchange_count || 0)} tone="default" />
        <OpsMetricPill label="Anulable" value={String(section.eligible_cancel_count || 0)} tone="default" />
        <OpsMetricPill label="Bloqueada" value={String(section.blocked_cancel_count || 0)} tone="warning" />
      </div>

      {section.latest && section.latest.length > 0 ? (
        <div className="mt-4 border-t border-[var(--ops-border-soft)] pt-4 space-y-2">
          {(section.latest as PostsalesItem[]).map((item) => (
            <Link
              key={item.sale_id}
              href={`/postventa/${item.sale_id}`}
              className="flex items-start justify-between gap-3 rounded-lg px-3 py-2 transition hover:bg-[var(--ops-surface-muted)]"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--ops-text)] truncate">
                  {item.sale_number || "Sin correlativo"}
                </p>
                <p className="text-xs text-[var(--ops-text-muted)]">
                  {item.customer_name_text || "Cliente general"} · {formatCurrency(item.total_amount)}
                </p>
                <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                  {item.cancel_allowed
                    ? "Permite cambio y anulacion."
                    : "Permite cambio simple, pero la anulacion esta bloqueada."}
                </p>
              </div>
              <span className={`shrink-0 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cashStatusTone(item.cash_status)}`}>
                Caja {item.cash_status}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--ops-text-muted)]">
          No encontramos ventas recientes listas para postventa.
        </p>
      )}
    </div>
  )
}

function InventorySection({ section }: { section: InventorySection }) {
  return (
    <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">Inventario</p>
      <h3 className="mt-1 text-base font-semibold text-[var(--ops-text)]">Inventario critico</h3>
      <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
        Variantes con stock 0 o menor/igual a {section.low_stock_threshold || 0}.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <OpsMetricPill
          label="En cero"
          value={String(section.zero_stock_count || 0)}
          tone={Number(section.zero_stock_count || 0) > 0 ? "warning" : "default"}
        />
        <OpsMetricPill
          label="Bajo minimo"
          value={String(section.low_stock_count || 0)}
          tone={Number(section.low_stock_count || 0) > 0 ? "warning" : "default"}
        />
      </div>

      {section.critical_variants && section.critical_variants.length > 0 ? (
        <div className="mt-4 border-t border-[var(--ops-border-soft)] pt-4 space-y-2">
          {(section.critical_variants as InventoryItem[]).map((item) => (
            <Link
              key={item.variant_id}
              href={appRoutes.inventory}
              className="flex items-start justify-between gap-3 rounded-lg px-3 py-2 transition hover:bg-[var(--ops-surface-muted)]"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--ops-text)] truncate">{item.style_name}</p>
                <p className="text-xs text-[var(--ops-text-muted)]">
                  {item.sku} · {item.size_code} / {item.color_code}
                </p>
              </div>
              <span
                className={`shrink-0 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  Number(item.qty || 0) === 0
                    ? "border-[color:color-mix(in_srgb,#f43f5e_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f43f5e_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#be123c_74%,var(--ops-text))]"
                    : "border-[color:color-mix(in_srgb,#f59e0b_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]"
                }`}
              >
                Stock {item.qty}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--ops-text-muted)]">
          No hay variantes criticas para la sede operativa.
        </p>
      )}
    </div>
  )
}

function TransfersSection({ section }: { section: TransfersSection }) {
  return (
    <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">Transferencias</p>
      <h3 className="mt-1 text-base font-semibold text-[var(--ops-text)]">Transferencias por recibir</h3>

      <div className="mt-4">
        <OpsMetricPill
          label="Pendientes"
          value={String(section.pending_receipts_count || 0)}
          tone={Number(section.pending_receipts_count || 0) > 0 ? "warning" : "default"}
        />
      </div>

      {section.latest && section.latest.length > 0 ? (
        <div className="mt-4 border-t border-[var(--ops-border-soft)] pt-4 space-y-2">
          {(section.latest as TransferItem[]).map((item) => (
            <Link
              key={item.transfer_id}
              href={`/transferencias/${item.transfer_id}`}
              className="flex items-start justify-between gap-3 rounded-lg px-3 py-2 transition hover:bg-[var(--ops-surface-muted)]"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--ops-text)] truncate">
                  {item.transfer_number || "Sin correlativo"}
                </p>
                <p className="text-xs text-[var(--ops-text-muted)]">
                  Desde {item.from_location_name} · {item.qty_shipped_total} und
                </p>
                <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                  Actualizado {formatDateTime(item.shipped_at || item.updated_at)}
                </p>
              </div>
              <span className="shrink-0 inline-flex rounded-full border border-[color:color-mix(in_srgb,#3b82f6_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#3b82f6_14%,var(--ops-surface))] px-2.5 py-1 text-[11px] font-semibold text-[color:color-mix(in_srgb,#2563eb_74%,var(--ops-text))]">
                {item.status}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--ops-text-muted)]">
          No hay recepciones pendientes en este momento.
        </p>
      )}
    </div>
  )
}
