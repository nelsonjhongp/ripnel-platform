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
  parseAmountInput,
} from "./pos-utils"
import { PAYMENT_TOLERANCE } from "./pos-constants"
import { PAYMENT_METHODS } from "./pos-types"

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
    <div className={`flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 py-2.5 text-left ${baseClass}`}>
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
    summaryStatusMessage,
    submitDisabled,
  submitting,
  error,
  goToStage,
  onReviewSale,
  } = props

  const productsSummary =
    cartCount === 0
      ? "Sin productos agregados"
      : `${cartCount} item${cartCount === 1 ? "" : "s"} · S/. ${formatMoney(totals.total)}`

  const customerSummary = selectedCustomerName || "Pendiente"
  const customerDetail = selectedCustomerName
    ? selectedCustomerDocument || "Sin documento"
    : "Sin cliente asignado"

  const documentSummary =
    !documentType || documentType === "none" || !activeDocumentOption
      ? "Pendiente"
      : activeDocumentOption.label
  const documentDetail =
    !selectedCustomerName
      ? "Sin cliente"
      : !documentType || documentType === "none"
        ? "Selecciona el tipo de comprobante"
        : customerStepReady
          ? "Listo para emitir comprobante"
          : "El cliente no cumple los requisitos"

  const hasPaymentError = Boolean(mixedPaymentsPreview?.error)
  const normalizedMixedPayments = mixedPayments.map((payment) => {
    const amountText = String(payment.amount || "").trim()
    const amountValue = parseAmountInput(payment.amount)
    const methodValue = String(payment.method || "").trim()
    return {
      ...payment,
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
  const mixedPositiveCount = normalizedMixedPayments.filter(
    (payment) => payment.amountValue !== null && payment.amountValue > 0,
  ).length
  const hasAnyMixedInput = normalizedMixedPayments.some(
    (payment) => payment.hasMethod || payment.hasAmount || payment.hasReference,
  )
  const hasMixedInvalidAmount = normalizedMixedPayments.some(
    (payment) => payment.hasAmount && payment.amountValue === null,
  )
  const hasMixedMissingMethod = normalizedMixedPayments.some(
    (payment) => payment.hasAmount && !payment.hasMethod,
  )
  const hasMixedInvalidMethod = normalizedMixedPayments.some(
    (payment) => payment.hasMethod && !payment.methodIsValid,
  )
  const paymentSummary =
    cartCount === 0
      ? "Pendiente"
      : paymentMode === "mixed"
        ? hasAnyMixedInput
          ? `${mixedPaymentsPreview?.payments.length || mixedPayments.length} pagos · S/. ${formatMoney(mixedPaymentsPreview?.enteredTotal ?? 0)}`
          : "Pendiente"
        : `${paymentSummaryLabel} · S/. ${formatMoney(totals.total)}`
  const pendingAmount =
    paymentMode === "mixed" ? mixedPaymentsPreview?.difference ?? totals.total : 0
  const isReadyToFinalize =
    !submitDisabled && !submitting && cashReady
  const paymentState =
    cartCount === 0
      ? "idle"
      : paymentMode === "single"
        ? paymentMethod
          ? "ready"
          : "pending"
        : !hasAnyMixedInput
          ? "pending"
          : hasMixedInvalidAmount ||
              hasMixedInvalidMethod ||
              (mixedPaymentsPreview?.difference ?? 0) < -PAYMENT_TOLERANCE
            ? "warning"
            : hasMixedMissingMethod ||
                mixedPositiveCount < 2 ||
                Math.max(pendingAmount, 0) > PAYMENT_TOLERANCE
              ? "pending"
              : "ready"
  const totalLabel =
    activeDocumentOption?.value === "boleta" || activeDocumentOption?.value === "factura"
      ? "Total documento"
      : "Total a cobrar"

  const summaryHeadline = !cashReady
    ? buildCashLabel(cashStatus)
    : cashStatus === "open"
      ? "Caja abierta"
    : isReadyToFinalize
      ? "Listo para finalizar"
    : cartCount === 0
      ? "Falta agregar productos"
    : !selectedCustomerName
      ? "Falta asignar cliente"
    : !documentType || documentType === "none"
      ? "Falta seleccionar comprobante"
    : paymentMode === "single" && !paymentMethod
      ? "Falta seleccionar cobro"
    : !customerStepReady
      ? "Revisar cliente y comprobante"
    : hasPaymentError
      ? "Revisar cobro"
    : paymentMode === "mixed" && Math.abs(pendingAmount) > PAYMENT_TOLERANCE
      ? `Falta cobrar S/. ${formatMoney(Math.max(pendingAmount, 0))}`
      : totals.hasMissingPrice
        ? "Hay items sin precio"
        : "Listo para finalizar"

  const headerStatus = (() => {
    if (submitting) return "Procesando…"
    if (!cashReady) return cashStatus === "closed" ? "Caja cerrada" : "Caja pendiente"
    if (cartCount === 0) return "Sin productos"
    if (!selectedCustomerName) return "Pendiente"
    if (!documentType || documentType === "none") return "Falta comprobante"
    if (paymentState === "pending") return "Pendiente"
    if (!customerStepReady) return "Cliente no válido"
    if (totals.hasMissingPrice) return "Precios pendientes"
    if (paymentState === "warning") return "Revisar cobro"
    if (submitDisabled) return "Pendiente"
    return "Listo para finalizar"
  })()
  const headerTone = (() => {
    if (submitting) return "accent" as const
    if (!cashReady) return cashStatus === "closed" ? "danger" as const : "warning" as const
    if (cartCount === 0) return "neutral" as const
    if (!selectedCustomerName || !documentType || documentType === "none") return "neutral" as const
    if (!customerStepReady || totals.hasMissingPrice || paymentState === "warning") return "warning" as const
    if (paymentState === "pending" || submitDisabled) return "neutral" as const
    return "success" as const
  })()
  const productsBadge =
    cartCount === 0 ? "Pendiente" : totals.hasMissingPrice ? "Revisar" : "Listo"
  const productsBadgeTone =
    cartCount === 0 ? "neutral" : totals.hasMissingPrice ? "warning" : "success"
  const customerBadge = !selectedCustomerName || selectedCustomerName === "Pendiente"
    ? "Pendiente"
    : !customerStepReady
      ? "Revisar"
      : "Listo"
  const customerBadgeTone =
    customerBadge === "Pendiente" ? "neutral" : customerBadge === "Revisar" ? "warning" : "success"
  const documentBadge =
    !documentType || documentType === "none"
      ? "Pendiente"
      : !customerStepReady
        ? "Revisar"
        : "Listo"
  const documentBadgeTone =
    documentBadge === "Pendiente" ? "neutral" : documentBadge === "Revisar" ? "warning" : "success"
  const paymentBadge =
    cartCount === 0
      ? "Pendiente"
      : !cashReady
        ? cashStatus === "closed" ? "Caja cerrada" : "Caja no abierta"
        : paymentMode === "single" && !paymentMethod
          ? "Pendiente"
        : paymentState === "warning"
          ? "Revisar"
        : paymentMode === "mixed" && paymentState === "pending" && Math.max(pendingAmount, 0) > PAYMENT_TOLERANCE
          ? `Faltan S/. ${formatMoney(Math.max(pendingAmount, 0))}`
        : paymentState === "pending"
          ? "Pendiente"
          : "Listo"
  const paymentBadgeTone =
    cartCount === 0
      ? "neutral"
      : !cashReady
        ? "warning"
        : paymentState === "warning"
          ? "warning"
          : paymentState === "pending"
            ? "neutral"
            : "success"

  return (
    <article className="sales-panel rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4 shadow-sm transition-all duration-200 sm:p-5 xl:sticky xl:top-20 xl:self-start">
      <div className="flex items-center justify-between gap-3" aria-live="polite">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ripnel-accent)]">
            <Receipt className="h-4 w-4" />
          </span>
          <h2 className="text-[1.05rem] font-semibold text-[var(--ops-text)]">Resumen de venta</h2>
        </div>
        <OpsStatusBadge tone={headerTone} size="sm" className="shrink-0">
          {headerStatus}
        </OpsStatusBadge>
      </div>

      <div className="mt-4 space-y-3">
        {(!cashReady || ((summaryStatusMessage || summaryHeadline) && !isReadyToFinalize)) ? (
          <div
            aria-live="polite"
            className="rounded-xl border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_82%,var(--ops-surface))] px-3 py-2.5"
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
                {!cashReady ? buildCashLabel(cashStatus) : summaryStatusMessage || summaryHeadline}
              </p>
            </div>
          </div>
        ) : null}

        <div className="space-y-2.5">
          <SummaryShortcut
            label="Productos"
            value={productsSummary}
            icon={<ShoppingBasket className="h-4 w-4" />}
            badge={productsBadge}
            badgeTone={productsBadgeTone}
            pulse={productsBadge === "Pendiente"}
            onClick={() => goToStage("products")}
          />

          <SummaryShortcut
            label="Cliente"
            value={customerSummary}
            detail={customerDetail}
            icon={<UserRound className="h-4 w-4" />}
            badge={customerBadge}
            badgeTone={customerBadgeTone}
            pulse={customerBadge === "Pendiente"}
            onClick={() => goToStage("customer")}
          />

          <SummaryShortcut
            label="Comprobante"
            value={documentSummary}
            detail={documentDetail}
            icon={<Receipt className="h-4 w-4" />}
            badge={documentBadge}
            badgeTone={documentBadgeTone}
            pulse={documentBadge === "Pendiente"}
            onClick={() => goToStage("customer")}
          />

          <SummaryShortcut
            label="Cobro"
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
            Hay items sin precio vigente. Ajustalos antes del cierre.
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
              Procesando…
            </span>
          ) : (
            <>
              <Check className="h-4 w-4" /> Finalizar venta
            </>
          )}
        </Button>
      </div>
    </article>
  )
}
