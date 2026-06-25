"use client"

import { useState, useMemo } from "react"
import {
  CheckCircle2,
  LoaderCircle,
  RefreshCcw,
  ShieldAlert,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { opsInputCompact } from "@/components/ui/ops-control-styles"
import { OpsFormField } from "@/components/ui/ops-form-field"
import { OpsSelect, type OpsOption } from "@/components/ui/ops-selection"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { OpsQuantityStepper } from "@/components/ui/ops-quantity-stepper"
import { PresetTextField } from "@/components/ui/preset-text-field"
import { ProductVariantPicker } from "@/components/shared/pickers/product-variant-picker"
import { formatCurrency, round2 } from "@/lib/format-utils"
import { cn } from "@/lib/utils"
import type { PostsaleContext } from "@/types/postsales"
import { PS } from "./postsales-messages"
import { CARD_BASE, EXCHANGE_REASON_PRESETS, SELECTED_CARD } from "./postsales-constants"
import { useReplacementSearch } from "./use-replacement-search"
import { useExchangeForm } from "./use-exchange-form"

interface ExchangeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  saleId: string
  context: PostsaleContext
  isAllowed: boolean
  blockedReasons: string[]
  onSuccess: () => void
}

const paymentMethodOptions: OpsOption[] = [
  { value: "cash", label: PS.exchangeDialog.paymentMethods.cash },
  { value: "yape", label: PS.exchangeDialog.paymentMethods.yape },
  { value: "plin", label: PS.exchangeDialog.paymentMethods.plin },
  { value: "transfer", label: PS.exchangeDialog.paymentMethods.transfer },
]

function computeCandidateTotal(
  candidate: { retail_price: number },
  effectiveQty: number,
  taxRate: number,
) {
  const subtotal = round2(Number(candidate.retail_price || 0) * effectiveQty)
  const tax = round2(subtotal * Number(taxRate || 0))
  return round2(subtotal + tax)
}

export default function ExchangeDialog({
  open,
  onOpenChange,
  saleId,
  context,
  isAllowed,
  blockedReasons,
  onSuccess,
}: ExchangeDialogProps) {
  const { sale } = context

  const [selectedLineId, setSelectedLineId] = useState("")
  const selectedLine = useMemo(
    () => sale.details.find((l) => l.sale_detail_id === selectedLineId) || null,
    [sale.details, selectedLineId],
  )

  const lineQty = Number(selectedLine?.quantity || 0)
  const exchangedQty = Number(selectedLine?.exchanged_qty || 0)
  const remainingQty = Math.max(0, lineQty - exchangedQty)

  const [exchangeQty, setExchangeQty] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [paymentReference, setPaymentReference] = useState("")

  const {
    replacementSearch: search,
    setReplacementSearch: setSearch,
    replacementResults: results,
    replacementLoading: searchLoading,
    replacementError: searchError,
    replacementHasSearched: searchHasSearched,
    selectedReplacementVariantId: selectedVariantId,
    selectedReplacement,
    replacementPickerOpen: pickerOpen,
    setReplacementPickerOpen: setPickerOpen,
    replacementHighlightedIndex: highlightedIndex,
    setReplacementHighlightedIndex: setHighlightedIndex,
    handleSelectReplacement,
    clearReplacementSelection,
  } = useReplacementSearch(context, isAllowed, open, selectedLine?.variant_id)

  const {
    reason,
    setReason,
    reasonError,
    notes,
    setNotes,
    error: formError,
    submitting,
    handleSubmit: submitExchange,
  } = useExchangeForm(() => {
    onSuccess()
  })

  const replacementTotal = selectedLine && selectedReplacement
    ? computeCandidateTotal(selectedReplacement, exchangeQty, context.sale.tax_rate)
    : 0

  const originalExchangeTotal = selectedLine && lineQty > 0
    ? round2(Number(selectedLine.line_total) * (exchangeQty / lineQty))
    : 0

  const differenceAmount = selectedLine && selectedReplacement
    ? round2(replacementTotal - originalExchangeTotal)
    : 0

  const valueMatches = selectedLine && selectedReplacement
    ? Math.abs(differenceAmount) < 0.01
    : true

  const requiresCharge = Boolean(selectedLine && selectedReplacement && differenceAmount > 0)
  const requiresRefundOrCredit = Boolean(selectedLine && selectedReplacement && differenceAmount < -0.01)
  const sameVariantSelected = Boolean(selectedLine && selectedVariantId === selectedLine.variant_id)

  const canSubmit =
    Boolean(selectedLineId) &&
    Boolean(selectedVariantId) &&
    reason.trim().length > 0 &&
    !sameVariantSelected &&
    !requiresRefundOrCredit &&
    (!requiresCharge || Boolean(paymentMethod)) &&
    !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ok = await submitExchange({
      saleId,
      saleDetailId: selectedLineId,
      replacementVariantId: selectedVariantId,
      quantity: exchangeQty,
      paymentMethod: requiresCharge ? paymentMethod : undefined,
      paymentReference: requiresCharge ? paymentReference : undefined,
    })
    if (ok) onOpenChange(false)
  }

  return (
    <OpsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={PS.exchangeDialog.title}
      description={PS.exchangeDialog.description}
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="rounded-lg"
            size="sm"
          >
            {PS.exchangeDialog.close}
          </Button>
          <Button
            variant="accent"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-lg"
            size="sm"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {PS.exchangeDialog.submitting}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <RefreshCcw className="h-4 w-4" />
                {PS.exchangeDialog.submit}
              </span>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {formError ? (
          <p className="rounded-lg border border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] px-3 py-2.5 text-sm text-[var(--ops-tone-danger-text)]" role="alert">
            {formError}
          </p>
        ) : null}

        {!isAllowed ? (
          <div className="rounded-lg border border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)] px-3 py-3">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ops-tone-warning-text)]" />
              <p className="text-sm text-[var(--ops-tone-warning-text)]">
                {blockedReasons.join(" ") || PS.detail.exchangeBlocked}
              </p>
            </div>
          </div>
        ) : null}

        <div>
          <p className="mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
            {PS.exchangeDialog.stepLine}
          </p>
          <div className="space-y-2">
            {sale.details.map((line) => {
              const lQty = Number(line.quantity || 0)
              const lExchanged = Number(line.exchanged_qty || 0)
              const lRemaining = Math.max(0, lQty - lExchanged)
              const isExhausted = lRemaining <= 0
              return (
              <button
                key={line.sale_detail_id}
                type="button"
                disabled={isExhausted}
                onClick={() => {
                  setSelectedLineId(line.sale_detail_id)
                  const r = Math.max(1, lRemaining)
                  setExchangeQty(r)
                  setPaymentMethod("cash")
                  setPaymentReference("")
                  clearReplacementSelection()
                }}
                className={cn(
                  "block w-full cursor-pointer rounded-lg border px-3 py-3 text-left transition",
                  isExhausted && "cursor-not-allowed opacity-50",
                  selectedLineId === line.sale_detail_id ? SELECTED_CARD : CARD_BASE,
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                      {line.style_name}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">
                      {line.sku} &middot; {line.size_code} / {line.color_code}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-[var(--ops-text)]">
                      {formatCurrency(Number(line.line_total))}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                      {lExchanged > 0
                        ? `${lExchanged} de ${lQty} cambiadas`
                        : `${lQty} und`}
                    </p>
                    {isExhausted ? (
                      <p className="mt-0.5 text-[10px] text-[var(--ops-tone-danger-text)]">
                        Sin unidades disponibles
                      </p>
                    ) : null}
                  </div>
                </div>
              </button>
              )
            })}
          </div>
        </div>

        {selectedLine ? (
          <>
            <OpsFormField
              label={PS.exchangeDialog.quantityLabel}
              required
              density="compact"
            >
              <div className="flex items-center gap-2">
                <OpsQuantityStepper
                  layout="horizontal"
                  size="sm"
                  value={exchangeQty}
                  onIncrement={() =>
                    setExchangeQty(Math.min(remainingQty, exchangeQty + 1))
                  }
                  onDecrement={() =>
                    setExchangeQty(Math.max(1, exchangeQty - 1))
                  }
                  min={1}
                  max={remainingQty}
                />
                <span className="shrink-0 text-xs text-[var(--ops-text-muted)]">
                  {PS.exchangeDialog.remainingUnits} {remainingQty}
                </span>
              </div>
            </OpsFormField>

            <ProductVariantPicker
              value={search}
              onChange={setSearch}
              placeholder={PS.exchangeDialog.searchPlaceholder}
              label={PS.exchangeDialog.searchLabel}
              items={results}
              loading={searchLoading}
              error={searchError}
              loadingMessage={PS.exchangeDialog.loading}
              emptyMessage={PS.exchangeDialog.noResults}
              idleMessage={PS.exchangeDialog.searchIdle}
              minQueryLength={2}
              hasSearched={searchHasSearched}
              maxVisibleItems={6}
              highlightedIndex={highlightedIndex}
              onHighlightChange={setHighlightedIndex}
              selectedItemKey={selectedVariantId}
              onSelect={handleSelectReplacement}
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              openOnFocus
              renderMeta={(variant) => {
                const total = computeCandidateTotal(variant, exchangeQty, context.sale.tax_rate)
                const originalTotal = lineQty > 0
                  ? round2(Number(selectedLine.line_total) * (exchangeQty / lineQty))
                  : 0
                const diff = round2(total - originalTotal)
                const matches = Math.abs(diff) < 0.01
                return (
                  <OpsStatusBadge
                    size="xs"
                    tone={matches ? "success" : diff > 0 ? "warning" : "danger"}
                  >
                    {matches
                      ? PS.exchangeDialog.sameValueBadge
                      : formatCurrency(diff)}
                  </OpsStatusBadge>
                )
              }}
            />

            {selectedReplacement ? (
              <div className="rounded-lg border border-[var(--ops-tone-success-border)] bg-[var(--ops-tone-success-bg)] px-3 py-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ops-tone-success-text)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-tone-success-text)]">
                      {PS.exchangeDialog.replacementSelected}
                    </p>
                    <div className="mt-2.5 space-y-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                        {PS.exchangeDialog.priceTraceTitle}
                      </p>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">
                          {PS.exchangeDialog.returnsLabel}
                        </p>
                        <p className="text-sm font-medium text-[var(--ops-text)]">
                          {selectedLine.style_name} &middot; {exchangeQty} und
                        </p>
                        <p className="text-xs text-[var(--ops-text-muted)]">
                          {formatCurrency(originalExchangeTotal)}
                        </p>
                      </div>
                      <div className="border-t border-[var(--ops-tone-success-border)] pt-2.5">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">
                          {PS.exchangeDialog.deliversLabel}
                        </p>
                        <p className="text-sm font-medium text-[var(--ops-text)]">
                          {selectedReplacement.style_name} &middot; {selectedReplacement.sku}
                        </p>
                        <p className="text-xs text-[var(--ops-text-muted)]">
                          {selectedReplacement.size_code}/{selectedReplacement.color_code}
                          {" "}&middot;{" "}
                          {formatCurrency(Number(selectedReplacement.retail_price || 0))}
                          {" "}&middot;{" "}
                          Stock {Number(selectedReplacement.stock || 0)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                          {formatCurrency(replacementTotal)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <OpsStatusBadge
                        tone={
                          sameVariantSelected || requiresRefundOrCredit
                            ? "danger"
                            : valueMatches
                              ? "success"
                              : "warning"
                        }
                      >
                        {valueMatches
                          ? PS.exchangeDialog.noDifference
                          : `${requiresCharge ? PS.exchangeDialog.chargeDifference : PS.exchangeDialog.differenceLabel} ${formatCurrency(Math.abs(differenceAmount))}`}
                      </OpsStatusBadge>
                    </div>
                    {sameVariantSelected || requiresRefundOrCredit ? (
                      <p className="mt-2 text-xs font-medium text-[var(--ops-tone-danger-text)]">
                        {sameVariantSelected
                          ? PS.exchangeDialog.sameVariantBlocked
                          : PS.exchangeDialog.refundBlocked}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {requiresCharge ? (
              <div className="grid gap-3 rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-3 py-3 md:grid-cols-2">
                <OpsSelect
                  label={PS.exchangeDialog.paymentMethod}
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  options={paymentMethodOptions}
                />
                <OpsFormField label={PS.exchangeDialog.paymentReference} density="compact">
                  <input
                    autoComplete="off"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    maxLength={80}
                    className={opsInputCompact}
                    placeholder={PS.exchangeDialog.paymentReferencePlaceholder}
                  />
                </OpsFormField>
              </div>
            ) : null}

            <PresetTextField
              label={PS.detail.lines.reasonRequired}
              required
              error={reasonError}
              value={reason}
              onChange={setReason}
              presets={EXCHANGE_REASON_PRESETS}
              placeholder={PS.detail.lines.reasonPlaceholder}
              textareaRows={2}
              textareaClassName="min-h-[72px]"
            />

            <OpsFormField label={PS.detail.lines.notes} density="compact">
              <textarea
                autoComplete="off"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={200}
                className="sales-field min-h-[80px] w-full rounded-lg px-3 py-2.5 text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]"
                placeholder={PS.detail.lines.notesExchangePlaceholder}
              />
              <div className="mt-1 text-right text-[11px] tabular-nums text-[var(--ops-text-muted)]">
                {notes.length}/200
              </div>
            </OpsFormField>
          </>
        ) : null}
      </div>
    </OpsDialog>
  )
}
