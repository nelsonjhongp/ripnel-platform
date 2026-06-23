import type {
  MixedPaymentPreview,
  PaymentDraft,
  SalePreview,
} from "./pos-types"
import { PAYMENT_METHODS } from "./pos-types"

import { formatMoney } from "@/lib/format-utils"
import { PAYMENT_TOLERANCE } from "./pos-constants"
import { POS } from "./pos-messages"
import { buildCashLabel, parseAmountInput } from "./pos-utils"

export interface SummaryDerivedState {
  productsSummary: string
  customerSummary: string
  customerDetail: string
  documentSummary: string
  documentDetail: string
  paymentSummary: string
  pendingAmount: number
  isReadyToFinalize: boolean
  paymentState: "idle" | "pending" | "warning" | "ready"
  totalLabel: string
  summaryHeadline: string
  headerStatus: string
  headerTone: "neutral" | "success" | "warning" | "danger" | "accent"
  productsBadge: string
  productsBadgeTone: "neutral" | "success" | "warning"
  customerBadge: string
  customerBadgeTone: "neutral" | "success" | "warning"
  documentBadge: string
  documentBadgeTone: "neutral" | "success" | "warning"
  paymentBadge: string
  paymentBadgeTone: "neutral" | "success" | "warning"
}

interface SummaryDerivationInput {
  documentType: string
  activeDocumentOption: { label: string; value: string } | null
  selectedCustomerName: string
  selectedCustomerDocument: string
  customerStepReady: boolean
  cartCount: number
  totals: SalePreview
  paymentMode: "single" | "mixed"
  paymentMethod: string
  paymentSummaryLabel: string
  mixedPaymentsPreview: MixedPaymentPreview | null
  mixedPayments: PaymentDraft[]
  cashReady: boolean
  cashStatus: string
  submitDisabled: boolean
  submitting: boolean
}

export function deriveSummaryState(input: SummaryDerivationInput): SummaryDerivedState {
  const {
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
  } = input

  const productsSummary =
    cartCount === 0
      ? POS.summaryBadge.noProducts
      : `${cartCount} item${cartCount === 1 ? "" : "s"} · S/. ${formatMoney(totals.total)}`

  const customerSummary = selectedCustomerName || POS.summaryBadge.pending
  const customerDetail = selectedCustomerName
    ? selectedCustomerDocument || "Sin documento"
    : POS.summaryBadge.noCustomer

  const documentSummary =
    !documentType || documentType === "none" || !activeDocumentOption
      ? POS.summaryBadge.pending
      : activeDocumentOption.label
  const documentDetail =
    !selectedCustomerName
      ? "Sin cliente"
      : !documentType || documentType === "none"
        ? POS.summaryBadge.selectDocument
        : customerStepReady
          ? POS.summaryBadge.documentReady
          : POS.summaryBadge.customerInvalid

  const hasPaymentError = Boolean(mixedPaymentsPreview?.error)
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
      ? POS.summaryBadge.pending
      : paymentMode === "mixed"
        ? hasAnyMixedInput
          ? `${mixedPaymentsPreview?.payments.length || mixedPayments.length} pagos · S/. ${formatMoney(mixedPaymentsPreview?.enteredTotal ?? 0)}`
          : POS.summaryBadge.pending
        : `${paymentSummaryLabel} · S/. ${formatMoney(totals.total)}`
  const pendingAmount =
    paymentMode === "mixed" ? mixedPaymentsPreview?.difference ?? totals.total : 0
  const isReadyToFinalize = !submitDisabled && !submitting && cashReady

  const paymentState: SummaryDerivedState["paymentState"] =
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
    : isReadyToFinalize
      ? POS.summaryBadge.readyToFinalize
      : cartCount === 0
        ? POS.summaryBadge.needProducts
        : !selectedCustomerName
          ? POS.summaryBadge.needCustomer
          : !documentType || documentType === "none"
            ? POS.summaryBadge.needDocument
            : paymentMode === "single" && !paymentMethod
              ? POS.summaryBadge.needPayment
              : !customerStepReady
                ? POS.summaryBadge.reviewCustomerDoc
                : hasPaymentError
                  ? POS.summaryBadge.reviewPayment
                  : paymentMode === "mixed" && Math.abs(pendingAmount) > PAYMENT_TOLERANCE
                    ? `Falta cobrar S/. ${formatMoney(Math.max(pendingAmount, 0))}`
                    : totals.hasMissingPrice
                      ? POS.summaryBadge.itemsMissingPrice
                      : POS.summaryBadge.readyToFinalize

  const headerStatus = (() => {
    if (submitting) return POS.summaryBadge.processing
    if (!cashReady) return cashStatus === "closed" ? POS.summaryBadge.cashClosed : POS.summaryBadge.cashPending
    if (cartCount === 0) return POS.summaryBadge.noDocs
    if (!selectedCustomerName) return POS.summaryBadge.pending
    if (!documentType || documentType === "none") return POS.summaryBadge.missingComp
    if (paymentState === "pending") return POS.summaryBadge.pending
    if (!customerStepReady) return POS.summaryBadge.invalidClient
    if (totals.hasMissingPrice) return POS.summaryBadge.pricesPending
    if (paymentState === "warning") return POS.summaryBadge.reviewPayment
    if (submitDisabled) return POS.summaryBadge.pending
    return POS.summaryBadge.readyToFinalize
  })()

  const headerTone = (() => {
    if (submitting) return "accent" as const
    if (!cashReady) return cashStatus === "closed" ? ("danger" as const) : ("warning" as const)
    if (cartCount === 0) return "neutral" as const
    if (!selectedCustomerName || !documentType || documentType === "none") return "neutral" as const
    if (!customerStepReady || totals.hasMissingPrice || paymentState === "warning") return "warning" as const
    if (paymentState === "pending" || submitDisabled) return "neutral" as const
    return "success" as const
  })()

  const productsBadge =
    cartCount === 0 ? POS.summaryBadge.pending : totals.hasMissingPrice ? POS.summaryBadge.review : POS.summaryBadge.ready
  const productsBadgeTone: "neutral" | "success" | "warning" =
    cartCount === 0 ? "neutral" : totals.hasMissingPrice ? "warning" : "success"

  const customerBadge = !selectedCustomerName || selectedCustomerName === POS.summaryBadge.pending
    ? POS.summaryBadge.pending
    : !customerStepReady
      ? POS.summaryBadge.review
      : POS.summaryBadge.ready
  const customerBadgeTone: "neutral" | "success" | "warning" =
    customerBadge === POS.summaryBadge.pending ? "neutral" : customerBadge === POS.summaryBadge.review ? "warning" : "success"

  const documentBadge =
    !documentType || documentType === "none"
      ? POS.summaryBadge.pending
      : !customerStepReady
        ? POS.summaryBadge.review
        : POS.summaryBadge.ready
  const documentBadgeTone: "neutral" | "success" | "warning" =
    documentBadge === POS.summaryBadge.pending ? "neutral" : documentBadge === POS.summaryBadge.review ? "warning" : "success"

  const paymentBadge =
    cartCount === 0
      ? POS.summaryBadge.pending
      : !cashReady
        ? cashStatus === "closed" ? POS.summaryBadge.cashClosed : POS.summaryBadge.cashNotOpen
        : paymentMode === "single" && !paymentMethod
          ? POS.summaryBadge.pending
          : paymentState === "warning"
            ? POS.summaryBadge.review
            : paymentMode === "mixed" && paymentState === "pending" && Math.max(pendingAmount, 0) > PAYMENT_TOLERANCE
              ? POS.summaryBadge.missingAmount(formatMoney(Math.max(pendingAmount, 0)))
              : paymentState === "pending"
                ? POS.summaryBadge.pending
                : POS.summaryBadge.ready
  const paymentBadgeTone: "neutral" | "success" | "warning" =
    cartCount === 0
      ? "neutral"
      : !cashReady
        ? "warning"
        : paymentState === "warning"
          ? "warning"
          : paymentState === "pending"
            ? "neutral"
            : "success"

  return {
    productsSummary,
    customerSummary,
    customerDetail,
    documentSummary,
    documentDetail,
    paymentSummary,
    pendingAmount,
    isReadyToFinalize,
    paymentState,
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
  }
}
