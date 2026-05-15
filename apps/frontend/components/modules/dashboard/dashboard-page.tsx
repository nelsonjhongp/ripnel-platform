"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowUpRight,
  BarChart3,
  CircleAlert,
  Clock,
  Database,
  Eye,
  EyeOff,
  LayoutDashboard,
  MapPin,
  Receipt,
  RefreshCw,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"

import { useAuth } from "@/components/auth/AuthProvider"
import { AdminInlineMessage } from "@/components/admin/admin-ui"
import { ErrorPage, ProtectedLoadingPage } from "@/components/feedback/status-page"
import { OpsMetricPill } from "@/components/ui/ops-metric-pill"
import { OpsPageShell, OpsSectionDivider } from "@/components/ui/ops-page-shell"
import { Button } from "@/components/ui/button"
import { useSidebarTopbarActions } from "@/components/sidebar"
import DashboardMap from "@/components/dashboard/DashboardMap"
import { fetchCustomerAnalytics, fetchDashboardActivity, fetchDashboardOverview, fetchSalesByDepartment } from "@/lib/api-dashboard"
import { appRoutes } from "@/lib/routes"
import type {
  CashSection,
  CustomerAnalytics,
  DashboardActivity,
  DashboardOverview,
  DepartmentSalesData,
  InventoryItem,
  InventorySection,
  PaymentBarData,
  PostsalesItem,
  PostsalesSection,
  ReceiptQueueItem,
  ReceiptsSection,
  SalesToday,
  TransferItem,
  TransfersSection,
} from "@/lib/dashboard-types"
import { ApiError } from "@/lib/api"

const WEEKDAY_LABELS: Record<number, string> = {
  1: "Lun", 2: "Mar", 3: "Mie", 4: "Jue", 5: "Vie", 6: "Sab", 7: "Dom",
}

const PIE_COLORS = ["#7c3aed", "#0ea5e9", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6", "#06b6d4", "#84cc16"]

function formatCurrency(value: number | null | undefined) {
  return `S/. ${Number(value || 0).toFixed(2)}`
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-"
  return new Date(value).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-"
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "medium" })
}

function todayPeruISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" })
}

function explainDashboardError(error: unknown) {
  if (!(error instanceof ApiError)) return "No pudimos preparar el dashboard."
  if (error.status === 409) return "Necesitas una sede default activa."
  if (error.status === 401) return "Tu sesion ya no es valida. Vuelve a iniciar sesion."
  return error.message || "No pudimos preparar el dashboard."
}

function queueTone(status: string) {
  if (status === "error") return "border-rose-400/34 bg-rose-500/14 text-rose-700"
  if (status === "pending") return "border-amber-400/34 bg-amber-500/14 text-amber-700"
  return "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text)]"
}

function cashStatusTone(status: string | null | undefined) {
  if (status === "open") return "border-emerald-400/34 bg-emerald-500/14 text-emerald-700"
  if (status === "closed") return "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text)]"
  return "border-amber-400/34 bg-amber-500/14 text-amber-700"
}

// ---- Subcomponents ----

function KpiCard({ label, value, trend, icon: Icon, href, color }: {
  label: string; value: string; trend?: { up: boolean; pct: string }; icon: React.ComponentType<{ className?: string }>; href?: string; color?: string
}) {
  const inner = (
    <div className="relative overflow-hidden rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4 transition hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">{label}</p>
          <p className="mt-1 text-xl font-bold text-[var(--ops-text)]">{value}</p>
          {trend ? (
            <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${trend.up ? "text-emerald-600" : "text-rose-600"}`}>
              {trend.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend.pct}
            </p>
          ) : null}
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: color ? `${color}1a` : "var(--ripnel-accent-soft)", color: color || "var(--ripnel-accent)" }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )

  if (href) return <Link href={href}>{inner}</Link>
  return inner
}

function SectionCard({ title, subtitle, children, action }: {
  title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">{title}</p>
          {subtitle ? <h3 className="mt-1 text-sm font-semibold text-[var(--ops-text)]">{subtitle}</h3> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function ChartCard({ title, subtitle, children, height = 240 }: {
  title: string; subtitle?: string; children: React.ReactNode; height?: number
}) {
  return (
    <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5">
      <p className="text-xs font-semibold text-[var(--ops-text)]">{title}</p>
      {subtitle ? <p className="mt-0.5 text-xs text-[var(--ops-text-muted)]">{subtitle}</p> : null}
      <div className="mt-3" style={{ height: `${height}px` }}>
        {children}
      </div>
    </div>
  )
}

// ---- Main Dashboard Page ----

export default function DashboardPage() {
  const { loading: authLoading } = useAuth()

  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [analytics, setAnalytics] = useState<CustomerAnalytics | null>(null)
  const [activity, setActivity] = useState<DashboardActivity | null>(null)
  const [departmentSales, setDepartmentSales] = useState<DepartmentSalesData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [period, setPeriod] = useState<"today" | "week" | "month" | "quarter">("today")
  const [showOperational, setShowOperational] = useState(true)

  const dateRange = useMemo(() => {
    const today = todayPeruISO()
    if (period === "today") return { date_from: today, date_to: today }
    const d = new Date()
    if (period === "week") d.setDate(d.getDate() - 6)
    else if (period === "month") d.setDate(d.getDate() - 29)
    else d.setDate(d.getDate() - 89)
    return { date_from: d.toLocaleDateString("en-CA", { timeZone: "America/Lima" }), date_to: today }
  }, [period])

  const loadAll = useCallback(async (options: { silent?: boolean } = {}) => {
    const isSilent = options.silent === true
    if (isSilent) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const [overviewData, analyticsData, activityData, deptData] = await Promise.all([
        fetchDashboardOverview({ date_from: dateRange.date_from, date_to: dateRange.date_to }),
        fetchCustomerAnalytics({ date_from: dateRange.date_from, date_to: dateRange.date_to, limit: 8 }),
        fetchDashboardActivity(),
        fetchSalesByDepartment({ date_from: dateRange.date_from, date_to: dateRange.date_to }),
      ])
      setOverview(overviewData)
      setAnalytics(analyticsData)
      setActivity(activityData)
      setDepartmentSales(deptData.departments || [])
    } catch (loadError) {
      setError(explainDashboardError(loadError))
      if (!isSilent) { setOverview(null); setAnalytics(null); setActivity(null) }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [dateRange.date_from, dateRange.date_to])

  useEffect(() => { void Promise.resolve().then(() => loadAll()) }, [loadAll])

  const alerts = useMemo(() => {
    if (!overview) return []
    const a: Array<{ key: string; title: string; description: string; href: string; tone: "warning" | "danger" }> = []
    if (overview.cash.visible && !overview.cash.closing) {
      a.push({ key: "cash-missing", title: "La caja del dia aun no fue aperturada", description: "Antes de operar conviene abrir la caja de la sede activa.", href: "/caja", tone: "warning" })
    }
    if (overview.receipts_queue.visible && Number(overview.receipts_queue.open_count || 0) > 0) {
      a.push({ key: "receipts-open", title: "Hay comprobantes pendientes o con error", description: `${overview.receipts_queue.open_count} venta(s) requieren seguimiento.`, href: appRoutes.transactionHistory, tone: "warning" })
    }
    if (overview.inventory.visible && Number(overview.inventory.zero_stock_count || 0) > 0) {
      a.push({ key: "inventory-zero", title: "Existen variantes sin stock", description: `${overview.inventory.zero_stock_count} variante(s) en cero.`, href: appRoutes.inventory, tone: "danger" })
    }
    if (overview.transfers.visible && Number(overview.transfers.pending_receipts_count || 0) > 0) {
      a.push({ key: "transfers-pending", title: "Transferencias pendientes de recepcion", description: `${overview.transfers.pending_receipts_count} transferencia(s) esperan.`, href: "/transferencias/recepciones-pendientes", tone: "warning" })
    }
    return a
  }, [overview])

  const dashboardTopbarActions = useMemo(() => [
    { key: "quick-sale", label: "Venta rapida", href: appRoutes.purchaseSystem, icon: <ShoppingCart className="h-4 w-4" />, variant: "accent" as const },
  ], [])

  useSidebarTopbarActions(dashboardTopbarActions)

  const byWeekdayChart = useMemo(() => {
    if (!analytics?.by_weekday) return []
    return analytics.by_weekday.map((item) => ({
      weekday: WEEKDAY_LABELS[Number(item.weekday_number)] || `Dia ${item.weekday_number}`,
      sale_count: Number(item.sale_count || 0),
      total_amount: Number(item.total_amount || 0),
    }))
  }, [analytics])

  const topCustomersChart = useMemo(() => {
    if (!analytics?.top_customers) return []
    return analytics.top_customers.map((item) => ({
      name: item.customer_name,
      total_amount: Number(item.total_amount || 0),
      sale_count: Number(item.sale_count || 0),
    }))
  }, [analytics])

  const topProductsChart = useMemo(() => {
    if (!analytics?.top_products) return []
    return analytics.top_products.map((item) => ({
      name: item.product_name,
      qty_sold: Number(item.qty_sold || 0),
      total_amount: Number(item.total_amount || 0),
    }))
  }, [analytics])

  const byDocumentChart = useMemo(() => {
    if (!analytics?.by_document_type) return []
    return analytics.by_document_type.map((item) => ({
      type: item.document_type === "boleta" ? "Boleta" : item.document_type === "factura" ? "Factura" : item.document_type === "proforma" ? "Proforma" : item.document_type,
      count: Number(item.sale_count || 0),
      total: Number(item.total_amount || 0),
    }))
  }, [analytics])

  const activityItems = useMemo(() => {
    if (!activity?.items) return []
    return activity.items.slice(0, 10)
  }, [activity])

  if ((loading || authLoading) && !overview) {
    return (
      <ProtectedLoadingPage
        title="Cargando dashboard…"
        description="Consolidando ventas, caja, inventario y analitica."
      />
    )
  }

  if (!overview) {
    return (
      <ErrorPage
        variant="ops"
        title="No pudimos abrir el dashboard"
        description={error || "El dashboard no esta disponible."}
        onReset={() => loadAll()}
      />
    )
  }

  const sales = overview.sales_today.visible ? overview.sales_today : null
  const cash = overview.cash.visible ? overview.cash : null
  const receipts = overview.receipts_queue.visible ? overview.receipts_queue : null
  const postsales = overview.postsales.visible ? overview.postsales : null
  const transfers = overview.transfers.visible ? overview.transfers : null
  const inventory = overview.inventory.visible ? overview.inventory : null

  const totalRevenue = sales?.total_amount ?? 0
  const totalPayments = cash?.sales_summary?.consistency.payment_total ?? 0

  // ---- Prepare chart data ----

  const paymentMix: PaymentBarData[] = sales?.by_method
    ? [
        { key: "cash", label: "Efectivo", amount: Number(sales.by_method.cash || 0) },
        { key: "yape", label: "Yape", amount: Number(sales.by_method.yape || 0) },
        { key: "plin", label: "Plin", amount: Number(sales.by_method.plin || 0) },
        { key: "transfer", label: "Transferencia", amount: Number(sales.by_method.transfer || 0) },
      ]
    : []

  const paymentPieData = paymentMix.filter((p) => p.amount > 0)

  const pressureData = [
    { key: "receipts", label: "Comprobantes", value: Number(receipts?.open_count || 0) },
    { key: "inventory", label: "Stock critico", value: Number(inventory?.zero_stock_count || 0) + Number(inventory?.low_stock_count || 0) },
    { key: "transfers", label: "Recepciones pend.", value: Number(transfers?.pending_receipts_count || 0) },
    { key: "postsales", label: "Postventa", value: Number(postsales?.eligible_exchange_count || 0) },
  ]

  const hasAnyAlerts = alerts.length > 0

  return (
    <OpsPageShell width="wide">
      {/* ---- HEADER ---- */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ripnel-accent-soft)] text-[var(--ripnel-accent)]">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ops-text-muted)]">
                {overview.context.location.name}
              </p>
              <h1 className="mt-1 text-xl font-bold text-[var(--ops-text)] md:text-2xl">
                Dashboard general
              </h1>
              <p className="mt-0.5 text-sm text-[var(--ops-text-muted)]">
                {period === "today" ? "Dia de hoy" : period === "week" ? "Ultimos 7 dias" : period === "month" ? "Ultimos 30 dias" : "Ultimos 90 dias"}
                {" · "}
                {overview.context.user.full_name}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-[var(--ops-border-strong)]">
              {(["today", "week", "month", "quarter"] as const).map((p, i, arr) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-semibold transition ${
                    period === p
                      ? "bg-[var(--ripnel-accent)] text-white"
                      : "text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)]"
                  } ${i === 0 ? "rounded-l-lg" : ""} ${i === arr.length - 1 ? "rounded-r-lg" : ""}`}
                >
                  {p === "today" ? "Hoy" : p === "week" ? "7d" : p === "month" ? "30d" : "90d"}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="rounded-lg"
              onClick={() => loadAll({ silent: true })}
              disabled={refreshing}
              aria-label="Actualizar"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* ---- ALERTS ---- */}
      {hasAnyAlerts ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CircleAlert className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />
            <h2 className="text-sm font-semibold text-[var(--ops-text)]">Atencion requerida</h2>
          </div>
          <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
            {alerts.map((alert) => (
              <AdminInlineMessage key={alert.key} tone={alert.tone}>
                <Link href={alert.href} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{alert.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs opacity-80">{alert.description}</p>
                  </div>
                  <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
                </Link>
              </AdminInlineMessage>
            ))}
          </div>
        </div>
      ) : null}

      {/* ---- KPI ROW ---- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Ventas totales"
          value={formatCurrency(totalRevenue)}
          icon={BarChart3}
          href={appRoutes.transactionHistory}
          color="#7c3aed"
        />
        <KpiCard
          label="Ventas confirmadas"
          value={String(sales?.sale_count || 0)}
          icon={ShoppingCart}
          href={appRoutes.transactionHistory}
          color="#0ea5e9"
        />
        <KpiCard
          label="Pagos registrados"
          value={formatCurrency(totalPayments)}
          icon={Wallet}
          href="/caja"
          color="#10b981"
        />
        <KpiCard
          label="Stock critico"
          value={String(Number(inventory?.zero_stock_count || 0) + Number(inventory?.low_stock_count || 0))}
          icon={Database}
          href={appRoutes.inventory}
          color={Number(inventory?.zero_stock_count || 0) > 0 ? "#f43f5e" : "#f59e0b"}
        />
      </div>

      {/* ---- ANALYTICS CHARTS (2x2 grid) ---- */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--ops-text)]">Analitica de ventas</h2>
            <p className="mt-0.5 text-sm text-[var(--ops-text-muted)]">
              Comportamiento comercial en el periodo seleccionado
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Chart 1: Weekday trend */}
          <ChartCard title="Ventas por dia de semana" subtitle="Total acumulado por dia">
            {byWeekdayChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={byWeekdayChart}>
                  <defs>
                    <linearGradient id="weekdayGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--ops-border-soft)" strokeDasharray="3 3" />
                  <XAxis dataKey="weekday" tick={{ fontSize: 12, fill: "var(--ops-text-muted)" }} />
                  <YAxis tick={{ fontSize: 12, fill: "var(--ops-text-muted)" }} />
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [
                      name === "total_amount" ? formatCurrency(value) : `${value} venta(s)`,
                      name === "total_amount" ? "Total" : "Ventas",
                    ]}
                    contentStyle={{ background: "var(--ops-surface)", border: "1px solid var(--ops-border-strong)", borderRadius: 6, fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="total_amount" stroke="#7c3aed" strokeWidth={2} fill="url(#weekdayGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[var(--ops-text-muted)]">Sin datos de tendencia semanal.</div>
            )}
          </ChartCard>

          {/* Chart 2: Payment mix pie */}
          <ChartCard title="Mezcla de cobro" subtitle="Distribucion por metodo de pago">
            {paymentPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentPieData} dataKey="amount" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                    {paymentPieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ background: "var(--ops-surface)", border: "1px solid var(--ops-border-strong)", borderRadius: 6, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[var(--ops-text-muted)]">Sin movimientos de cobro en el periodo.</div>
            )}
          </ChartCard>

          {/* Chart 3: Top customers */}
          <ChartCard title="Clientes que mas compran" subtitle="Top 8 por monto total">
            {topCustomersChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCustomersChart} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid stroke="var(--ops-border-soft)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "var(--ops-text-muted)" }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "var(--ops-text-muted)" }} />
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [
                      name === "total_amount" ? formatCurrency(value) : `${value} venta(s)`,
                      name === "total_amount" ? "Total" : "Ventas",
                    ]}
                    contentStyle={{ background: "var(--ops-surface)", border: "1px solid var(--ops-border-strong)", borderRadius: 6, fontSize: 12 }}
                  />
                  <Bar dataKey="total_amount" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[var(--ops-text-muted)]">Sin datos de clientes en el periodo.</div>
            )}
          </ChartCard>

          {/* Chart 4: By document type */}
          <ChartCard title="Ventas por tipo de comprobante" subtitle="Distribucion de documentos emitidos">
            {byDocumentChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDocumentChart}>
                  <CartesianGrid stroke="var(--ops-border-soft)" strokeDasharray="3 3" />
                  <XAxis dataKey="type" tick={{ fontSize: 12, fill: "var(--ops-text-muted)" }} />
                  <YAxis tick={{ fontSize: 12, fill: "var(--ops-text-muted)" }} />
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [
                      name === "total" ? formatCurrency(value) : `${value} venta(s)`,
                      name === "total" ? "Total" : "Cantidad",
                    ]}
                    contentStyle={{ background: "var(--ops-surface)", border: "1px solid var(--ops-border-strong)", borderRadius: 6, fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[var(--ops-text-muted)]">Sin ventas en el periodo.</div>
            )}
          </ChartCard>
        </div>
      </div>

      {/* ---- MAP + TOP PRODUCTS SIDE BY SIDE ---- */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Map */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[var(--ripnel-accent)]" />
              <h2 className="text-sm font-semibold text-[var(--ops-text)]">Ventas por departamento</h2>
            </div>
            {departmentSales.length > 0 ? (
              <span className="text-xs text-[var(--ops-text-muted)]">
                {departmentSales.reduce((s, d) => s + d.sale_count, 0)} venta(s) en {departmentSales.length} departamento(s)
              </span>
            ) : null}
          </div>
          <DashboardMap
            departments={departmentSales}
            locationName={overview.context.location.name}
            height={380}
          />
          <div className="flex items-center justify-between text-xs text-[var(--ops-text-muted)]">
            <span>Los colores reflejan el volumen de ventas por departamento usando datos de clientes registrados.</span>
            {departmentSales.length > 0 ? (
              <span className="font-semibold text-[var(--ops-text)]">
                Total: {formatCurrency(departmentSales.reduce((s, d) => s + d.total_amount, 0))}
              </span>
            ) : null}
          </div>
        </div>

        {/* Top products */}
        <SectionCard title="Productos" subtitle="Los mas vendidos del periodo">
          {topProductsChart.length > 0 ? (
            <div className="space-y-2">
              {topProductsChart.slice(0, 6).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition hover:bg-[var(--ops-surface-muted)]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--ops-text)]">{item.name}</p>
                    <p className="text-xs text-[var(--ops-text-muted)]">{item.qty_sold} und</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-[var(--ops-text)]">{formatCurrency(item.total_amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--ops-text-muted)]">Sin datos de productos vendidos.</p>
          )}
          {analytics?.top_products && analytics.top_products.length > 0 ? (
            <Link href={appRoutes.products} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--ripnel-accent)] transition hover:text-[var(--ripnel-accent-hover)]">
              Ver todos los productos <ArrowUpRight className="h-3 w-3" />
            </Link>
          ) : null}
        </SectionCard>
      </div>

      {/* ---- OPERATIONAL SECTIONS ---- */}
      <OpsSectionDivider>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-[var(--ops-text-muted)]" />
            <h2 className="text-base font-semibold text-[var(--ops-text)]">Operaciones</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowOperational(!showOperational)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ops-text-muted)] transition hover:text-[var(--ops-text)]"
          >
            {showOperational ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showOperational ? "Ocultar" : "Mostrar"}
          </button>
        </div>

        {showOperational ? (
          <>
            {/* Pressure + quick metrics */}
            <div className="grid gap-4 lg:grid-cols-4">
              <SectionCard title="Presion operativa" subtitle="Frentes que requieren atencion">
                {pressureData.some((d) => d.value > 0) ? (
                  <div className="space-y-2">
                    {pressureData.filter((d) => d.value > 0).map((d) => (
                      <div key={d.key} className="flex items-center justify-between text-sm">
                        <span className="text-[var(--ops-text-muted)]">{d.label}</span>
                        <span className={`font-semibold ${d.value > 0 ? "text-amber-600" : "text-[var(--ops-text)]"}`}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--ops-text-muted)]">Sin presion critica.</p>
                )}
              </SectionCard>

              {sales ? <SalesCard sales={sales} href={appRoutes.transactionHistory} /> : null}
              {receipts ? <ReceiptsCard section={receipts} /> : null}
              {cash ? <CashCard section={cash} /> : null}
            </div>

            {/* Detailed sections */}
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {inventory ? <InventoryDetailCard section={inventory} /> : null}
              {transfers ? <TransfersCard section={transfers} /> : null}
              {postsales ? <PostsalesCard section={postsales} /> : null}
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--ops-text-muted)]">Las secciones operativas estan ocultas. Presiona "Mostrar" para verlas.</p>
        )}
      </OpsSectionDivider>

      {/* ---- ACTIVITY FEED ---- */}
      <OpsSectionDivider>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[var(--ops-text-muted)]" />
          <h2 className="text-base font-semibold text-[var(--ops-text)]">Actividad reciente</h2>
        </div>

        {activityItems.length > 0 ? (
          <div className="space-y-1">
            {activityItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center justify-between gap-4 rounded-lg px-3 py-2.5 transition hover:bg-[var(--ops-surface-muted)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--ops-text)]">{item.title}</p>
                  <p className="text-xs text-[var(--ops-text-muted)]">{item.subtitle}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-[var(--ops-text-muted)]">{formatDateTime(item.occurred_at)}</span>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${item.status === "confirmed" || item.status === "closed" ? "border-emerald-400/34 bg-emerald-500/14 text-emerald-700" : "border-amber-400/34 bg-amber-500/14 text-amber-700"}`}>
                    {item.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--ops-text-muted)]">No hay actividad reciente para mostrar.</p>
        )}
      </OpsSectionDivider>
    </OpsPageShell>
  )
}

// ---- Section sub-components ----

function SalesCard({ sales, href }: { sales: SalesToday; href: string }) {
  return (
    <SectionCard title="Ventas" subtitle="Flujo comercial" action={
      <Link href={href} className="text-xs font-semibold text-[var(--ripnel-accent)] hover:underline">Ver todo</Link>
    }>
      <div className="flex flex-wrap gap-2">
        <OpsMetricPill label="Total" value={formatCurrency(sales.total_amount)} tone="accent" />
        <OpsMetricPill label="Ventas" value={String(sales.sale_count || 0)} tone="default" />
      </div>
      <p className="mt-2 text-xs text-[var(--ops-text-muted)]">Ultima: {formatDateTime(sales.last_confirmed_at)}</p>
    </SectionCard>
  )
}

function ReceiptsCard({ section }: { section: ReceiptsSection }) {
  return (
    <SectionCard title="Comprobantes" subtitle="Cola de emision" action={
      <Link href={appRoutes.transactionHistory} className="text-xs font-semibold text-[var(--ripnel-accent)] hover:underline">Ir</Link>
    }>
      <div className="flex flex-wrap gap-2">
        <OpsMetricPill label="Abiertos" value={String(section.open_count || 0)} tone={Number(section.open_count || 0) > 0 ? "warning" : "default"} />
        <OpsMetricPill label="Error" value={String(section.error_count || 0)} tone={Number(section.error_count || 0) > 0 ? "warning" : "default"} />
      </div>
      {section.latest && section.latest.length > 0 ? (
        <div className="mt-3 space-y-1.5 border-t border-[var(--ops-border-soft)] pt-3">
          {(section.latest as ReceiptQueueItem[]).slice(0, 3).map((item) => (
            <Link key={`${item.sale_id}-${item.queue_status}`} href={`/ventas/${item.sale_id}`} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 transition hover:bg-[var(--ops-surface-muted)]">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-[var(--ops-text)]">{item.sale_number || "Sin #"}</p>
                <p className="text-[10px] text-[var(--ops-text-muted)]">{item.customer_name_text || "General"}</p>
              </div>
              <span className={`shrink-0 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${queueTone(item.queue_status)}`}>{item.queue_status}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </SectionCard>
  )
}

function CashCard({ section }: { section: CashSection }) {
  const summary = section.sales_summary
  return (
    <SectionCard title="Caja" subtitle="Estado y consistencia" action={
      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${cashStatusTone(section.closing?.status)}`}>
        {section.closing ? (section.closing.status === "open" ? "Abierta" : "Cerrada") : "Sin apertura"}
      </span>
    }>
      {summary ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--ops-text-muted)]">Total ventas</span>
            <span className="font-semibold text-[var(--ops-text)]">{formatCurrency(summary.consistency.sales_total)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--ops-text-muted)]">Total pagos</span>
            <span className="font-semibold text-[var(--ops-text)]">{formatCurrency(summary.consistency.payment_total)}</span>
          </div>
          <div className={`flex items-center justify-between text-xs ${summary.consistency.is_consistent ? "" : "text-rose-600"}`}>
            <span className="text-[var(--ops-text-muted)]">Diferencia</span>
            <span className="font-semibold">{formatCurrency(summary.consistency.difference)}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--ops-text-muted)]">Sin resumen disponible.</p>
      )}
      <Link href="/caja" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--ripnel-accent)] hover:underline">
        <Wallet className="h-3 w-3" /> Ir a caja
      </Link>
    </SectionCard>
  )
}

function InventoryDetailCard({ section }: { section: InventorySection }) {
  return (
    <SectionCard title="Inventario" subtitle="Variantes con stock critico" action={
      <Link href={appRoutes.inventory} className="text-xs font-semibold text-[var(--ripnel-accent)] hover:underline">Ver</Link>
    }>
      <div className="flex flex-wrap gap-2">
        <OpsMetricPill label="En cero" value={String(section.zero_stock_count || 0)} tone={Number(section.zero_stock_count || 0) > 0 ? "warning" : "default"} />
        <OpsMetricPill label="Bajo minimo" value={String(section.low_stock_count || 0)} tone={Number(section.low_stock_count || 0) > 0 ? "warning" : "default"} />
      </div>
      {section.critical_variants && section.critical_variants.length > 0 ? (
        <div className="mt-3 space-y-1.5 border-t border-[var(--ops-border-soft)] pt-3">
          {(section.critical_variants as InventoryItem[]).slice(0, 4).map((item) => (
            <div key={item.variant_id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-[var(--ops-text)]">{item.style_name}</p>
                <p className="text-[10px] text-[var(--ops-text-muted)]">{item.sku} · {item.size_code}/{item.color_code}</p>
              </div>
              <span className={`shrink-0 text-xs font-bold ${Number(item.qty || 0) === 0 ? "text-rose-600" : "text-amber-600"}`}>{item.qty}</span>
            </div>
          ))}
        </div>
      ) : null}
    </SectionCard>
  )
}

function TransfersCard({ section }: { section: TransfersSection }) {
  return (
    <SectionCard title="Transferencias" subtitle="Recepciones y envios pendientes" action={
      <Link href="/transferencias/recepciones-pendientes" className="text-xs font-semibold text-[var(--ripnel-accent)] hover:underline">Ir</Link>
    }>
      <OpsMetricPill label="Pendientes" value={String(section.pending_receipts_count || 0)} tone={Number(section.pending_receipts_count || 0) > 0 ? "warning" : "default"} />
      {section.latest && section.latest.length > 0 ? (
        <div className="mt-3 space-y-1.5 border-t border-[var(--ops-border-soft)] pt-3">
          {(section.latest as TransferItem[]).slice(0, 3).map((item) => (
            <Link key={item.transfer_id} href={`/transferencias/${item.transfer_id}`} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 transition hover:bg-[var(--ops-surface-muted)]">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-[var(--ops-text)]">{item.transfer_number || "Sin #"}</p>
                <p className="text-[10px] text-[var(--ops-text-muted)]">Desde {item.from_location_name}</p>
              </div>
              <span className="text-xs text-[var(--ops-text-muted)]">{item.qty_shipped_total} und</span>
            </Link>
          ))}
        </div>
      ) : null}
    </SectionCard>
  )
}

function PostsalesCard({ section }: { section: PostsalesSection }) {
  return (
    <SectionCard title="Postventa" subtitle="Cambios y anulaciones disponibles" action={
      <Link href="/postventa" className="text-xs font-semibold text-[var(--ripnel-accent)] hover:underline">Ir</Link>
    }>
      <div className="flex flex-wrap gap-2">
        <OpsMetricPill label="Cambio" value={String(section.eligible_exchange_count || 0)} tone="default" />
        <OpsMetricPill label="Anulable" value={String(section.eligible_cancel_count || 0)} tone="default" />
        <OpsMetricPill label="Bloqueada" value={String(section.blocked_cancel_count || 0)} tone="warning" />
      </div>
      {section.latest && section.latest.length > 0 ? (
        <div className="mt-3 space-y-1.5 border-t border-[var(--ops-border-soft)] pt-3">
          {(section.latest as PostsalesItem[]).slice(0, 3).map((item) => (
            <Link key={item.sale_id} href={`/postventa/${item.sale_id}`} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 transition hover:bg-[var(--ops-surface-muted)]">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-[var(--ops-text)]">{item.sale_number || "Sin #"}</p>
                <p className="text-[10px] text-[var(--ops-text-muted)]">{item.customer_name_text || "General"}</p>
              </div>
              <span className={`shrink-0 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cashStatusTone(item.cash_status)}`}>Caja {item.cash_status}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </SectionCard>
  )
}
