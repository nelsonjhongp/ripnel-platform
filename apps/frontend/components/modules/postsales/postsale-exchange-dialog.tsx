"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import {
  CheckCircle2,
  LoaderCircle,
  RefreshCcw,
  ShieldAlert,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { OpsFormField } from "@/components/ui/ops-form-field"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { PresetTextField } from "@/components/ui/preset-text-field"
import { SearchablePicker } from "@/components/ui/searchable-picker"
import { apiFetch } from "@/lib/api"
import { explainApiError } from "@/lib/error-utils"
import { formatCurrency, round2 } from "@/lib/format-utils"
import { cn } from "@/lib/utils"
import type { PostsaleContext, SaleLine, SellableVariant } from "@/types/postsales"
import { PS } from "./postsales-messages"
import { CARD_BASE, EXCHANGE_REASON_PRESETS, SELECTED_CARD } from "./postsales-constants"

interface ExchangeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  saleId: string
  context: PostsaleContext
  isAllowed: boolean
  blockedReasons: string[]
  onSuccess: () => void
}

function computeCandidateTotal(
  candidate: { retail_price: number },
  line: SaleLine,
  taxRate: number,
) {
  const subtotal = round2(Number(candidate.retail_price || 0) * Number(line.quantity || 0))
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

  const [search, setSearch] = useState("")
  const [results, setResults] = useState<SellableVariant[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState("")
  const [pickerOpen, setPickerOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const selectedReplacement = useMemo(
    () => results.find((v) => v.variant_id === selectedVariantId) || null,
    [results, selectedVariantId],
  )

  useEffect(() => {
    if (!open) return
    const trimmed = search.trim()
    if (trimmed.length < 2) {
      queueMicrotask(() => {
        setResults([])
        setSearchLoading(false)
        setSearchError(null)
      })
      return
    }

    const controller = new AbortController()
    let active = true

    const timer = window.setTimeout(async () => {
      setSearchLoading(true)
      setSearchError(null)
      try {
        const params = new URLSearchParams({ q: trimmed })
        const data = await apiFetch<SellableVariant[]>(
          `/api/sales/sellable-variants?${params.toString()}`,
          { cache: "no-store", signal: controller.signal },
        )
        if (active) setResults(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!active || controller.signal.aborted) return
        setResults([])
        setSearchError(explainApiError(e, PS.exchangeDialog.noResults))
      } finally {
        if (active) setSearchLoading(false)
      }
    }, 250)

    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [search, open])

  const handleReplacementSelect = useCallback(
    (variant: SellableVariant) => {
      setSelectedVariantId(variant.variant_id)
      setSearch("")
      setResults([])
    },
    [],
  )

  const [reason, setReason] = useState("")
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedLineId || !selectedVariantId) {
      setFormError(PS.exchangeDialog.blockValidation)
      return
    }

    if (!reason.trim()) {
      setReasonError(PS.detail.alerts.reasonValidation)
      return
    }

    setFormError(null)
    setReasonError(null)
    setSubmitting(true)

    try {
      await apiFetch(`/api/postsales/${saleId}/exchanges`, {
        method: "POST",
        body: JSON.stringify({
          sale_detail_id: selectedLineId,
          replacement_variant_id: selectedVariantId,
          reason,
          notes,
        }),
      })
      onSuccess()
      onOpenChange(false)
    } catch (e) {
      setFormError(explainApiError(e, PS.exchangeDialog.errorFallback))
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit =
    Boolean(selectedLineId) &&
    Boolean(selectedVariantId) &&
    reason.trim().length > 0 &&
    !submitting

  const replacementTotal = selectedLine && selectedReplacement
    ? computeCandidateTotal(selectedReplacement, selectedLine, context.sale.tax_rate)
    : 0

  const valueMatches = selectedLine && selectedReplacement
    ? round2(replacementTotal) === round2(selectedLine.line_total)
    : true

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
          >
            {PS.exchangeDialog.close}
          </Button>
          <Button
            variant="accent"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-lg"
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
            {sale.details.map((line) => (
              <button
                key={line.sale_detail_id}
                type="button"
                onClick={() => {
                  setSelectedLineId(line.sale_detail_id)
                  setSelectedVariantId("")
                  setSearch("")
                  setResults([])
                }}
                className={cn(
                  "block w-full cursor-pointer rounded-lg border px-3 py-3 text-left transition",
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
                      {line.quantity} und
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedLine ? (
          <>
            <SearchablePicker
              value={search}
              onChange={(v) => {
                setSearch(v)
                setHighlightedIndex(0)
              }}
              placeholder={PS.exchangeDialog.searchPlaceholder}
              label={PS.exchangeDialog.searchLabel}
              items={results}
              loading={searchLoading}
              error={searchError}
              loadingMessage={PS.exchangeDialog.loading}
              emptyMessage={PS.exchangeDialog.noResults}
              maxVisibleItems={6}
              highlightedIndex={highlightedIndex}
              onHighlightChange={setHighlightedIndex}
              getItemKey={(v) => v.variant_id}
              selectedItemKey={selectedVariantId}
              onSelect={handleReplacementSelect}
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              openOnFocus
              renderItem={(variant) => {
                const total = computeCandidateTotal(variant, selectedLine, context.sale.tax_rate)
                const matches = round2(total) === round2(selectedLine.line_total)
                return (
                  <div className="flex w-full items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--ops-text)]">
                        {variant.style_name}
                      </p>
                      <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">
                        {variant.sku} &middot; {variant.size_code}/{variant.color_code}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-xs">
                      <p className="font-semibold text-[var(--ops-text)]">
                        {formatCurrency(Number(variant.retail_price || 0))}
                      </p>
                      <p className="text-[var(--ops-text-muted)]">
                        Stock {Number(variant.stock || 0)}
                      </p>
                      <div className="mt-0.5">
                        <OpsStatusBadge size="xs" tone={matches ? "success" : "warning"}>
                          {matches
                            ? PS.exchangeDialog.sameValueBadge
                            : formatCurrency(total)}
                        </OpsStatusBadge>
                      </div>
                    </div>
                  </div>
                )
              }}
              density="compact"
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
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">
                          {PS.exchangeDialog.lineToReplace}
                        </p>
                        <p className="text-sm font-medium text-[var(--ops-text)]">
                          {selectedLine.style_name} &middot; {selectedLine.quantity} und
                        </p>
                        <p className="text-xs text-[var(--ops-text-muted)]">
                          {formatCurrency(Number(selectedLine.line_total))}
                        </p>
                      </div>
                      <div className="border-t border-[var(--ops-tone-success-border)] pt-2.5">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">
                          {PS.exchangeDialog.replacementVariant}
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
                      </div>
                    </div>
                    <div className="mt-2">
                      <OpsStatusBadge tone={valueMatches ? "success" : "warning"}>
                        {valueMatches
                          ? PS.exchangeDialog.sameValueBadge
                          : `${PS.exchangeDialog.diffValueBadge} ${formatCurrency(replacementTotal)}`}
                      </OpsStatusBadge>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <PresetTextField
              label={PS.detail.lines.reasonRequired}
              required
              error={reasonError}
              value={reason}
              onChange={(v) => {
                setReason(v)
                setReasonError(null)
              }}
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
