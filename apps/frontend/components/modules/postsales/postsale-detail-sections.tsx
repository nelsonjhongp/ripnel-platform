"use client"

import type { ReactNode } from "react"
import {
  PackageSearch,
  RefreshCcw,
  ShieldAlert,
  Undo2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { OpsMetricRow } from "@/components/ui/ops-metric-row"
import { OpsPanelSection } from "@/components/ui/ops-panel-section"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { formatDateTime } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/format-utils"
import { cn } from "@/lib/utils"
import type { PostsaleContext } from "@/types/postsales"
import {
  CARD_BASE,
  INFO_BOX,
  INFO_BOX_MUTED,
} from "./postsales-constants"
import { PS } from "./postsales-messages"

const mutedBlockClass = cn(INFO_BOX_MUTED, "px-3 py-3")

export type PostsalePaymentSummary = {
  paymentTotal: number
  reversalTotal: number
  netTotal: number
  balanceDue: number
  isFullyPaid: boolean
}

export function BaseSalePanel({ context }: { context: PostsaleContext }) {
  return (
    <OpsPanelSection
      title={PS.detail.sections.baseSale}
      icon={<PackageSearch className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />}
    >
      <div className="space-y-2.5">
        {context.sale.details.map((line) => {
          const lExchanged = Number(line.exchanged_qty || 0)
          const lQty = Number(line.quantity || 0)
          const lRemaining = Math.max(0, lQty - lExchanged)
          return (
            <div key={line.sale_detail_id} className={cn(CARD_BASE, "rounded-lg px-3 py-3")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                    {line.style_name}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">
                    {line.sku} &middot; {line.size_code} / {line.color_code}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-[var(--ops-text)]">
                  {formatCurrency(Number(line.line_total))}
                </p>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-[var(--ops-text-muted)] md:grid-cols-4">
                <span>
                  {PS.detail.lines.quantity} {lQty}
                  {lExchanged > 0 ? (
                    <span className="ml-1 text-[var(--ops-tone-warning-text)]">
                      ({lRemaining} disponibles)
                    </span>
                  ) : null}
                </span>
                <span>
                  {PS.detail.lines.listPrice} {formatCurrency(Number(line.unit_price_list))}
                </span>
                <span>
                  {PS.detail.lines.finalPrice} {formatCurrency(Number(line.unit_price_final))}
                </span>
                <span>
                  {PS.detail.lines.lineSubtotal} {formatCurrency(Number(line.line_subtotal))}
                </span>
              </div>
              {lExchanged > 0 ? (
                <p className="mt-2 text-[11px] text-[var(--ops-tone-warning-text)]">
                  {lExchanged} de {lQty} unidades cambiadas &middot; {lRemaining} disponibles
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
    </OpsPanelSection>
  )
}

export function ExchangeTracePanel({ context }: { context: PostsaleContext }) {
  if (context.exchanges.length === 0) return null

  return (
    <OpsPanelSection
      title={PS.detail.sections.exchangeTrace}
      icon={<RefreshCcw className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />}
    >
      <div className="space-y-3">
        {context.exchanges.map((ex) => (
          <div key={ex.exchange_id} className={mutedBlockClass}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--ops-text)]">
                  {ex.exchange_number || ex.exchange_id}
                </p>
                <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                  {ex.reason || PS.table.fallbackNoReason} &middot;{" "}
                  {formatDateTime(ex.confirmed_at, ex.created_at)}
                </p>
              </div>
              <OpsStatusBadge tone="success">{ex.status}</OpsStatusBadge>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {ex.lines.map((line) => (
                <div key={line.exchange_line_id} className={INFO_BOX}>
                  <p className="text-sm font-semibold text-[var(--ops-text)]">
                    {line.direction === "IN"
                      ? PS.detail.lines.exchangeIn
                      : PS.detail.lines.exchangeOut}{" "}
                    &middot; {line.style_name}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">
                    {line.sku} &middot; {line.size_code} / {line.color_code}
                  </p>
                  <p className="mt-2 text-xs text-[var(--ops-text-muted)]">
                    {PS.detail.lines.quantity} {line.quantity} &middot;{" "}
                    {PS.detail.lines.finalPrice}{" "}
                    {formatCurrency(Number(line.unit_price_final || line.unit_reference_price || 0))}
                    {" "}&middot;{" "}
                    {formatCurrency(Number(line.line_total || 0))}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-2 text-sm md:grid-cols-4">
              <DetailField label={PS.detail.lines.originalTotal}>
                {formatCurrency(Number(ex.original_total || 0))}
              </DetailField>
              <DetailField label={PS.detail.lines.replacementTotal}>
                {formatCurrency(Number(ex.replacement_total || 0))}
              </DetailField>
              <DetailField label={PS.detail.lines.difference}>
                {formatCurrency(Math.abs(Number(ex.difference_amount || 0)))}
              </DetailField>
              <DetailField label={PS.detail.lines.settlement}>
                {PS.detail.lines.settlementLabels[ex.settlement_type] ||
                  PS.detail.lines.settlementLabels.none}
              </DetailField>
            </div>
            {ex.notes ? (
              <p className="mt-3 text-sm text-[var(--ops-text-muted)]">{ex.notes}</p>
            ) : null}
          </div>
        ))}
      </div>
    </OpsPanelSection>
  )
}

export function CancellationPanel({ context }: { context: PostsaleContext }) {
  if (!context.cancellation) return null

  return (
    <OpsPanelSection title={PS.detail.sections.cancellation} tone="danger">
      <p className="text-sm text-[var(--ops-tone-danger-text)]">
        {context.cancellation.reason} &middot; {formatDateTime(context.cancellation.cancelled_at)}
      </p>
      {context.cancellation.notes ? (
        <p className="mt-2 text-sm text-[var(--ops-tone-danger-text)]">
          {context.cancellation.notes}
        </p>
      ) : null}
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-tone-danger-text)]">
        {PS.detail.fields.executedBy}{" "}
        {context.cancellation.cancelled_by_name || PS.table.fallbackUnknownUser}
      </p>
    </OpsPanelSection>
  )
}

export function PostsaleActionsPanel({
  context,
  canExchange,
  canCancel,
  exchangeAllowed,
  cancelAllowed,
  isFinalized,
  onOpenExchange,
  onOpenCancel,
}: {
  context: PostsaleContext
  canExchange: boolean
  canCancel: boolean
  exchangeAllowed: boolean
  cancelAllowed: boolean
  isFinalized: boolean
  onOpenExchange: () => void
  onOpenCancel: () => void
}) {
  return (
    <OpsPanelSection
      title={PS.detail.sections.actions}
      icon={<RefreshCcw className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />}
    >
      <div className="space-y-3">
        {isFinalized ? (
          <div className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-3 py-3">
            <p className="text-sm text-[var(--ops-text-muted)]">
              <ShieldAlert className="mr-2 inline-block h-4 w-4 text-[var(--ops-text-muted)]" />
              {PS.detail.actionsPanel.finalized}
            </p>
          </div>
        ) : (
          <>
            {canExchange ? (
              exchangeAllowed ? (
                <Button variant="accent" size="sm" className="w-full rounded-lg" onClick={onOpenExchange}>
                  <RefreshCcw className="h-4 w-4" />
                  {PS.detail.sections.simpleExchange}
                </Button>
              ) : (
                <BlockedActionMessage>
                  {context.availability.exchange.reasons.join(" ") ||
                    PS.detail.actionsPanel.exchangeBlocked}
                </BlockedActionMessage>
              )
            ) : null}

            {canCancel ? (
              cancelAllowed ? (
                <Button variant="accent" size="sm" className="w-full rounded-lg" onClick={onOpenCancel}>
                  <Undo2 className="h-4 w-4" />
                  {PS.detail.sections.totalCancellation}
                </Button>
              ) : (
                <BlockedActionMessage>
                  {context.availability.cancel.reasons.join(" ") ||
                    PS.detail.actionsPanel.cancelBlocked}
                </BlockedActionMessage>
              )
            ) : null}

            {!canExchange && !canCancel ? (
              <p className="text-sm text-[var(--ops-text-muted)]">
                {PS.detail.actionsPanel.finalized}
              </p>
            ) : null}
          </>
        )}
      </div>
    </OpsPanelSection>
  )
}

function BlockedActionMessage({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)] px-3 py-3">
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ops-tone-warning-text)]" />
        <p className="text-sm text-[var(--ops-tone-warning-text)]">{children}</p>
      </div>
    </div>
  )
}

function DetailField({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn(mutedBlockClass, className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm text-[var(--ops-text)]">{children}</p>
    </div>
  )
}

export function PaymentsNetPanel({
  context,
  paymentSummary,
}: {
  context: PostsaleContext
  paymentSummary: PostsalePaymentSummary
}) {
  return (
    <>
      <div className="space-y-2">
        {(context.sale.payments || []).map((payment) => (
          <div key={payment.payment_id} className={mutedBlockClass}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold capitalize text-[var(--ops-text)]">
                  {payment.method}
                </p>
                <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                  {formatDateTime(payment.paid_at)}
                </p>
              </div>
              <p className="text-sm font-semibold text-[var(--ops-text)]">
                {formatCurrency(Number(payment.amount))}
              </p>
            </div>
            {payment.reference ? (
              <p className="mt-2 text-xs text-[var(--ops-text-muted)]">
                {PS.detail.lines.referenceAbbr} {payment.reference}
              </p>
            ) : null}
          </div>
        ))}

        {context.payment_reversals.length > 0 ? (
          <div className="space-y-2 pt-1">
            {context.payment_reversals.map((reversal) => (
              <div
                key={reversal.payment_reversal_id}
                className="rounded-lg border border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold capitalize text-[var(--ops-tone-danger-text)]">
                      {PS.detail.payments.reversalMethod} {reversal.method}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ops-tone-danger-text)]">
                      {reversal.reason} &middot; {formatDateTime(reversal.reversed_at)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[var(--ops-tone-danger-text)]">
                    - {formatCurrency(Number(reversal.amount))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 space-y-2 border-t border-[var(--ops-border-strong)] pt-4">
        <OpsMetricRow
          label={PS.detail.payments.registered}
          value={formatCurrency(paymentSummary.paymentTotal)}
        />
        <OpsMetricRow
          label={PS.detail.payments.reversals}
          value={formatCurrency(paymentSummary.reversalTotal)}
        />
        <div className="border-t border-[var(--ops-border-strong)] pt-2">
          <OpsMetricRow
            label={PS.detail.payments.net}
            value={formatCurrency(paymentSummary.netTotal)}
          />
        </div>
      </div>
    </>
  )
}
