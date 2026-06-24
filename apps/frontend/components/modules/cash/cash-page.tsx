"use client"

import Link from "next/link"
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock3,
  RefreshCw,
} from "lucide-react"

import { ErrorBoundary } from "@/components/ui/ErrorBoundary"
import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { InlineStatusCard } from "@/components/feedback/status-page"
import { LoadingPage } from "@/components/feedback/status-page"
import { useAuth } from "@/components/auth/AuthProvider"
import { OpsPageShell } from "@/components/ui/ops-page-shell"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { OpsActionBanner } from "@/components/ui/ops-action-banner"
import { Button } from "@/components/ui/button"
import { OpsPanelMuted } from "@/components/ui/ops-panel"
import { OpsMetricCard } from "@/components/ui/ops-metric-card"
import { OpsMetricRow } from "@/components/ui/ops-metric-row"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AdminActionButton } from "@/components/admin/admin-ui"
import { resolveCashCapabilities } from "@/lib/capabilities"
import { HelpTooltip } from "@/components/ui/help-tooltip"

import { METHOD_CONFIG } from "./cash-constants"
import { formatAmount } from "./cash-utils"
import { CAJA } from "./cash-messages"
import { useCashPage } from "./use-cash-page"
import { CashOpenDialog } from "./cash-dialogs/cash-open-dialog"
import { CashCloseDialog } from "./cash-dialogs/cash-close-dialog"

export default function CajaPage() {
  const { defaultLocation, permissions } = useAuth()
  const locationId = defaultLocation?.location_id
  const cashCapabilities = resolveCashCapabilities({ permissions })
  const canOperateCash = cashCapabilities.operate

  const {
    actionLoading,
    actionError,
    openNotes,
    setOpenNotes,
    openingBalance,
    setOpeningBalance,
    showOpenConfirm,
    setShowOpenConfirm,
    closeNotes,
    setCloseNotes,
    closingBalanceDeclared,
    setClosingBalanceDeclared,
    showCloseConfirm,
    setShowCloseConfirm,
    loading,
    error,
    refetch,
    handleClose,
    handleOpen,
    isOpen,
    summary,
    consistencyOk,
    cashStatusMeta,
    bannerState,
    methodValues,
    grandTotal,
    saleCount,
    paymentTotal,
    businessDate,
    balanceDiffLabel,
  } = useCashPage(locationId, canOperateCash)

  if (!locationId) {
    return (
      <ErrorBoundary>
        <PermissionGuard anyPermissions={["cash.view", "cash.operate"]}>
          <OpsPageShell>
            <InlineStatusCard
              title={CAJA.errors.noLocation.title}
              description={CAJA.errors.noLocation.desc}
              tone="warning"
              variant="ops"
            />
          </OpsPageShell>
        </PermissionGuard>
      </ErrorBoundary>
    )
  }

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      {isOpen ? (
        <Button variant="outline" size="sm" className="rounded-lg gap-2" asChild>
          <Link href="/ventas/nueva">{CAJA.actions.goSale}</Link>
        </Button>
      ) : null}
      <Button variant="outline" size="sm" className="rounded-lg gap-2" asChild>
        <Link href="/caja/historial">{CAJA.actions.history}</Link>
      </Button>
      <AdminActionButton
        onClick={refetch}
        disabled={loading || actionLoading}
      >
        <RefreshCw className="h-4 w-4" />
        {CAJA.actions.update}
      </AdminActionButton>
    </div>
  )

  return (
    <ErrorBoundary>
      <PermissionGuard anyPermissions={["cash.view", "cash.operate"]}>
        <TooltipProvider delayDuration={120}>
          <OpsPageShell>
            <PosHeader
              eyebrow={CAJA.header.eyebrow}
              title={CAJA.header.dayTitle}
              meta={
                <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--ops-text)]">
                  {defaultLocation?.name ? (
                    <span className="text-[var(--ops-text-muted)]">
                      {defaultLocation.name}
                    </span>
                  ) : null}
                  {cashStatusMeta ? (
                    <span className="inline-flex items-center gap-1">
                      {cashStatusMeta.text}
                      <HelpTooltip content={cashStatusMeta.tooltip} />
                    </span>
                  ) : null}
                </span>
              }
              actions={headerActions}
            />

            {(error || actionError) ? (
              <InlineStatusCard
                title={CAJA.errors.generic.title}
                description={actionError || error || ""}
                tone="danger"
                variant="ops"
              />
            ) : null}

            {!canOperateCash ? (
              <InlineStatusCard
                title={CAJA.errors.consultOnly.title}
                description={CAJA.errors.consultOnly.desc}
                tone="warning"
                variant="ops"
              />
            ) : null}

            {loading ? (
              <LoadingPage
                title={CAJA.loading.cash.title}
                description={CAJA.loading.cash.desc}
                variant="ops"
              />
            ) : (
              <>
                {bannerState.kind === "open" ? (
                  <OpsActionBanner
                    icon={CheckCircle2}
                    tone="success"
                    title={CAJA.status.open}
                    description={
                      bannerState.openedByName
                        ? CAJA.status.openBy(bannerState.openedByName)
                        : undefined
                    }
                    {...(canOperateCash
                      ? {
                          actionLabel: CAJA.actions.close,
                          actionTone: "neutral" as const,
                          onAction: () => setShowCloseConfirm(true),
                        }
                      : {})}
                    loading={actionLoading}
                  />
                ) : bannerState.kind === "closed" ? (
                  <OpsActionBanner
                    icon={Clock3}
                    tone="neutral"
                    title={CAJA.status.closed}
                    description={
                      bannerState.closedByName
                        ? CAJA.status.closedBy(bannerState.closedByName)
                        : undefined
                    }
                  />
                ) : (
                  <OpsActionBanner
                    icon={Clock3}
                    tone="warning"
                    title={CAJA.status.notOpen}
                    description={CAJA.status.notOpenDesc}
                    {...(canOperateCash
                      ? {
                          actionLabel: CAJA.actions.open,
                          actionTone: "accent" as const,
                          onAction: () => {
                            setOpenNotes("")
                            setOpeningBalance("")
                            setShowOpenConfirm(true)
                          },
                        }
                      : {})}
                    loading={actionLoading}
                  />
                )}

                {summary ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <OpsMetricCard
                        key="total"
                        icon={<Banknote className="h-4 w-4" />}
                        label={
                          <>
                            {CAJA.summary.dayTotal}
                            <HelpTooltip content={CAJA.summary.dayTotalHint} />
                          </>
                        }
                        value={grandTotal ?? ""}
                        tone="accent"
                        className="px-3 py-3.5"
                      />
                      <OpsMetricCard
                        key="ventas"
                        icon={<CheckCircle2 className="h-4 w-4" />}
                        label={CAJA.summary.sales}
                        value={CAJA.summary.salesCount(saleCount ?? 0)}
                        tone="success"
                        className="px-3 py-3.5"
                      />
                      <OpsMetricCard
                        key="consistencia"
                        icon={
                          consistencyOk ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <AlertTriangle className="h-4 w-4" />
                          )
                        }
                        label={
                          <>
                            {CAJA.summary.consistency}
                            <HelpTooltip content={CAJA.summary.consistencyHint} />
                          </>
                        }
                        value={consistencyOk ? CAJA.summary.matches : CAJA.summary.review}
                        tone={consistencyOk ? "success" : "warning"}
                        className="px-3 py-3.5"
                      />
                    </div>

                    <OpsPanelMuted className="mt-4">
                      <p className="text-xs uppercase tracking-wide text-[var(--ops-text-muted)]">
                        {CAJA.summary.paymentMethods}
                      </p>
                      <div className="mt-3 space-y-1.5">
                        {METHOD_CONFIG.map((method) => (
                          <OpsMetricRow
                            key={method.key}
                            label={CAJA.methods[method.key]}
                            value={methodValues?.[method.key] ?? ""}
                          />
                        ))}
                      </div>
                      <div className="mt-3 border-t border-[var(--ops-border-soft)] pt-3">
                        <OpsMetricRow
                          label={
                            <>
                              {CAJA.summary.totalPayments}
                              <HelpTooltip content={CAJA.summary.totalPaymentsHint} />
                            </>
                          }
                          value={paymentTotal ?? formatAmount(0)}
                        />
                      </div>
                    </OpsPanelMuted>
                  </>
                ) : null}

                {balanceDiffLabel ? (
                  <OpsPanelMuted className="mt-4">
                    <OpsMetricRow
                      label={
                        <>
                          {balanceDiffLabel.label}
                          <HelpTooltip content={CAJA.summary.balanceDiffTooltip} />
                        </>
                      }
                      value={balanceDiffLabel.value}
                      tone={balanceDiffLabel.tone}
                    />
                  </OpsPanelMuted>
                ) : null}
              </>
            )}

            <CashCloseDialog
              open={showCloseConfirm && canOperateCash}
              onOpenChange={(open) => {
                if (!open) setShowCloseConfirm(false)
              }}
              methodValues={methodValues}
              grandTotal={grandTotal}
              closingBalanceDeclared={closingBalanceDeclared}
              onClosingBalanceDeclaredChange={setClosingBalanceDeclared}
              notes={closeNotes}
              onNotesChange={setCloseNotes}
              loading={actionLoading}
              onConfirm={handleClose}
            />

            <CashOpenDialog
              open={showOpenConfirm && canOperateCash}
              onOpenChange={(open) => {
                if (!open) setShowOpenConfirm(false)
              }}
              locationName={defaultLocation?.name}
              businessDate={businessDate}
              openingBalance={openingBalance}
              onOpeningBalanceChange={setOpeningBalance}
              notes={openNotes}
              onNotesChange={setOpenNotes}
              loading={actionLoading}
              onConfirm={handleOpen}
            />
          </OpsPageShell>
        </TooltipProvider>
      </PermissionGuard>
    </ErrorBoundary>
  )
}
