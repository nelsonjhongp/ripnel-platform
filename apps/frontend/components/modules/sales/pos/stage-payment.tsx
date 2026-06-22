"use client"

import { useEffect } from "react"
import { Banknote, Landmark, Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { OpsSegmentedControl } from "@/components/ui/ops-segmented-control"
import { OpsSelect, type OpsOption } from "@/components/ui/ops-selection"
import { OpsStepSectionHeading } from "@/components/ui/ops-step-section-heading"
import { OpsHint } from "@/components/ui/ops-hint"
import { formatMoney } from "@/lib/format-utils"

import { renderPaymentMethodIcon } from "./pos-icons"
import { StageSection } from "./stage-section"
import { POS } from "./pos-messages"
import type { PaymentStageProps } from "./pos-stage-props"
import { PAYMENT_METHODS } from "./pos-types"
import { getPaymentReferenceMeta, parseAmountInput } from "./pos-utils"
import { INPUT_CLASS, PAYMENT_TOLERANCE } from "./pos-constants"

const CIRCLE_CLASS =
  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full"

function renderPaymentCircle(method: string) {
  const iconClass = "h-3.5 w-3.5"
  if (method === "cash") {
    return (
      <span className={`${CIRCLE_CLASS} bg-[var(--ops-tone-success-bg)] text-[var(--ops-tone-success-text)]`}>
        <Banknote className={iconClass} />
      </span>
    )
  }
  if (method === "transfer") {
    return (
      <span className={`${CIRCLE_CLASS} bg-[var(--ops-tone-info-bg)] text-[var(--ops-tone-info-text)]`}>
        <Landmark className={iconClass} />
      </span>
    )
  }
  return (
    <span className={`${CIRCLE_CLASS} bg-[var(--ripnel-accent-soft)] text-[var(--ripnel-accent-hover)]`}>
      {renderPaymentMethodIcon(method, iconClass)}
    </span>
  )
}

const PAYMENT_OPTIONS: OpsOption[] = PAYMENT_METHODS.map((method) => ({
  value: method.value,
  label: method.label,
  leading: renderPaymentCircle(method.value),
}))

export function PaymentStage(props: PaymentStageProps) {
  const {
    pulseStage,
    cartCount,
    totals,
    openDiscountModal,
    paymentMode,
    setPaymentModeWithDefaults,
    paymentMethod,
    setPaymentMethod,
    singleReference,
    setSingleReference,
    mixedPayments,
    mixedPaymentsPreview,
    updateMixedPaymentDraft,
    addMixedPaymentDraft,
    removeMixedPaymentDraft,
    paymentSectionRef,
  } = props

  const isEmpty = cartCount === 0
  const assignedAmount =
    paymentMode === "mixed" ? mixedPaymentsPreview?.enteredTotal ?? 0 : 0
  const pendingAmount =
    paymentMode === "mixed" ? mixedPaymentsPreview?.difference ?? totals.total : totals.total
  const normalizedMixedPayments = mixedPayments.map((payment) => {
    const amountText = String(payment.amount || "").trim()
    const amountValue = parseAmountInput(payment.amount)
    const methodValue = String(payment.method || "").trim()
    return {
      amountText,
      amountValue,
      methodValue,
      hasMethod: methodValue.length > 0,
      hasReference: String(payment.reference || "").trim().length > 0,
      hasAmount: amountText.length > 0,
      methodIsValid:
        methodValue.length === 0 ||
        PAYMENT_METHODS.some((method) => method.value === methodValue),
    }
  })
  const hasAnyMixedInput = normalizedMixedPayments.some(
    (payment) => payment.hasMethod || payment.hasAmount || payment.hasReference,
  )
  const hasMixedInvalidAmount = normalizedMixedPayments.some(
    (payment) => payment.hasAmount && payment.amountValue === null,
  )
  const hasMixedInvalidMethod = normalizedMixedPayments.some(
    (payment) => payment.hasMethod && !payment.methodIsValid,
  )
  const hasMixedOverflow =
    paymentMode === "mixed" && (mixedPaymentsPreview?.difference ?? 0) < -PAYMENT_TOLERANCE
  const hasPanelWarning =
    paymentMode === "mixed" &&
    hasAnyMixedInput &&
    (hasMixedInvalidAmount || hasMixedInvalidMethod || hasMixedOverflow)
  const discountLabel =
    totals.saleDiscountAmount > 0
      ? `S/. ${formatMoney(totals.saleDiscountAmount)} ${POS.payment.applied}`
      : POS.payment.noDiscount

  useEffect(() => {
    if (paymentMode === "mixed" && paymentSectionRef?.current) {
      paymentSectionRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [paymentMode, paymentSectionRef])

  if (isEmpty) {
    return (
      <StageSection
        stage="payment"
        pulseStage={pulseStage}
        isEmpty
      >
        <OpsStepSectionHeading
          step={3}
          title={POS.stage.payment}
        />
        <OpsHint>{POS.payment.inactiveHint}</OpsHint>
      </StageSection>
    )
  }

  return (
    <StageSection
      sectionRef={paymentSectionRef}
      stage="payment"
      pulseStage={pulseStage}
      hasError={hasPanelWarning}
    >
      <OpsStepSectionHeading
        step={3}
        title={POS.stage.payment}
        meta={
          <OpsSegmentedControl
            options={[
              { value: "single" as const, label: POS.payment.single },
              { value: "mixed" as const, label: POS.payment.mixed },
            ]}
            value={paymentMode}
            onChange={(mode) => setPaymentModeWithDefaults(mode as "single" | "mixed")}
            size="compact"
            tone="accent"
            variant="switch"
          />
        }
      />

      <div className="space-y-3">
        {paymentMode === "single" ? (
          <>
            <div className="hidden gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">{POS.payment.method}</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">{POS.payment.total}</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">{POS.payment.reference}</span>
            </div>
            <SinglePaymentLine
              method={paymentMethod}
              onMethodChange={setPaymentMethod}
              total={totals.total}
              reference={singleReference}
              onReferenceChange={setSingleReference}
            />
          </>
        ) : (
          <div className="space-y-3">
            <div className="hidden gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">{POS.payment.method}</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">{POS.payment.amount}</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">{POS.payment.reference}</span>
              <span aria-hidden="true" />
            </div>
            {mixedPayments.map((payment) => (
              <PaymentLine
                key={payment.id}
                method={payment.method}
                onMethodChange={(value) =>
                  updateMixedPaymentDraft(payment.id, "method", value)
                }
                amount={payment.amount}
                onAmountChange={(value) =>
                  updateMixedPaymentDraft(payment.id, "amount", value)
                }
                reference={payment.reference}
                onReferenceChange={(value) =>
                  updateMixedPaymentDraft(payment.id, "reference", value)
                }
                canRemove={
                  mixedPayments.length > 1 &&
                  !(
                    mixedPayments.length === 2 &&
                    mixedPayments.every(
                      (p) => p.method && String(p.amount || "").trim()
                    )
                  )
                }
                onRemove={() => removeMixedPaymentDraft(payment.id)}
              />
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addMixedPaymentDraft}
              className="w-full rounded-lg border-dashed"
            >
              <Plus className="h-3.5 w-3.5" />
              {POS.payment.addMethod}
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ops-border-strong)] pt-3">
          <div>
            <p className="text-sm font-semibold text-[var(--ops-text)]">{POS.payment.discount}</p>
            <p className="text-xs text-[var(--ops-text-muted)]">{discountLabel}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openDiscountModal}
            className="rounded-lg"
          >
            {totals.saleDiscountAmount > 0 ? POS.payment.editButton : POS.payment.applyButton}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--ops-border-strong)] pt-3 text-xs">
          <span className="text-[var(--ops-text-muted)]">
            {POS.payment.assigned}: S/. {formatMoney(paymentMode === "mixed" ? assignedAmount : totals.total)}
          </span>
          <span className="text-[var(--ops-text-muted)]">
            {paymentMode === "mixed" && Math.abs(pendingAmount) > PAYMENT_TOLERANCE
              ? `${POS.payment.missing}: S/. ${formatMoney(Math.max(pendingAmount, 0))}`
              : POS.payment.complete}
          </span>
          <span className="font-semibold text-[var(--ops-text)]">
            {POS.payment.total}: S/. {formatMoney(totals.total)}
          </span>
        </div>
      </div>
    </StageSection>
  )
}

function SinglePaymentLine({
  method,
  onMethodChange,
  total,
  reference,
  onReferenceChange,
}: {
  method: string
  onMethodChange: (value: string) => void
  total: number
  reference: string
  onReferenceChange: (value: string) => void
}) {
  const refMeta = getPaymentReferenceMeta(method)
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
      <div className="space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)] sm:hidden">{POS.payment.method}</span>
        <OpsSelect
          className="h-9 rounded-lg px-2.5"
          value={method}
          onValueChange={onMethodChange}
          placeholder={POS.payment.selectMethod}
          options={PAYMENT_OPTIONS}
          triggerContent={(option) => (
            <span className="flex min-w-0 items-center gap-2">
              {option?.leading}
              <span className="truncate text-sm font-medium text-[var(--ops-text)]">
                {option?.label ?? "Método"}
              </span>
            </span>
          )}
        />
      </div>
      <div className="space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)] sm:hidden">{POS.payment.total}</span>
        <div className={`${INPUT_CLASS} flex items-center justify-end gap-1 font-semibold text-[var(--ops-text)]`}>
          <span className="text-[var(--ops-text-muted)]">S/.</span>
          {formatMoney(total)}
        </div>
      </div>
      <div className="space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)] sm:hidden">{POS.payment.reference}</span>
        <input
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={reference}
          onChange={(event) => onReferenceChange(event.target.value)}
          placeholder={refMeta.placeholder}
          className={`${INPUT_CLASS}`}
        />
      </div>
    </div>
  )
}

function PaymentLine({
  method,
  onMethodChange,
  amount,
  onAmountChange,
  reference,
  onReferenceChange,
  canRemove,
  onRemove,
}: {
  method: string
  onMethodChange: (value: string) => void
  amount: string
  onAmountChange: (value: string) => void
  reference: string
  onReferenceChange: (value: string) => void
  canRemove: boolean
  onRemove: () => void
}) {
  const refMeta = getPaymentReferenceMeta(method)
  return (
    <div className="grid gap-2 rounded-lg border border-[color:color-mix(in_srgb,var(--ops-border-strong)_72%,transparent)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_28%,var(--ops-surface))] p-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 sm:block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)] sm:hidden">{POS.payment.method}</span>
          <span className="inline-flex rounded-full border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ops-text-muted)] sm:hidden">
            Pago
          </span>
        </div>
        <OpsSelect
          className="h-9 rounded-lg px-2.5"
          value={method}
          onValueChange={onMethodChange}
          placeholder={POS.payment.selectMethod}
          options={PAYMENT_OPTIONS}
          triggerContent={(option) => (
            <span className="flex min-w-0 items-center gap-2">
              {option?.leading}
              <span className="truncate text-sm font-medium text-[var(--ops-text)]">
                {option?.label ?? "Método"}
              </span>
            </span>
          )}
        />
      </div>
      <div className="space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)] sm:hidden">{POS.payment.amount}</span>
        <div className={`${INPUT_CLASS} flex items-center gap-1 text-right`}>
          <span className="text-[var(--ops-text-muted)] shrink-0">S/.</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            placeholder="0.00"
            className="w-full bg-transparent text-sm text-right text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]"
          />
        </div>
      </div>
      <div className="space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)] sm:hidden">{POS.payment.reference}</span>
        <input
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={reference}
          onChange={(event) => onReferenceChange(event.target.value)}
          placeholder={refMeta.placeholder}
          className={`${INPUT_CLASS}`}
        />
      </div>
      <div className="flex justify-end pt-1 sm:justify-end sm:pt-0">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={!canRemove}
          onClick={onRemove}
          aria-label="Quitar método de pago"
          className="shrink-0 text-[var(--ops-text-muted)] hover:text-[var(--ops-text)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
        </Button>
      </div>
    </div>
  )
}
