"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { useAuth } from "@/components/auth/AuthProvider"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcut"
import { apiFetch } from "@/lib/api"
import { showError, showInfo, showSuccess } from "@/lib/toast"

import {
  DOC_TYPES,
  PAYMENT_METHODS,
} from "./pos-types"
import type {
  ConfirmedSale,
  PosCustomer,
  SaleDiscountState,
  SaleVariant,
  SearchableStyle,
  Stage,
} from "./pos-types"
import {
  buildCustomerDisplayName,
  buildCustomerDocument,
  buildVariantTone,
  calculateSalePreview,
  createDefaultMixedPayments,
  createPaymentDraft,
  explainApiError,
  getPaymentMethodLabel,
  isCustomerValidForDocumentType,
  parseAmountInput,
  round2,
  shouldApplyWholesalePreview,
  trimOrNull,
} from "./pos-utils"
import { useCart } from "./use-cart"
import { useCashContext } from "./use-cash-context"
import { useCustomerSearch } from "./use-customer-search"
import { usePaymentState } from "./use-payment-state"
import { useProductSearch } from "./use-product-search"

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
  const [pulseStage, setPulseStage] = useState<Stage | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmedSale, setConfirmedSale] = useState<ConfirmedSale | null>(null)
  const [saleConfirmationOpen, setSaleConfirmationOpen] = useState(false)
  const [saleReviewOpen, setSaleReviewOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      return "Ingresa un descuento valido."
    }
    if (saleDiscount.mode === "percent" && discountValue > 100) {
      return "El descuento porcentual no puede superar 100%."
    }
    if (saleDiscount.mode === "amount" && discountValue > totals.baseSubtotal) {
      return "El descuento no puede superar el subtotal base."
    }
    if (totals.total <= 0) return "El total final debe ser mayor a cero."
    if (!trimOrNull(saleDiscount.reason)) return "Ingresa el motivo del descuento."
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
        errorMessage = "Distribuye el cobro en al menos dos pagos."
      } else if (hasEmptyMethodWithAmount) {
        errorMessage = "Selecciona el metodo en cada linea de pago."
      } else if (normalizedPayments.some((payment) => !payment.methodIsValid)) {
        errorMessage = "Revisa los metodos del pago mixto."
      } else if (
        normalizedPayments.some(
          (payment) =>
            String(payment.amount || "").trim() !== "" &&
            payment.amountValue === null,
        )
      ) {
        errorMessage = "Revisa los montos del pago mixto."
      } else if (Math.abs(difference) >= 0.01) {
        errorMessage =
          difference > 0
            ? `Faltan S/. ${difference.toFixed(2)} por asignar.`
            : `El pago excede el total por S/. ${Math.abs(difference).toFixed(2)}.`
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
      ? `${mixedPaymentsPreview.payments.length || mixedPayments.length} lineas de pago`
      : getPaymentMethodLabel(paymentMethod)
  const selectedCustomerName = buildCustomerDisplayName(selectedCustomer)
  const selectedCustomerDocument = buildCustomerDocument(selectedCustomer)
  const singlePaymentMissingMethod =
    cartItems.length > 0 && paymentMode === "single" && !paymentMethod.trim()
  const hasDraftSale =
    !confirmedSale &&
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

  const summaryStatusMessage = (() => {
    if (!defaultLocation?.location_id) return "Asigna una sede operativa antes de vender."
    if (posContextLoading) return "Validando sede y caja operativa..."
    if (!cashReady) {
      return (
        posContext?.cash?.message ||
        "La venta no se puede registrar hasta que se abra una caja"
      )
    }
    if (cartItems.length === 0) return "Agrega al menos un producto."
    if (totals.hasMissingPrice) return "Hay items sin precio vigente."
    if (saleDiscountError) return saleDiscountError
    if (singlePaymentMissingMethod) return "Selecciona un metodo de pago."
    if (mixedPaymentsPreview.error) return mixedPaymentsPreview.error
    if (!selectedCustomer) return "Selecciona un cliente o crea uno con el boton."
    if (!customerIsValid) return "Revisa cliente y comprobante."
    return "Venta lista para confirmar."
  })()

  const submitDisabled =
    cartItems.length === 0 ||
    Boolean(confirmedSale) ||
    !defaultLocation?.location_id ||
    locationsLoading ||
    posContextLoading ||
    !cashReady ||
    totals.hasMissingPrice ||
    Boolean(saleDiscountError) ||
    singlePaymentMissingMethod ||
    Boolean(mixedPaymentsPreview.error) ||
    !customerIsValid ||
    submitting

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

  const priceTargetPreviewItem = useMemo(
    () => totals.items.find((item) => item.variant_id === cart.priceTargetId) || null,
    [cart.priceTargetId, totals.items],
  )

  useKeyboardShortcuts([
    {
      key: "F2",
      handler: () => productSearchInputRef.current?.focus(),
      enabled: !submitting,
    },
    {
      key: "F4",
      handler: () => customerSearchInputRef.current?.focus(),
      enabled: !submitting,
    },
    {
      key: "F8",
      handler: () => {
        if (!submitDisabled) openSaleReview()
      },
      enabled: !submitting,
    },
    {
      key: "Escape",
      handler: () => {
        setProductPickerOpen(false)
        setCustomerPickerOpen(false)
      },
      enabled: true,
    },
  ])

  function pulse(stage: Stage) {
    setPulseStage(stage)
    window.setTimeout(() => setPulseStage(null), 850)
  }

  function goToStage(stage: Stage) {
    pulse(stage)
    const ref =
      stage === "products"
        ? productSectionRef
        : stage === "customer"
          ? customerSectionRef
          : paymentSectionRef
    window.requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      ref.current?.focus?.()
    })
  }

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
        productSearchInputRef.current?.focus()
        return
      }
    }

    setProductConfigOpen(true)
  }

  function closeProductConfigModal() {
    setProductConfigOpen(false)
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
        "Cobro mixto reiniciado",
        "El total cambio. Reingresa los montos del pago mixto.",
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

  async function printConfirmedSaleReceipt(saleId: string) {
    window.open(`/api/sales/${saleId}/receipt-pdf`, "_blank")
  }

  function startNextSale() {
    resetSaleDraft()
    productSearchInputRef.current?.focus()
  }

  function resetSaleDraft() {
    setConfirmedSale(null)
    setSaleConfirmationOpen(false)
    setSaleReviewOpen(false)
    setCart([])
    setSelectedCustomer(null)
    setDocumentType("none")
    setPaymentMethod("")
    setPaymentMode("single")
    setSingleReference("")
    setMixedPayments(createDefaultMixedPayments(0, ""))
    setSaleDiscount({ mode: "none", value: "", reason: "" })
    setPricingModeOverride("auto")
    setError(null)
    closePriceSheet()
    closeRemoveItemConfirm()
  }

  function openSaleReview() {
    if (submitDisabled) return
    setSaleReviewOpen(true)
  }

  function closeSaleReview() {
    setSaleReviewOpen(false)
  }

  async function confirmSale() {
    if (submitDisabled) return
    setSubmitting(true)
    setError(null)
    setSaleReviewOpen(false)

    try {
      const payload: Record<string, unknown> = {
        customer_id: selectedCustomer?.customer_id || null,
        document_type: documentType,
        items: cartItems.map((item) => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
          ...(item.price_override
            ? {
                price_override: {
                  unit_price_final: item.price_override.unit_price_final,
                  reason: item.price_override.reason,
                },
              }
            : {}),
        })),
      }

      if (totals.saleDiscountAmount > 0) {
        payload.sale_discount = {
          mode: saleDiscount.mode,
          value: parseAmountInput(saleDiscount.value),
          reason: trimOrNull(saleDiscount.reason),
        }
      }

      if (paymentMode === "mixed") {
        payload.payments = mixedPaymentsPreview.payments
      } else {
        payload.payment_method = paymentMethod
        if (trimOrNull(singleReference)) payload.payment_reference = trimOrNull(singleReference)
      }

      const sale = (await apiFetch("/api/sales", {
        method: "POST",
        body: JSON.stringify(payload),
      })) as ConfirmedSale

      setConfirmedSale(sale)
      setSaleConfirmationOpen(true)
      setCustomerQuery("")
      setDiscountModalOpen(false)
      await refreshPosContext()
      showSuccess("Venta confirmada", sale.sale_number ? `#${sale.sale_number}` : "Exitosa")
    } catch (submitError) {
      const message = explainApiError(submitError, "No se pudo confirmar la venta.")
      setError(message)
      showError("Error al confirmar venta", message)
      await refreshPosContext()
    } finally {
      setSubmitting(false)
    }
  }

  return {
    defaultLocation,
    locationsLoading,
    has,
    customerSectionRef,
    productSectionRef,
    paymentSectionRef,
    productSearchInputRef,
    customerSearchInputRef,
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
    pulseStage,
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
    submitting,
    confirmedSale,
    saleConfirmationOpen,
    setSaleConfirmationOpen,
    saleReviewOpen,
    setSaleReviewOpen,
    error: error || productError,
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
    summaryStatusMessage,
    submitDisabled,
    hasDraftSale,
    cartCount,
    customerStepReady,
    canEditSelectedCustomer,
    activeDocumentOption,
    paymentSummaryLabel,
    selectedCustomerName,
    selectedCustomerDocument,
    printConfirmedSaleReceipt,
    startNextSale,
    resetSaleDraft,
    openSaleReview,
    closeSaleReview,
    goToStage,
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
    confirmSale,
    handleOpenCash,
    handleReopenCash,
  }
}
