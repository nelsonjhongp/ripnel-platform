"use client"

import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
} from "lucide-react"

import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { ErrorPage, LoadingPage } from "@/components/feedback/status-page"
import { TooltipProvider } from "@/components/ui/tooltip"
import { OpsPageShell } from "@/components/ui/ops-page-shell"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { OpsPanelSection } from "@/components/ui/ops-panel-section"
import { OpsMetricRow } from "@/components/ui/ops-metric-row"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { Button } from "@/components/ui/button"
import { HelpTooltip } from "@/components/ui/help-tooltip"

import { formatAmount, formatBusinessDate } from "./cash-utils"
import { formatDateTime } from "@/lib/date-utils"
import { CashStatusBadge } from "./cash-status-badge"
import { METHOD_CONFIG, INFO_BOX_XL, ACCENT_HIGHLIGHT_PANEL, ACCENT_LABEL_TEXT } from "./cash-constants"
import { CAJA } from "./cash-messages"
import { useCashDetail } from "./use-cash-detail"

export default function CashHistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { closing, loading, error, consistencyTone } = useCashDetail(params)

  if (loading) {
    return (
      <LoadingPage
        title={CAJA.loading.detail.title}
        description={CAJA.loading.detail.desc}
        variant="ops"
      />
    )
  }

  if (error || !closing) {
    return (
      <ErrorPage
        title={CAJA.loading.detail.errorTitle}
        description={error || CAJA.loading.detail.errorDesc}
        variant="ops"
      />
    )
  }

  const title = closing.location_name || CAJA.fallback.dash

  const declaredBalance = closing.closing_balance_declared
  const balanceDiff =
    declaredBalance != null ? declaredBalance - closing.total_all : null

  return (
    <PermissionGuard anyPermissions={["cash.view", "cash.operate"]}>
      <TooltipProvider delayDuration={120}>
        <OpsPageShell width="wide" className="space-y-5">
          <PosHeader
            eyebrow={CAJA.header.detailEyebrow}
            title={title}
            meta={
              <>
                <CashStatusBadge
                  status={closing.status}
                  className="px-3 py-1.5 text-sm"
                />
                <OpsStatusBadge
                  tone="neutral"
                  size="sm"
                >
                  {formatBusinessDate(closing.business_date)}
                </OpsStatusBadge>
              </>
            }
            actions={
              <Button variant="outline" size="sm" className="rounded-lg gap-2" asChild>
                <Link href="/caja/historial">
                  <ArrowLeft className="h-4 w-4" />
                  {CAJA.detail.backToHistory}
                </Link>
              </Button>
            }
          />

          <div className={`${INFO_BOX_XL} p-5 shadow-sm md:p-6`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-2">
                <p className="text-sm text-[var(--ops-text-muted)]">
                  {closing.location_name} &middot;{" "}
                  {formatBusinessDate(closing.business_date)}
                </p>
                <div>
                  <p className="text-sm text-[var(--ops-text-muted)]">
                    {CAJA.detail.metrics.openedBy}{" "}
                    {closing.opened_by_name || CAJA.fallback.dash}
                    {" "}&middot;{" "}
                    {formatDateTime(closing.created_at)}
                  </p>
                  <p className="text-sm text-[var(--ops-text-muted)]">
                    {closing.closed_at
                      ? `${CAJA.detail.metrics.closedBy} ${closing.closed_by_name || CAJA.fallback.dash} \u00b7 ${formatDateTime(closing.closed_at)}`
                      : CAJA.statusLabels.pending}
                  </p>
                  {closing.reopened_at ? (
                    <p className="text-sm text-[var(--ops-text-muted)]">
                      {CAJA.detail.headerReopenedBy}{" "}
                      {closing.reopened_by_name || CAJA.fallback.dash}
                      {" "}&middot;{" "}
                      {formatDateTime(closing.reopened_at)}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className={`${ACCENT_HIGHLIGHT_PANEL} px-4 py-3 lg:min-w-56`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${ACCENT_LABEL_TEXT}`}>
                  {CAJA.detail.metrics.total}
                </p>
                <p className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-[var(--ops-text)]">
                  {formatAmount(closing.total_all)}
                </p>
                <div className="mt-2 space-y-1 text-sm text-[var(--ops-text-muted)]">
                  <p>
                    {CAJA.detail.metrics.openingBalance}{" "}
                    {formatAmount(closing.opening_balance)}
                  </p>
                  <p>
                    {CAJA.detail.metrics.sales}{" "}
                    {closing.sales_summary.sale_count}
                  </p>
                </div>
              </div>
            </div>

            {closing.reopen_notes ? (
              <p className="mt-3 text-sm text-[var(--ops-text-muted)] border-t border-[var(--ops-border-soft)] pt-3">
                <span className="font-medium">{CAJA.detail.reopenedLabel}:</span>{" "}
                {closing.reopen_notes}
              </p>
            ) : null}

            {closing.notes ? (
              <p className="mt-3 text-sm text-[var(--ops-text-muted)] border-t border-[var(--ops-border-soft)] pt-3">
                <span className="font-medium">{CAJA.detail.notesSection}:</span>{" "}
                {closing.notes}
              </p>
            ) : null}
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:items-start">
            <OpsPanelSection
              title={CAJA.detail.methodsTitle}
              icon={<Banknote className="h-4 w-4 text-[var(--ripnel-accent)]" />}
            >
              <div className="space-y-1.5">
                {METHOD_CONFIG.map((method) => {
                  const field = `total_${method.key}` as keyof typeof closing
                  return (
                    <OpsMetricRow
                      key={method.key}
                      label={CAJA.methods[method.key]}
                      value={formatAmount(closing[field] as number)}
                    />
                  )
                })}
              </div>
            </OpsPanelSection>

            <div className="space-y-4 lg:sticky lg:top-20">
              <OpsPanelSection
                title={CAJA.detail.consistencySection}
                icon={
                  closing.sales_summary.consistency.is_consistent ? (
                    <CheckCircle2 className="h-4 w-4 text-[var(--ops-tone-success-text)]" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-[var(--ops-tone-warning-text)]" />
                  )
                }
                aside={
                  <HelpTooltip content={CAJA.detail.consistencyHint} />
                }
                className={consistencyTone}
              >
                <p className="text-sm text-[var(--ops-text-muted)]">
                  {closing.sales_summary.consistency.is_consistent
                    ? CAJA.detail.consistencyOk
                    : CAJA.detail.consistencyError}
                </p>
                <div className="mt-4 space-y-1.5">
                  <OpsMetricRow
                    label={CAJA.detail.totals.totalSales}
                    value={formatAmount(closing.sales_summary.grand_total)}
                  />
                  <OpsMetricRow
                    label={CAJA.detail.totals.totalPayments}
                    value={formatAmount(
                      closing.sales_summary.consistency.payment_total,
                    )}
                  />
                  <OpsMetricRow
                    label={CAJA.detail.totals.difference}
                    value={formatAmount(
                      closing.sales_summary.consistency.difference,
                    )}
                    tone={
                      closing.sales_summary.consistency.is_consistent
                        ? undefined
                        : "warning"
                    }
                  />
                </div>

                {declaredBalance != null ? (
                  <div className="mt-4 space-y-1.5 border-t border-[var(--ops-border-soft)] pt-4">
                    <OpsMetricRow
                      label={CAJA.detail.metrics.declaredBalance}
                      value={formatAmount(declaredBalance)}
                    />
                    <OpsMetricRow
                      label={CAJA.detail.metrics.difference}
                      value={balanceDiff != null ? formatAmount(balanceDiff) : CAJA.fallback.dash}
                      tone={
                        balanceDiff != null && balanceDiff !== 0
                          ? balanceDiff < 0
                            ? "warning"
                            : undefined
                          : undefined
                      }
                    />
                  </div>
                ) : null}
              </OpsPanelSection>
            </div>
          </div>
        </OpsPageShell>
      </TooltipProvider>
    </PermissionGuard>
  )
}
