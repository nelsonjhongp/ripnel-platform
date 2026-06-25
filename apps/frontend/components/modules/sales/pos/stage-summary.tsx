"use client"

import type { ReactNode } from "react"
import {
  Check,
  CreditCard,
  LoaderCircle,
  Receipt,
  ShieldAlert,
  ShoppingBasket,
  UserRound,
} from "lucide-react"

import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { Button } from "@/components/ui/button"
import type { SummaryStageProps } from "./pos-stage-props"
import {
  buildCashLabel,
  buildSemanticChipClass,
  formatMoney,
} from "./pos-utils"
import { deriveSummaryState } from "./pos-summary-utils"
import { INFO_BOX_XL, SURFACE_MUTED_BG } from "./pos-constants"
import { POS } from "./pos-messages"

function SummaryShortcut({
  label,
  value,
  detail,
  icon,
  badge,
  badgeTone = "neutral",
  pulse = false,
  onClick,
}: {
  label: string
  value: string
  detail?: string | null
  icon: ReactNode
  badge?: string | null
  badgeTone?: "neutral" | "success" | "warning" | "danger" | "accent"
  pulse?: boolean
  onClick?: () => void
}) {
  const content = (
    <>
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--ripnel-accent)]">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
            {label}
          </p>
          <p className="truncate text-[15px] font-medium text-[var(--ops-text)]">{value}</p>
          {detail ? (
            <p className="truncate text-[11px] text-[var(--ops-text-muted)]">{detail}</p>
          ) : null}
        </div>
      </div>

      {badge ? (
        <OpsStatusBadge tone={badgeTone} size="sm" className="shrink-0">
          {badge}
        </OpsStatusBadge>
      ) : null}
    </>
  )

  const baseClass = pulse ? "animate-hint-pulse" : ""

  if (onClick) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClick}
        className={`w-full justify-between gap-3 rounded-xl px-3 py-1.5 text-left h-auto ${baseClass}`}
      >
        {content}
      </Button>
    )
  }

  return (
    <div className={`flex w-full items-center justify-between gap-3 ${INFO_BOX_XL} text-left ${baseClass}`}>
      {content}
    </div>
  )
}

export function SummaryStage(props: SummaryStageProps) {
  const {
    activeDocumentOption,
    selectedCustomerName,
    selectedCustomerDocument,
    documentType,
    customerStepReady,
    cartCount,
    totals,
    paymentMode,
    paymentMethod,
    paymentSummaryLabel,
    mixedPaymentsPreview,
    mixedPayments,
    cashReady,
    cashStatus,
    submitDisabled,
  submitting,
  error,
  goToStage,
  onReviewSale,
  } = props

  const derived = deriveSummaryState({
    documentType,
    activeDocumentOption,
    selectedCustomerName,
    selectedCustomerDocument,
    customerStepReady,
    cartCount,
    totals,
    paymentMode,
    paymentMethod,
    paymentSummaryLabel,
    mixedPaymentsPreview,
    mixedPayments,
    cashReady,
    cashStatus,
    submitDisabled,
    submitting,
  })

  const {
    productsSummary,
    customerSummary,
    customerDetail,
    documentSummary,
    documentDetail,
    paymentSummary,
    isReadyToFinalize,
    totalLabel,
    summaryHeadline,
    headerStatus,
    headerTone,
    productsBadge,
    productsBadgeTone,
    customerBadge,
    customerBadgeTone,
    documentBadge,
    documentBadgeTone,
    paymentBadge,
    paymentBadgeTone,
  } = derived

  return (
    <article className="sales-panel rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4 shadow-sm transition-all duration-200 sm:p-5 xl:sticky xl:top-20 xl:self-start">
      <div className="flex items-center justify-between gap-3" aria-live="polite">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ripnel-accent)]">
            <Receipt className="h-4 w-4" />
          </span>
          <h2 className="text-[1.05rem] font-semibold text-[var(--ops-text)]">{POS.stage.summary}</h2>
        </div>
        <OpsStatusBadge tone={headerTone} size="sm" className="shrink-0">
          {headerStatus}
        </OpsStatusBadge>
      </div>

      <div className="mt-4 space-y-3">
        {(!cashReady || (summaryHeadline && !isReadyToFinalize)) ? (
          <div
            aria-live="polite"
            className={`rounded-xl border border-[var(--ops-border-strong)] ${SURFACE_MUTED_BG} px-3 py-2.5`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
              Estado
            </p>
            <div className="mt-1.5">
              <p className={`text-[15px] font-semibold ${
                headerTone === "danger"
                  ? "text-[var(--ops-tone-danger-text)]"
                  : headerTone === "warning"
                    ? "text-[var(--ops-tone-warning-text)]"
                    : "text-[var(--ops-text)]"
              }`}>
                {!cashReady ? buildCashLabel(cashStatus) : summaryHeadline}
              </p>
            </div>
          </div>
        ) : null}

        <div className="space-y-2.5">
          <SummaryShortcut
            label={POS.summary.products}
            value={productsSummary}
            icon={<ShoppingBasket className="h-4 w-4" />}
            badge={productsBadge}
            badgeTone={productsBadgeTone}
            pulse={productsBadge === "Pendiente"}
            onClick={() => goToStage("products")}
          />

          <SummaryShortcut
            label={POS.stage.customer.split(" y ")[0]}
            value={customerSummary}
            detail={customerDetail}
            icon={<UserRound className="h-4 w-4" />}
            badge={customerBadge}
            badgeTone={customerBadgeTone}
            pulse={customerBadge === "Pendiente"}
            onClick={() => goToStage("customer")}
          />

          <SummaryShortcut
            label={POS.summary.documentShort}
            value={documentSummary}
            detail={documentDetail}
            icon={<Receipt className="h-4 w-4" />}
            badge={documentBadge}
            badgeTone={documentBadgeTone}
            pulse={documentBadge === "Pendiente"}
            onClick={() => goToStage("customer")}
          />

          <SummaryShortcut
            label={POS.summary.charge}
            value={paymentSummary}
            icon={<CreditCard className="h-4 w-4" />}
            badge={paymentBadge}
            badgeTone={paymentBadgeTone}
            pulse={paymentBadge === "Pendiente"}
            onClick={() => goToStage("payment")}
          />
        </div>

        <div className="space-y-2 border-t border-[var(--ops-border-strong)] pt-2.5 text-sm">
          <div className="flex justify-between text-[var(--ops-text-muted)]">
            <span>Subtotal base</span>
            <span>S/. {formatMoney(totals.baseSubtotal)}</span>
          </div>
          {totals.saleDiscountAmount > 0 ? (
            <div className="flex justify-between text-[var(--ops-tone-warning-text)]">
              <span>Descuento general</span>
              <span>- S/. {formatMoney(totals.saleDiscountAmount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-[var(--ops-border-strong)] pt-2 text-base font-bold text-[var(--ops-text)]">
            <span>{totalLabel}</span>
            <span>S/. {formatMoney(totals.total)}</span>
          </div>
          {totals.taxRate > 0 ? (
            <div className="flex justify-between text-[var(--ops-text-muted)]">
              <span>IGV incluido ({(totals.taxRate * 100).toFixed(0)}%)</span>
              <span>S/. {formatMoney(totals.tax)}</span>
            </div>
          ) : null}
        </div>

        {totals.hasMissingPrice ? (
          <p
            className={`rounded-lg border px-3 py-2.5 text-sm ${buildSemanticChipClass("warning")}`}
          >
            {POS.product.missingPrice}
          </p>
        ) : null}

        {error ? (
          <p
            className={`rounded-lg border px-3 py-2.5 text-sm ${buildSemanticChipClass("danger")}`}
          >
            <ShieldAlert className="mr-1.5 inline h-4 w-4" />
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          variant="accent"
          size="lg"
          onClick={onReviewSale}
          disabled={submitDisabled}
          className="w-full rounded-lg"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              {POS.summary.reviewing}
            </span>
          ) : (
            <>
              <Check className="h-4 w-4" /> {POS.summary.finalizeButton}
            </>
          )}
        </Button>
      </div>
    </article>
  )
}
