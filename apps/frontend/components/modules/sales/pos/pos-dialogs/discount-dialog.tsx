"use client"

import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { OpsFormField } from "@/components/ui/ops-form-field"
import { OpsSegmentedControl } from "@/components/ui/ops-segmented-control"
import { PresetTextField } from "@/components/ui/preset-text-field"
import { formatMoney, parseAmountInput, round2 } from "../pos-utils"
import { computeSaleDiscountAmount } from "../pos-pricing-utils"
import { ADJUSTMENT_REASON_PRESETS } from "../pos-types"
import type { SaleDiscountState, SalePreview } from "../pos-types"
import { INPUT_CLASS, SURFACE_MUTED_BG, ACCENT_HOVER_BORDER, ACCENT_MUTED_BG } from "../pos-constants"
import { POS } from "../pos-messages"

export function DiscountDialog({
  open,
  onOpenChange,
  totals,
  currentDiscount,
  onApply,
  onClose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  totals: SalePreview
  currentDiscount: SaleDiscountState
  onApply: (discount: SaleDiscountState) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<SaleDiscountState>(() =>
    currentDiscount.mode === "none"
      ? { mode: "percent", value: "", reason: "" }
      : currentDiscount
  )
  const [valueError, setValueError] = useState<string | null>(null)
  const [reasonError, setReasonError] = useState<string | null>(null)
  const prevOpen = useRef(open)

  useEffect(() => {
    if (open && !prevOpen.current) {
      setDraft(
        currentDiscount.mode === "none"
          ? { mode: "percent", value: "", reason: "" }
          : currentDiscount
      )
      setValueError(null)
      setReasonError(null)
    }
    prevOpen.current = open
  }, [currentDiscount, open])

  const isEditing = currentDiscount.mode !== "none"

  const currentDiscountAmount = isEditing
    ? computeSaleDiscountAmount(totals.baseSubtotal, currentDiscount)
    : 0

  const parsedValue = parseAmountInput(draft.value)
  const estimatedAmount =
    parsedValue !== null && parsedValue > 0 && totals.baseSubtotal > 0
      ? computeSaleDiscountAmount(totals.baseSubtotal, draft)
      : 0
  const estimatedPercent =
    totals.baseSubtotal > 0
      ? round2((estimatedAmount / totals.baseSubtotal) * 100)
      : 0

  function close() {
    onClose()
    onOpenChange(false)
  }

  function apply() {
    const amount = parseAmountInput(draft.value)
    if (amount === null || amount <= 0) {
      setValueError(POS.discount.valueError)
      setReasonError(null)
      return
    }
    if (draft.mode === "percent" && amount > 100) {
      setValueError(POS.discount.percentError)
      setReasonError(null)
      return
    }
    if (draft.mode === "amount" && amount > totals.baseSubtotal) {
      setValueError(POS.discount.amountError)
      setReasonError(null)
      return
    }
    if (!draft.reason.trim()) {
      setValueError(null)
      setReasonError(POS.discount.reasonError)
      return
    }

    setValueError(null)
    setReasonError(null)
    onApply(draft)
  }

  function handleModeChange(mode: SaleDiscountState["mode"]) {
    setDraft((current) => ({
      ...current,
      mode,
    }))
    setValueError(null)
    setReasonError(null)
  }

  function handleRemoveDiscount() {
    onApply({ mode: "none", value: "", reason: "" })
  }

  return (
    <OpsDialog
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())}
      title={POS.discount.title}
      description={`${POS.discount.subtotalBase} ${POS.summary.moneyPrefix} ${formatMoney(totals.baseSubtotal)}`}
      size="md"
      bodyClassName="space-y-2.5"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {isEditing ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveDiscount}
                className="w-full justify-start px-0 text-[var(--ops-text-muted)] hover:bg-transparent hover:text-[var(--ops-tone-danger-text)] sm:w-auto"
              >
                {POS.discount.remove}
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="sm" className="rounded-lg px-4" onClick={close}>
              {POS.discount.cancel}
            </Button>
            <Button type="button" variant="accent" size="sm" className="rounded-lg px-4" onClick={apply}>
              {POS.discount.apply}
            </Button>
          </div>
        </div>
      }
    >
      {isEditing ? (
        <div className={`rounded-lg border border-${ACCENT_HOVER_BORDER} bg-${ACCENT_MUTED_BG} px-3 py-2 text-sm`}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[var(--ops-text-muted)]">{POS.discount.current}</span>
            <span className="font-semibold text-[var(--ripnel-accent-hover)]">
              {currentDiscount.mode === "percent"
                ? `${currentDiscount.value}% -> ${POS.summary.moneyPrefix} ${formatMoney(currentDiscountAmount)}`
                : `${POS.summary.moneyPrefix} ${formatMoney(currentDiscountAmount)}`}
            </span>
          </div>
        </div>
      ) : null}

      <OpsSegmentedControl
        options={[
          { value: "percent", label: POS.discount.percent },
          { value: "amount", label: POS.discount.fixed },
        ]}
        value={draft.mode}
        onChange={(mode) => handleModeChange(mode as "percent" | "amount")}
        tone="accent"
        variant="switch"
      />

      <OpsFormField
        label={draft.mode === "percent" ? POS.discount.percent : POS.discount.amount}
        required
        error={valueError}
        density="compact"
      >
        <div className="relative">
          <input
            type="text"
            name="sale_discount_value"
            inputMode="decimal"
            autoComplete="off"
            value={draft.value}
            onChange={(event) => {
              setDraft((current) => ({ ...current, value: event.target.value }))
              setValueError(null)
            }}
            placeholder={draft.mode === "percent" ? "0" : "0.00"}
            className={`${INPUT_CLASS} ${draft.mode === "percent" ? "pr-8" : "pl-8"}`}
          />
          <span
            className={
              draft.mode === "percent"
                ? "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--ops-text-muted)]"
                : "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--ops-text-muted)]"
            }
          >
            {draft.mode === "percent" ? "%" : POS.summary.moneyPrefix}
          </span>
        </div>
      </OpsFormField>

      {estimatedAmount > 0 ? (
        <div className={`rounded-lg border border-[var(--ops-border-strong)] ${SURFACE_MUTED_BG} px-3 py-2 text-sm`}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[var(--ops-text-muted)]">{POS.discount.estimated}</span>
            <span className="font-semibold text-[var(--ops-text)]">
              {POS.summary.moneyPrefix} {formatMoney(estimatedAmount)}
              <span className="ml-1 font-normal text-[var(--ops-text-muted)]">
                ({estimatedPercent}% {POS.discount.estimatedPercentSuffix})
              </span>
            </span>
          </div>
        </div>
      ) : null}

      <PresetTextField
        label={POS.discount.reason}
        required
        error={reasonError}
        value={draft.reason}
        onChange={(reason) => {
          setDraft((current) => ({ ...current, reason }))
          setReasonError(null)
        }}
        presets={ADJUSTMENT_REASON_PRESETS}
        placeholder={POS.discount.reasonPlaceholder}
        textareaRows={2}
        textareaClassName="min-h-[72px]"
      />
    </OpsDialog>
  )
}
