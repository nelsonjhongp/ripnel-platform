"use client"

import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  ChevronRight,
  LineChart,
  LoaderCircle,
  MapPinned,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"

import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { useAuth } from "@/components/auth/AuthProvider"
import { ErrorPage, InlineStatusCard, LoadingPage } from "@/components/feedback/status-page"
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { OpsPageShell, OpsFiltersRow } from "@/components/ui/ops-page-shell"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { OpsPanelSection } from "@/components/ui/ops-panel-section"
import { OpsAttentionRow } from "@/components/ui/ops-attention-row"
import { OpsMetricCard } from "@/components/ui/ops-metric-card"
import { OpsDataTable } from "@/components/ui/ops-data-table"
import { DashboardChartCard } from "@/components/dashboard/dashboard-chart-card"
import { OpsSelect, type OpsOption } from "@/components/ui/ops-selection"
import { Pagination } from "@/components/ui/pagination"
import { Button } from "@/components/ui/button"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { OpsFormField } from "@/components/ui/ops-form-field"
import { opsInputCompact } from "@/components/ui/ops-control-styles"
import { AdminActionButton } from "@/components/admin/admin-ui"
import { formatDateTime } from "@/lib/date-utils"

import { CashStatusBadge } from "./cash-status-badge"
import { formatAmount, formatBusinessDate } from "./cash-utils"
import { CAJA } from "./cash-messages"
import { CONTROL_TABLE_COLUMNS } from "./cash-constants"
import { useCashAdmin } from "./use-cash-admin"

const RANGE_OPTIONS: OpsOption[] = [
  { value: "7d", label: CAJA.admin.rangeOptions.d7 },
  { value: "30d", label: CAJA.admin.rangeOptions.d30 },
  { value: "60d", label: CAJA.admin.rangeOptions.d60 },
]

const STATUS_OPTIONS: OpsOption[] = [
  { value: "all", label: CAJA.admin.statusOptions.all },
  { value: "open", label: CAJA.admin.statusOptions.pending },
  { value: "closed", label: CAJA.admin.statusOptions.closed },
]

export default function CashControlPage() {
  const { has } = useAuth()
  const canReopenCash = has("cash.admin.reopen")

  const {
    summary,
    sessions,
    loading,
    error,
    range,
    setRange,
    status,
    setStatus,
    locationId,
    setLocationId,
    setPage,
    setReloadKey,
    locationOptions,
    reopenTarget,
    setReopenTarget,
    reopenNotes,
    setReopenNotes,
    reopeningCash,
    handleReopenCash,
    trendData,
    locationChartData,
    hasActiveFilters,
    clearFilters,
  } = useCashAdmin()

  if (loading && !summary && !sessions) {
    return (
      <LoadingPage
        title={CAJA.loading.admin.title}
        description={CAJA.loading.admin.desc}
        variant="ops"
      />
    )
  }

  if (error && !summary && !sessions) {
    return (
      <ErrorPage
        title={CAJA.loading.admin.errorTitle}
        description={error}
        variant="ops"
      />
    )
  }

  const stats = summary?.stats
  const pagination = sessions?.pagination

  return (
    <PermissionGuard permission="cash.admin.view">
      <TooltipProvider delayDuration={120}>
        <OpsPageShell width="wide" className="space-y-5">
          <PosHeader
            eyebrow={CAJA.header.eyebrow}
            title={CAJA.header.controlTitle}
            actions={
              <>
                <Button variant="outline" size="sm" className="rounded-lg gap-2" asChild>
                  <Link href="/caja">
                    <ArrowLeft className="h-4 w-4" />
                    {CAJA.actions.dayBox}
                  </Link>
                </Button>
                <AdminActionButton
                  onClick={() => setReloadKey((current) => current + 1)}
                >
                  <RefreshCw className="h-4 w-4" />
                  {CAJA.actions.update}
                </AdminActionButton>
              </>
            }
          />

          <OpsFiltersRow className="lg:grid-cols-[0.92fr_0.84fr_0.95fr_auto]">
            <OpsSelect
              label={CAJA.admin.filters.range}
              value={range}
              options={RANGE_OPTIONS}
              onChange={(v) => {
                setRange(v as Parameters<typeof setRange>[0])
                setPage(1)
              }}
            />
            <OpsSelect
              label={CAJA.admin.filters.status}
              value={status}
              options={STATUS_OPTIONS}
              onChange={(v) => {
                setStatus(v as Parameters<typeof setStatus>[0])
                setPage(1)
              }}
            />
            <OpsSelect
              label={CAJA.admin.filters.location}
              value={locationId}
              options={locationOptions}
              onChange={(v) => {
                setLocationId(v)
                setPage(1)
              }}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="h-10 w-10 rounded-lg"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  aria-label={CAJA.admin.filters.clearFilters}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{CAJA.admin.filters.clearFilters}</TooltipContent>
            </Tooltip>
          </OpsFiltersRow>

          {summary &&
          ((summary.alerts.open_locations.length > 0) ||
            (summary.alerts.inconsistent_sessions.length > 0)) ? (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[var(--ops-tone-warning-text)]" />
                <h2 className="text-base font-semibold text-[var(--ops-text)]">
                  {CAJA.admin.operationalAlerts}
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {summary.alerts.open_locations.map((location) => (
                  <OpsAttentionRow
                    key={location.location_id}
                    icon={<AlertTriangle className="h-4 w-4" />}
                    title={location.location_name}
                    description={CAJA.admin.openSession(location.open_count)}
                    ctaLabel={CAJA.actions.view}
                    href="/caja/historial"
                    highlightValue={String(location.open_count)}
                    badge={CAJA.admin.pendingBadge}
                    tone="warning"
                    embedded
                  />
                ))}
                {summary.alerts.inconsistent_sessions.map((session) => (
                  <OpsAttentionRow
                    key={session.cash_closing_id}
                    icon={<AlertTriangle className="h-4 w-4" />}
                    title={session.location_name}
                    description={formatBusinessDate(session.business_date)}
                    ctaLabel={CAJA.actions.review}
                    href={`/caja/historial/${session.cash_closing_id}`}
                    highlightValue={formatAmount(session.difference)}
                    tone="danger"
                    embedded
                  />
                ))}
              </div>
            </section>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <OpsMetricCard
              icon={<ShieldCheck className="h-4 w-4" />}
              label={CAJA.admin.sessions}
              value={stats?.session_count || 0}
            />
            <OpsMetricCard
              icon={<LineChart className="h-4 w-4" />}
              label={CAJA.admin.totalRegistered}
              value={formatAmount(stats?.total_registered || 0)}
              tone="accent"
            />
            <OpsMetricCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label={CAJA.admin.pendingClose}
              value={stats?.open_count || 0}
              tone="warning"
            />
            <OpsMetricCard
              icon={<MapPinned className="h-4 w-4" />}
              label={CAJA.admin.openLocations}
              value={stats?.open_location_count || 0}
              tone="success"
            />
          </div>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[var(--ripnel-accent)]" />
              <h2 className="text-base font-semibold text-[var(--ops-text)]">
                {CAJA.admin.chartsTitle}
              </h2>
            </div>
            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <DashboardChartCard
                title={CAJA.admin.trendTitle}
                subtitle={CAJA.admin.trendSubtitle}
                height={260}
              >
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient
                          id="cashTrend"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="var(--ripnel-accent)"
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="100%"
                            stopColor="var(--ripnel-accent)"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        stroke="var(--ops-border-strong)"
                        strokeDasharray="3 3"
                      />
                      <XAxis
                        dataKey="short_date"
                        tick={{ fontSize: 12, fill: "var(--ops-text-muted)" }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "var(--ops-text-muted)" }}
                        tickFormatter={(value: number) => formatAmount(value)}
                        width={80}
                      />
                      <RechartsTooltip
                        formatter={(value: number) => formatAmount(value)}
                        labelFormatter={(label) => CAJA.admin.chartDateLabel(String(label))}
                      />
                      <Area
                        type="monotone"
                        dataKey="total_registered"
                        stroke="var(--ripnel-accent)"
                        strokeWidth={2}
                        fill="url(#cashTrend)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <InlineStatusCard
                    title={CAJA.admin.noTrendDataTitle}
                    description={CAJA.admin.noTrendDataDesc}
                    tone="neutral"
                    variant="ops"
                  />
                )}
              </DashboardChartCard>

              <DashboardChartCard
                title={CAJA.admin.comparisonTitle}
                subtitle={CAJA.admin.comparisonSubtitle}
                height={260}
              >
                {locationChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={locationChartData}
                      layout="vertical"
                      margin={{ left: 24 }}
                    >
                      <CartesianGrid
                        stroke="var(--ops-border-strong)"
                        strokeDasharray="3 3"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 12, fill: "var(--ops-text-muted)" }}
                      />
                      <YAxis
                        type="category"
                        dataKey="short_name"
                        tick={{ fontSize: 12, fill: "var(--ops-text-muted)" }}
                        width={110}
                      />
                      <RechartsTooltip
                        formatter={(value: number) => formatAmount(value)}
                        labelFormatter={(label) => String(label)}
                      />
                      <Bar
                        dataKey="total_registered"
                        fill="var(--ripnel-accent)"
                        radius={[0, 8, 8, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <InlineStatusCard
                    title={CAJA.admin.noLocationDataTitle}
                    description={CAJA.admin.noLocationDataDesc}
                    tone="neutral"
                    variant="ops"
                  />
                )}
              </DashboardChartCard>
            </div>
          </section>

          <OpsPanelSection
            title={CAJA.admin.multiSessions}
            icon={<ShieldCheck className="h-4 w-4 text-[var(--ripnel-accent)]" />}
          >
            <div className="-mx-[var(--ops-panel-padding)] -mb-[var(--ops-panel-padding)] overflow-hidden rounded-b-xl">
            <OpsDataTable
              columns={CONTROL_TABLE_COLUMNS}
              minWidth="960px"
              loading={loading}
              error={error}
              errorTitle={CAJA.errors.generic.title}
              isEmpty={!sessions || sessions.items.length === 0}
              emptyMessage={CAJA.admin.noSessions}
              footer={
                sessions && pagination && sessions.items.length > 0 ? (
                  <>
                    <span className="text-sm text-[var(--ops-text-muted)]">
                      {(pagination.page - 1) * pagination.page_size + 1}-
                      {Math.min(
                        pagination.page * pagination.page_size,
                        pagination.total_items,
                      )}{" "}
                      de {pagination.total_items}
                    </span>
                    <Pagination
                      page={pagination.page}
                      totalPages={pagination.total_pages}
                      onPageChange={setPage}
                    />
                  </>
                ) : undefined
              }
            >
              {sessions?.items.map((closing) => (
                <tr
                  key={closing.cash_closing_id}
                  className="text-sm text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
                >
                  <td className="px-4 py-[var(--ops-row-py)]">
                    <p className="font-semibold">
                      {formatBusinessDate(closing.business_date)}
                    </p>
                    <CashStatusBadge status={closing.status} className="mt-1" />
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)] text-[var(--ops-text-muted)]">
                    <p className="font-medium text-[var(--ops-text)]">
                      {closing.location_name}
                    </p>
                    <p>
                      {closing.opened_by_name || CAJA.admin.unknownUser}
                    </p>
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)] text-[var(--ops-text-muted)]">
                    <p>
                      {CAJA.admin.openLabel}{" "}
                      {formatDateTime(closing.created_at)}
                    </p>
                    <p>
                      {closing.closed_at
                        ? `${CAJA.admin.closeLabel} ${formatDateTime(closing.closed_at)}`
                        : CAJA.admin.pendingCloseStatus}
                    </p>
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)]">
                    <p className="font-semibold">
                      {formatAmount(closing.total_all)}
                    </p>
                    {closing.status !== "closed" ? (
                      <p className="text-xs text-[var(--ops-text-muted)]">
                        {CAJA.admin.consistencyPending}
                      </p>
                    ) : closing.is_consistent === false ? (
                      <p className="text-xs text-[var(--ops-tone-warning-text)]">
                        {CAJA.admin.diffLabel}{" "}
                        {formatAmount(closing.difference)}
                      </p>
                    ) : closing.is_consistent === true ? (
                      <p className="text-xs text-[var(--ops-tone-success-text)]">
                        {CAJA.admin.consistencyOk}
                      </p>
                    ) : (
                      <p className="text-xs text-[var(--ops-text-muted)]">
                        {CAJA.admin.consistencyReview}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)]">
                    <div className="flex items-center gap-2">
                      {canReopenCash && closing.status === "closed" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          disabled={reopeningCash}
                          onClick={() => {
                            setReopenNotes("")
                            setReopenTarget(closing.cash_closing_id)
                          }}
                        >
                          {reopeningCash && closing.cash_closing_id === reopenTarget ? (
                            <span className="inline-flex items-center gap-1.5">
                              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                              {CAJA.actions.reopen}
                            </span>
                          ) : (
                            CAJA.actions.reopen
                          )}
                        </Button>
                      ) : null}
                      <Link
                        href={`/caja/historial/${closing.cash_closing_id}`}
                        className="inline-flex items-center text-[var(--ops-text-muted)] transition hover:text-[var(--ops-text)]"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </OpsDataTable>
            </div>
          </OpsPanelSection>

          <OpsDialog
            open={reopenTarget !== null}
            onOpenChange={(open) => {
              if (!open) setReopenTarget(null)
            }}
            title={CAJA.reopenDialog.title}
            description={CAJA.reopenDialog.description}
            size="sm"
            bodyClassName="space-y-4"
            footer={
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg px-4"
                  onClick={() => setReopenTarget(null)}
                  disabled={reopeningCash}
                >
                  {CAJA.reopenDialog.cancel}
                </Button>
                <Button
                  type="button"
                  variant="accent"
                  size="sm"
                  className="rounded-lg px-4"
                  onClick={handleReopenCash}
                  disabled={reopeningCash || !reopenNotes.trim()}
                >
                  {reopeningCash
                    ? CAJA.reopenDialog.reopening
                    : CAJA.reopenDialog.confirm}
                </Button>
              </div>
            }
          >
            <OpsFormField
              label={CAJA.reopenDialog.reasonLabel}
              required
              density="compact"
            >
              <input
                value={reopenNotes}
                onChange={(event) => setReopenNotes(event.target.value)}
                placeholder={CAJA.reopenDialog.reasonPlaceholder}
                className={opsInputCompact}
              />
            </OpsFormField>
            <p className="text-sm text-[var(--ops-text-muted)]">
              {CAJA.reopenDialog.hint}
            </p>
          </OpsDialog>
        </OpsPageShell>
      </TooltipProvider>

    </PermissionGuard>
  )
}
