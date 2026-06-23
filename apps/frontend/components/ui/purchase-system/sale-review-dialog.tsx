"use client"

import { CreditCard, Receipt, ShoppingBasket, UserRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { POS } from "@/components/modules/sales/pos/pos-messages"
import { formatMoney } from "@/lib/format-utils"
import { INFO_BOX_XL } from "@/components/ui/ops-control-styles"

type SaleReviewItem = {
  id: string
  title: string
  detail: string
  quantity: number
  subtotal: number
}

type SaleReviewPayment = {
  id: string
  label: string
  amount: number
  reference?: string | null
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--ripnel-accent)]">
        {icon}
      </span>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
        {title}
      </p>
    </div>
  )
}

export function SaleReviewDialog({
  open,
  onOpenChange,
  onClose,
  onConfirm,
  confirming,
  customerLabel,
  customerDetail,
  documentLabel,
  documentDetail,
  paymentModeLabel,
  paymentAssignedAmount,
  payments,
  discountAmount,
  totalAmount,
  baseSubtotal,
  items,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClose: () => void
  onConfirm: () => void
  confirming: boolean
  customerLabel: string
  customerDetail?: string | null
  documentLabel: string
  documentDetail?: string | null
  paymentModeLabel: string
  paymentAssignedAmount: number
  payments: SaleReviewPayment[]
  discountAmount: number
  totalAmount: number
  baseSubtotal: number
  items: SaleReviewItem[]
}) {
  return (
    <OpsDialog
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : onClose())}
      title={POS.summary.reviewTitle}
      description={POS.summary.reviewDesc}
      size="md"
      bodyClassName="space-y-3"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg px-4"
            onClick={onClose}
            disabled={confirming}
          >
            {POS.sale.backButton}
          </Button>
          <Button
            type="button"
            variant="accent"
            size="sm"
            className="rounded-lg px-4"
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? POS.sale.confirming : POS.sale.confirmButton}
          </Button>
        </div>
      }
    >
      <div className="flex items-start justify-between gap-3 rounded-xl border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_74%,var(--ops-surface))] px-3 py-2.5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
            {POS.payment.total}
          </p>
          <p className="text-lg font-semibold text-[var(--ops-text)]">
            {POS.summary.moneyPrefix} {formatMoney(totalAmount)}
          </p>
        </div>
        {discountAmount > 0 ? (
          <OpsStatusBadge tone="warning" size="sm">
            {POS.summary.discountAbbr} {POS.summary.moneyPrefix} {formatMoney(discountAmount)}
          </OpsStatusBadge>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className={INFO_BOX_XL}>
          <SectionTitle icon={<UserRound className="h-4 w-4" />} title={POS.summary.reviewCustomer} />
          <div className="mt-2">
            <p className="text-sm font-medium text-[var(--ops-text)]">{customerLabel}</p>
            {customerDetail ? (
              <p className="mt-0.5 text-[11px] text-[var(--ops-text-muted)]">{customerDetail}</p>
            ) : null}
          </div>
        </div>
        <div className={INFO_BOX_XL}>
          <SectionTitle icon={<Receipt className="h-4 w-4" />} title={POS.summary.reviewDocument} />
          <div className="mt-2">
            <p className="text-sm font-medium text-[var(--ops-text)]">{documentLabel}</p>
            {documentDetail ? (
              <p className="mt-0.5 text-[11px] text-[var(--ops-text-muted)]">{documentDetail}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className={INFO_BOX_XL}>
        <SectionTitle icon={<ShoppingBasket className="h-4 w-4" />} title={POS.summary.products} />
        <div className="mt-2 space-y-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-3 rounded-lg bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_44%,var(--ops-surface))] px-2.5 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--ops-text)]">{item.title}</p>
                <p className="truncate text-[11px] text-[var(--ops-text-muted)]">{item.detail}</p>
              </div>
              <span className="text-[11px] font-medium text-[var(--ops-text-muted)]">x{item.quantity}</span>
              <span className="text-sm font-semibold text-[var(--ops-text)]">
                {POS.summary.moneyPrefix} {formatMoney(item.subtotal)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={INFO_BOX_XL}>
        <div className="flex items-start justify-between gap-3">
          <SectionTitle icon={<CreditCard className="h-4 w-4" />} title={POS.summary.reviewCharge} />
          <OpsStatusBadge tone="neutral" size="sm">
            {POS.payment.assigned} {POS.summary.moneyPrefix} {formatMoney(paymentAssignedAmount)}
          </OpsStatusBadge>
        </div>
        <div className="mt-2">
          <p className="text-sm font-medium text-[var(--ops-text)]">{paymentModeLabel}</p>
          <div className="mt-2 space-y-1.5">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-start justify-between gap-3 rounded-lg bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_44%,var(--ops-surface))] px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--ops-text)]">{payment.label}</p>
                  {payment.reference ? (
                    <p className="truncate text-[11px] text-[var(--ops-text-muted)]">{payment.reference}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-sm font-semibold text-[var(--ops-text)]">
                  {POS.summary.moneyPrefix} {formatMoney(payment.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={INFO_BOX_XL}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
          {POS.summary.reviewTotals}
        </p>
        <div className="mt-2 space-y-2 text-sm">
          <div className="flex items-center justify-between text-[var(--ops-text-muted)]">
            <span>{POS.summary.subtotalBase}</span>
            <span>{POS.summary.moneyPrefix} {formatMoney(baseSubtotal)}</span>
          </div>
          {discountAmount > 0 ? (
            <div className="flex items-center justify-between text-[var(--ops-tone-warning-text)]">
              <span>{POS.payment.discount}</span>
              <span>- {POS.summary.moneyPrefix} {formatMoney(discountAmount)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-[var(--ops-border-strong)] pt-2 text-base font-semibold text-[var(--ops-text)]">
            <span>{POS.payment.total}</span>
            <span>{POS.summary.moneyPrefix} {formatMoney(totalAmount)}</span>
          </div>
        </div>
      </div>
    </OpsDialog>
  )
}

