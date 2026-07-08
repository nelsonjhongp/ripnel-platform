"use client"

import { useEffect, useMemo, useState } from "react"

import { showInfo } from "@/lib/toast"
import {
  DOC_TYPES,
  PAYMENT_METHODS,
} from "./pos-types"
import type {
  CartItem,
  PosCustomer,
  PosPricingConfig,
  PriceModeOverride,
  SaleDiscountState,
} from "./pos-types"
import {
  createDefaultMixedPayments,
  createPaymentDraft,
  getPaymentMethodLabel,
  parseAmountInput,
  round2,
  trimOrNull,
} from "./pos-utils"
import {
  calculateSalePreview,
  shouldApplyWholesalePreview,
} from "./pos-pricing-utils"
import {
  buildCustomerDisplayName,
  buildCustomerDocument,
  isCustomerValidForDocumentType,
} from "./pos-customer-utils"
import { usePaymentState } from "./use-payment-state"
import { useCustomerSearch } from "./use-customer-search"
import { POS } from "./pos-messages"

export function usePosPayment(
  cartItems: CartItem[],
  posPricing: PosPricingConfig | undefined,
  pricingModeOverride: PriceModeOverride,
) {
  const payments = usePaymentState()
  const customers = useCustomerSearch(payments.documentType)

  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [customerDialogMode, setCustomerDialogMode] =
    useState<"create" | "edit">("create")

  const {
    customerQuery,
    setCustomerQuery,
    customerResults,
    loadingCustomers,
    customerPickerOpen,
    setCustomerPickerOpen,
    highlightedCustomerIndex,
    setHighlightedCustomerIndex,
    selectedCustomer,
    setSelectedCustomer,
    selectCustomer: rawSelectCustomer,
    handleCustomerSaved: rawHandleCustomerSaved,
  } = customers

  const {
    documentType,
    setDocumentType,
    paymentMethod,
    setPaymentMethod,
    paymentMode,
    setPaymentMode,
    singleReference,
    setSingleReference,
    mixedPayments,
    setMixedPayments,
    saleDiscount,
    setSaleDiscount,
    discountModalOpen,
    setDiscountModalOpen,
  } = payments

  const totals = useMemo(
    () =>
      calculateSalePreview(
        cartItems,
        documentType,
        saleDiscount,
        posPricing,
        pricingModeOverride,
      ),
    [cartItems, documentType, posPricing, pricingModeOverride, saleDiscount],
  )

  const saleDiscountError = useMemo(() => {
    if (saleDiscount.mode === "none" || cartItems.length === 0) return null
    const discountValue = parseAmountInput(saleDiscount.value)
    if (discountValue === null || discountValue <= 0) {
      return POS.discount.valueError
    }
    if (saleDiscount.mode === "percent" && discountValue > 100) {
      return POS.discount.percentError
    }
    if (saleDiscount.mode === "amount" && discountValue > totals.baseSubtotal) {
      return POS.discount.amountError
    }
    if (totals.total <= 0) return POS.summaryStatus.totalZero
    if (!trimOrNull(saleDiscount.reason)) return POS.discount.reasonError
    return null
  }, [cartItems.length, saleDiscount, totals.baseSubtotal, totals.total])

  const mixedPaymentsPreview = useMemo(() => {
    if (paymentMode !== "mixed") {
      return {
        payments: [] as { method: string; amount: number | null; reference: string | null }[],
        enteredTotal: totals.total,
        difference: 0,
        error: null as string | null,
      }
    }

    const normalizedPayments = mixedPayments.map((payment) => ({
      ...payment,
      amountValue: parseAmountInput(payment.amount),
      methodIsValid: PAYMENT_METHODS.some((method) => method.value === payment.method),
    }))
    const positivePayments = normalizedPayments.filter(
      (payment) => payment.amountValue !== null && payment.amountValue > 0,
    )
    const hasEmptyMethodWithAmount = normalizedPayments.some(
      (payment) =>
        String(payment.amount || "").trim() !== "" &&
        !String(payment.method || "").trim(),
    )
    const enteredTotal = round2(
      positivePayments.reduce(
        (accumulator, payment) => accumulator + (payment.amountValue as number),
        0,
      ),
    )
    const difference = round2(totals.total - enteredTotal)
    let errorMessage: string | null = null

    if (cartItems.length > 0) {
      if (positivePayments.length < 2) {
        errorMessage = POS.validation.mixedMinTwoPayments
      } else if (hasEmptyMethodWithAmount) {
        errorMessage = POS.validation.mixedSelectMethod
      } else if (normalizedPayments.some((payment) => !payment.methodIsValid)) {
        errorMessage = POS.validation.mixedReviewMethods
      } else if (
        normalizedPayments.some(
          (payment) =>
            String(payment.amount || "").trim() !== "" &&
            payment.amountValue === null,
        )
      ) {
        errorMessage = POS.validation.mixedReviewAmounts
      } else if (Math.abs(difference) >= 0.01) {
        errorMessage =
          difference > 0
            ? POS.validation.mixedShortfall(difference.toFixed(2))
            : POS.validation.mixedExcess(Math.abs(difference).toFixed(2))
      }
    }

    return {
      payments: positivePayments.map((payment) => ({
        method: payment.method,
        amount: payment.amountValue,
        reference: trimOrNull(payment.reference),
      })),
      enteredTotal,
      difference,
      error: errorMessage,
    }
  }, [cartItems.length, mixedPayments, paymentMode, totals.total])

  const customerIsValid = isCustomerValidForDocumentType(selectedCustomer, documentType)

  const customerStepReady =
    Boolean(selectedCustomer?.customer_id) && customerIsValid
  const canEditSelectedCustomer = Boolean(selectedCustomer?.customer_id)
  const activeDocumentOption =
    DOC_TYPES.find((docType) => docType.value === documentType) || DOC_TYPES[0]
  const paymentSummaryLabel =
    paymentMode === "mixed"
      ? POS.paymentLine.linesOfPayment(mixedPaymentsPreview.payments.length || mixedPayments.length)
      : getPaymentMethodLabel(paymentMethod)
  const selectedCustomerName = buildCustomerDisplayName(selectedCustomer)
  const selectedCustomerDocument = buildCustomerDocument(selectedCustomer)

  const previewWholesaleApplies = shouldApplyWholesalePreview(
    cartItems,
    posPricing,
  )

  const singlePaymentMissingMethod =
    cartItems.length > 0 && paymentMode === "single" && !paymentMethod.trim()

  function setPaymentModeWithDefaults(nextMode: "single" | "mixed") {
    setPaymentMode(nextMode)
    if (nextMode === "mixed") {
      setMixedPayments((current) =>
        current.length > 0
          ? current
          : createDefaultMixedPayments(totals.total, paymentMethod),
      )
    }
  }

  function updateMixedPaymentDraft(
    draftId: string,
    field: "method" | "amount" | "reference",
    value: string,
  ) {
    setMixedPayments((current) => {
      const next = current.map((payment) =>
        payment.id === draftId ? { ...payment, [field]: value } : payment,
      )

      if (field !== "amount" || totals.total <= 0) return next

      const editedIndex = next.findIndex((payment) => payment.id === draftId)
      const targetIndex = next.findIndex(
        (payment, index) =>
          index !== editedIndex &&
          (next.length === 2 ||
            String(payment.amount || "").trim() === "" ||
            Math.abs((parseAmountInput(payment.amount) || 0) - totals.total) < 0.01),
      )

      if (targetIndex === -1) return next

      const assignedWithoutTarget = next.reduce((accumulator, payment, index) => {
        if (index === targetIndex) return accumulator
        return accumulator + (parseAmountInput(payment.amount) || 0)
      }, 0)
      const remaining = round2(totals.total - assignedWithoutTarget)

      return next.map((payment, index) =>
        index === targetIndex
          ? { ...payment, amount: remaining > 0 ? remaining.toFixed(2) : "" }
          : payment,
      )
    })
  }

  function addMixedPaymentDraft() {
    setMixedPayments((current) => [...current, createPaymentDraft("", "")])
  }

  function removeMixedPaymentDraft(draftId: string) {
    setMixedPayments((current) =>
      current.length <= 2
        ? current
        : current.filter((payment) => payment.id !== draftId),
    )
  }

  function openDiscountModal() {
    setDiscountModalOpen(true)
  }

  function closeDiscountModal() {
    setDiscountModalOpen(false)
  }

  function applyDiscountDraft(discount: SaleDiscountState) {
    const previousTotal = totals.total
    const nextTotals = calculateSalePreview(
      cartItems,
      documentType,
      discount,
      posPricing,
      pricingModeOverride,
    )
    const totalChanged = Math.abs(round2(nextTotals.total - previousTotal)) >= 0.01

    if (paymentMode === "mixed" && totalChanged) {
      setMixedPayments((current) =>
        current.map((payment) => ({
          ...payment,
          amount: "",
          reference: "",
        })),
      )
      showInfo(
        POS.toast.mixedResetTitle,
        POS.toast.mixedResetDesc,
      )
    }

    setSaleDiscount(discount)
    setDiscountModalOpen(false)
  }

  function openCustomerDialog(mode: "create" | "edit") {
    setCustomerDialogMode(mode)
    setCustomerDialogOpen(true)
  }

  function closeCustomerDialog() {
    setCustomerDialogOpen(false)
  }

  function handleCustomerSaved(customer: PosCustomer) {
    rawHandleCustomerSaved(customer)
    closeCustomerDialog()
  }

  function selectCustomer(customer: PosCustomer | null) {
    rawSelectCustomer(customer)
  }

  useEffect(() => {
    if (paymentMode === "mixed" && mixedPayments.length === 0) {
      void Promise.resolve().then(() =>
        setMixedPayments(createDefaultMixedPayments(totals.total, paymentMethod)),
      )
    }
  }, [mixedPayments.length, paymentMethod, paymentMode, setMixedPayments, totals.total])

  return {
    documentType,
    setDocumentType,
    paymentMethod,
    setPaymentMethod,
    paymentMode,
    singleReference,
    setSingleReference,
    mixedPayments,
    saleDiscount,
    discountModalOpen,
    setDiscountModalOpen,
    customerQuery,
    setCustomerQuery,
    customerResults,
    loadingCustomers,
    customerPickerOpen,
    setCustomerPickerOpen,
    highlightedCustomerIndex,
    setHighlightedCustomerIndex,
    selectedCustomer,
    customerDialogOpen,
    setCustomerDialogOpen,
    customerDialogMode,
    totals,
    saleDiscountError,
    mixedPaymentsPreview,
    customerIsValid,
    customerStepReady,
    canEditSelectedCustomer,
    activeDocumentOption,
    paymentSummaryLabel,
    selectedCustomerName,
    selectedCustomerDocument,
    previewWholesaleApplies,
    singlePaymentMissingMethod,
    setPaymentModeWithDefaults,
    updateMixedPaymentDraft,
    addMixedPaymentDraft,
    removeMixedPaymentDraft,
    openDiscountModal,
    closeDiscountModal,
    applyDiscountDraft,
    openCustomerDialog,
    closeCustomerDialog,
    handleCustomerSaved,
    selectCustomer,
    setSelectedCustomer,
    setPaymentMode,
    setMixedPayments,
    setSaleDiscount,
  }
}