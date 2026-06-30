"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
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
import { OpsEmptyState } from "@/components/ui/ops-empty-state"
import {
  formatCashStatus,
  formatCurrencyPEN,
  formatNumber,
} from "@/components/dashboard/dashboard-formatters"
import { DashboardKpiCard, type DashboardKpiTone } from "@/components/dashboard/dashboard-kpi-card"
import { useAuth } from "@/components/auth/AuthProvider"
import { useApiGet } from "@/hooks/use-api-get"
import { ErrorPage, ProtectedLoadingPage } from "@/components/feedback/status-page"
import { useSidebarTopbarActions } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { OpsSelect } from "@/components/ui/ops-selection"
import { OpsActionLink } from "@/components/ui/ops-action-link"
import { OpsMetricRow } from "@/components/ui/ops-metric-row"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { fetchCommercialActivity, fetchCustomerAnalytics, fetchDashboardOverview } from "@/lib/api-dashboard"
import type {
  CashSection,
  DashboardMetricComparison,
  InventorySection,
  PostsalesSection,
  SalesToday,
  TransfersSection,
} from "@/lib/dashboard-types"
import {
  appRoutes,
} from "@/lib/routes"
import { formatDateTime } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import { DASH } from "./dashboard-messages"
import {
  SURFACE_MUTED_24,
  CHART4_HIGHLIGHT_PANEL,
  ACCENT_FACTURATION_PANEL,
} from "./dashboard-constants"

const PIE_COLORS = [
  "var(--ops-chart-1)",
  "var(--ops-chart-2)",
  "var(--ops-chart-3)",
  "var(--ops-chart-4)",
  "var(--ops-chart-5)",
  "var(--ops-chart-6)",
]

const chartTooltipStyle = {
  background: "var(--ops-surface)",
  border: "1px solid var(--ops-border-strong)",
  borderRadius: 12,
  boxShadow: "0 10px 24px rgb(15 23 42 / 0.08)",
  fontSize: 12,
  color: "var(--ops-text)",
}

const ALL_LOCATIONS_VALUE = "all"

function todayPeruISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" })
}

function buildAttentionBadge(value: number, tone: AttentionPanelItem["tone"]) {
  if (value === 0) return null
  if (tone === "danger") return DASH.attention.urgent
  if (tone === "warning") return DASH.attention.attend
  return DASH.attention.review
}

function buildDashboardScopeParams(locationValue: string) {
  if (!locationValue) {
    return {}
  }

  if (locationValue === ALL_LOCATIONS_VALUE) {
    return {
      location_scope: "all" as const,
      location_id: null,
    }
  }

  return {
    location_scope: "single" as const,
    location_id: locationValue,
  }
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

  const [period, setPeriod] = useState<"week" | "month" | "quarter">("week")
  const [selectedLocation, setSelectedLocation] = useState<string>("")

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

  const { data: overview, loading: loadingOverview, error: overviewError, refetch: refetchOverview } = useApiGet(
    () => fetchDashboardOverview({
      date_from: dateRange.date_from,
      date_to: dateRange.date_to,
      ...buildDashboardScopeParams(selectedLocation),
    }),
    [dateRange.date_from, dateRange.date_to, selectedLocation]
  )

  const { data: analytics, loading: loadingAnalytics, error: analyticsError, refetch: refetchAnalytics } = useApiGet(
    () => fetchCustomerAnalytics({
      date_from: dateRange.date_from,
      date_to: dateRange.date_to,
      limit: 8,
      ...buildDashboardScopeParams(selectedLocation),
    }),
    [dateRange.date_from, dateRange.date_to, selectedLocation]
  )

  const { data: commercialActivity, loading: loadingActivity, error: activityError, refetch: refetchActivity } = useApiGet(
    () => fetchCommercialActivity({
      date_from: dateRange.date_from,
      date_to: dateRange.date_to,
      group: "daily",
      ...buildDashboardScopeParams(selectedLocation),
    }),
    [dateRange.date_from, dateRange.date_to, selectedLocation]
  )

  const loading = loadingOverview || loadingAnalytics || loadingActivity
  const error = overviewError || analyticsError || activityError
  const refreshing = loading && !!overview

  const refetchAll = () => {
    refetchOverview()
    refetchAnalytics()
    refetchActivity()
  }

  useEffect(() => {
    const availableLocations = overview?.context.scope.available_locations ?? []
    if (!availableLocations.length) return

    const selectedOptionExists =
      selectedLocation === ALL_LOCATIONS_VALUE ||
      availableLocations.some((location) => location.location_id === selectedLocation)

    if (selectedOptionExists) return

    const nextSelected =
      overview?.context.scope.mode === "all"
        ? ALL_LOCATIONS_VALUE
        : overview?.context.scope.selected_location_id || availableLocations[0]?.location_id || null

    if (nextSelected && nextSelected !== selectedLocation) {
      const timer = window.setTimeout(() => {
        setSelectedLocation(nextSelected)
      }, 0)

      return () => window.clearTimeout(timer)
    }
  }, [overview, selectedLocation])

  const dashboardTopbarActions = useMemo(() => [
    {
      key: "quick-sale",
      label: DASH.header.quickSale,
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
        name: item.customer_name || DASH.payments.genericCustomer,
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
    { key: "cash", label: DASH.payments.cash, amount: Number(sales?.by_method?.cash || 0) },
    { key: "yape", label: DASH.payments.yape, amount: Number(sales?.by_method?.yape || 0) },
    { key: "plin", label: DASH.payments.plin, amount: Number(sales?.by_method?.plin || 0) },
    { key: "transfer", label: DASH.payments.transfer, amount: Number(sales?.by_method?.transfer || 0) },
  ]
  const paymentPieData = paymentMix.filter((item) => item.amount > 0)

  const kpis = [
    {
      label: DASH.kpi.cashDiff,
      value: cashConsistency ? formatCurrencyPEN(cashDifference) : "—",
      trend: null,
      icon: Wallet,
      tone: resolveDifferenceTone(cashDifference),
      href: appRoutes.cash,
    },
    {
      label: DASH.kpi.totalSales,
      value: formatCurrencyPEN(totalRevenue),
      trend: normalizeComparison(sales?.comparisons?.total_amount),
      icon: CircleDollarSign,
      tone: "purple" as const,
      href: appRoutes.transactionHistory,
    },
    {
      label: DASH.kpi.confirmedSales,
      value: formatNumber(saleCount),
      trend: normalizeComparison(sales?.comparisons?.sale_count),
      icon: ShoppingCart,
      tone: "neutral" as const,
      href: appRoutes.transactionHistory,
    },
    {
      label: DASH.kpi.avgTicket,
      value: averageTicket == null ? "—" : formatCurrencyPEN(averageTicket),
      trend: normalizeComparison(sales?.comparisons?.avg_ticket),
      icon: Ticket,
      tone: "danger" as const,
      href: appRoutes.transactionHistory,
    },
    {
      label: DASH.kpi.registeredPayments,
      value: formatCurrencyPEN(totalPayments),
      trend: normalizeComparison(cash?.sales_summary?.comparisons?.payment_total),
      icon: CreditCard,
      tone: (cashConsistency ? "success" : "neutral") as DashboardKpiTone,
      href: appRoutes.cash,
    },
    {
      label: DASH.kpi.criticalStock,
      value: formatNumber(criticalStockCount),
      trend: null,
      icon: PackageSearch,
      tone: (criticalStockCount > 0 ? "warning" : "neutral") as DashboardKpiTone,
      href:
        Number(inventory?.zero_stock_count || 0) > 0
          ? `${appRoutes.inventory}?status=sin-stock`
          : Number(inventory?.low_stock_count || 0) > 0
            ? `${appRoutes.inventory}?status=stock-bajo`
            : appRoutes.inventory,
    },
  ]

  const attentionItems = useMemo<AttentionPanelItem[]>(() => {
    const items: AttentionPanelItem[] = []

    if (cash) {
      const difference = Number(cashConsistency?.difference ?? 0)
      items.push({
        key: "cash-difference",
        label: DASH.attention.cashDiffLabel,
        value: cashConsistency
          ? difference === 0
            ? DASH.attention.cashAllGood
            : difference > 0
              ? DASH.attention.cashPaymentsBelow
              : DASH.attention.cashPaymentsAbove
          : DASH.attention.cashNoSummary,
        numericValue: Math.abs(difference),
        highlightValue: cashConsistency ? formatCurrencyPEN(difference) : "—",
        badge: cashConsistency ? buildAttentionBadge(Math.abs(difference), difference === 0 ? "success" : difference > 0 ? "warning" : "danger") : DASH.attention.cashNoData,
        cta: DASH.attention.cashCta,
        href: appRoutes.cash,
        icon: Wallet,
        tone: cashConsistency ? (difference === 0 ? "success" : difference > 0 ? "warning" : "danger") : "neutral",
      })
    }

    if (inventory) {
      items.push({
        key: "inventory-critical",
        label: DASH.attention.stockCriticalLabel,
        value: criticalStockCount > 0 ? DASH.attention.stockCompromised : DASH.attention.stockNoAlerts,
        numericValue: criticalStockCount,
        highlightValue: formatNumber(criticalStockCount),
        badge: buildAttentionBadge(criticalStockCount, criticalStockCount > 0 ? "warning" : "success"),
        cta: DASH.attention.stockCta,
        href: criticalStockCount > 0 ? `${appRoutes.inventory}?status=con-alertas` : appRoutes.inventory,
        icon: PackageSearch,
        tone: criticalStockCount > 0 ? "warning" : "success",
      })
    }

    if (postsales) {
      const postsalesPending = Number(postsales.eligible_exchange_count || 0)
      items.push({
        key: "postsales",
        label: DASH.attention.postsaleLabel,
        value: postsalesPending > 0 ? DASH.attention.postsalePending : DASH.attention.postsaleNoCases,
        numericValue: postsalesPending,
        highlightValue: formatNumber(postsalesPending),
        badge: postsalesPending > 0 ? DASH.attention.postsalePendingBadge : DASH.attention.postsaleUpToDate,
        cta: DASH.attention.postsaleCta,
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
        label: DASH.attention.transferLabel,
        value: pendingTransfers > 0 ? DASH.attention.transferStuck : DASH.attention.transferNoQueue,
        numericValue: pendingTransfers,
        highlightValue: formatNumber(pendingTransfers),
        badge: buildAttentionBadge(pendingTransfers, pendingTransfers > 0 ? "warning" : "success"),
        cta: DASH.attention.transferCta,
        href: appRoutes.transfers,
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

  const locationLabel = overview?.context.scope.label ?? DASH.header.activeLocation
  const locationOptions = useMemo(() => {
    const availableLocations = overview?.context.scope.available_locations ?? []
    const options = availableLocations.map((location) => ({
      value: location.location_id,
      label: location.name,
    }))

    if (availableLocations.length > 1) {
       return [{ value: ALL_LOCATIONS_VALUE, label: DASH.header.allLocations }, ...options]
    }

    return options
  }, [overview])

  if ((loading || authLoading) && !overview) {
    return (
      <ProtectedLoadingPage
        title={DASH.loading.title}
        description={DASH.loading.description}
      />
    )
  }

  if (!overview) {
    return (
      <ErrorPage
        variant="ops"
        title={DASH.error.title}
        description={error || DASH.error.fallback}
        onReset={refetchAll}
      />
    )
  }

  const periodActions = (
    <div className="flex flex-wrap items-center gap-2">
      {locationOptions.length > 0 ? (
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
            {DASH.header.coverage}
          </span>
          <div className="min-w-[180px] max-w-[220px]">
            <OpsSelect
              label=""
              value={selectedLocation}
              options={locationOptions}
              onChange={setSelectedLocation}
              triggerClassName="h-10 rounded-xl"
            />
          </div>
        </div>
      ) : null}
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
        onClick={refetchAll}
        disabled={refreshing}
        aria-label={DASH.header.refresh}
      >
        <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
      </Button>
    </div>
  )

  return (
    <section className="ops-page min-h-screen py-[var(--ops-page-py)]">
        <div className="mx-auto max-w-[1480px] space-y-4 px-3 lg:px-4">
          <PosHeader eyebrow={locationLabel} title={DASH.header.title} actions={periodActions} />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
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

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
            <CommercialActivityCard data={commercialActivity} />
            <AttentionPanel items={attentionItems} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
            <div className="xl:col-span-4">
            <DashboardChartCard
              title={DASH.charts.topProducts}
              icon={<PackageSearch className="h-4 w-4" />}
              height={240}
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
                        name === "qtySold" ? `${formatNumber(value)} ${DASH.charts.units}` : formatCurrencyPEN(value),
                        name === "qtySold" ? DASH.charts.quantity : DASH.charts.sales,
                      ]}
                      contentStyle={chartTooltipStyle}
                    />
                    <Bar dataKey="qtySold" name="qtySold" fill="var(--ops-chart-1)" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <OpsEmptyState variant="compact" description={DASH.charts.topProductsEmpty} />
              )}
            </DashboardChartCard>
            </div>

            <div className="xl:col-span-4">
            <DashboardChartCard
              title={DASH.charts.topCustomers}
              icon={<Users className="h-4 w-4" />}
              height={240}
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
                        name === "totalAmount" ? DASH.charts.sales : DASH.charts.quantity,
                      ]}
                      contentStyle={chartTooltipStyle}
                    />
                    <Bar dataKey="totalAmount" name="totalAmount" fill="var(--ops-chart-2)" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <OpsEmptyState variant="compact" description={DASH.charts.topCustomersEmpty} />
              )}
            </DashboardChartCard>
            </div>

            <div className="md:col-span-2 xl:col-span-4">
            <DashboardChartCard
              title={DASH.charts.paymentMethods}
              icon={<Wallet className="h-4 w-4" />}
              height="auto"
              contentClassName="p-3"
            >
              {paymentPieData.length > 0 ? (
                <div className="space-y-3">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_158px] lg:items-center">
                    <div className="mx-auto h-[188px] w-full max-w-[280px] sm:h-[208px]">
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
                            {DASH.charts.registeredPayments}
                          </text>
                          <RechartsTooltip
                            formatter={(value: number) => [formatCurrencyPEN(value), DASH.charts.amount]}
                            contentStyle={chartTooltipStyle}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="hidden lg:block">
                      <div className="space-y-2">
                        {paymentMix.map((item, index) => (
                          <div
                            key={item.key}
                            className="flex items-center justify-between gap-3 border-b border-[var(--ops-border-soft)] pb-2 last:border-b-0 last:pb-0"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                              />
                              <span className="truncate text-xs font-medium text-[var(--ops-text)]">{item.label}</span>
                            </div>
                            <span className={cn("shrink-0 text-xs font-semibold", paymentMethodTone(item.amount))}>
                              {item.amount > 0 ? formatCurrencyPEN(item.amount) : "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 lg:hidden">
                    {paymentMix.map((item, index) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-3 border-b border-[var(--ops-border-soft)] pb-2 last:border-b-0 last:pb-0"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                          />
                          <span className="truncate text-sm text-[var(--ops-text)]">{item.label}</span>
                        </div>
                        <span className={cn("shrink-0 text-sm font-semibold", paymentMethodTone(item.amount))}>
                          {item.amount > 0 ? formatCurrencyPEN(item.amount) : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <OpsEmptyState variant="compact" description={DASH.charts.paymentMethodsEmpty} />
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
            <OperationsCard
              cash={cash}
              postsales={postsales}
              transfers={transfers}
              isSingleLocationScope={overview.context.scope.mode === "single"}
            />
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
      contentClassName="p-3.5"
    >
      {children}
    </DashboardChartCard>
  )
}

function DashboardActionLink({ href, label }: { href: string; label: string }) {
  return (
    <OpsActionLink
      href={href}
      tone="accent"
      size="sm"
      className="gap-1.5 border-transparent bg-transparent px-0 hover:bg-transparent"
    >
      {label}
      <ArrowRight className="h-3.5 w-3.5" />
    </OpsActionLink>
  )
}

function DashboardInlineBadge({
  children,
  tone,
}: {
  children: ReactNode
  tone: "neutral" | "accent" | "success" | "warning" | "danger"
}) {
  return (
    <OpsStatusBadge tone={tone} size="xs" className="uppercase tracking-[0.12em]">
      {children}
    </OpsStatusBadge>
  )
}


function SalesPerformanceCard({ section }: { section: SalesToday | null }) {
  const saleCount = Number(section?.sale_count || 0)
  const totalAmount = Number(section?.total_amount || 0)
  const averageTicket = saleCount > 0 ? totalAmount / saleCount : null
  const paymentRows = [
    { key: "cash", label: DASH.payments.cash, amount: Number(section?.by_method?.cash || 0) },
    { key: "yape", label: DASH.payments.yape, amount: Number(section?.by_method?.yape || 0) },
    { key: "plin", label: DASH.payments.plin, amount: Number(section?.by_method?.plin || 0) },
    { key: "transfer", label: DASH.payments.transfer, amount: Number(section?.by_method?.transfer || 0) },
  ]

  return (
    <DashboardInfoCard
      title={DASH.cards.salesPerformance}
      icon={ShoppingCart}
    >
      {!section ? (
        <OpsEmptyState variant="compact" description={DASH.cards.salesPerformanceEmpty} />
      ) : (
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)] px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                {DASH.cards.sales}
              </p>
              <p className="mt-1 text-xl font-semibold text-[var(--ops-text)]">
                {formatNumber(saleCount)}
              </p>
            </div>
            <div className={ACCENT_FACTURATION_PANEL}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ripnel-accent-hover)]">
                {DASH.cards.invoicing}
              </p>
              <p className="mt-1 text-xl font-semibold text-[var(--ops-text)]">
                {formatCurrencyPEN(totalAmount)}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] text-[var(--ops-text-muted)]">{DASH.cards.avgTicketLabel}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[var(--ops-text-muted)] transition hover:text-[var(--ops-text)]"
                      aria-label={DASH.cards.avgTicketAria}
                    >
                      <Ticket className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8}>
                    {DASH.cards.avgTicketTooltip}
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="font-semibold text-[var(--ops-text)]">
                {averageTicket == null ? "—" : formatCurrencyPEN(averageTicket)}
              </span>
            </div>
            <OpsMetricRow label={DASH.cards.lastSale} value={formatDateTime(section.last_confirmed_at)} />
          </div>

          <div className="space-y-1">
            {paymentRows.filter((item) => item.amount > 0).map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-[14px] border border-transparent px-2 py-1.5"
              >
                <span className="text-sm text-[var(--ops-text-muted)]">{item.label}</span>
                <span className={cn("text-sm font-semibold", paymentMethodTone(item.amount))}>{formatCurrencyPEN(item.amount)}</span>
              </div>
            ))}
          </div>

          <DashboardActionLink href={appRoutes.transactionHistory} label={DASH.cards.viewSales} />
        </div>
      )}
    </DashboardInfoCard>
  )
}

function InventoryCard({ section }: { section: InventorySection | null }) {
  return (
    <DashboardInfoCard
      title={DASH.cards.inventoryCritical}
      icon={PackageSearch}
    >
      {!section ? (
        <OpsEmptyState variant="compact" description={DASH.cards.inventoryEmpty} />
      ) : (
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)] px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                {DASH.cards.inZero}
              </p>
              <p className="mt-1 text-xl font-semibold text-[var(--ops-text)]">
                {formatNumber(Number(section.zero_stock_count || 0))}
              </p>
            </div>
            <div className={CHART4_HIGHLIGHT_PANEL}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-chart-4)]">
                {DASH.cards.belowMin}
              </p>
              <p className="mt-1 text-xl font-semibold text-[var(--ops-text)]">
                {formatNumber(Number(section.low_stock_count || 0))}
              </p>
            </div>
          </div>

          {section.critical_variants && section.critical_variants.length > 0 ? (
            <div className="space-y-1">
              {section.critical_variants.slice(0, 4).map((item) => (
                <Link
                  key={item.variant_id}
                  href={`${appRoutes.inventory}?focus_variant_id=${encodeURIComponent(item.variant_id)}`}
                  className="flex items-center justify-between gap-3 rounded-xl px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--ops-text)]">{item.style_name}</p>
                    <p className="truncate text-[11px] text-[var(--ops-text-muted)]">
                      {item.sku} · {item.size_code}/{item.color_code}
                    </p>
                  </div>
                  <span
                    className={cn("shrink-0 text-sm font-semibold", Number(item.qty || 0) === 0 ? "text-[var(--ops-chart-5)]" : "text-[var(--ops-chart-4)]")}
                  >
                    {formatNumber(item.qty)} {DASH.charts.units}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <OpsEmptyState variant="compact" description={DASH.cards.noCriticalVariants} />
          )}

          <DashboardActionLink href={`${appRoutes.inventory}?status=con-alertas`} label={DASH.cards.viewStock} />
        </div>
      )}
    </DashboardInfoCard>
  )
}

function OperationsCard({
  cash,
  postsales,
  transfers,
  isSingleLocationScope,
}: {
  cash: CashSection | null
  postsales: PostsalesSection | null
  transfers: TransfersSection | null
  isSingleLocationScope: boolean
}) {
  const cashDifference = cash?.sales_summary?.consistency?.difference

  return (
    <DashboardInfoCard
      title={DASH.cards.operations}
      icon={Store}
    >
      <div className="space-y-3.5">
        <div className={`space-y-2.5 rounded-xl border border-[var(--ops-border-soft)] ${SURFACE_MUTED_24} p-3`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--ops-text)]">{DASH.cards.cash}</p>
              <p className="text-[11px] text-[var(--ops-text-muted)]">
                {cash?.closing
                  ? `Estado ${formatCashStatus(cash.closing.status).toLowerCase()}.`
                  : isSingleLocationScope
                    ? DASH.cards.cashNoOpening
                    : DASH.cards.cashConsolidated}
              </p>
            </div>
            <DashboardInlineBadge
              tone={!cash?.closing ? "neutral" : cash.closing.status === "open" ? "success" : "neutral"}
            >
              {
                cash?.closing
                  ? formatCashStatus(cash.closing.status)
                  : isSingleLocationScope
                    ? DASH.cards.cashNoDataBadge
                    : DASH.cards.cashConsolidatedBadge
              }
            </DashboardInlineBadge>
          </div>
          <div className="space-y-1.5">
            <OpsMetricRow label={DASH.cards.sales} value={formatCurrencyPEN(cash?.sales_summary?.consistency?.sales_total)} />
            <OpsMetricRow label={DASH.cards.payments} value={formatCurrencyPEN(cash?.sales_summary?.consistency?.payment_total)} />
            <OpsMetricRow
              label={DASH.cards.difference}
              value={cash?.sales_summary ? formatCurrencyPEN(cashDifference) : "—"}
              tone={!cash?.sales_summary ? "default" : cashDifference === 0 ? "default" : cashDifference && cashDifference > 0 ? "warning" : "danger"}
            />
          </div>
          <div>
            <DashboardActionLink href={appRoutes.cash} label={DASH.cards.viewCash} />
          </div>
        </div>

        <div className={`space-y-2.5 rounded-xl border border-[var(--ops-border-soft)] ${SURFACE_MUTED_24} p-3`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--ops-text)]">{DASH.cards.postsale}</p>
              <p className="text-[11px] text-[var(--ops-text-muted)]">
                {DASH.cards.postsaleHint}
              </p>
            </div>
            <DashboardInlineBadge
              tone={Number(postsales?.eligible_exchange_count || 0) > 0 ? "warning" : "neutral"}
            >
              {`${formatNumber(Number(postsales?.eligible_exchange_count || 0))} ${DASH.cards.postsaleCases}`}
            </DashboardInlineBadge>
          </div>
          <div className="space-y-1.5">
            <OpsMetricRow label={DASH.cards.eligible} value={formatNumber(Number(postsales?.eligible_exchange_count || 0))} />
            <OpsMetricRow label={DASH.cards.cancellable} value={formatNumber(Number(postsales?.eligible_cancel_count || 0))} />
            <OpsMetricRow label={DASH.cards.blocked} value={formatNumber(Number(postsales?.blocked_cancel_count || 0))} />
          </div>
          <div>
            <DashboardActionLink href={appRoutes.postsales} label={DASH.cards.reviewPostsale} />
          </div>
        </div>

        <div className={`space-y-2.5 rounded-xl border border-[var(--ops-border-soft)] ${SURFACE_MUTED_24} p-3`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--ops-text)]">{DASH.cards.transfers}</p>
              <p className="text-[11px] text-[var(--ops-text-muted)]">
                {DASH.cards.transfersHint}
              </p>
            </div>
            <DashboardInlineBadge
              tone={
                Number(transfers?.pending_receipts_count || 0) +
                  Number(transfers?.pending_approval_count || 0) +
                  Number(transfers?.pending_dispatch_count || 0) >
                0
                  ? "warning"
                  : "neutral"
              }
            >
              {`${formatNumber(
                Number(transfers?.pending_receipts_count || 0) +
                  Number(transfers?.pending_approval_count || 0) +
                  Number(transfers?.pending_dispatch_count || 0)
              )} ${DASH.cards.transfersPending}`}
            </DashboardInlineBadge>
          </div>
          <div className="space-y-1.5">
            <OpsMetricRow label={DASH.cards.byReceive} value={formatNumber(Number(transfers?.pending_receipts_count || 0))} />
            <OpsMetricRow label={DASH.cards.byApprove} value={formatNumber(Number(transfers?.pending_approval_count || 0))} />
            <OpsMetricRow label={DASH.cards.byDispatch} value={formatNumber(Number(transfers?.pending_dispatch_count || 0))} />
          </div>
          <div>
            <DashboardActionLink
              href={appRoutes.transfers}
              label={DASH.cards.viewTransfers}
            />
          </div>
        </div>
      </div>
    </DashboardInfoCard>
  )
}
