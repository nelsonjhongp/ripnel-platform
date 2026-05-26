"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRight,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  PackageSearch,
  RefreshCw,
  ShoppingCart,
  Store,
  Ticket,
  Truck,
  Users,
  Wallet,
} from "lucide-react"
import {
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

import { AttentionPanel, type AttentionPanelItem } from "@/components/dashboard/attention-panel"
import { DashboardChartCard } from "@/components/dashboard/dashboard-chart-card"
import { CommercialActivityCard } from "@/components/dashboard/commercial-activity-card"
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state"
import {
  formatCashStatus,
  formatCurrencyPEN,
  formatNumber,
} from "@/components/dashboard/dashboard-formatters"
import { DashboardKpiCard, type DashboardKpiTone } from "@/components/dashboard/dashboard-kpi-card"
import { useAuth } from "@/components/auth/AuthProvider"
import { ErrorPage, ProtectedLoadingPage } from "@/components/feedback/status-page"
import { useSidebarTopbarActions } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { fetchCommercialActivity, fetchCustomerAnalytics, fetchDashboardOverview } from "@/lib/api-dashboard"
import { ApiError } from "@/lib/api"
import type {
  CashSection,
  CommercialActivityResponse,
  CustomerAnalytics,
  DashboardMetricComparison,
  DashboardOverview,
  InventorySection,
  PostsalesSection,
  SalesToday,
  TransfersSection,
} from "@/lib/dashboard-types"
import {
  appRoutes,
  buildTransferModuleRoute,
  transferRouteSlugs,
} from "@/lib/routes"
import { cn } from "@/lib/utils"

const PIE_COLORS = ["#b07ae4", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#7c3aed"]

const chartTooltipStyle = {
  background: "var(--ops-surface)",
  border: "1px solid var(--ops-border-strong)",
  borderRadius: 12,
  boxShadow: "0 10px 24px rgb(15 23 42 / 0.08)",
  fontSize: 12,
  color: "var(--ops-text)",
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

function buildAttentionBadge(value: number, tone: AttentionPanelItem["tone"]) {
  if (value === 0) return "Al dia"
  if (tone === "danger") return "Urgente"
  if (tone === "warning") return "Atender"
  return "Revisar"
}

function attentionTonePriority(tone: AttentionPanelItem["tone"]) {
  if (tone === "danger") return 0
  if (tone === "warning") return 1
  if (tone === "purple") return 2
  if (tone === "success") return 3
  return 4
}

function resolveDifferenceTone(value: number | null | undefined): DashboardKpiTone {
  if (value == null) return "neutral"
  if (value === 0) return "success"
  if (value > 0) return "warning"
  return "danger"
}

function paymentMethodTone(amount: number) {
  return amount > 0 ? "text-[var(--ops-text)]" : "text-[var(--ops-text-muted)]"
}

function invertComparisonDirection(direction: DashboardMetricComparison["direction"]) {
  if (direction === "up") return "down"
  if (direction === "down") return "up"
  return "neutral"
}

function normalizeComparison(
  comparison: DashboardMetricComparison | undefined | null,
  options: { lowerIsBetter?: boolean } = {}
) {
  if (!comparison?.valid) return null

  return {
    ...comparison,
    direction: options.lowerIsBetter
      ? invertComparisonDirection(comparison.direction)
      : comparison.direction,
  }
}

export default function DashboardPage() {
  const { loading: authLoading } = useAuth()

  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [analytics, setAnalytics] = useState<CustomerAnalytics | null>(null)
  const [commercialActivity, setCommercialActivity] = useState<CommercialActivityResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("week")

  const dateRange = useMemo(() => {
    const today = todayPeruISO()
    const date = new Date()
    if (period === "week") date.setDate(date.getDate() - 6)
    else if (period === "month") date.setDate(date.getDate() - 29)
    else date.setDate(date.getDate() - 89)

    return {
      date_from: date.toLocaleDateString("en-CA", { timeZone: "America/Lima" }),
      date_to: today,
    }
  }, [period])

  const loadAll = useCallback(async (options: { silent?: boolean } = {}) => {
    const silent = options.silent === true
    const activityGroup = "daily"

    if (silent) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const [overviewData, analyticsData, activityData] = await Promise.all([
        fetchDashboardOverview({ date_from: dateRange.date_from, date_to: dateRange.date_to }),
        fetchCustomerAnalytics({
          date_from: dateRange.date_from,
          date_to: dateRange.date_to,
          limit: 8,
        }),
        fetchCommercialActivity({
          date_from: dateRange.date_from,
          date_to: dateRange.date_to,
          group: activityGroup,
        }),
      ])

      setOverview(overviewData)
      setAnalytics(analyticsData)
      setCommercialActivity(activityData)
    } catch (loadError) {
      setError(explainDashboardError(loadError))
      if (!silent) {
        setOverview(null)
        setAnalytics(null)
        setCommercialActivity(null)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [dateRange.date_from, dateRange.date_to])

  useEffect(() => {
    void Promise.resolve().then(() => loadAll())
  }, [loadAll])

  const dashboardTopbarActions = useMemo(() => [
    {
      key: "quick-sale",
      label: "Venta rapida",
      href: appRoutes.purchaseSystem,
      icon: null,
      variant: "accent" as const,
    },
  ], [])

  useSidebarTopbarActions(dashboardTopbarActions)

  const topCustomersChart = useMemo(() => {
    if (!analytics?.top_customers) return []

    return analytics.top_customers
      .map((item) => ({
        name: item.customer_name || "Cliente general",
        totalAmount: Number(item.total_amount || 0),
        saleCount: Number(item.sale_count || 0),
      }))
      .slice(0, 6)
  }, [analytics])

  const topProductsChart = useMemo(() => {
    if (!analytics?.top_products) return []

    return analytics.top_products
      .map((item) => ({
        name: item.product_name,
        qtySold: Number(item.qty_sold || 0),
        totalAmount: Number(item.total_amount || 0),
      }))
      .slice(0, 6)
  }, [analytics])

  const sales = overview?.sales_today?.visible ? overview.sales_today : null
  const cash = overview?.cash?.visible ? overview.cash : null
  const postsales = overview?.postsales?.visible ? overview.postsales : null
  const transfers = overview?.transfers?.visible ? overview.transfers : null
  const inventory = overview?.inventory?.visible ? overview.inventory : null

  const saleCount = Number(sales?.sale_count || 0)
  const totalRevenue = Number(sales?.total_amount || 0)
  const averageTicket = saleCount > 0 ? totalRevenue / saleCount : null
  const cashConsistency = cash?.sales_summary?.consistency ?? null
  const totalPayments = Number(cashConsistency?.payment_total ?? 0)
  const cashDifference = cashConsistency?.difference ?? null
  const criticalStockCount =
    Number(inventory?.zero_stock_count || 0) + Number(inventory?.low_stock_count || 0)

  const paymentMix = [
    { key: "cash", label: "Efectivo", amount: Number(sales?.by_method?.cash || 0) },
    { key: "yape", label: "Yape", amount: Number(sales?.by_method?.yape || 0) },
    { key: "plin", label: "Plin", amount: Number(sales?.by_method?.plin || 0) },
    { key: "transfer", label: "Transferencia", amount: Number(sales?.by_method?.transfer || 0) },
  ]
  const paymentPieData = paymentMix.filter((item) => item.amount > 0)

  const kpis = [
    {
      label: "Diferencia de caja",
      value: cashConsistency ? formatCurrencyPEN(cashDifference) : "—",
      trend: null,
      icon: Wallet,
      tone: resolveDifferenceTone(cashDifference),
      href: appRoutes.cash,
    },
    {
      label: "Ventas totales",
      value: formatCurrencyPEN(totalRevenue),
      trend: normalizeComparison(sales?.comparisons?.total_amount),
      icon: CircleDollarSign,
      tone: "purple" as const,
      href: appRoutes.transactionHistory,
    },
    {
      label: "Ventas confirmadas",
      value: formatNumber(saleCount),
      trend: normalizeComparison(sales?.comparisons?.sale_count),
      icon: ShoppingCart,
      tone: "neutral" as const,
      href: appRoutes.transactionHistory,
    },
    {
      label: "Ticket promedio",
      value: averageTicket == null ? "—" : formatCurrencyPEN(averageTicket),
      trend: normalizeComparison(sales?.comparisons?.avg_ticket),
      icon: Ticket,
      tone: "danger" as const,
      href: appRoutes.transactionHistory,
    },
    {
      label: "Pagos registrados",
      value: formatCurrencyPEN(totalPayments),
      trend: normalizeComparison(cash?.sales_summary?.comparisons?.payment_total),
      icon: CreditCard,
      tone: (cashConsistency ? "success" : "neutral") as DashboardKpiTone,
      href: appRoutes.cash,
    },
    {
      label: "Stock critico",
      value: formatNumber(criticalStockCount),
      trend: null,
      icon: PackageSearch,
      tone: (criticalStockCount > 0 ? "warning" : "neutral") as DashboardKpiTone,
      href: appRoutes.inventory,
    },
  ]

  const attentionItems = useMemo<AttentionPanelItem[]>(() => {
    const items: AttentionPanelItem[] = []

    if (cash) {
      const difference = Number(cashConsistency?.difference ?? 0)
      items.push({
        key: "cash-difference",
        label: "Caja con diferencia",
        value: cashConsistency
          ? difference === 0
            ? "Todo en orden"
            : difference > 0
              ? "Pagos por debajo de ventas"
              : "Pagos por encima de ventas"
          : "Sin resumen disponible",
        numericValue: Math.abs(difference),
        highlightValue: cashConsistency ? formatCurrencyPEN(difference) : "—",
        badge: cashConsistency ? buildAttentionBadge(Math.abs(difference), difference === 0 ? "success" : difference > 0 ? "warning" : "danger") : "Sin datos",
        cta: "Ir a caja",
        href: appRoutes.cash,
        icon: Wallet,
        tone: cashConsistency ? (difference === 0 ? "success" : difference > 0 ? "warning" : "danger") : "neutral",
      })
    }

    if (inventory) {
      items.push({
        key: "inventory-critical",
        label: "Stock critico",
        value: criticalStockCount > 0 ? "Variantes comprometidas" : "Sin alertas de inventario",
        numericValue: criticalStockCount,
        highlightValue: formatNumber(criticalStockCount),
        badge: buildAttentionBadge(criticalStockCount, criticalStockCount > 0 ? "warning" : "success"),
        cta: "Ver stock",
        href: appRoutes.inventory,
        icon: PackageSearch,
        tone: criticalStockCount > 0 ? "warning" : "success",
      })
    }

    if (postsales) {
      const postsalesPending = Number(postsales.eligible_exchange_count || 0)
      items.push({
        key: "postsales",
        label: "Postventa pendiente",
        value: postsalesPending > 0 ? "Casos por resolver" : "Sin casos pendientes",
        numericValue: postsalesPending,
        highlightValue: formatNumber(postsalesPending),
        badge: postsalesPending > 0 ? "Pendiente" : "Al dia",
        cta: "Revisar postventa",
        href: appRoutes.postsales,
        icon: ClipboardList,
        tone: postsalesPending > 0 ? "purple" : "success",
      })
    }

    if (transfers) {
      const pendingTransfers =
        Number(transfers.pending_receipts_count || 0) +
        Number(transfers.pending_approval_count || 0) +
        Number(transfers.pending_dispatch_count || 0)
      items.push({
        key: "transfers",
        label: "Transferencias pendientes",
        value:
          pendingTransfers > 0
            ? "Solicitudes por aprobar, despachar o recepcionar"
            : "Flujo de transferencias al dia",
        numericValue: pendingTransfers,
        highlightValue: formatNumber(pendingTransfers),
        badge: buildAttentionBadge(pendingTransfers, pendingTransfers > 0 ? "warning" : "success"),
        cta: "Ver transferencias",
        href: buildTransferModuleRoute(transferRouteSlugs.list),
        icon: Truck,
        tone: pendingTransfers > 0 ? "warning" : "success",
      })
    }

    const keyPriority: Record<string, number> = {
      "inventory-critical": 0,
      "cash-difference": 1,
      postsales: 2,
      transfers: 3,
    }

    return items.sort((left, right) => {
      const toneDelta = attentionTonePriority(left.tone) - attentionTonePriority(right.tone)
      if (toneDelta !== 0) return toneDelta

      const leftHealthyZero = left.numericValue === 0 && left.tone === "success"
      const rightHealthyZero = right.numericValue === 0 && right.tone === "success"
      if (leftHealthyZero !== rightHealthyZero) return leftHealthyZero ? 1 : -1

      const valueDelta = right.numericValue - left.numericValue
      if (valueDelta !== 0) return valueDelta

      return (keyPriority[left.key] ?? 99) - (keyPriority[right.key] ?? 99)
    })
  }, [cash, cashConsistency, criticalStockCount, inventory, postsales, transfers])

  const location = overview?.context.location.name ?? "Sede activa"

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

  const periodActions = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-1 shadow-sm">
        {(["week", "month", "quarter"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setPeriod(item)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              period === item
                ? "bg-[var(--ripnel-accent)] text-white"
                : "text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)]"
            )}
          >
            {item === "week" ? "7d" : item === "month" ? "30d" : "90d"}
          </button>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="rounded-xl border-[var(--ops-border-strong)] bg-[var(--ops-surface)]"
        onClick={() => loadAll({ silent: true })}
        disabled={refreshing}
        aria-label="Actualizar"
      >
        <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
      </Button>
    </div>
  )

  return (
    <section className="ops-page min-h-screen py-[var(--ops-page-py)]">
      <div className="mx-auto max-w-[1580px] space-y-5 px-3 lg:px-4">
        <PosHeader eyebrow={location} title="Dashboard general" actions={periodActions} />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          {kpis.map((kpi) => (
            <DashboardKpiCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              trend={kpi.trend}
              icon={kpi.icon}
              tone={kpi.tone}
              href={kpi.href}
            />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <CommercialActivityCard data={commercialActivity} />
          </div>

          <div className="xl:col-span-4">
            <AttentionPanel items={attentionItems} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <DashboardChartCard
              title="Top productos"
              icon={<PackageSearch className="h-4 w-4" />}
              height={280}
              contentClassName="p-3"
            >
              {topProductsChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProductsChart} layout="vertical" margin={{ top: 4, right: 10, left: 12, bottom: 0 }}>
                    <CartesianGrid stroke="var(--ops-border-soft)" strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "var(--ops-text-muted)" }}
                      tickFormatter={(value) => formatNumber(Number(value))}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 11, fill: "var(--ops-text-muted)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip
                      formatter={(value: number, name: string) => [
                        name === "qtySold" ? `${formatNumber(value)} und` : formatCurrencyPEN(value),
                        name === "qtySold" ? "Cantidad" : "Ventas",
                      ]}
                      contentStyle={chartTooltipStyle}
                    />
                    <Bar dataKey="qtySold" name="qtySold" fill="#b07ae4" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <DashboardEmptyState description="Sin productos vendidos para destacar en este periodo." />
              )}
            </DashboardChartCard>
          </div>

          <div className="xl:col-span-4">
            <DashboardChartCard
              title="Clientes que mas compran"
              icon={<Users className="h-4 w-4" />}
              height={280}
              contentClassName="p-3"
            >
              {topCustomersChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCustomersChart} layout="vertical" margin={{ top: 4, right: 10, left: 12, bottom: 0 }}>
                    <CartesianGrid stroke="var(--ops-border-soft)" strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "var(--ops-text-muted)" }}
                      tickFormatter={(value) => formatNumber(Number(value))}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 11, fill: "var(--ops-text-muted)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip
                      formatter={(value: number, name: string) => [
                        name === "totalAmount" ? formatCurrencyPEN(value) : formatNumber(value),
                        name === "totalAmount" ? "Ventas" : "Cantidad",
                      ]}
                      contentStyle={chartTooltipStyle}
                    />
                    <Bar dataKey="totalAmount" name="totalAmount" fill="#0ea5e9" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <DashboardEmptyState description="Sin clientes suficientes para construir un ranking en este periodo." />
              )}
            </DashboardChartCard>
          </div>

          <div className="md:col-span-2 xl:col-span-4">
            <DashboardChartCard
              title="Mezcla de cobro"
              icon={<Wallet className="h-4 w-4" />}
              height={280}
              contentClassName="p-3"
            >
              {paymentPieData.length > 0 ? (
                <div className="grid h-full gap-3 lg:grid-cols-[minmax(0,1fr)_148px] lg:items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentPieData}
                        dataKey="amount"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={54}
                        outerRadius={84}
                        paddingAngle={2}
                      >
                        {paymentPieData.map((item, index) => (
                          <Cell key={item.key} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <text x="50%" y="48%" textAnchor="middle" className="fill-[var(--ops-text)] text-[15px] font-semibold">
                        {formatCurrencyPEN(totalPayments)}
                      </text>
                      <text x="50%" y="58%" textAnchor="middle" className="fill-[var(--ops-text-muted)] text-[11px]">
                        Pagos registrados
                      </text>
                      <RechartsTooltip
                        formatter={(value: number) => [formatCurrencyPEN(value), "Monto"]}
                        contentStyle={chartTooltipStyle}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="space-y-1.5">
                    {paymentMix.map((item, index) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-3 rounded-[14px] border border-[color:color-mix(in_srgb,var(--ops-border-soft)_74%,transparent)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_44%,var(--ops-surface))] px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                          />
                          <span className="text-xs font-medium text-[var(--ops-text)]">{item.label}</span>
                        </div>
                        <span className={cn("text-xs font-semibold", paymentMethodTone(item.amount))}>
                          {item.amount > 0 ? formatCurrencyPEN(item.amount) : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <DashboardEmptyState description="Sin pagos registrados para construir la mezcla de cobro." />
              )}
            </DashboardChartCard>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <SalesPerformanceCard section={sales} />
          </div>
          <div className="xl:col-span-4">
            <InventoryCard section={inventory} />
          </div>
          <div className="xl:col-span-4">
            <OperationsCard cash={cash} postsales={postsales} transfers={transfers} />
          </div>
        </div>
      </div>
    </section>
  )
}

function DashboardInfoCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <DashboardChartCard
      title={title}
      icon={<Icon className="h-4 w-4" />}
      height="auto"
      contentClassName="p-4"
    >
      {children}
    </DashboardChartCard>
  )
}

function InlineBadge({
  label,
  tone = "neutral",
}: {
  label: string
  tone?: "neutral" | "success" | "warning" | "danger" | "purple"
}) {
  return (
    <OpsStatusBadge tone={tone === "purple" ? "accent" : tone} size="xs" className="uppercase tracking-[0.12em]">
      {label}
    </OpsStatusBadge>
  )
}

function MetricRow({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "warning" | "danger"
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[var(--ops-text-muted)]">{label}</span>
      <span
        className={cn(
          "font-semibold",
          tone === "warning" && "text-amber-700",
          tone === "danger" && "text-rose-700",
          tone === "default" && "text-[var(--ops-text)]"
        )}
      >
        {value}
      </span>
    </div>
  )
}

function CardActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ripnel-accent-hover)] transition hover:text-[var(--ripnel-accent)]"
    >
      {label}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  )
}

function SalesPerformanceCard({ section }: { section: SalesToday | null }) {
  const saleCount = Number(section?.sale_count || 0)
  const totalAmount = Number(section?.total_amount || 0)
  const averageTicket = saleCount > 0 ? totalAmount / saleCount : null
  const paymentRows = [
    { key: "cash", label: "Efectivo", amount: Number(section?.by_method?.cash || 0) },
    { key: "yape", label: "Yape", amount: Number(section?.by_method?.yape || 0) },
    { key: "plin", label: "Plin", amount: Number(section?.by_method?.plin || 0) },
    { key: "transfer", label: "Transferencia", amount: Number(section?.by_method?.transfer || 0) },
  ]

  return (
    <DashboardInfoCard
      title="Ritmo comercial"
      icon={ShoppingCart}
    >
      {!section ? (
        <DashboardEmptyState compact description="No tienes visibilidad comercial para este periodo." />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)] px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                Ventas
              </p>
              <p className="mt-1 text-xl font-semibold text-[var(--ops-text)]">
                {formatNumber(saleCount)}
              </p>
            </div>
            <div className="rounded-xl border border-[color:color-mix(in_srgb,var(--ripnel-accent)_24%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_88%,var(--ops-surface))] px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ripnel-accent-hover)]">
                Facturacion
              </p>
              <p className="mt-1 text-xl font-semibold text-[var(--ops-text)]">
                {formatCurrencyPEN(totalAmount)}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <MetricRow
              label="Ticket promedio"
              value={averageTicket == null ? "—" : formatCurrencyPEN(averageTicket)}
            />
            <MetricRow label="Ultima venta" value={formatDateTime(section.last_confirmed_at)} />
          </div>

          <div className="space-y-1">
            {paymentRows.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-[14px] border border-transparent px-2.5 py-2"
              >
                <span className="text-sm text-[var(--ops-text-muted)]">{item.label}</span>
                <span className={cn("text-sm font-semibold", paymentMethodTone(item.amount))}>
                  {item.amount > 0 ? formatCurrencyPEN(item.amount) : "—"}
                </span>
              </div>
            ))}
          </div>

          <CardActionLink href={appRoutes.transactionHistory} label="Ver ventas" />
        </div>
      )}
    </DashboardInfoCard>
  )
}

function InventoryCard({ section }: { section: InventorySection | null }) {
  return (
    <DashboardInfoCard
      title="Inventario critico"
      icon={PackageSearch}
    >
      {!section ? (
        <DashboardEmptyState compact description="No hay visibilidad de inventario para este usuario." />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)] px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                En cero
              </p>
              <p className="mt-1 text-xl font-semibold text-[var(--ops-text)]">
                {formatNumber(Number(section.zero_stock_count || 0))}
              </p>
            </div>
            <div className="rounded-xl border border-[color:color-mix(in_srgb,#f59e0b_24%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_10%,var(--ops-surface))] px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                Bajo minimo
              </p>
              <p className="mt-1 text-xl font-semibold text-[var(--ops-text)]">
                {formatNumber(Number(section.low_stock_count || 0))}
              </p>
            </div>
          </div>

          {section.critical_variants && section.critical_variants.length > 0 ? (
            <div className="space-y-1">
              {section.critical_variants.slice(0, 4).map((item) => (
                <div
                  key={item.variant_id}
                  className="flex items-center justify-between gap-3 rounded-xl px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--ops-text)]">{item.style_name}</p>
                    <p className="truncate text-[11px] text-[var(--ops-text-muted)]">
                      {item.sku} · {item.size_code}/{item.color_code}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold",
                      Number(item.qty || 0) === 0 ? "text-rose-700" : "text-amber-700"
                    )}
                  >
                    {formatNumber(item.qty)} und
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <DashboardEmptyState compact description="No hay variantes criticas en la sede activa." />
          )}

          <CardActionLink href={appRoutes.inventory} label="Ver stock" />
        </div>
      )}
    </DashboardInfoCard>
  )
}

function OperationsCard({
  cash,
  postsales,
  transfers,
}: {
  cash: CashSection | null
  postsales: PostsalesSection | null
  transfers: TransfersSection | null
}) {
  const cashDifference = cash?.sales_summary?.consistency?.difference

  return (
    <DashboardInfoCard
      title="Caja, postventa y transferencias"
      icon={Store}
    >
      <div className="space-y-4">
        <div className="space-y-3 border-b border-[var(--ops-border-soft)] pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--ops-text)]">Caja</p>
              <p className="text-[11px] text-[var(--ops-text-muted)]">
                {cash?.closing ? `Estado ${formatCashStatus(cash.closing.status).toLowerCase()}.` : "Sin apertura registrada."}
              </p>
            </div>
            <InlineBadge
              label={cash?.closing ? formatCashStatus(cash.closing.status) : "Sin datos"}
              tone={!cash?.closing ? "neutral" : cash.closing.status === "open" ? "success" : "neutral"}
            />
          </div>
          <div className="mt-3 space-y-1.5">
            <MetricRow label="Ventas" value={formatCurrencyPEN(cash?.sales_summary?.consistency?.sales_total)} />
            <MetricRow label="Pagos" value={formatCurrencyPEN(cash?.sales_summary?.consistency?.payment_total)} />
            <MetricRow
              label="Diferencia"
              value={cash?.sales_summary ? formatCurrencyPEN(cashDifference) : "—"}
              tone={!cash?.sales_summary ? "default" : cashDifference === 0 ? "default" : cashDifference && cashDifference > 0 ? "warning" : "danger"}
            />
          </div>
          <div className="mt-3">
            <CardActionLink href={appRoutes.cash} label="Ver caja" />
          </div>
        </div>

        <div className="space-y-3 border-b border-[var(--ops-border-soft)] pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--ops-text)]">Postventa</p>
              <p className="text-[11px] text-[var(--ops-text-muted)]">
                Cambios y anulaciones permitidas por reglas del sistema.
              </p>
            </div>
            <InlineBadge
              label={`${formatNumber(Number(postsales?.eligible_exchange_count || 0))} casos`}
              tone={Number(postsales?.eligible_exchange_count || 0) > 0 ? "warning" : "neutral"}
            />
          </div>
          <div className="mt-3 space-y-1.5">
            <MetricRow label="Elegibles" value={formatNumber(Number(postsales?.eligible_exchange_count || 0))} />
            <MetricRow label="Anulables" value={formatNumber(Number(postsales?.eligible_cancel_count || 0))} />
            <MetricRow label="Bloqueadas" value={formatNumber(Number(postsales?.blocked_cancel_count || 0))} />
          </div>
          <div className="mt-3">
            <CardActionLink href={appRoutes.postsales} label="Revisar postventa" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--ops-text)]">Transferencias</p>
              <p className="text-[11px] text-[var(--ops-text-muted)]">
                Reposición entre sedes con aprobación, despacho y recepción.
              </p>
            </div>
            <InlineBadge
              label={`${formatNumber(
                Number(transfers?.pending_receipts_count || 0) +
                  Number(transfers?.pending_approval_count || 0) +
                  Number(transfers?.pending_dispatch_count || 0)
              )} pendientes`}
              tone={
                Number(transfers?.pending_receipts_count || 0) +
                  Number(transfers?.pending_approval_count || 0) +
                  Number(transfers?.pending_dispatch_count || 0) >
                0
                  ? "warning"
                  : "neutral"
              }
            />
          </div>
          <div className="mt-3 space-y-1.5">
            <MetricRow label="Por recibir" value={formatNumber(Number(transfers?.pending_receipts_count || 0))} />
            <MetricRow label="Por aprobar" value={formatNumber(Number(transfers?.pending_approval_count || 0))} />
            <MetricRow label="Por despachar" value={formatNumber(Number(transfers?.pending_dispatch_count || 0))} />
          </div>
          <div className="mt-3">
            <CardActionLink
              href={buildTransferModuleRoute(transferRouteSlugs.list)}
              label="Ver transferencias"
            />
          </div>
        </div>
      </div>
    </DashboardInfoCard>
  )
}
