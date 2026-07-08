"use client"

import { useEffect, useMemo, useState } from "react"

import type {
  SearchableStyle,
} from "./pos-types"
import {
  buildVariantTone,
  createDefaultMixedPayments,
} from "./pos-utils"
import { deriveSummaryState } from "./pos-summary-utils"
import { useSaleConfirmation } from "./use-sale-confirmation"
import { useSaleKeyboard } from "./use-sale-keyboard"
import { usePosCart } from "./use-pos-cart"
import { usePosPayment } from "./use-pos-payment"
import { usePosSession } from "./use-pos-session"

export function usePosSale() {
  const {
    defaultLocation,
    locationsLoading,
    has,
    refs,
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
  } = usePosSession()

  const {
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
    searchableStyles,
    pricingModeOverride,
    setPricingModeOverride,
    productError,
    rawSelectProductStyle,
    cartItems,
    setCart,
    cartCount,
    priceSheetOpen,
    priceTargetId,
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
  } = usePosCart()

  const payment = usePosPayment(cartItems, posContext?.pricing, pricingModeOverride)

  const {
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
  } = payment

  const [productConfigOpen, setProductConfigOpen] = useState(false)

  const selectedVariantAutoPrice =
    selectedVariant && totals.priceMode === "wholesale"
      ? selectedVariant.wholesale_price ?? selectedVariant.retail_price
      : selectedVariant?.retail_price ?? selectedVariant?.wholesale_price

  const selectedVariantPriceTone = buildVariantTone(
    totals.priceMode === "wholesale" &&
      selectedVariant?.wholesale_price !== null &&
      selectedVariant?.wholesale_price !== undefined,
  )

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
    productSearchInputRef: refs.productSearchInputRef,
    customerSearchInputRef: refs.customerSearchInputRef,
    productSectionRef: refs.productSectionRef,
    customerSectionRef: refs.customerSectionRef,
    paymentSectionRef: refs.paymentSectionRef,
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

  const priceTargetPreviewItem = useMemo(
    () => totals.items.find((item) => item.variant_id === priceTargetId) || null,
    [priceTargetId, totals.items],
  )

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

  function addSelectedVariantToCart(variant: import("./pos-types").SaleVariant, quantity = 1) {
    addToCart(variant, quantity)
  }

  function resetSaleDraft() {
    confirm.startNextSale()
    refs.productSearchInputRef.current?.focus()
  }

  return {
    defaultLocation,
    locationsLoading,
    has,
    refs,
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