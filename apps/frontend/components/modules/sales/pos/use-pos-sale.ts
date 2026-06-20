"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useAuth } from "@/components/auth/AuthProvider"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcut"
import { apiFetch, unwrapApiData } from "@/lib/api"
import { showError, showInfo, showSuccess } from "@/lib/toast"

import {
  DOC_TYPES,
  PAYMENT_METHODS,
} from "./pos-types"
import type {
  CartItem,
  ConfirmedSale,
  PaymentDraft,
  PosContext,
  PosCustomer,
  PreviewItem,
  PriceModeOverride,
  SaleDiscountState,
  SaleVariant,
  SearchableStyle,
  Stage,
} from "./pos-types"
import {
  buildCustomerDisplayName,
  buildCustomerDocument,
  buildProductSearchResults,
  buildVariantTone,
  calculateSalePreview,
  createDefaultMixedPayments,
  createPaymentDraft,
  explainApiError,
  filterCustomersByDocumentType,
  findVariantByAttributes,
  getCustomerSearchFilter,
  getPaymentMethodLabel,
  getVariantOptionValues,
  groupVariantsByStyle,
  isCustomerValidForDocumentType,
  parseAmountInput,
  replaceCustomerInResults,
  round2,
  shouldApplyWholesalePreview,
  trimOrNull,
} from "./pos-utils"

export function usePosSale() {
  const { defaultLocation, locationsLoading, has } = useAuth()
  const customerSectionRef = useRef<HTMLElement | null>(null)
  const productSectionRef = useRef<HTMLElement | null>(null)
  const paymentSectionRef = useRef<HTMLElement | null>(null)
  const productSearchInputRef = useRef<HTMLInputElement | null>(null)
  const customerSearchInputRef = useRef<HTMLInputElement | null>(null)

  const [query, setQuery] = useState("")
  const [variants, setVariants] = useState<SaleVariant[]>([])
  const [loadingVariants, setLoadingVariants] = useState(false)
  const [productPickerOpen, setProductPickerOpen] = useState(false)
  const [highlightedProductIndex, setHighlightedProductIndex] = useState(0)
  const [selectedProductStyle, setSelectedProductStyle] =
    useState<SearchableStyle | null>(null)
  const [selectedSizeCode, setSelectedSizeCode] = useState("")
  const [selectedColorCode, setSelectedColorCode] = useState("")
  const [pricingModeOverride, setPricingModeOverride] =
    useState<PriceModeOverride>("auto")
  const [cart, setCart] = useState<CartItem[]>([])

  const [documentType, setDocumentType] = useState("none")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [paymentMode, setPaymentMode] = useState<"single" | "mixed">("single")
  const [singleReference, setSingleReference] = useState("")
  const [mixedPayments, setMixedPayments] = useState<PaymentDraft[]>(() =>
    createDefaultMixedPayments(0, ""),
  )
  const [saleDiscount, setSaleDiscount] = useState<SaleDiscountState>({
    mode: "none",
    value: "",
    reason: "",
  })
  const [discountModalOpen, setDiscountModalOpen] = useState(false)

  const [customerQuery, setCustomerQuery] = useState("")
  const [customerResults, setCustomerResults] = useState<PosCustomer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false)
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(0)
  const [selectedCustomer, setSelectedCustomer] = useState<PosCustomer | null>(null)

  const [posContext, setPosContext] = useState<PosContext | null>(null)
  const [posContextLoading, setPosContextLoading] = useState(false)
  const [posContextError, setPosContextError] = useState<string | null>(null)

  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [customerDialogMode, setCustomerDialogMode] =
    useState<"create" | "edit">("create")
  const [priceSheetOpen, setPriceSheetOpen] = useState(false)
  const [productConfigOpen, setProductConfigOpen] = useState(false)
  const [pulseStage, setPulseStage] = useState<Stage | null>(null)
  const [priceTargetId, setPriceTargetId] = useState<string | null>(null)
  const [pendingRemoveVariantId, setPendingRemoveVariantId] = useState<string | null>(null)
  const [cashOpenDialogOpen, setCashOpenDialogOpen] = useState(false)
  const [openingCash, setOpeningCash] = useState(false)
  const [reopenCashDialogOpen, setReopenCashDialogOpen] = useState(false)
  const [reopenNotes, setReopenNotes] = useState("")
  const [reopeningCash, setReopeningCash] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmedSale, setConfirmedSale] = useState<ConfirmedSale | null>(null)
  const [saleConfirmationOpen, setSaleConfirmationOpen] = useState(false)
  const [saleReviewOpen, setSaleReviewOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshPosContext = useCallback(async () => {
    if (!defaultLocation?.location_id) {
      setPosContext(null)
      setPosContextError(null)
      return
    }

    setPosContextLoading(true)
    setPosContextError(null)

    try {
      const context = (await apiFetch("/api/sales/context", {
        cache: "no-store",
      })) as PosContext
      setPosContext(context)
    } catch (fetchError) {
      setPosContext(null)
      setPosContextError(
        explainApiError(fetchError, "No se pudo validar la caja operativa."),
      )
    } finally {
      setPosContextLoading(false)
    }
  }, [defaultLocation?.location_id])



  useEffect(() => {
    void Promise.resolve().then(() => refreshPosContext())
  }, [refreshPosContext])

  useEffect(() => {
    if (!defaultLocation?.location_id) {
      void Promise.resolve().then(() => {
        setVariants([])
        setProductPickerOpen(false)
        setSelectedProductStyle(null)
      })
      return
    }

    let active = true
    const timeoutId = window.setTimeout(async () => {
      setLoadingVariants(true)

      try {
        const params = new URLSearchParams()
        if (query.trim()) params.set("q", query.trim())
        const path = params.toString()
          ? `/api/sales/sellable-variants?${params.toString()}`
          : "/api/sales/sellable-variants"
        const response = await apiFetch(path)

        if (!active) return
        setError(null)
        setVariants(Array.isArray(response) ? response : [])
      } catch (fetchError) {
        if (!active) return
        setVariants([])
        setError(explainApiError(fetchError, "No se pudieron cargar productos."))
      } finally {
        if (active) setLoadingVariants(false)
      }
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timeoutId)
    }
  }, [defaultLocation?.location_id, query])

  useEffect(() => {
    const normalizedCustomerQuery = customerQuery.trim()
    if (!customerPickerOpen && !normalizedCustomerQuery) {
      void Promise.resolve().then(() => {
        setCustomerResults([])
        setLoadingCustomers(false)
      })
      return
    }

    let active = true
    const timeoutId = window.setTimeout(
      async () => {
        setLoadingCustomers(true)

        try {
          const params = new URLSearchParams()
          if (normalizedCustomerQuery) params.set("q", normalizedCustomerQuery)
          const { queryDocumentType } = getCustomerSearchFilter(documentType)
          if (queryDocumentType) params.set("document_type", queryDocumentType)
          const path = params.toString()
            ? `/api/customers?${params.toString()}`
            : "/api/customers"
          const response = await apiFetch(path)
          const customers = unwrapApiData(response)
          const compatibleCustomers = filterCustomersByDocumentType(
            Array.isArray(customers) ? customers : [],
            documentType,
          ).slice(0, normalizedCustomerQuery ? 12 : 24)

          if (active) setCustomerResults(compatibleCustomers)
        } catch {
          if (active) setCustomerResults([])
        } finally {
          if (active) setLoadingCustomers(false)
        }
      },
      normalizedCustomerQuery ? 250 : 0,
    )

    return () => {
      active = false
      window.clearTimeout(timeoutId)
    }
  }, [customerPickerOpen, customerQuery, documentType])

  const styles = useMemo(() => groupVariantsByStyle(variants), [variants])
  const catalogStyles = useMemo(
    () => buildProductSearchResults(styles, ""),
    [styles],
  )
  const searchableStyles = useMemo(
    () => (query.trim() ? buildProductSearchResults(styles, query) : catalogStyles),
    [catalogStyles, query, styles],
  )

  const sizeOptions = useMemo(
    () =>
      getVariantOptionValues(
        selectedProductStyle?.variants || [],
        "size_code",
        selectedColorCode ? { color_code: selectedColorCode } : {},
      ),
    [selectedColorCode, selectedProductStyle?.variants],
  )

  const colorOptions = useMemo(
    () =>
      getVariantOptionValues(
        selectedProductStyle?.variants || [],
        "color_code",
        selectedSizeCode ? { size_code: selectedSizeCode } : {},
      ),
    [selectedProductStyle?.variants, selectedSizeCode],
  )

  const sizeNameMap = useMemo(() => {
    const nextMap = new Map<string, string>()
    for (const variant of selectedProductStyle?.variants || []) {
      const sizeCode = String(variant.size_code || "").trim()
      if (sizeCode && !nextMap.has(sizeCode)) {
        nextMap.set(sizeCode, variant.size_name || sizeCode)
      }
    }
    return nextMap
  }, [selectedProductStyle?.variants])

  const colorNameMap = useMemo(() => {
    const nextMap = new Map<string, string>()
    for (const variant of selectedProductStyle?.variants || []) {
      const colorCode = String(variant.color_code || "").trim()
      if (colorCode && !nextMap.has(colorCode)) {
        nextMap.set(colorCode, variant.color_name || colorCode)
      }
    }
    return nextMap
  }, [selectedProductStyle?.variants])

  const sizeSelectOptions = useMemo(
    () =>
      sizeOptions.map((sizeCode) => ({
        value: sizeCode,
        label: sizeNameMap.get(sizeCode) || sizeCode,
        helper: sizeNameMap.get(sizeCode) !== sizeCode ? sizeCode : undefined,
      })),
    [sizeNameMap, sizeOptions],
  )

  const colorSelectOptions = useMemo(
    () =>
      colorOptions.map((colorCode) => ({
        value: colorCode,
        label: colorNameMap.get(colorCode) || colorCode,
        helper: colorNameMap.get(colorCode) !== colorCode ? colorCode : undefined,
      })),
    [colorNameMap, colorOptions],
  )

  const selectedVariant = useMemo(
    () =>
      findVariantByAttributes(
        selectedProductStyle?.variants || [],
        selectedSizeCode,
        selectedColorCode,
      ),
    [selectedColorCode, selectedProductStyle?.variants, selectedSizeCode],
  )

  useEffect(() => {
    void Promise.resolve().then(() =>
      setHighlightedProductIndex((current) =>
        Math.min(Math.max(current, 0), Math.max(searchableStyles.length - 1, 0)),
      ),
    )
  }, [searchableStyles.length])

  useEffect(() => {
    void Promise.resolve().then(() =>
      setHighlightedCustomerIndex((current) =>
        Math.min(Math.max(current, 0), Math.max(customerResults.length - 1, 0)),
      ),
    )
  }, [customerResults.length])

  useEffect(() => {
    if (!selectedProductStyle?.style_id) return
    const refreshedStyle =
      catalogStyles.find((style) => style.style_id === selectedProductStyle.style_id) ||
      null
    if (refreshedStyle) {
      void Promise.resolve().then(() => setSelectedProductStyle(refreshedStyle))
    }
  }, [catalogStyles, selectedProductStyle?.style_id])

  useEffect(() => {
    if (!selectedProductStyle) {
      void Promise.resolve().then(() => {
        setSelectedSizeCode("")
        setSelectedColorCode("")
      })
      return
    }

    void Promise.resolve().then(() => {
      setSelectedSizeCode((current) => {
        if (current && sizeOptions.includes(current)) return current
        return sizeOptions.length === 1 ? sizeOptions[0] : ""
      })
    })
  }, [selectedProductStyle, sizeOptions])

  useEffect(() => {
    if (!selectedProductStyle) return

    void Promise.resolve().then(() => {
      setSelectedColorCode((current) => {
        if (current && colorOptions.includes(current)) return current
        return colorOptions.length === 1 ? colorOptions[0] : ""
      })
    })
  }, [colorOptions, selectedProductStyle])

  const totals = useMemo(
    () =>
      calculateSalePreview(
        cart,
        documentType,
        saleDiscount,
        posContext?.pricing,
        pricingModeOverride,
      ),
    [cart, documentType, posContext?.pricing, pricingModeOverride, saleDiscount],
  )

  const saleDiscountError = useMemo(() => {
    if (saleDiscount.mode === "none" || cart.length === 0) return null
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
  }, [cart.length, saleDiscount, totals.baseSubtotal, totals.total])

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

    if (cart.length > 0) {
      if (positivePayments.length < 2) {
        errorMessage = "Distribuye el cobro en al menos dos pagos."
      } else if (hasEmptyMethodWithAmount) {
        errorMessage = "Selecciona el método en cada línea de pago."
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
  }, [cart.length, mixedPayments, paymentMode, totals.total])

  const customerIsValid = isCustomerValidForDocumentType(selectedCustomer, documentType)
  const cashReady = posContext?.cash?.sale_enabled === true
  const cashStatus = posContext?.cash?.status || "missing"
  const canOpenCashModule = has("cash.operate")
  const canReopenCash = has("cash.admin.reopen")
  const priceTargetItem = useMemo(
    () => cart.find((item) => item.variant_id === priceTargetId) || null,
    [cart, priceTargetId],
  )
  const priceTargetPreviewItem = useMemo(
    () => totals.items.find((item) => item.variant_id === priceTargetId) || null,
    [priceTargetId, totals.items],
  )
  const pendingRemoveItem = useMemo(
    () => cart.find((item) => item.variant_id === pendingRemoveVariantId) || null,
    [cart, pendingRemoveVariantId],
  )
  const effectivePreviewPriceMode = totals.priceMode
  const previewWholesaleApplies = shouldApplyWholesalePreview(cart, posContext?.pricing)
  const selectedVariantAutoPrice =
    selectedVariant && effectivePreviewPriceMode === "wholesale"
      ? selectedVariant.wholesale_price ?? selectedVariant.retail_price
      : selectedVariant?.retail_price ?? selectedVariant?.wholesale_price
  const selectedVariantPriceTone = buildVariantTone(
    effectivePreviewPriceMode === "wholesale" &&
      selectedVariant?.wholesale_price !== null &&
      selectedVariant?.wholesale_price !== undefined,
  )
  const cartCount = cart.reduce((accumulator, item) => accumulator + item.quantity, 0)
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
    cart.length > 0 && paymentMode === "single" && !paymentMethod.trim()
  const hasDraftSale =
    !confirmedSale &&
    (
      cart.length > 0 ||
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

  useEffect(() => {
    if (!hasDraftSale) return
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", warnBeforeUnload)
    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [hasDraftSale])

  const summaryStatusMessage = (() => {
    if (!defaultLocation?.location_id) return "Asigna una sede operativa antes de vender."
    if (posContextLoading) return "Validando sede y caja operativa..."
    if (!cashReady) {
      return (
        posContext?.cash?.message ||
        "La venta no se puede registrar hasta que se abra una caja"
      )
    }
    if (cart.length === 0) return "Agrega al menos un producto."
    if (totals.hasMissingPrice) return "Hay items sin precio vigente."
    if (saleDiscountError) return saleDiscountError
    if (singlePaymentMissingMethod) return "Selecciona un método de pago."
    if (mixedPaymentsPreview.error) return mixedPaymentsPreview.error
    if (!selectedCustomer) return "Selecciona un cliente o crea uno con el boton."
    if (!customerIsValid) return "Revisa cliente y comprobante."
    return "Venta lista para confirmar."
  })()

  const submitDisabled =
    cart.length === 0 ||
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
    if (paymentMode === "mixed" && mixedPayments.length === 0) {
      void Promise.resolve().then(() =>
        setMixedPayments(createDefaultMixedPayments(totals.total, paymentMethod)),
      )
    }
  }, [mixedPayments.length, paymentMethod, paymentMode, totals.total])

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

  function openPriceSheet(item: PreviewItem) {
    setPriceTargetId(item.variant_id)
    setPriceSheetOpen(true)
  }

  function closePriceSheet() {
    setPriceSheetOpen(false)
    setPriceTargetId(null)
  }

  function submitPriceAdjustment(
    variantId: string,
    unitPriceFinal: number,
    reason: string,
  ) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.variant_id === variantId
          ? {
              ...item,
              price_override: {
                unit_price_final: unitPriceFinal,
                reason,
              },
            }
          : item,
      ),
    )
  }

  function clearPriceAdjustment(variantId: string) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.variant_id === variantId ? { ...item, price_override: null } : item,
      ),
    )
    if (priceTargetId === variantId) closePriceSheet()
  }

  function addToCart(variant: SaleVariant, quantity = 1) {
    const hasPrice =
      variant.retail_price !== null ||
      variant.wholesale_price !== null
    const availableStock = Number(variant.stock || 0)
    if (!hasPrice) {
      showError("No se pudo agregar producto", "La variante no tiene precio vigente.")
      return
    }
    if (availableStock <= 0) {
      showError("No se pudo agregar producto", "La variante no tiene stock disponible.")
      return
    }

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.variant_id === variant.variant_id,
      )
      if (existingItem) {
        return currentCart.map((item) =>
          item.variant_id === variant.variant_id
            ? {
                ...item,
                quantity: Math.min(item.quantity + quantity, availableStock),
                retail_price: variant.retail_price,
                wholesale_price: variant.wholesale_price,
                stock: availableStock,
                size_name: variant.size_name,
                color_name: variant.color_name,
              }
            : item,
        )
      }

      return [
        ...currentCart,
        {
          variant_id: variant.variant_id,
          sku: variant.sku,
          style_name: variant.style_name,
          size_code: variant.size_code,
          size_name: variant.size_name,
          color_code: variant.color_code,
          color_name: variant.color_name,
          label: `${variant.style_name} - ${variant.size_name || variant.size_code} / ${variant.color_name || variant.color_code}`,
          quantity: Math.min(Math.max(quantity, 1), availableStock),
          retail_price: variant.retail_price,
          wholesale_price: variant.wholesale_price,
          stock: availableStock,
          price_override: null,
        },
      ]
    })
  }

  function updateQty(variantId: string, delta: number) {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.variant_id !== variantId) return item
        const nextQuantity = Math.max(1, Math.min(item.stock, item.quantity + delta))
        return { ...item, quantity: nextQuantity }
      }),
    )
  }

  function removeFromCart(variantId: string) {
    setPendingRemoveVariantId(variantId)
  }

  function closeRemoveItemConfirm() {
    setPendingRemoveVariantId(null)
  }

  function confirmRemoveFromCart() {
    const variantId = pendingRemoveVariantId
    if (!variantId) return
    setCart((currentCart) =>
      currentCart.filter((item) => item.variant_id !== variantId),
    )
    if (priceTargetId === variantId) closePriceSheet()
    closeRemoveItemConfirm()
  }

  function selectProductStyle(style: SearchableStyle | null) {
    setSelectedProductStyle(style)
    setSelectedSizeCode("")
    setSelectedColorCode("")
    setQuery("")
    setHighlightedProductIndex(0)
    setProductPickerOpen(false)

    if (!style) return

    const variants = style.variants || []

    if (variants.length === 1) {
      const single = variants[0]
      const hasPrice =
        single.retail_price !== null || single.wholesale_price !== null
      if (hasPrice && single.stock > 0) {
        addToCart(single, 1)
        setSelectedProductStyle(null)
        productSearchInputRef.current?.focus()
        return
      }
    }

    setProductConfigOpen(true)
  }

  function closeProductConfigModal() {
    setProductConfigOpen(false)
  }

  function openProductConfigModal() {
    setProductConfigOpen(true)
  }

  function addSelectedVariantToCart(variant: SaleVariant, quantity = 1) {
    addToCart(variant, quantity)
  }

  function selectCustomer(customer: PosCustomer | null) {
    setSelectedCustomer(customer)
    setCustomerQuery("")
    setCustomerResults([])
    setHighlightedCustomerIndex(0)
    setCustomerPickerOpen(false)
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
      cart,
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
        "El total cambió. Reingresa los montos del pago mixto.",
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
    setSelectedCustomer(customer)
    setCustomerResults((current) => replaceCustomerInResults(current, customer))
    setCustomerQuery("")
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
        items: cart.map((item) => ({
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

  async function handleOpenCash() {
    if (!defaultLocation?.location_id) return
    setOpeningCash(true)
    try {
      await apiFetch("/api/cash/open", {
        method: "POST",
        body: JSON.stringify({
          location_id: defaultLocation.location_id,
          business_date: posContext?.business_date,
        }),
      })
      setCashOpenDialogOpen(false)
      await refreshPosContext()
      showSuccess("Caja abierta", "Ventas habilitadas para la sede.")
    } catch (openError) {
      showError("No se pudo abrir caja", explainApiError(openError, "Intenta nuevamente."))
    } finally {
      setOpeningCash(false)
    }
  }

  async function handleReopenCash() {
    const cashClosingId = posContext?.cash?.cash_closing_id
    if (!cashClosingId || !reopenNotes.trim()) return
    setReopeningCash(true)
    try {
      await apiFetch(`/api/cash/${cashClosingId}/reopen`, {
        method: "PATCH",
        body: JSON.stringify({ reopen_notes: reopenNotes.trim() }),
      })
      setReopenCashDialogOpen(false)
      setReopenNotes("")
      await refreshPosContext()
      showSuccess("Caja reabierta", "Ventas habilitadas nuevamente.")
    } catch (reopenError) {
      showError("No se pudo reabrir caja", explainApiError(reopenError, "Intenta nuevamente."))
    } finally {
      setReopeningCash(false)
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
    sizeSelectOptions,
    colorSelectOptions,
    selectedVariant,
    selectedVariantAutoPrice,
    selectedVariantPriceTone,
    pricingModeOverride,
    setPricingModeOverride,
    cart,
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
    setPriceSheetOpen,
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
    setConfirmedSale,
    saleConfirmationOpen,
    setSaleConfirmationOpen,
    saleReviewOpen,
    setSaleReviewOpen,
    error,
    searchableStyles,
    effectivePreviewPriceMode,
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
    openProductConfigModal,
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
