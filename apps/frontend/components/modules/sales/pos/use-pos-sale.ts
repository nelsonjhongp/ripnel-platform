"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { useAuth } from "@/components/auth/AuthProvider"
import { showInfo } from "@/lib/toast"

import {
  DOC_TYPES,
  PAYMENT_METHODS,
} from "./pos-types"
import type {
  PosCustomer,
  SaleDiscountState,
  SaleVariant,
  SearchableStyle,
} from "./pos-types"
import {
  buildVariantTone,
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
import { deriveSummaryState } from "./pos-summary-utils"
import { useCart } from "./use-cart"
import { useCashContext } from "./use-cash-context"
import { useCustomerSearch } from "./use-customer-search"
import { usePaymentState } from "./use-payment-state"
import { useProductSearch } from "./use-product-search"
import { useSaleKeyboard } from "./use-sale-keyboard"
import { useSaleConfirmation } from "./use-sale-confirmation"
import { POS } from "./pos-messages"

export function usePosSale() {
  const { defaultLocation, locationsLoading, has } = useAuth()
  const customerSectionRef = useRef<HTMLElement | null>(null)
  const productSectionRef = useRef<HTMLElement | null>(null)
  const paymentSectionRef = useRef<HTMLElement | null>(null)
  const productSearchInputRef = useRef<HTMLInputElement | null>(null)
  const customerSearchInputRef = useRef<HTMLInputElement | null>(null)

  const cash = useCashContext(defaultLocation?.location_id, has)
  const products = useProductSearch(defaultLocation?.location_id)
  const payments = usePaymentState()
  const customers = useCustomerSearch(payments.documentType)
  const cart = useCart()

  const {
    posContext,
    posContextLoading,
    posContextError,
    cashReady,
    cashStatus,
    canOpenCashModule,
    canReopenCash,
    refreshPosContext,
    cashOpenDialogOpen,
    setCashOpenDialogOpen,
    openingCash,
    reopenCashDialogOpen,
    setReopenCashDialogOpen,
    reopenNotes,
    setReopenNotes,
    reopeningCash,
    handleOpenCash,
    handleReopenCash,
  } = cash

  const {
    query,
    setQuery,
    loadingVariants,
    productPickerOpen,
    setProductPickerOpen,
    highlightedProductIndex,
    setHighlightedProductIndex,
    selectedProductStyle,
    searchableStyles,
    pricingModeOverride,
    setPricingModeOverride,
    selectedSizeCode,
    setSelectedSizeCode,
    selectedColorCode,
    setSelectedColorCode,
    selectedVariant,
    error: productError,
    selectProductStyle: rawSelectProductStyle,
  } = products

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

  const {
    cart: cartItems,
    setCart,
    cartCount,
    priceSheetOpen,
    priceTargetItem,
    pendingRemoveVariantId,
    pendingRemoveItem,
    addToCart,
    updateQty,
    removeFromCart,
    closeRemoveItemConfirm,
    confirmRemoveFromCart,
    openPriceSheet,
    closePriceSheet,
    submitPriceAdjustment,
    clearPriceAdjustment,
  } = cart

  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [customerDialogMode, setCustomerDialogMode] =
    useState<"create" | "edit">("create")
  const [productConfigOpen, setProductConfigOpen] = useState(false)

  const totals = useMemo(
    () =>
      calculateSalePreview(
        cartItems,
        documentType,
        saleDiscount,
        posContext?.pricing,
        pricingModeOverride,
      ),
    [cartItems, documentType, posContext?.pricing, pricingModeOverride, saleDiscount],
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
        payments: [],
        enteredTotal: totals.total,
        difference: 0,
        error: null,
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

  const selectedVariantAutoPrice =
    selectedVariant && totals.priceMode === "wholesale"
      ? selectedVariant.wholesale_price ?? selectedVariant.retail_price
      : selectedVariant?.retail_price ?? selectedVariant?.wholesale_price

  const selectedVariantPriceTone = buildVariantTone(
    totals.priceMode === "wholesale" &&
      selectedVariant?.wholesale_price !== null &&
      selectedVariant?.wholesale_price !== undefined,
  )

  const previewWholesaleApplies = shouldApplyWholesalePreview(
    cartItems,
    posContext?.pricing,
  )

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

  const priceTargetPreviewItem = useMemo(
    () => totals.items.find((item) => item.variant_id === cart.priceTargetId) || null,
    [cart.priceTargetId, totals.items],
  )

  const singlePaymentMissingMethod =
    cartItems.length > 0 && paymentMode === "single" && !paymentMethod.trim()

  const submitDisabledBeforeConfirm =
    cartItems.length === 0 ||
    !defaultLocation?.location_id ||
    locationsLoading ||
    posContextLoading ||
    !cashReady ||
    totals.hasMissingPrice ||
    Boolean(saleDiscountError) ||
    singlePaymentMissingMethod ||
    Boolean(mixedPaymentsPreview.error) ||
    !customerIsValid

  const confirm = useSaleConfirmation({
    cartItems,
    selectedCustomer,
    documentType,
    paymentMode,
    paymentMethod,
    singleReference,
    mixedPaymentsPreview: {
      payments: mixedPaymentsPreview.payments,
      error: mixedPaymentsPreview.error,
    },
    totals: { saleDiscountAmount: totals.saleDiscountAmount, total: totals.total },
    saleDiscount,
    submitDisabled: submitDisabledBeforeConfirm,
    refreshPosContext,
    onReset: () => {
      setCart([])
      setSelectedCustomer(null)
      setDocumentType("none")
      setPaymentMethod("")
      setPaymentMode("single")
      setSingleReference("")
      setMixedPayments(createDefaultMixedPayments(0, ""))
      setSaleDiscount({ mode: "none", value: "", reason: "" })
      setPricingModeOverride("auto")
      closePriceSheet()
      closeRemoveItemConfirm()
    },
    onConfirmed: () => {
      setCustomerQuery("")
      setDiscountModalOpen(false)
    },
  })

  const submitDisabled =
    submitDisabledBeforeConfirm ||
    Boolean(confirm.confirmedSale) ||
    confirm.submitting

  const keyboard = useSaleKeyboard({
    productSearchInputRef,
    customerSearchInputRef,
    productSectionRef,
    customerSectionRef,
    paymentSectionRef,
    submitDisabled,
    submitting: confirm.submitting,
    onReviewSale: confirm.openSaleReview,
    onCloseProductPicker: () => setProductPickerOpen(false),
    onCloseCustomerPicker: () => setCustomerPickerOpen(false),
  })

  const hasDraftSale =
    !confirm.confirmedSale &&
    (
      cartItems.length > 0 ||
      Boolean(selectedCustomer) ||
      documentType !== "none" ||
      paymentMode !== "single" ||
      Boolean(paymentMethod.trim()) ||
      Boolean(singleReference.trim()) ||
      mixedPayments.some((payment) =>
        Boolean(
          payment.method.trim() ||
            payment.amount.trim() ||
            payment.reference.trim(),
        ),
      ) ||
      saleDiscount.mode !== "none"
    )

  const derivedSummary = useMemo(
    () =>
      deriveSummaryState({
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
        submitting: confirm.submitting,
      }),
    [
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
      confirm.submitting,
    ],
  )

  useEffect(() => {
    if (!hasDraftSale) return
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", warnBeforeUnload)
    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [hasDraftSale])

  useEffect(() => {
    if (paymentMode === "mixed" && mixedPayments.length === 0) {
      void Promise.resolve().then(() =>
        setMixedPayments(createDefaultMixedPayments(totals.total, paymentMethod)),
      )
    }
  }, [mixedPayments.length, paymentMethod, paymentMode, setMixedPayments, totals.total])

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

  function selectProductStyle(style: SearchableStyle | null) {
    rawSelectProductStyle(style)

    if (!style) return

    const variants = style.variants || []

    if (variants.length === 1) {
      const single = variants[0]
      const hasPrice =
        single.retail_price !== null || single.wholesale_price !== null
      if (hasPrice && single.stock > 0) {
        addToCart(single, 1)
        return
      }
    }

    setProductConfigOpen(true)
  }

  function closeProductConfigModal() {
    setProductConfigOpen(false)
    rawSelectProductStyle(null)
  }

  function addSelectedVariantToCart(variant: SaleVariant, quantity = 1) {
    addToCart(variant, quantity)
  }

  function selectCustomer(customer: PosCustomer | null) {
    rawSelectCustomer(customer)
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
      posContext?.pricing,
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

  function resetSaleDraft() {
    confirm.startNextSale()
    productSearchInputRef.current?.focus()
  }

  return {
    defaultLocation,
    locationsLoading,
    has,
    refs: {
      customerSectionRef,
      productSectionRef,
      paymentSectionRef,
      productSearchInputRef,
      customerSearchInputRef,
    },
    query,
    setQuery,
    loadingVariants,
    productPickerOpen,
    setProductPickerOpen,
    highlightedProductIndex,
    setHighlightedProductIndex,
    selectedProductStyle,
    selectedSizeCode,
    setSelectedSizeCode,
    selectedColorCode,
    setSelectedColorCode,
    selectedVariant,
    selectedVariantAutoPrice,
    selectedVariantPriceTone,
    pricingModeOverride,
    setPricingModeOverride,
    cart: cartItems,
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
    posContext,
    posContextLoading,
    posContextError,
    customerDialogOpen,
    setCustomerDialogOpen,
    customerDialogMode,
    priceSheetOpen,
    productConfigOpen,
    setProductConfigOpen,
    pulseStage: keyboard.pulseStage,
    priceTargetItem,
    priceTargetPreviewItem,
    pendingRemoveItem,
    pendingRemoveVariantId,
    cashOpenDialogOpen,
    setCashOpenDialogOpen,
    openingCash,
    reopenCashDialogOpen,
    setReopenCashDialogOpen,
    reopenNotes,
    setReopenNotes,
    reopeningCash,
    submitting: confirm.submitting,
    confirmedSale: confirm.confirmedSale,
    saleConfirmationOpen: confirm.saleConfirmationOpen,
    setSaleConfirmationOpen: confirm.setSaleConfirmationOpen,
    saleReviewOpen: confirm.saleReviewOpen,
    setSaleReviewOpen: confirm.setSaleReviewOpen,
    error: confirm.error || productError,
    searchableStyles,
    effectivePreviewPriceMode: totals.priceMode,
    previewWholesaleApplies,
    totals,
    mixedPaymentsPreview,
    customerIsValid,
    cashReady,
    cashStatus,
    canOpenCashModule,
    canReopenCash,
    derivedSummary,
    submitDisabled,
    hasDraftSale,
    cartCount,
    customerStepReady,
    canEditSelectedCustomer,
    activeDocumentOption,
    paymentSummaryLabel,
    selectedCustomerName,
    selectedCustomerDocument,
    printConfirmedSaleReceipt: confirm.printConfirmedSaleReceipt,
    startNextSale: confirm.startNextSale,
    resetSaleDraft,
    openSaleReview: confirm.openSaleReview,
    closeSaleReview: confirm.closeSaleReview,
    goToStage: keyboard.goToStage,
    setPaymentModeWithDefaults,
    updateMixedPaymentDraft,
    addMixedPaymentDraft,
    removeMixedPaymentDraft,
    openPriceSheet,
    closePriceSheet,
    submitPriceAdjustment,
    clearPriceAdjustment,
    closeRemoveItemConfirm,
    confirmRemoveFromCart,
    closeProductConfigModal,
    addSelectedVariantToCart,
    addToCart,
    updateQty,
    removeFromCart,
    selectProductStyle,
    selectCustomer,
    openDiscountModal,
    closeDiscountModal,
    applyDiscountDraft,
    openCustomerDialog,
    closeCustomerDialog,
    handleCustomerSaved,
    confirmSale: confirm.confirmSale,
    handleOpenCash,
    handleReopenCash,
  }
}
