"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"
import Link from "next/link"
import { Dialog as DialogPrimitive } from "radix-ui"
import type { LucideIcon } from "lucide-react"
import {
  Banknote,
  BadgeCheck,
  CircleAlert,
  ChevronDown,
  CreditCard,
  History,
  Info,
  Landmark,
  LoaderCircle,
  MapPin,
  Minus,
  PencilLine,
  Plus,
  Receipt,
  ScanLine,
  Search,
  ShieldAlert,
  ShoppingBasket,
  Smartphone,
  Trash2,
  Users,
  UserPlus,
  X,
} from "lucide-react"

import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { InlineStatusCard } from "@/components/feedback/status-page"
import { useAuth } from "@/components/auth/AuthProvider"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { SalesWizardRail } from "@/components/ui/purchase-system/SalesWizardRail"
import { Button } from "@/components/ui/button"
import {
  CompactPickerEmpty,
  CompactPickerList,
  CompactPickerOption,
  CompactPickerPopover,
} from "@/components/ui/compact-picker"
import { OpsSelectMenu } from "@/components/ui/ops-selection"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { apiFetch, unwrapApiData } from "@/lib/api"
import { appRoutes, buildSaleDetailRoute } from "@/lib/routes"

import {
  DOC_TYPES,
  PAYMENT_METHODS,
  SALE_DISCOUNT_OPTIONS,
  SALE_DISCOUNT_REASON_OPTIONS,
  GENERIC_CUSTOMER_CODE,
} from "./pos-types"
import type {
  CartItem,
  ConfirmedSale,
  CustomerFormState,
  PaymentDraft,
  PosContext,
  PosCustomer,
  PreviewItem,
  PriceFormState,
  SaleDiscountState,
  SaleVariant,
  SearchableStyle,
  Stage,
} from "./pos-types"

import {
  round2,
  trimOrNull,
  formatMoney,
  parseAmountInput,
  buildSemanticChipClass,
  buildVariantTone,
  createPaymentDraft,
  createDefaultMixedPayments,
  buildCustomerDisplayName,
  buildCustomerDocument,
  shouldApplyWholesalePreview,
  calculateSalePreview,
  buildCashLabel,
  buildCashTone,
  getPaymentMethodLabel,
  getPaymentReferenceMeta,
  isCustomerValidForDocumentType,
  getCustomerSearchFilter,
  filterCustomersByDocumentType,
  groupVariantsByStyle,
  buildProductSearchResults,
  getVariantOptionValues,
  findVariantByAttributes,
  explainApiError,
  createEmptyCustomerForm,
  buildCustomerFormFromCustomer,
  validateCustomerForm,
  buildCustomerPayload,
  replaceCustomerInResults,
} from "./pos-utils"

const INPUT_CLASS = "sales-field w-full rounded-lg px-3 py-2 text-sm"
const COMPACT_LABEL_CLASS =
  "mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]"

// buildSemanticChipClass is now imported from ./pos-utils

function SemanticChip({ tone = "neutral", children, className = "" }: { tone?: string; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${buildSemanticChipClass(tone)} ${className}`}
    >
      {children}
    </span>
  )
}

// All utility functions above are now imported from ./pos-utils

function getDocumentIcon(documentType: string): LucideIcon {
  if (documentType === "factura") return Receipt
  if (documentType === "boleta") return CreditCard
  if (documentType === "proforma") return BadgeCheck
  return CircleAlert
}

function getPaymentMethodIcon(method: string): LucideIcon {
  if (method === "cash") return Banknote
  if (method === "transfer") return Landmark
  return Smartphone
}

// getDocumentIcon and getPaymentMethodIcon stay inline (need direct icon imports)
// All other utility functions are now imported from ./pos-utils

export default function NuevaVentaPage() {
  const { user, defaultLocation, locationsLoading, has } = useAuth()
  const wizardViewportRef = useRef<HTMLDivElement | null>(null)
  const customerSectionRef = useRef<HTMLElement | null>(null)
  const productSectionRef = useRef<HTMLElement | null>(null)
  const paymentSectionRef = useRef<HTMLElement | null>(null)
  const summarySectionRef = useRef<HTMLElement | null>(null)
  const productPickerRef = useRef<HTMLDivElement | null>(null)
  const productSearchInputRef = useRef<HTMLInputElement | null>(null)
  const customerPickerRef = useRef<HTMLDivElement | null>(null)
  const customerSearchInputRef = useRef<HTMLInputElement | null>(null)
  const documentPickerRef = useRef<HTMLDivElement | null>(null)
  const stageOrder: Stage[] = ["products", "customer", "payment", "summary"]

  const [query, setQuery] = useState("")
  const [variants, setVariants] = useState<SaleVariant[]>([])
  const [loadingVariants, setLoadingVariants] = useState(false)
  const [productPickerOpen, setProductPickerOpen] = useState(false)
  const [highlightedProductIndex, setHighlightedProductIndex] = useState(0)
  const [selectedProductStyle, setSelectedProductStyle] = useState<SearchableStyle | null>(null)
  const [selectedSizeCode, setSelectedSizeCode] = useState("")
  const [selectedColorCode, setSelectedColorCode] = useState("")

  const [cart, setCart] = useState<CartItem[]>([])

  const [documentType, setDocumentType] = useState("none")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [paymentMode, setPaymentMode] = useState<"single" | "mixed">("single")
  const [mixedPayments, setMixedPayments] = useState<PaymentDraft[]>(() => createDefaultMixedPayments(0, "cash"))
  const [saleDiscount, setSaleDiscount] = useState<SaleDiscountState>({
    mode: "none",
    value: "",
    reason: "",
  })

  const [customerQuery, setCustomerQuery] = useState("")
  const [customerResults, setCustomerResults] = useState<PosCustomer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false)
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(0)
  const [documentPickerOpen, setDocumentPickerOpen] = useState(false)
  const [genericCustomer, setGenericCustomer] = useState<PosCustomer | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<PosCustomer | null>(null)

  const [posContext, setPosContext] = useState<PosContext | null>(null)
  const [posContextLoading, setPosContextLoading] = useState(false)
  const [posContextError, setPosContextError] = useState<string | null>(null)

  const [customerSheetOpen, setCustomerSheetOpen] = useState(false)
  const [customerSheetMode, setCustomerSheetMode] = useState("create")
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(createEmptyCustomerForm())
  const [customerFormError, setCustomerFormError] = useState<string | null>(null)
  const [customerSaving, setCustomerSaving] = useState(false)
  const [priceSheetOpen, setPriceSheetOpen] = useState(false)
  const [discountModalOpen, setDiscountModalOpen] = useState(false)
  const [priceTargetId, setPriceTargetId] = useState<string | null>(null)
  const [priceForm, setPriceForm] = useState<PriceFormState>({
    unit_price_final: "",
    reason: "",
  })
  const [priceFormError, setPriceFormError] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [confirmedSale, setConfirmedSale] = useState<ConfirmedSale | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeStage, setActiveStage] = useState<Stage>("products")

  const refreshPosContext = useCallback(async () => {
    if (!defaultLocation?.location_id) {
      setPosContext(null)
      setPosContextError(null)
      return
    }

    setPosContextLoading(true)
    setPosContextError(null)

    try {
      const context = await apiFetch("/api/sales/context", {
        cache: "no-store",
      }) as PosContext
      setPosContext(context)
    } catch (fetchError) {
      setPosContext(null)
      setPosContextError(explainApiError(fetchError, "No se pudo validar la caja operativa."))
    } finally {
      setPosContextLoading(false)
    }
  }, [defaultLocation?.location_id])

  const refreshGenericCustomer = useCallback(async () => {
    try {
      const response = await apiFetch(`/api/customers?q=${encodeURIComponent(GENERIC_CUSTOMER_CODE)}`)
      const customers = unwrapApiData(response)
      const generic =
        (Array.isArray(customers) ? customers : []).find(
          (customer) => customer.internal_code === GENERIC_CUSTOMER_CODE
        ) || null

      setGenericCustomer(generic)
    } catch {
      setGenericCustomer(null)
    }
  }, [])

  useEffect(() => {
    // defer refresh to avoid synchronous setState inside effect
    void Promise.resolve().then(() => refreshGenericCustomer())
  }, [refreshGenericCustomer])

  useEffect(() => {
    if (!defaultLocation?.location_id) {
      // defer clearing state to avoid synchronous setState inside effect
      void Promise.resolve().then(() => {
        setVariants([])
        setProductPickerOpen(false)
        setSelectedProductStyle(null)
        setSelectedSizeCode("")
        setSelectedColorCode("")
      })
      return
    }

    let active = true
    const timeoutId = window.setTimeout(async () => {
      setLoadingVariants(true)

      try {
        const params = new URLSearchParams()
        if (query.trim()) {
          params.set("q", query.trim())
        }

        const path = params.toString()
          ? `/api/sales/sellable-variants?${params.toString()}`
          : "/api/sales/sellable-variants"
        const response = await apiFetch(path)
        const nextVariants = Array.isArray(response) ? response : []

        if (!active) return

        setError(null)
        setVariants(nextVariants)
      } catch (fetchError) {
        if (!active) return
        setVariants([])
        setError(explainApiError(fetchError, "No se pudieron cargar productos."))
      } finally {
        if (active) {
          setLoadingVariants(false)
        }
      }
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timeoutId)
    }
  }, [defaultLocation?.location_id, query])

  useEffect(() => {
    refreshPosContext()
  }, [refreshPosContext])

  useEffect(() => {
    const normalizedCustomerQuery = customerQuery.trim()
    if (!customerPickerOpen && !normalizedCustomerQuery) {
      setCustomerResults([])
      setLoadingCustomers(false)
      return
    }

    let active = true
    const timeoutId = window.setTimeout(async () => {
      setLoadingCustomers(true)

      try {
        const params = new URLSearchParams()
        if (normalizedCustomerQuery) {
          params.set("q", normalizedCustomerQuery)
        }

        const { queryDocumentType } = getCustomerSearchFilter(documentType)
        if (queryDocumentType) {
          params.set("document_type", queryDocumentType)
        }

        const path = params.toString() ? `/api/customers?${params.toString()}` : "/api/customers"
        const response = await apiFetch(path)
        const customers = unwrapApiData(response)
        const compatibleCustomers = filterCustomersByDocumentType(
          Array.isArray(customers) ? customers : [],
          documentType
        ).slice(0, normalizedCustomerQuery ? 12 : 24)

        if (active) {
          setCustomerResults(compatibleCustomers)
        }
      } catch {
        if (active) {
          setCustomerResults([])
        }
      } finally {
        if (active) {
          setLoadingCustomers(false)
        }
      }
    }, normalizedCustomerQuery ? 250 : 0)

    return () => {
      active = false
      window.clearTimeout(timeoutId)
    }
  }, [customerPickerOpen, customerQuery, documentType])

  const styles = useMemo(() => groupVariantsByStyle(variants), [variants])
  const catalogStyles = useMemo(() => buildProductSearchResults(styles, ""), [styles])
  const searchableStyles = useMemo(
    () => (query.trim() ? buildProductSearchResults(styles, query) : catalogStyles),
    [catalogStyles, query, styles]
  )

  const sizeOptions = useMemo(
    () =>
      getVariantOptionValues(
        selectedProductStyle?.variants || [],
        "size_code",
        selectedColorCode ? { color_code: selectedColorCode } : {}
      ),
    [selectedColorCode, selectedProductStyle]
  )

  const colorOptions = useMemo(
    () =>
      getVariantOptionValues(
        selectedProductStyle?.variants || [],
        "color_code",
        selectedSizeCode ? { size_code: selectedSizeCode } : {}
      ),
    [selectedProductStyle, selectedSizeCode]
  )
  const sizeNameMap = useMemo(() => {
    const nextMap = new Map()
    for (const variant of selectedProductStyle?.variants || []) {
      const sizeCode = String(variant.size_code || "").trim()
      if (sizeCode && !nextMap.has(sizeCode)) {
        nextMap.set(sizeCode, variant.size_name || sizeCode)
      }
    }
    return nextMap
  }, [selectedProductStyle])
  const colorNameMap = useMemo(() => {
    const nextMap = new Map()
    for (const variant of selectedProductStyle?.variants || []) {
      const colorCode = String(variant.color_code || "").trim()
      if (colorCode && !nextMap.has(colorCode)) {
        nextMap.set(colorCode, variant.color_name || colorCode)
      }
    }
    return nextMap
  }, [selectedProductStyle])
  const sizeSelectOptions = useMemo(
    () =>
      sizeOptions.map((sizeCode) => ({
        value: sizeCode,
        label: sizeNameMap.get(sizeCode) || sizeCode,
        helper: sizeNameMap.get(sizeCode) !== sizeCode ? sizeCode : undefined,
      })),
    [sizeNameMap, sizeOptions]
  )
  const colorSelectOptions = useMemo(
    () =>
      colorOptions.map((colorCode) => ({
        value: colorCode,
        label: colorNameMap.get(colorCode) || colorCode,
        helper: colorNameMap.get(colorCode) !== colorCode ? colorCode : undefined,
      })),
    [colorNameMap, colorOptions]
  )

  const selectedVariant = useMemo(
    () =>
      findVariantByAttributes(
        selectedProductStyle?.variants || [],
        selectedSizeCode,
        selectedColorCode
      ),
    [selectedColorCode, selectedProductStyle, selectedSizeCode]
  )
  const previewWholesaleApplies = useMemo(
    () => shouldApplyWholesalePreview(cart, posContext?.pricing),
    [cart, posContext?.pricing]
  )
  const selectedVariantAutoPrice =
    selectedVariant &&
    previewWholesaleApplies &&
    selectedVariant.wholesale_price !== null &&
    selectedVariant.wholesale_price !== undefined
      ? selectedVariant.wholesale_price
      : selectedVariant?.retail_price

  useEffect(() => {
    if (!productPickerOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (productPickerRef.current && !productPickerRef.current.contains(event.target as Node)) {
        setProductPickerOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
    }
  }, [productPickerOpen])

  useEffect(() => {
    if (!searchableStyles.length) {
      setHighlightedProductIndex(0)
      return
    }

    setHighlightedProductIndex((current) =>
      Math.min(Math.max(current, 0), searchableStyles.length - 1)
    )
  }, [searchableStyles])

  useEffect(() => {
    if (!customerPickerOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (customerPickerRef.current && !customerPickerRef.current.contains(event.target as Node)) {
        setCustomerPickerOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
    }
  }, [customerPickerOpen])

  useEffect(() => {
    if (!documentPickerOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (documentPickerRef.current && !documentPickerRef.current.contains(event.target as Node)) {
        setDocumentPickerOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
    }
  }, [documentPickerOpen])

  useEffect(() => {
    if (!customerResults.length) {
      setHighlightedCustomerIndex(0)
      return
    }

    setHighlightedCustomerIndex((current) =>
      Math.min(Math.max(current, 0), customerResults.length - 1)
    )
  }, [customerResults])

  useEffect(() => {
    if (!selectedProductStyle?.style_id) {
      return
    }

    const refreshedStyle =
      catalogStyles.find((style) => style.style_id === selectedProductStyle.style_id) || null

    if (refreshedStyle) {
      setSelectedProductStyle(refreshedStyle)
    }
  }, [catalogStyles, selectedProductStyle?.style_id])

  useEffect(() => {
    if (!selectedProductStyle) {
      setSelectedSizeCode("")
      setSelectedColorCode("")
      return
    }

    setSelectedSizeCode((current) => {
      if (current && sizeOptions.includes(current)) {
        return current
      }

      return sizeOptions.length === 1 ? sizeOptions[0] : ""
    })
  }, [selectedProductStyle, sizeOptions])

  useEffect(() => {
    if (!selectedProductStyle) {
      return
    }

    setSelectedColorCode((current) => {
      if (current && colorOptions.includes(current)) {
        return current
      }

      return colorOptions.length === 1 ? colorOptions[0] : ""
    })
  }, [colorOptions, selectedProductStyle])

  const totals = useMemo(
    () => calculateSalePreview(cart, documentType, saleDiscount, posContext?.pricing),
    [cart, documentType, posContext?.pricing, saleDiscount]
  )

  const saleDiscountError = useMemo(() => {
    if (saleDiscount.mode === "none" || cart.length === 0) {
      return null
    }

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

    if (totals.total <= 0) {
      return "El total final debe ser mayor a cero."
    }

    if (!trimOrNull(saleDiscount.reason)) {
      return "Ingresa el motivo del descuento."
    }

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
      (payment) => payment.amountValue !== null && payment.amountValue > 0
    )
    const enteredTotal = round2(
      positivePayments.reduce((accumulator, payment) => accumulator + (payment.amountValue as number), 0)
    )
    const difference = round2(totals.total - enteredTotal)

    let errorMessage = null

    if (cart.length > 0) {
      if (positivePayments.length < 2) {
        errorMessage = "Distribuye el cobro en al menos dos pagos."
      } else if (normalizedPayments.some((payment) => !payment.methodIsValid)) {
        errorMessage = "Revisa los metodos del pago mixto."
      } else if (
        normalizedPayments.some(
          (payment) => String(payment.amount || "").trim() !== "" && payment.amountValue === null
        )
      ) {
        errorMessage = "Revisa los montos del pago mixto."
      } else if (Math.abs(difference) >= 0.01) {
        errorMessage =
          difference > 0
            ? `Faltan S/. ${formatMoney(difference)} por asignar.`
            : `El pago excede el total por S/. ${formatMoney(Math.abs(difference))}.`
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
  const cashOverlayVisible = Boolean(posContext && !cashReady)
  const canOpenCashModule = ["ADMIN", "CAJA"].includes(String(user?.role_name || ""))
  const priceTargetItem = useMemo(
    () => cart.find((item) => item.variant_id === priceTargetId) || null,
    [cart, priceTargetId]
  )
  const priceTargetPreviewItem = useMemo(
    () => totals.items.find((item) => item.variant_id === priceTargetId) || null,
    [priceTargetId, totals.items]
  )
  const documentGuidance =
    documentType === "boleta"
      ? customerIsValid
        ? "Cliente listo para boleta con DNI o CE."
        : "Boleta requiere cliente con DNI o CE valido."
      : documentType === "factura"
        ? customerIsValid
          ? "Cliente listo para factura con RUC y direccion."
          : "Factura requiere RUC y direccion fiscal."
        : documentType === "proforma"
          ? "Proforma sin validacion fiscal obligatoria."
          : "Sin comprobante: no exige documento."
  const summaryStatusMessage = (() => {
    if (!defaultLocation?.location_id) {
      return "Asigna una sede operativa antes de vender."
    }

    if (posContextLoading) {
      return "Validando sede y caja operativa..."
    }

    if (!cashReady) {
      return posContext?.cash?.message || "La venta no se puede registrar hasta que se abra una caja"
    }

    if (cart.length === 0) {
      return "Agrega al menos un producto."
    }

    if (totals.hasMissingPrice) {
      return "Hay items sin precio vigente."
    }

    if (saleDiscountError) {
      return saleDiscountError
    }

    if (mixedPaymentsPreview.error) {
      return mixedPaymentsPreview.error
    }

    if (!selectedCustomer) {
      return "Selecciona un cliente o confirma cliente mostrador."
    }

    if (!customerIsValid) {
      return documentGuidance
    }

    return "Venta lista para confirmar."
  })()
  const submitDisabled =
    cart.length === 0 ||
    !defaultLocation?.location_id ||
    locationsLoading ||
    posContextLoading ||
    !cashReady ||
    totals.hasMissingPrice ||
    Boolean(saleDiscountError) ||
    Boolean(mixedPaymentsPreview.error) ||
    !customerIsValid ||
    submitting

  const cartCount = cart.reduce((accumulator, item) => accumulator + item.quantity, 0)
  const isGenericCustomerSelected =
    Boolean(genericCustomer?.customer_id) &&
    selectedCustomer?.customer_id === genericCustomer?.customer_id
  const customerStepReady = Boolean(selectedCustomer?.customer_id) && customerIsValid
  const paymentStepReady =
    customerStepReady &&
    cartCount > 0 &&
    !mixedPaymentsPreview.error &&
    !saleDiscountError
  const canEditSelectedCustomer =
    Boolean(selectedCustomer?.customer_id) &&
    selectedCustomer?.customer_id !== genericCustomer?.customer_id
  const activeDocumentOption =
    DOC_TYPES.find((docType) => docType.value === documentType) || DOC_TYPES[0]
  const ActiveDocumentIcon = getDocumentIcon(activeDocumentOption.value)
  const productInputValue =
    productPickerOpen || query ? query : selectedProductStyle?.style_name || ""
  const productInputPlaceholder =
    selectedProductStyle && !productPickerOpen && !query
      ? selectedProductStyle.style_name
      : "Buscar por estilo, SKU, talla o color"
  const customerInputValue =
    customerPickerOpen || customerQuery
      ? customerQuery
      : selectedCustomer
        ? buildCustomerDisplayName(selectedCustomer)
        : ""
  const customerInputPlaceholder =
    selectedCustomer && !customerPickerOpen && !customerQuery
      ? buildCustomerDisplayName(selectedCustomer)
      : "Nombre, documento o codigo"
  const paymentSummaryLabel =
    paymentMode === "mixed"
      ? `${mixedPaymentsPreview.payments.length || mixedPayments.length} lineas de pago`
      : getPaymentMethodLabel(paymentMethod)
  const nextRecommendedStage =
    cartCount === 0
      ? "products"
      : !customerStepReady
        ? "customer"
        : !paymentStepReady
          ? "payment"
          : "summary"
  const progressItems = [
    {
      id: "products",
      label: "Productos",
      icon: ShoppingBasket,
      active: activeStage === "products",
      complete: cartCount > 0,
      suggested: nextRecommendedStage === "products",
      meta: cartCount > 0 ? `${cartCount} item${cartCount === 1 ? "" : "s"}` : "Agrega items",
    },
    {
      id: "customer",
      label: "Cliente",
      icon: Users,
      active: activeStage === "customer",
      complete: customerStepReady,
      suggested: nextRecommendedStage === "customer",
      meta: customerStepReady
        ? isGenericCustomerSelected
          ? "Mostrador"
          : "Confirmado"
        : !selectedCustomer
          ? "Pendiente"
          : customerIsValid
            ? "Seleccionado"
            : "Revisar",
    },
    {
      id: "payment",
      label: "Cobro",
      icon: CreditCard,
      active: activeStage === "payment",
      complete: paymentStepReady,
      suggested: nextRecommendedStage === "payment",
      meta: paymentStepReady ? paymentSummaryLabel : "Pendiente",
    },
    {
      id: "summary",
      label: "Resumen",
      icon: Receipt,
      active: activeStage === "summary",
      complete: false,
      suggested: nextRecommendedStage === "summary",
      meta: submitDisabled ? "Pendiente" : "Listo",
    },
  ]
  const stageRefs = {
    customer: customerSectionRef,
    products: productSectionRef,
    payment: paymentSectionRef,
    summary: summarySectionRef,
  }
  const currentStageIndex = stageOrder.indexOf(activeStage)
  const canGoPrevious = currentStageIndex > 0
  const canGoNext = currentStageIndex < stageOrder.length - 1
  const canAdvanceStage =
    activeStage === "products"
      ? cartCount > 0
      : activeStage === "customer"
        ? cartCount > 0 && customerStepReady
        : activeStage === "payment"
          ? paymentStepReady
          : false
  const nextStageLabel =
    activeStage === "products"
      ? "Ir a cliente"
      : activeStage === "customer"
        ? "Ir a cobro"
        : activeStage === "payment"
          ? "Ir a resumen"
          : undefined
  const selectedCustomerName = buildCustomerDisplayName(selectedCustomer)
  const selectedCustomerDocument = buildCustomerDocument(selectedCustomer)
  const discountReasonSelection = SALE_DISCOUNT_REASON_OPTIONS.some(
    (option) => option.value === saleDiscount.reason
  )
    ? saleDiscount.reason
    : saleDiscount.reason
      ? "custom"
      : ""
  const saleDiscountTargetTotal = Math.max(round2(totals.baseSubtotal - totals.saleDiscountAmount), 0)

  function goToStage(stageId: Stage) {
    setActiveStage(stageId)
    requestAnimationFrame(() => {
      wizardViewportRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
      stageRefs[stageId]?.current?.focus?.()
    })
  }

  function moveStage(direction: number) {
    const currentIndex = stageOrder.indexOf(activeStage)
    const nextIndex = Math.min(stageOrder.length - 1, Math.max(0, currentIndex + direction))
    const nextStage = stageOrder[nextIndex]

    if (nextStage) {
      goToStage(nextStage)
    }
  }

  useEffect(() => {
    if (paymentMode === "mixed" && mixedPayments.length === 0) {
      setMixedPayments(createDefaultMixedPayments(totals.total, paymentMethod))
    }
  }, [mixedPayments.length, paymentMethod, paymentMode, totals.total])

  function setPaymentModeWithDefaults(nextMode: "single" | "mixed") {
    setPaymentMode(nextMode)

    if (nextMode === "mixed") {
      setMixedPayments((current) =>
        current.length > 0 ? current : createDefaultMixedPayments(totals.total, paymentMethod)
      )
    }
  }

  function updateMixedPaymentDraft(draftId: string, field: string, value: string) {
    setMixedPayments((current) => {
      const next = current.map((payment) =>
        payment.id === draftId ? { ...payment, [field]: value } : payment
      )

      if (field !== "amount" || totals.total <= 0) {
        return next
      }

      const editedIndex = next.findIndex((payment) => payment.id === draftId)
      const targetIndex = next.findIndex(
        (payment, index) =>
          index !== editedIndex &&
          (next.length === 2 ||
            String(payment.amount || "").trim() === "" ||
            Math.abs((parseAmountInput(payment.amount) || 0) - totals.total) < 0.01)
      )

      if (targetIndex === -1) {
        return next
      }

      const assignedWithoutTarget = next.reduce((accumulator, payment, index) => {
        if (index === targetIndex) return accumulator
        return accumulator + (parseAmountInput(payment.amount) || 0)
      }, 0)
      const remaining = round2(totals.total - assignedWithoutTarget)

      return next.map((payment, index) =>
        index === targetIndex
          ? {
              ...payment,
              amount: remaining > 0 ? formatMoney(remaining) : "",
            }
          : payment
      )
    })
  }

  function addMixedPaymentDraft() {
    setMixedPayments((current) => [...current, createPaymentDraft("transfer", "")])
  }

  function removeMixedPaymentDraft(draftId: string) {
    setMixedPayments((current) =>
      current.length <= 2 ? current : current.filter((payment) => payment.id !== draftId)
    )
  }

  function openPriceSheet(item: PreviewItem) {
    setPriceTargetId(item.variant_id)
    setPriceForm({
      unit_price_final: String(
        item.price_override?.unit_price_final ??
          item.unit_price_list ??
          item.wholesale_price ??
          item.retail_price ??
          ""
      ),
      reason: item.price_override?.reason || "",
    })
    setPriceFormError(null)
    setPriceSheetOpen(true)
  }

  function closePriceSheet() {
    setPriceSheetOpen(false)
    setPriceTargetId(null)
    setPriceFormError(null)
    setPriceForm({
      unit_price_final: "",
      reason: "",
    })
  }

  function submitPriceAdjustment() {
    if (!priceTargetItem) {
      setPriceFormError("Selecciona un item valido.")
      return
    }

    const nextUnitPrice = parseAmountInput(priceForm.unit_price_final)
    if (nextUnitPrice === null) {
      setPriceFormError("Ingresa un precio final valido.")
      return
    }

    const reason = trimOrNull(priceForm.reason)
    if (!reason) {
      setPriceFormError("Ingresa el motivo del ajuste manual.")
      return
    }

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.variant_id === priceTargetItem.variant_id
          ? {
              ...item,
              price_override: {
                unit_price_final: nextUnitPrice,
                reason,
              },
            }
          : item
      )
    )

    closePriceSheet()
  }

  function clearPriceAdjustment(variantId: string) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.variant_id === variantId
          ? {
              ...item,
              price_override: null,
            }
          : item
      )
    )

    if (priceTargetId === variantId) {
      closePriceSheet()
    }
  }

  function addToCart(variant: SaleVariant) {
    const hasPrice =
      (variant.retail_price !== null && variant.retail_price !== undefined) ||
      (variant.wholesale_price !== null && variant.wholesale_price !== undefined)
    const availableStock = Number(variant.stock || 0)

    if (!hasPrice || availableStock <= 0) {
      return
    }

    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.variant_id === variant.variant_id)

      if (existingItem) {
        return currentCart.map((item) =>
          item.variant_id === variant.variant_id
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, availableStock),
                retail_price: variant.retail_price,
                wholesale_price: variant.wholesale_price,
                stock: availableStock,
                size_name: variant.size_name,
                color_name: variant.color_name,
              }
            : item
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
          quantity: 1,
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
        if (item.variant_id !== variantId) {
          return item
        }

        const nextQuantity = Math.max(1, Math.min(item.stock, item.quantity + delta))
        return { ...item, quantity: nextQuantity }
      })
    )
  }

  function removeFromCart(variantId: string) {
    setCart((currentCart) => currentCart.filter((item) => item.variant_id !== variantId))

    if (priceTargetId === variantId) {
      closePriceSheet()
    }
  }

  function focusProductSearch() {
    window.requestAnimationFrame(() => {
      productSearchInputRef.current?.focus()
    })
  }

  function focusCustomerSearch() {
    window.requestAnimationFrame(() => {
      customerSearchInputRef.current?.focus()
    })
  }

  function clearProductSelection() {
    setSelectedProductStyle(null)
    setSelectedSizeCode("")
    setSelectedColorCode("")
    setQuery("")
    setHighlightedProductIndex(0)
  }

  function selectProductStyle(style: SearchableStyle) {
    setSelectedProductStyle(style)
    setSelectedSizeCode("")
    setSelectedColorCode("")
    setQuery("")
    setHighlightedProductIndex(0)
    setProductPickerOpen(false)
  }

  function selectCustomer(customer: PosCustomer) {
    setSelectedCustomer(customer)
    setCustomerQuery("")
    setCustomerResults([])
    setHighlightedCustomerIndex(0)
    setCustomerPickerOpen(false)
  }

  function openCustomerSheet(mode: string) {
    setCustomerFormError(null)
    setCustomerSheetMode(mode)

    if (mode === "edit" && selectedCustomer) {
      setCustomerForm(buildCustomerFormFromCustomer(selectedCustomer))
    } else {
      setCustomerForm(createEmptyCustomerForm(documentType === "factura" ? "factura" : "retail"))
    }

    setCustomerSheetOpen(true)
  }

  function closeCustomerSheet() {
    setCustomerSheetOpen(false)
    setCustomerFormError(null)
    setCustomerSaving(false)
  }

  async function submitCustomerForm() {
    const validationError = validateCustomerForm(customerForm)
    if (validationError) {
      setCustomerFormError(validationError)
      return
    }

    setCustomerSaving(true)
    setCustomerFormError(null)

    try {
      const payload = buildCustomerPayload(customerForm)
      const response =
        customerSheetMode === "edit" && selectedCustomer?.customer_id
          ? await apiFetch(`/api/customers/${selectedCustomer.customer_id}`, {
              method: "PATCH",
              body: JSON.stringify(payload),
            })
          : await apiFetch("/api/customers", {
              method: "POST",
              body: JSON.stringify(payload),
            })

      const savedCustomer = unwrapApiData(response) as PosCustomer

      setSelectedCustomer(savedCustomer)
      setCustomerResults((current) => replaceCustomerInResults(current, savedCustomer))

      if (savedCustomer.internal_code === GENERIC_CUSTOMER_CODE) {
        setGenericCustomer(savedCustomer)
      }

      setCustomerQuery("")
      closeCustomerSheet()
    } catch (submitError) {
      setCustomerFormError(explainApiError(submitError, "No se pudo guardar el cliente."))
    } finally {
      setCustomerSaving(false)
    }
  }

  async function confirmSale() {
    if (submitDisabled) return

    setSubmitting(true)
    setError(null)

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

      if (saleDiscount.mode !== "none" && totals.saleDiscountAmount > 0) {
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
      }

      const sale = await apiFetch("/api/sales", {
        method: "POST",
        body: JSON.stringify(payload),
      }) as ConfirmedSale

      setConfirmedSale({
        sale_id: sale.sale_id,
        sale_number: sale.sale_number,
      })
      setCart([])
      setCustomerQuery("")
      setSelectedCustomer(genericCustomer)
      setDocumentType("none")
      setPaymentMethod("cash")
      setPaymentMode("single")
      setMixedPayments(createDefaultMixedPayments(0, "cash"))
      setSaleDiscount({
        mode: "none",
        value: "",
        reason: "",
      })
      setDiscountModalOpen(false)
      setActiveStage("products")
      closePriceSheet()
      await refreshPosContext()
    } catch (submitError) {
      setError(explainApiError(submitError, "No se pudo confirmar la venta."))
      await refreshPosContext()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ErrorBoundary>
    <PermissionGuard permission="sales.pos">
      <Sheet open={customerSheetOpen} onOpenChange={setCustomerSheetOpen}>
        <TooltipProvider delayDuration={120}>
          <div className="sales-page min-h-dvh px-4 py-[var(--ops-page-py)] md:px-8">
            <div className="mx-auto max-w-[1180px] space-y-4">
              <PosHeader
                eyebrow="Punto de venta"
                title="Nueva venta"
                meta={
                  <>
                    <span className="sales-chip rounded-full px-3 py-1 text-xs font-semibold">
                      <MapPin className="h-3.5 w-3.5 text-[var(--ripnel-accent)]" />
                      {locationsLoading
                        ? "Cargando sede..."
                        : defaultLocation?.name || "Sin sede asignada"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                        posContextLoading
                          ? "sales-chip"
                          : buildCashTone(cashStatus)
                      }`}
                    >
                      {posContextLoading ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      {posContextLoading ? "Validando caja" : buildCashLabel(cashStatus)}
                    </span>
                  </>
                }
                actions={
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="rounded-lg"
                          aria-label="Reglas del punto de venta"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={8}>
                        La venta solo se confirma si la caja esta operativa, hay stock y existe un precio vigente.
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button asChild variant="outline" size="icon-sm" className="rounded-lg">
                          <Link href="/clientes" aria-label="Ir a clientes">
                            <Users className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={8}>Clientes</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button asChild variant="outline" size="icon-sm" className="rounded-lg">
                          <Link href={appRoutes.transactionHistory} aria-label="Ir al historial de ventas">
                            <History className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={8}>Historial</TooltipContent>
                    </Tooltip>
                  </>
                }
              />

              {!defaultLocation?.location_id && !locationsLoading ? (
                <InlineStatusCard
                  title="No hay sede operativa activa"
                  description="Debes tener una sede default asignada para registrar ventas. Configurala desde tu cuenta o solicita apoyo al administrador."
                  tone="warning"
                  icon={<MapPin className="h-5 w-5" />}
                />
              ) : null}

              {confirmedSale ? (
                <div className={`rounded-lg border p-4 shadow-sm ${buildSemanticChipClass("success")}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <BadgeCheck className="h-6 w-6 shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold">
                        Venta confirmada: {confirmedSale.sale_number}
                      </p>
                      <p className="text-sm">
                        La venta quedo registrada y el stock ya fue descontado.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={buildSaleDetailRoute(confirmedSale.sale_id)}
                        className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 py-1.5 text-sm font-medium text-[var(--ops-text)] hover:bg-[var(--ops-surface-muted)]"
                      >
                        Ver detalle
                      </Link>
                      <Link
                        href={appRoutes.transactionHistory}
                        className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 py-1.5 text-sm font-medium text-[var(--ops-text)] hover:bg-[var(--ops-surface-muted)]"
                      >
                        Ver historial
                      </Link>
                      {has("sales.postsale.view") ? (
                        <Link
                          href={`/postventa/${confirmedSale.sale_id}`}
                          className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 py-1.5 text-sm font-medium text-[var(--ops-text)] hover:bg-[var(--ops-surface-muted)]"
                        >
                          Ir a postventa
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setConfirmedSale(null)}
                        className="rounded-lg bg-[var(--ripnel-accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--ripnel-accent-hover)]"
                      >
                        Nueva venta
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {posContextError ? (
                <InlineStatusCard
                  title="No pudimos validar el contexto de venta"
                  description={posContextError}
                  tone="warning"
                  icon={<ShieldAlert className="h-5 w-5" />}
                />
              ) : null}

              <div ref={wizardViewportRef}>
                <SalesWizardRail
                  items={progressItems}
                  currentStep={currentStageIndex}
                  onSelect={(stageId) => goToStage(stageId as Stage)}
                  onPrevious={() => moveStage(-1)}
                  onNext={() => moveStage(1)}
                  canGoPrevious={canGoPrevious}
                  canGoNext={canGoNext}
                  canAdvance={canAdvanceStage}
                  nextLabel={nextStageLabel}
                />
              </div>

              <div className="relative">
                {cashOverlayVisible ? (
                  <div className="ops-overlay-backdrop absolute inset-0 z-20 flex items-center justify-center rounded-[28px] p-4">
                    <div className="ops-overlay-panel w-full max-w-md rounded-2xl p-6">
                      <div className="flex items-start gap-3">
                        <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                        <div className="space-y-2">
                          <p className="text-lg font-semibold">Venta bloqueada por caja</p>
                          <p className="text-sm leading-6 text-[var(--ops-text-muted)]">
                            {posContext?.cash?.message ||
                              "No pudimos validar la caja operativa de esta sede."}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {canOpenCashModule ? (
                          <Button asChild variant="accent" size="sm" className="h-9 rounded-xl px-4">
                            <Link href="/caja">Ir a caja del dia</Link>
                          </Button>
                        ) : (
                          <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-4 py-2.5 text-sm text-[var(--ops-text-muted)]">
                            Coordina con caja o con un administrador para habilitar la venta.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                <section className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_360px]">
                  <div className="contents">
                    <section
                      ref={productSectionRef}
                      onMouseEnter={() => setActiveStage("products")}
                      className={`relative space-y-3 xl:order-2 xl:col-span-2 ${
                        activeStage === "products"
                          ? productPickerOpen
                            ? "z-30"
                            : "z-0"
                          : "hidden"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <ShoppingBasket className="h-5 w-5 text-[var(--ripnel-accent)]" />
                          <h2 className="text-lg font-semibold text-[var(--ops-text)]">Productos</h2>
                        </div>

                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center gap-2 rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 py-2 text-sm font-medium text-[var(--ops-text-muted)] opacity-80"
                        >
                          <ScanLine className="h-4 w-4" />
                          Escanear producto
                        </button>
                      </div>

                      <div ref={productPickerRef} className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ops-text-muted)]" />
                        <input
                          ref={productSearchInputRef}
                          type="text"
                          value={productInputValue}
                          onFocus={() => {
                            setProductPickerOpen(true)
                            if (!query) {
                              setHighlightedProductIndex(0)
                            }
                          }}
                          onChange={(event) => {
                            setQuery(event.target.value)
                            setProductPickerOpen(true)
                            setHighlightedProductIndex(0)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              setProductPickerOpen(false)
                              return
                            }

                            if (!searchableStyles.length) {
                              return
                            }

                            if (event.key === "ArrowDown") {
                              event.preventDefault()
                              setProductPickerOpen(true)
                              setHighlightedProductIndex((current) =>
                                Math.min(current + 1, searchableStyles.length - 1)
                              )
                            }

                            if (event.key === "ArrowUp") {
                              event.preventDefault()
                              setProductPickerOpen(true)
                              setHighlightedProductIndex((current) => Math.max(current - 1, 0))
                            }

                            if (event.key === "Enter" && productPickerOpen) {
                              event.preventDefault()
                              selectProductStyle(searchableStyles[highlightedProductIndex])
                            }
                          }}
                          placeholder={productInputPlaceholder}
                          className="sales-field w-full rounded-xl py-2.5 pl-9 pr-48 text-sm"
                        />
                        {selectedProductStyle || query ? (
                          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                            {selectedProductStyle && !query && !productPickerOpen ? (
                              <>
                                <span className="sales-chip sales-chip-accent rounded-full px-2 py-0.5 text-[11px] font-semibold">
                                  Stock {selectedProductStyle.totalStock}
                                </span>
                                {selectedProductStyle.style_code ? (
                                  <span className="sales-chip rounded-full px-2 py-0.5 text-[11px] font-semibold">
                                    {selectedProductStyle.style_code}
                                  </span>
                                ) : null}
                                <span className="sales-chip rounded-full px-2 py-0.5 text-[11px] font-semibold">
                                  {selectedProductStyle.variants.length} variantes
                                </span>
                              </>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => {
                                clearProductSelection()
                                focusProductSearch()
                              }}
                              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] text-[var(--ops-text-muted)] transition hover:border-[var(--ripnel-accent)] hover:text-[var(--ripnel-accent-hover)]"
                              aria-label="Limpiar producto"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : null}

                        {productPickerOpen ? (
                          <CompactPickerPopover className="absolute left-0 right-0 top-[calc(100%+0.55rem)] z-20">
                            {loadingVariants ? (
                              <CompactPickerEmpty>Buscando productos...</CompactPickerEmpty>
                            ) : !defaultLocation?.location_id ? (
                              <CompactPickerEmpty>
                                Configura una sede para operar ventas.
                              </CompactPickerEmpty>
                            ) : styles.length === 0 ? (
                              <CompactPickerEmpty>
                                No hay productos vendibles para la sede actual.
                              </CompactPickerEmpty>
                            ) : searchableStyles.length === 0 ? (
                              <CompactPickerEmpty>
                                No encontramos coincidencias para esta busqueda.
                              </CompactPickerEmpty>
                            ) : (
                              <CompactPickerList
                                className="max-h-72 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                style={{ scrollbarWidth: "none" }}
                              >
                                <div className="divide-y divide-[color:color-mix(in_srgb,var(--ops-border-strong)_72%,transparent)]">
                                  {searchableStyles.map((style, index) => {
                                    const isHighlighted = index === highlightedProductIndex
                                    return (
                                      <CompactPickerOption
                                        key={style.style_id}
                                        active={isHighlighted}
                                        onMouseEnter={() => setHighlightedProductIndex(index)}
                                        onClick={() => selectProductStyle(style)}
                                        className="py-2.5"
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="min-w-0 flex gap-3">
                                            <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                                              {style.style_name}
                                            </p>
                                            <p className="mt-0.5 text-[11px] text-[var(--ops-text-muted)]">
                                              {style.variants.length} variante
                                              {style.variants.length === 1 ? "" : "s"}
                                            </p>
                                          </div>
                                          <span
                                            className={`${style.totalStock > 0 ? "sales-chip sales-chip-success" : "sales-chip sales-chip-danger"} rounded-full px-2 py-0.5 text-[11px] font-semibold`}
                                          >
                                            stock: {style.totalStock}
                                          </span>
                                        </div>
                                      </CompactPickerOption>
                                    )
                                  })}
                                </div>
                              </CompactPickerList>
                            )}
                          </CompactPickerPopover>
                        ) : null}
                      </div>

                      <div className="border-y border-[var(--ops-border-strong)] py-3">
                        {!selectedProductStyle ? (
                          <div className="rounded-lg border border-dashed border-[var(--ops-border-soft)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] px-4 py-6 text-sm text-[var(--ops-text-muted)]">
                            Selecciona un producto para configurar talla, color y agregarlo a la venta.
                          </div>
                        ) : (
                          <div className="grid gap-3 lg:grid-cols-[178px_180px_minmax(0,1fr)_116px] lg:items-end">
                            <div>
                              <label className={COMPACT_LABEL_CLASS}>Talla</label>
                              <OpsSelectMenu
                                value={selectedSizeCode}
                                onValueChange={setSelectedSizeCode}
                                placeholder={sizeSelectOptions.length ? "Seleccionar talla" : "Sin tallas"}
                                options={sizeSelectOptions}
                              />
                            </div>

                            <div>
                              <label className={COMPACT_LABEL_CLASS}>Color</label>
                              <OpsSelectMenu
                                value={selectedColorCode}
                                onValueChange={setSelectedColorCode}
                                placeholder={colorSelectOptions.length ? "Seleccionar color" : "Sin colores"}
                                options={colorSelectOptions}
                              />
                            </div>

                            <div className="rounded-lg border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] px-3 py-2.5">
                              {!selectedVariant ? (
                                <p className="text-sm text-[var(--ops-text-muted)]">Completa talla y color.</p>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                  <SemanticChip
                                    tone={buildVariantTone(
                                      previewWholesaleApplies &&
                                        selectedVariant.wholesale_price !== null &&
                                        selectedVariant.wholesale_price !== undefined
                                    )}
                                    className="px-2 py-0.5"
                                  >
                                    {previewWholesaleApplies &&
                                    selectedVariant.wholesale_price !== null &&
                                    selectedVariant.wholesale_price !== undefined
                                      ? "Mayorista activo"
                                      : "Retail vigente"}
                                  </SemanticChip>
                                  <span className="font-medium text-[var(--ops-text)]">
                                    {selectedVariantAutoPrice !== null &&
                                    selectedVariantAutoPrice !== undefined
                                      ? `S/. ${formatMoney(selectedVariantAutoPrice)}`
                                      : "Sin precio"}
                                  </span>
                                  <span
                                    className={`${Number(selectedVariant.stock || 0) > 0 ? "sales-chip sales-chip-success" : "sales-chip sales-chip-danger"} rounded-full px-2 py-0.5 text-[11px] font-semibold`}
                                  >
                                    Stock {Number(selectedVariant.stock || 0)}
                                  </span>
                                </div>
                              )}
                            </div>

                            <Button
                              type="button"
                              variant="accent"
                              size="lg"
                              onClick={() => selectedVariant && addToCart(selectedVariant)}
                              disabled={
                                !selectedVariant ||
                                (selectedVariant.retail_price === null &&
                                  selectedVariant.wholesale_price === null) ||
                                (selectedVariant.retail_price === undefined &&
                                  selectedVariant.wholesale_price === undefined) ||
                                Number(selectedVariant.stock || 0) <= 0
                              }
                              className="h-10 rounded-lg px-4"
                            >
                              {!selectedVariant
                                ? "Agregar"
                                : Number(selectedVariant.stock || 0) <= 0
                                  ? "Sin stock"
                                  : (selectedVariant.retail_price === null &&
                                        selectedVariant.wholesale_price === null) ||
                                      (selectedVariant.retail_price === undefined &&
                                        selectedVariant.wholesale_price === undefined)
                                    ? "Sin precio"
                                    : "Agregar"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </section>

                    <section
                      className={`relative z-0 space-y-3 xl:order-3 xl:col-span-2 ${
                        activeStage === "products" ? "" : "hidden"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <ShoppingBasket className="h-5 w-5 text-[var(--ripnel-accent)]" />
                          <h2 className="text-lg font-semibold text-[var(--ops-text)]">Detalle de venta</h2>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={`inline-flex cursor-help items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                                totals.wholesaleApplied
                                  ? buildSemanticChipClass("success")
                                  : buildSemanticChipClass("neutral")
                              }`}
                            >
                              {totals.wholesaleApplied ? "Mayorista activo" : "Retail vigente"}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" sideOffset={8}>
                            {totals.wholesaleApplied
                              ? `Aplica desde ${posContext?.pricing?.wholesale_min_qty_total || 3} unidades en la venta.`
                              : "Se aplica el precio vigente de lista hasta alcanzar el umbral mayorista."}
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {cart.length === 0 ? (
                        <div className="mt-4 rounded-lg border border-dashed border-[var(--ops-border-soft)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] px-4 py-8 text-center text-sm text-[var(--ops-text-muted)]">
                          Aun no hay productos agregados a la venta.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <div className="min-w-[980px] border-y border-[var(--ops-border-strong)]">
                            <table className="w-full border-collapse">
                              <thead className="bg-[var(--ops-surface-muted)]">
                                <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                                  <th className="px-4 py-3">Producto</th>
                                  <th className="px-4 py-3">Talla</th>
                                  <th className="px-4 py-3">Color</th>
                                  <th className="px-4 py-3 text-center">Cantidad</th>
                                  <th className="px-4 py-3 text-right">Precio aplicado</th>
                                  <th className="px-4 py-3 text-right">Subtotal</th>
                                  <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                                {totals.items.map((item) => (
                                  <tr
                                    key={item.variant_id}
                                    className="transition hover:bg-[var(--ops-surface-muted)]"
                                  >
                                    <td className="px-4 py-[var(--ops-row-py)] align-top">
                                      <p className="text-sm font-semibold text-[var(--ops-text)]">
                                        {item.style_name}
                                      </p>
                                      {item.price_override?.reason ? (
                                        <p className="mt-1 text-[11px] text-[var(--ripnel-accent-hover)]">
                                          Ajuste manual: {item.price_override.reason}
                                        </p>
                                      ) : null}
                                    </td>
                                    <td className="px-4 py-[var(--ops-row-py)] align-top text-sm text-[var(--ops-text)]">
                                      {item.size_name || item.size_code}
                                    </td>
                                    <td className="px-4 py-[var(--ops-row-py)] align-top text-sm text-[var(--ops-text)]">
                                      {item.color_name || item.color_code}
                                    </td>
                                    <td className="px-4 py-[var(--ops-row-py)] align-top">
                                      <div className="flex justify-center">
                                        <div className="sales-field flex items-center gap-1 rounded-lg px-1.5 py-1">
                                          <button
                                            type="button"
                                            onClick={() => updateQty(item.variant_id, -1)}
                                            className="sales-field-interactive rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-1 text-[var(--ops-text-muted)]"
                                          >
                                            <Minus className="h-3 w-3" />
                                          </button>
                                          <span className="min-w-8 text-center text-sm font-semibold text-[var(--ops-text)]">
                                            {item.quantity}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => updateQty(item.variant_id, 1)}
                                            disabled={item.quantity >= item.stock}
                                            className="sales-field-interactive rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-1 text-[var(--ops-text-muted)] disabled:opacity-40"
                                          >
                                            <Plus className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-[var(--ops-row-py)] align-top text-right">
                                      <div className="space-y-1">
                                        <p className="text-sm font-semibold text-[var(--ops-text)]">
                                          S/. {formatMoney(item.unit_price_before_discount)}
                                        </p>
                                        <p className="text-[11px] text-[var(--ops-text-muted)]">
                                          {item.price_type_applied === "wholesale" ? "Mayorista" : "Retail"}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="px-4 py-[var(--ops-row-py)] align-top text-right">
                                      <p className="text-sm font-semibold text-[var(--ops-text)]">
                                        S/. {formatMoney(item.line_subtotal_before_discount)}
                                      </p>
                                    </td>
                                    <td className="px-4 py-[var(--ops-row-py)] align-top">
                                      <div className="flex items-center justify-end gap-1">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              type="button"
                                              onClick={() => openPriceSheet(item)}
                                              className="sales-field-interactive rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-1.5 text-[var(--ops-text-muted)] transition"
                                              aria-label={item.price_override ? "Editar precio" : "Ajustar precio"}
                                            >
                                              <PencilLine className="h-4 w-4" />
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent side="bottom" sideOffset={8}>
                                            {item.price_override ? "Editar precio" : "Ajustar precio"}
                                          </TooltipContent>
                                        </Tooltip>
                                        {item.price_override ? (
                                          <button
                                            type="button"
                                            onClick={() => clearPriceAdjustment(item.variant_id)}
                                            className="rounded-lg p-1 text-[var(--ops-text-muted)] transition hover:bg-[var(--ops-surface)] hover:text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]"
                                            aria-label="Quitar ajuste"
                                          >
                                            <CircleAlert className="h-4 w-4" />
                                          </button>
                                        ) : null}
                                        <button
                                          type="button"
                                          onClick={() => removeFromCart(item.variant_id)}
                                          className={`rounded-lg border p-1.5 transition hover:bg-[var(--ops-surface-muted)] ${buildSemanticChipClass("danger")}`}
                                          aria-label="Quitar producto"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </section>
                  </div>

                  <div className="contents">
                    <section
                      ref={customerSectionRef}
                      onMouseEnter={() => setActiveStage("customer")}
                      className={`relative space-y-3 xl:order-1 xl:col-span-2 ${
                        activeStage === "customer"
                          ? customerPickerOpen || documentPickerOpen
                            ? "z-30"
                            : "z-0"
                          : "hidden"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Users className="h-5 w-5 text-[var(--ripnel-accent)]" />
                          <h2 className="text-lg font-semibold text-[var(--ops-text)]">Cliente</h2>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {genericCustomer && !isGenericCustomerSelected ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => selectCustomer(genericCustomer)}
                              className="rounded-lg px-3"
                            >
                              Usar mostrador
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="accent"
                            size="sm"
                            onClick={() => openCustomerSheet("create")}
                            className="rounded-lg px-4"
                          >
                            <UserPlus className="h-4 w-4" />
                            Crear cliente
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)]">
                          <div ref={documentPickerRef} className="relative">
                            <button
                              type="button"
                              onClick={() => setDocumentPickerOpen((current) => !current)}
                              className="sales-field sales-field-interactive flex h-full w-full items-center justify-between rounded-xl px-3 py-2 text-sm"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <ActiveDocumentIcon className="h-4 w-4 shrink-0 text-[var(--ripnel-accent)]" />
                                <span className="truncate">{activeDocumentOption.label}</span>
                              </span>
                              <ChevronDown className="h-4 w-4 shrink-0 text-[var(--ops-text-muted)]" />
                            </button>

                            {documentPickerOpen ? (
                              <CompactPickerPopover className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-30">
                                <CompactPickerList>
                                  {DOC_TYPES.map((docType) => {
                                    const Icon = getDocumentIcon(docType.value)
                                    const selected = documentType === docType.value
                                    return (
                                      <CompactPickerOption
                                        key={docType.value}
                                        selected={selected}
                                        onClick={() => {
                                          setDocumentType(docType.value)
                                          setDocumentPickerOpen(false)
                                          setActiveStage("customer")
                                        }}
                                        className="flex items-center gap-2 text-sm"
                                      >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        <span>{docType.label}</span>
                                      </CompactPickerOption>
                                    )
                                  })}
                                </CompactPickerList>
                              </CompactPickerPopover>
                            ) : null}
                          </div>

                          <div ref={customerPickerRef} className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ops-text-muted)]" />
                            <input
                              ref={customerSearchInputRef}
                              type="text"
                              value={customerInputValue}
                              onFocus={() => {
                                setCustomerPickerOpen(true)
                                setHighlightedCustomerIndex(0)
                              }}
                              onChange={(event) => {
                                setCustomerQuery(event.target.value)
                                if (selectedCustomer) {
                                  setSelectedCustomer(null)
                                }
                                setCustomerPickerOpen(true)
                                setHighlightedCustomerIndex(0)
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                  setCustomerPickerOpen(false)
                                  return
                                }

                                if (!customerResults.length) {
                                  return
                                }

                                if (event.key === "ArrowDown") {
                                  event.preventDefault()
                                  setCustomerPickerOpen(true)
                                  setHighlightedCustomerIndex((current) =>
                                    Math.min(current + 1, customerResults.length - 1)
                                  )
                                }

                                if (event.key === "ArrowUp") {
                                  event.preventDefault()
                                  setCustomerPickerOpen(true)
                                  setHighlightedCustomerIndex((current) => Math.max(current - 1, 0))
                                }

                                if (event.key === "Enter" && customerPickerOpen) {
                                  event.preventDefault()
                                  if (customerResults[highlightedCustomerIndex]) {
                                    selectCustomer(customerResults[highlightedCustomerIndex])
                                  }
                                }
                              }}
                              placeholder={customerInputPlaceholder}
                              className="sales-field w-full rounded-xl py-2.5 pl-9 pr-10 text-sm"
                            />
                            {selectedCustomer || customerQuery ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomerQuery("")
                                  setSelectedCustomer(null)
                                  focusCustomerSearch()
                                }}
                                className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] text-[var(--ops-text-muted)] transition hover:border-[var(--ripnel-accent)] hover:text-[var(--ripnel-accent-hover)]"
                                aria-label="Limpiar cliente"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            ) : null}

                            {customerPickerOpen ? (
                              <CompactPickerPopover className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-30">
                                {loadingCustomers ? (
                                  <CompactPickerEmpty>Buscando clientes...</CompactPickerEmpty>
                                ) : customerResults.length > 0 ? (
                                  <CompactPickerList
                                    className="max-h-60 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                    style={{ scrollbarWidth: "none" }}
                                  >
                                    <div className="divide-y divide-[color:color-mix(in_srgb,var(--ops-border-strong)_72%,transparent)]">
                                      {customerResults.map((customer, index) => {
                                        const isHighlighted = index === highlightedCustomerIndex
                                        return (
                                          <CompactPickerOption
                                            key={customer.customer_id}
                                            active={isHighlighted}
                                            onMouseEnter={() => setHighlightedCustomerIndex(index)}
                                            onClick={() => selectCustomer(customer)}
                                            className="py-2.5"
                                          >
                                            <span className="block truncate text-sm font-semibold text-[var(--ops-text)]">
                                              {buildCustomerDisplayName(customer)}
                                            </span>
                                            <span className="mt-0.5 block truncate text-[11px] text-[var(--ops-text-muted)]">
                                              {buildCustomerDocument(customer)}
                                            </span>
                                          </CompactPickerOption>
                                        )
                                      })}
                                    </div>
                                  </CompactPickerList>
                                ) : (
                                  <CompactPickerEmpty>
                                    No encontramos coincidencias. Puedes crear el cliente y seguir con la venta.
                                  </CompactPickerEmpty>
                                )}
                              </CompactPickerPopover>
                            ) : null}
                          </div>
                        </div>

                        {!selectedCustomer ? (
                          <div className="rounded-lg border border-dashed border-[var(--ops-border-soft)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] px-4 py-6 text-sm text-[var(--ops-text-muted)]">
                            Selecciona un cliente desde el buscador o usa Cliente mostrador para continuar.
                          </div>
                        ) : (
                          <div className="border-y border-[var(--ops-border-strong)] py-3">
                            <div className="flex flex-wrap items-start gap-3 xl:grid xl:grid-cols-[minmax(0,1.15fr)_max-content_minmax(0,1fr)_max-content_max-content] xl:items-center">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                                  {buildCustomerDisplayName(selectedCustomer)}
                                </p>
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-xs text-[var(--ops-text-muted)]">
                                  {buildCustomerDocument(selectedCustomer)}
                                </p>
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-xs text-[var(--ops-text-muted)]">
                                  {selectedCustomer.address ||
                                    (isGenericCustomerSelected
                                      ? "Cliente mostrador"
                                      : "Sin direccion registrada")}
                                </p>
                              </div>

                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                                  customerStepReady
                                    ? buildSemanticChipClass("success")
                                    : buildSemanticChipClass("warning")
                                }`}
                              >
                                {customerStepReady
                                  ? isGenericCustomerSelected
                                    ? "Mostrador confirmado"
                                    : "Listo para el comprobante"
                                  : customerIsValid
                                    ? "Cliente elegido"
                                    : documentType === "factura"
                                      ? "Falta RUC o direccion"
                                      : documentType === "boleta"
                                        ? "Falta DNI o CE valido"
                                        : "Confirma el cliente"}
                              </span>

                              <div className="flex flex-wrap items-center gap-2 justify-self-end">
                                {customerStepReady ? (
                                  <Button
                                    type="button"
                                    variant="accent"
                                    size="sm"
                                    onClick={() => goToStage("payment")}
                                    className="rounded-lg px-3"
                                  >
                                    Ir a cobro
                                  </Button>
                                ) : null}

                                {canEditSelectedCustomer ? (
                                  <button
                                    type="button"
                                    onClick={() => openCustomerSheet("edit")}
                                    className="sales-field-interactive inline-flex items-center gap-1.5 rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 py-1.5 text-xs font-medium text-[var(--ops-text)] transition"
                                  >
                                    <PencilLine className="h-3.5 w-3.5" />
                                    Editar
                                  </button>
                                ) : null}

                                {genericCustomer && !isGenericCustomerSelected ? (
                                  <button
                                    type="button"
                                    onClick={() => selectCustomer(genericCustomer)}
                                    className="inline-flex cursor-pointer items-center rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--ripnel-accent-hover)] transition hover:bg-[var(--ripnel-accent-soft)]"
                                  >
                                    Usar mostrador
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedCustomer && !customerStepReady ? (
                          <div className={`rounded-lg border px-3 py-2.5 text-sm ${buildSemanticChipClass("warning")}`}>
                            {documentType === "boleta"
                                ? "Para boleta debes seleccionar un cliente con DNI o CE valido."
                                : documentType === "factura"
                                  ? "Para factura debes seleccionar un cliente con RUC y direccion fiscal."
                                  : "Confirma a quien corresponde la venta antes de pasar al cobro."}
                          </div>
                        ) : null}
                      </div>
                    </section>

                    <section
                      ref={paymentSectionRef}
                      onMouseEnter={() => setActiveStage("payment")}
                      className={`relative z-0 space-y-3 xl:order-4 xl:col-span-2 ${
                        activeStage === "payment" ? "" : "hidden"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-5 w-5 text-[var(--ripnel-accent)]" />
                          <h2 className="text-lg font-semibold text-[var(--ops-text)]">Cobro</h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="sales-chip rounded-full px-2.5 py-1 text-[11px] font-semibold">
                            {cartCount} item{cartCount === 1 ? "" : "s"}
                          </span>
                          <span
                            className={`${customerIsValid ? "sales-chip sales-chip-success" : "sales-chip sales-chip-warning"} rounded-full px-2.5 py-1 text-[11px] font-semibold`}
                          >
                            {activeDocumentOption.label}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {cartCount > 0 ? (
                          <div className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-[var(--ops-text)]">
                                    Ajustes comerciales
                                  </p>
                                  <SemanticChip tone={totals.saleDiscountAmount > 0 ? "warning" : "neutral"}>
                                    {totals.saleDiscountAmount > 0
                                      ? `Descuento actual S/. ${formatMoney(totals.saleDiscountAmount)}`
                                      : "Sin descuento"}
                                  </SemanticChip>
                                </div>
                                <p className="text-xs text-[var(--ops-text-muted)]">
                                  El descuento afecta el total del documento y se traza por separado.
                                </p>
                              </div>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setDiscountModalOpen(true)}
                                className="rounded-lg"
                              >
                                Ajustar descuento
                              </Button>
                            </div>

                            {saleDiscountError ? (
                              <p className={`mt-3 rounded-lg border px-3 py-2 text-sm ${buildSemanticChipClass("warning")}`}>
                                {saleDiscountError}
                              </p>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="border-y border-[var(--ops-border-strong)] py-3">
                          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-[var(--ops-text)]">Metodo de pago</p>
                            <div className="inline-flex rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] p-1">
                              <button
                                type="button"
                                onClick={() => setPaymentModeWithDefaults("single")}
                                className={`cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                                  paymentMode === "single"
                                    ? "bg-[var(--ops-surface)] text-[var(--ripnel-accent-hover)] shadow-sm"
                                    : "text-[var(--ops-text-muted)]"
                                }`}
                              >
                                Pago unico
                              </button>
                              <button
                                type="button"
                                onClick={() => setPaymentModeWithDefaults("mixed")}
                                className={`cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                                  paymentMode === "mixed"
                                    ? "bg-[var(--ops-surface)] text-[var(--ripnel-accent-hover)] shadow-sm"
                                    : "text-[var(--ops-text-muted)]"
                                }`}
                              >
                                Pago mixto
                              </button>
                            </div>
                          </div>
                          {paymentMode === "single" ? (
                            <div className="grid grid-cols-2 gap-2">
                              {PAYMENT_METHODS.map((method) => {
                                const Icon = getPaymentMethodIcon(method.value)
                                const selected = paymentMethod === method.value

                                return (
                                  <button
                                    key={method.value}
                                    type="button"
                                    onClick={() => setPaymentMethod(method.value)}
                                    className={`cursor-pointer rounded-lg border px-3 py-2.5 text-sm transition ${
                                      selected
                                        ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_40%,var(--ops-border-strong))] bg-[var(--ripnel-accent-soft)] font-semibold text-[var(--ripnel-accent-hover)]"
                                        : "border-[var(--ops-border-strong)] bg-[var(--ops-surface)] text-[var(--ops-text)] hover:border-[color:color-mix(in_srgb,var(--ripnel-accent)_28%,var(--ops-border-strong))]"
                                    }`}
                                  >
                                    <div className="flex items-center justify-center gap-2">
                                      <Icon className="h-4 w-4" />
                                      <span>{method.label}</span>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 py-3">
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <SemanticChip
                                  tone={
                                    Math.abs(mixedPaymentsPreview.difference) < 0.01
                                      ? "success"
                                      : mixedPaymentsPreview.difference < 0
                                        ? "danger"
                                        : "warning"
                                  }
                                >
                                  {Math.abs(mixedPaymentsPreview.difference) < 0.01
                                    ? "Pago cuadrado"
                                    : mixedPaymentsPreview.difference > 0
                                      ? `Faltan S/. ${formatMoney(mixedPaymentsPreview.difference)}`
                                      : `Excede S/. ${formatMoney(Math.abs(mixedPaymentsPreview.difference))}`}
                                </SemanticChip>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="xs"
                                  onClick={addMixedPaymentDraft}
                                  className="rounded-lg"
                                >
                                  Agregar linea
                                </Button>
                              </div>

                              <div className="divide-y divide-[var(--ops-border-strong)]">
                                {mixedPayments.map((payment, index) => {
                                  const paymentReferenceMeta = getPaymentReferenceMeta(payment.method)

                                  return (
                                    <div
                                      key={payment.id}
                                      className="grid gap-2 py-3 md:grid-cols-[minmax(0,0.9fr)_112px_minmax(0,1fr)_auto] md:items-end"
                                    >
                                      <div>
                                        <div className="mb-1.5 flex items-center gap-2">
                                          <span className="sales-chip sales-chip-accent rounded-full px-2 text-[11px] font-semibold">
                                            {index + 1}
                                          </span>
                                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                                            Linea de pago
                                          </p>
                                        </div>
                                        <select
                                          value={payment.method}
                                          onChange={(event) =>
                                            updateMixedPaymentDraft(payment.id, "method", event.target.value)
                                          }
                                          className={INPUT_CLASS}
                                        >
                                          {PAYMENT_METHODS.map((method) => (
                                            <option key={method.value} value={method.value}>
                                              {method.label}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      <div>
                                        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--ops-text-muted)]">
                                          Monto
                                        </label>
                                        <input
                                          value={payment.amount}
                                          onChange={(event) =>
                                            updateMixedPaymentDraft(payment.id, "amount", event.target.value)
                                          }
                                          placeholder="0.00"
                                          className={INPUT_CLASS}
                                        />
                                      </div>

                                      <div>
                                        <div className="mb-1 flex items-center gap-1.5">
                                          <label className="block text-[11px] font-medium uppercase tracking-wide text-[var(--ops-text-muted)]">
                                            {paymentReferenceMeta.label}
                                          </label>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                type="button"
                                                className="rounded-full p-0.5 text-[var(--ops-text-muted)] transition hover:bg-[var(--ops-surface)] hover:text-[var(--ops-text)]"
                                                aria-label={`Informacion de ${paymentReferenceMeta.label.toLowerCase()}`}
                                              >
                                                <Info className="h-3.5 w-3.5" />
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" sideOffset={8}>
                                              {paymentReferenceMeta.helper}
                                            </TooltipContent>
                                          </Tooltip>
                                        </div>
                                        <input
                                          value={payment.reference}
                                          onChange={(event) =>
                                            updateMixedPaymentDraft(payment.id, "reference", event.target.value)
                                          }
                                          placeholder={paymentReferenceMeta.placeholder}
                                          className={`${INPUT_CLASS} ${
                                            payment.method === "cash" ? "bg-[var(--ops-surface-muted)]" : ""
                                          }`}
                                        />
                                      </div>

                                      <div className="flex md:justify-end">
                                        <button
                                          type="button"
                                          onClick={() => removeMixedPaymentDraft(payment.id)}
                                          className="cursor-pointer rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-2.5 py-2 text-xs font-semibold text-[var(--ops-text-muted)] transition hover:bg-[var(--ops-surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
                                          disabled={mixedPayments.length <= 2}
                                        >
                                          Quitar
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="text-[var(--ops-text-muted)]">
                                  Asignado: S/. {formatMoney(mixedPaymentsPreview.enteredTotal)}
                                </span>
                                <span className="font-semibold text-[var(--ops-text)]">
                                  Total: S/. {formatMoney(totals.total)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </section>

                    <article
                      ref={summarySectionRef}
                      className={`sales-panel rounded-xl p-4 shadow-sm xl:order-5 ${
                        activeStage === "summary" ? "" : "hidden"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="sales-chip sales-chip-accent rounded-full px-2.5 py-1 text-sm font-semibold">
                            <Receipt className="h-4 w-4" />
                          </span>
                          <div>
                            <h2 className="text-lg font-semibold text-[var(--ops-text)]">
                              Resumen de venta
                            </h2>
                          </div>
                        </div>

                        <SemanticChip tone={submitDisabled ? "warning" : "success"} className="px-3 text-xs">
                          {submitDisabled ? "Pendiente por validar" : "Listo para finalizar"}
                        </SemanticChip>
                      </div>

                      <div className="mt-4 space-y-3">
                        <section className="border-y border-[var(--ops-border-strong)] py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-[var(--ripnel-accent)]" />
                              <h3 className="text-sm font-semibold text-[var(--ops-text)]">Cliente</h3>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => goToStage("customer")}
                              className="rounded-lg"
                            >
                              <PencilLine className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                          </div>

                          <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                                Comprobante
                              </p>
                              <p className="mt-1 font-medium text-[var(--ops-text)]">
                                {activeDocumentOption.label}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                                Cliente
                              </p>
                              <p className="mt-1 font-medium text-[var(--ops-text)]">
                                {selectedCustomerName}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                                Documento
                              </p>
                              <p className="mt-1 font-medium text-[var(--ops-text)]">
                                {selectedCustomerDocument}
                              </p>
                            </div>
                          </div>
                        </section>

                        <section className="border-b border-[var(--ops-border-strong)] pb-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <ShoppingBasket className="h-4 w-4 text-[var(--ripnel-accent)]" />
                              <h3 className="text-sm font-semibold text-[var(--ops-text)]">
                                Productos ({cartCount})
                              </h3>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => goToStage("products")}
                              className="rounded-lg"
                            >
                              <PencilLine className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                          </div>

                          <div className="mt-3 overflow-x-auto">
                            <div className="min-w-[640px] border-y border-[var(--ops-border-strong)]">
                              <div className="hidden bg-[var(--ops-surface-muted)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)] md:grid md:grid-cols-[minmax(0,1.5fr)_120px_90px_120px] md:gap-4">
                                <span>Producto</span>
                                <span>Variacion</span>
                                <span className="text-center">Cant.</span>
                                <span className="text-right">Subtotal</span>
                              </div>
                              <div className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                                {totals.items.map((item) => (
                                  <div
                                    key={item.variant_id}
                                    className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[minmax(0,1.5fr)_120px_90px_120px] md:items-center md:gap-4"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate font-medium text-[var(--ops-text)]">
                                        {item.style_name}
                                      </p>
                                      <p className="mt-0.5 text-[11px] text-[var(--ops-text-muted)]">
                                        {item.sku}
                                      </p>
                                    </div>
                                    <p className="text-[var(--ops-text-muted)]">
                                      {(item.color_name || item.color_code)} / {(item.size_name || item.size_code)}
                                    </p>
                                    <p className="text-center font-medium text-[var(--ops-text)]">
                                      {item.quantity}
                                    </p>
                                    <p className="text-left font-semibold text-[var(--ops-text)] md:text-right">
                                      S/. {formatMoney(item.line_subtotal_before_discount)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </section>

                        <section className="border-b border-[var(--ops-border-strong)] pb-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-[var(--ripnel-accent)]" />
                              <h3 className="text-sm font-semibold text-[var(--ops-text)]">Cobro</h3>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => goToStage("payment")}
                              className="rounded-lg"
                            >
                              <PencilLine className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                          </div>

                          <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                                Modalidad
                              </p>
                              <p className="mt-1 font-medium text-[var(--ops-text)]">
                                {paymentMode === "mixed" ? "Pago mixto" : "Pago unico"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                                Medio principal
                              </p>
                              <p className="mt-1 font-medium text-[var(--ops-text)]">
                                {paymentSummaryLabel}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                                Cobro asignado
                              </p>
                              <p className="mt-1 font-medium text-[var(--ops-text)]">
                                S/.{" "}
                                {formatMoney(
                                  paymentMode === "mixed"
                                    ? mixedPaymentsPreview.enteredTotal
                                    : totals.total
                                )}
                              </p>
                            </div>
                          </div>

                          {paymentMode === "mixed" ? (
                            <div className="mt-3 divide-y divide-[var(--ops-border-strong)] border-y border-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                              {mixedPayments.map((payment) => {
                                const PaymentMethodIcon = getPaymentMethodIcon(payment.method)
                                return (
                                  <div
                                    key={payment.id}
                                    className="grid gap-2 px-3 py-2.5 text-sm md:grid-cols-[minmax(0,1fr)_112px_minmax(0,1fr)] md:items-center"
                                  >
                                    <div className="flex items-center gap-2 font-medium text-[var(--ops-text)]">
                                      <PaymentMethodIcon className="h-4 w-4 text-[var(--ripnel-accent)]" />
                                      {getPaymentMethodLabel(payment.method)}
                                    </div>
                                    <span className="font-medium text-[var(--ops-text)]">
                                      S/. {formatMoney(parseAmountInput(payment.amount) || 0)}
                                    </span>
                                    <span className="truncate text-[var(--ops-text-muted)]">
                                      {trimOrNull(payment.reference) || "Sin referencia"}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          ) : null}
                        </section>
                      </div>
                    </article>

                    <article
                      className={`sales-panel rounded-xl p-4 shadow-sm xl:order-6 xl:sticky xl:top-20 xl:self-start ${
                        activeStage === "summary" ? "" : "hidden"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-[var(--ripnel-accent)]" />
                        <h2 className="text-base font-semibold text-[var(--ops-text)]">Totales</h2>
                      </div>
                      <div className="mt-4 space-y-2 text-sm">
                        <div
                          className={`rounded-lg border px-3 py-2 ${
                            cashReady ? buildSemanticChipClass("success") : buildSemanticChipClass("warning")
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold">
                              Estado de caja: {cashReady ? "Abierta" : buildCashLabel(cashStatus)}
                            </span>
                            {!cashReady ? (
                              canOpenCashModule ? (
                                <Link
                                  href="/caja"
                                  className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
                                >
                                  Ir a Caja del dia
                                </Link>
                              ) : (
                                <span className="text-xs">Solicita apertura a caja/admin.</span>
                              )
                            ) : null}
                          </div>
                        </div>

                        <div className="flex justify-between text-[var(--ops-text-muted)]">
                          <span>Subtotal base</span>
                          <span>S/. {formatMoney(totals.baseSubtotal)}</span>
                        </div>
                        {totals.saleDiscountAmount > 0 ? (
                          <div className="flex justify-between text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]">
                            <span>Descuento general</span>
                            <span>- S/. {formatMoney(totals.saleDiscountAmount)}</span>
                          </div>
                        ) : null}
                        <div className="flex justify-between border-t border-[var(--ops-border-strong)] pt-2 text-base font-bold text-[var(--ops-text)]">
                          <span>Total documento</span>
                          <span>S/. {formatMoney(totals.total)}</span>
                        </div>
                        {totals.taxRate > 0 ? (
                          <div className="flex justify-between text-[var(--ops-text-muted)]">
                            <span>IGV incluido ({(totals.taxRate * 100).toFixed(0)}%)</span>
                            <span>S/. {formatMoney(totals.tax)}</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="sales-panel-muted rounded-xl px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                            Cobro asignado
                          </p>
                          <p className="mt-1 text-xl font-semibold text-[var(--ops-text)]">
                            S/.{" "}
                            {formatMoney(
                              paymentMode === "mixed"
                                ? mixedPaymentsPreview.enteredTotal
                                : totals.total
                            )}
                          </p>
                        </div>
                        <div className="sales-panel-muted rounded-xl px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                            Estado
                          </p>
                          <p
                            className={`mt-1 text-sm font-semibold ${
                              submitDisabled
                                ? "text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]"
                                : "text-[color:color-mix(in_srgb,#059669_74%,var(--ops-text))]"
                            }`}
                          >
                            {summaryStatusMessage}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                          Acciones
                        </p>
                        <div className="mt-2 space-y-2">
                          <Button type="button" variant="outline" className="w-full justify-start" disabled>
                            <Receipt className="h-4 w-4" />
                            Imprimir comprobante
                          </Button>
                          <Button type="button" variant="outline" className="w-full justify-start" disabled>
                            <Users className="h-4 w-4" />
                            Enviar por correo
                          </Button>
                          <Button type="button" variant="outline" className="w-full justify-start" disabled>
                            <History className="h-4 w-4" />
                            Descargar PDF
                          </Button>
                          <Button type="button" variant="outline" className="w-full justify-start" disabled>
                            <BadgeCheck className="h-4 w-4" />
                            Guardar venta como borrador
                          </Button>
                        </div>
                      </div>

                      {totals.hasMissingPrice ? (
                        <p className={`mt-3 rounded-lg border px-3 py-2 text-sm ${buildSemanticChipClass("warning")}`}>
                          Hay items sin precio vigente. Ajustalos antes del cierre.
                        </p>
                      ) : null}

                      {error ? (
                        <p className={`mt-3 rounded-lg border px-3 py-2 text-sm ${buildSemanticChipClass("danger")}`}>
                          {error}
                        </p>
                      ) : null}

                      <button
                        type="button"
                        onClick={confirmSale}
                        disabled={submitDisabled}
                        className="mt-4 w-full cursor-pointer rounded-lg bg-[var(--ripnel-accent)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--ripnel-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {submitting ? "Procesando..." : "Finalizar venta"}
                      </button>
                    </article>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </TooltipProvider>

        <DialogPrimitive.Root open={discountModalOpen} onOpenChange={setDiscountModalOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/15 backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
            <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5 shadow-xl outline-none data-open:animate-in data-open:zoom-in-95 data-closed:animate-out data-closed:zoom-out-95">
              <div className="flex items-start justify-between gap-4 border-b border-[var(--ops-border-strong)] pb-4">
                <div>
                  <DialogPrimitive.Title className="text-lg font-semibold text-[var(--ops-text)]">
                    Ajustes comerciales
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="mt-1 text-sm text-[var(--ops-text-muted)]">
                    El descuento afecta el total del documento. Los precios base del producto se mantienen visibles por separado.
                  </DialogPrimitive.Description>
                </div>
                <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--ops-border-strong)] text-[var(--ops-text-muted)] transition hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)]"
                    aria-label="Cerrar ajustes comerciales"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </DialogPrimitive.Close>
              </div>

              <div className="mt-4 grid gap-4">
                <div className="grid gap-3 lg:grid-cols-[180px_120px_minmax(0,1fr)]">
                  <div>
                    <label className={COMPACT_LABEL_CLASS}>Tipo</label>
                    <OpsSelectMenu
                      value={saleDiscount.mode}
                      onValueChange={(value) =>
                        setSaleDiscount((current) => ({
                          ...current,
                          mode: value,
                          value: value === "none" ? "" : current.value,
                          reason: value === "none" ? "" : current.reason,
                        }))
                      }
                      placeholder="Tipo de descuento"
                      options={SALE_DISCOUNT_OPTIONS}
                    />
                  </div>

                  {saleDiscount.mode !== "none" ? (
                    <div>
                      <label className={COMPACT_LABEL_CLASS}>
                        {saleDiscount.mode === "percent" ? "Porcentaje" : "Monto"}
                      </label>
                      <input
                        value={saleDiscount.value}
                        onChange={(event) =>
                          setSaleDiscount((current) => ({
                            ...current,
                            value: event.target.value,
                          }))
                        }
                        inputMode="decimal"
                        placeholder={saleDiscount.mode === "percent" ? "10" : "20.00"}
                        className={INPUT_CLASS}
                      />
                    </div>
                  ) : (
                    <div className="hidden lg:block" aria-hidden="true" />
                  )}

                  <div className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--ops-text-muted)]">Subtotal base</span>
                      <span className="font-semibold text-[var(--ops-text)]">
                        S/. {formatMoney(totals.baseSubtotal)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <span className="text-[var(--ops-text-muted)]">Descuento</span>
                      <span className="font-semibold text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]">
                        - S/. {formatMoney(totals.saleDiscountAmount)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3 border-t border-[var(--ops-border-strong)] pt-1">
                      <span className="font-semibold text-[var(--ops-text)]">Total documento</span>
                      <span className="font-semibold text-[var(--ops-text)]">
                        S/. {formatMoney(saleDiscountTargetTotal)}
                      </span>
                    </div>
                    {totals.taxRate > 0 ? (
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <span className="text-[var(--ops-text-muted)]">
                          IGV incluido ({(totals.taxRate * 100).toFixed(0)}%)
                        </span>
                        <span className="font-semibold text-[var(--ops-text)]">
                          S/. {formatMoney(totals.tax)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {saleDiscount.mode !== "none" ? (
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div>
                      <label className={COMPACT_LABEL_CLASS}>Motivo</label>
                      <OpsSelectMenu
                        value={discountReasonSelection}
                        onValueChange={(value) =>
                          setSaleDiscount((current) => ({
                            ...current,
                            reason: value === "custom" ? "" : value,
                          }))
                        }
                        placeholder="Seleccionar motivo"
                        options={SALE_DISCOUNT_REASON_OPTIONS}
                      />
                    </div>

                    {discountReasonSelection === "custom" ? (
                      <div>
                        <label className={COMPACT_LABEL_CLASS}>Detalle</label>
                        <input
                          value={saleDiscount.reason}
                          onChange={(event) =>
                            setSaleDiscount((current) => ({
                              ...current,
                              reason: event.target.value,
                            }))
                          }
                          placeholder="Motivo personalizado"
                          className={INPUT_CLASS}
                        />
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-[var(--ops-border-soft)] px-3 py-2 text-sm text-[var(--ops-text-muted)]">
                        El descuento quedará trazado en el comprobante y en el resumen final.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-[var(--ops-border-soft)] px-3 py-2 text-sm text-[var(--ops-text-muted)]">
                    Sin descuento general aplicado.
                  </div>
                )}

                {saleDiscountError ? (
                  <p className={`rounded-lg border px-3 py-2 text-sm ${buildSemanticChipClass("warning")}`}>
                    {saleDiscountError}
                  </p>
                ) : null}
              </div>

              <div className="mt-5 flex justify-end gap-3 border-t border-[var(--ops-border-strong)] pt-4">
                <DialogPrimitive.Close asChild>
                  <Button type="button" variant="outline" className="rounded-lg">
                    Cerrar
                  </Button>
                </DialogPrimitive.Close>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>

        <SheetContent side="right" className="w-full border-l border-[var(--ops-border-strong)] bg-[var(--ops-surface)] sm:max-w-lg">
          <SheetHeader className="border-b border-[var(--ops-border-strong)] px-5 py-4">
            <SheetTitle>
              {customerSheetMode === "edit" ? "Editar cliente" : "Crear cliente rapido"}
            </SheetTitle>
            <SheetDescription>
              {customerSheetMode === "edit"
                ? "Ajusta el cliente seleccionado sin salir de la venta."
                : "Crea un cliente operativo y dejalo seleccionado automaticamente en la venta."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--ops-text-muted)]">
                  Tipo de alta
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerForm(createEmptyCustomerForm("retail"))}
                    disabled={customerSheetMode === "edit"}
                    className={`cursor-pointer rounded-xl border px-3 py-2 text-left text-sm transition ${
                      customerForm.entry_mode === "retail"
                        ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_40%,var(--ops-border-strong))] bg-[var(--ripnel-accent-soft)] font-semibold text-[var(--ripnel-accent-hover)] ring-1 ring-[color:color-mix(in_srgb,var(--ripnel-accent)_28%,transparent)]"
                        : "border-[var(--ops-border-strong)] text-[var(--ops-text)] hover:border-[color:color-mix(in_srgb,var(--ripnel-accent)_28%,var(--ops-border-strong))]"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    Cliente retail
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerForm(createEmptyCustomerForm("factura"))}
                    disabled={customerSheetMode === "edit"}
                    className={`cursor-pointer rounded-xl border px-3 py-2 text-left text-sm transition ${
                      customerForm.entry_mode === "factura"
                        ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_40%,var(--ops-border-strong))] bg-[var(--ripnel-accent-soft)] font-semibold text-[var(--ripnel-accent-hover)] ring-1 ring-[color:color-mix(in_srgb,var(--ripnel-accent)_28%,transparent)]"
                        : "border-[var(--ops-border-strong)] text-[var(--ops-text)] hover:border-[color:color-mix(in_srgb,var(--ripnel-accent)_28%,var(--ops-border-strong))]"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    Cliente factura
                  </button>
                </div>
              </div>

              {customerForm.entry_mode === "factura" ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                      RUC
                    </label>
                    <input
                      value={customerForm.document_number}
                      onChange={(event) =>
                        setCustomerForm((current) => ({
                          ...current,
                          document_number: event.target.value,
                        }))
                      }
                      placeholder="20123456789"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                      Razon social
                    </label>
                    <input
                      value={customerForm.business_name}
                      onChange={(event) =>
                        setCustomerForm((current) => ({
                          ...current,
                          business_name: event.target.value,
                        }))
                      }
                      placeholder="Empresa Demo S.A.C."
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                      Direccion fiscal
                    </label>
                    <input
                      value={customerForm.address}
                      onChange={(event) =>
                        setCustomerForm((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                      placeholder="Av. Ejemplo 123, Lima"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                        Telefono
                      </label>
                      <input
                        value={customerForm.phone}
                        onChange={(event) =>
                          setCustomerForm((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                        placeholder="999 000 000"
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                        Correo
                      </label>
                      <input
                        value={customerForm.email}
                        onChange={(event) =>
                          setCustomerForm((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                        placeholder="ventas@empresa.com"
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                        Tipo de documento
                      </label>
                      <select
                        value={customerForm.document_type}
                        onChange={(event) =>
                          setCustomerForm((current) => ({
                            ...current,
                            document_type: event.target.value,
                            document_number:
                              event.target.value === "none" ? "" : current.document_number,
                          }))
                        }
                        className={INPUT_CLASS}
                      >
                        <option value="dni">DNI</option>
                        <option value="ce">CE</option>
                        <option value="passport">Pasaporte</option>
                        <option value="none">Sin documento</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                        Numero de documento
                      </label>
                      <input
                        value={customerForm.document_number}
                        onChange={(event) =>
                          setCustomerForm((current) => ({
                            ...current,
                            document_number: event.target.value,
                          }))
                        }
                        placeholder="Ingresa el numero"
                        className={`${INPUT_CLASS} ${
                          customerForm.document_type === "none" ? "bg-[var(--ops-surface-muted)]" : ""
                        }`}
                        disabled={customerForm.document_type === "none"}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                      Nombre completo
                    </label>
                    <input
                      value={customerForm.full_name}
                      onChange={(event) =>
                        setCustomerForm((current) => ({
                          ...current,
                          full_name: event.target.value,
                        }))
                      }
                      placeholder="Nombre del cliente"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                        Telefono
                      </label>
                      <input
                        value={customerForm.phone}
                        onChange={(event) =>
                          setCustomerForm((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                        placeholder="999 000 000"
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                        Correo
                      </label>
                      <input
                        value={customerForm.email}
                        onChange={(event) =>
                          setCustomerForm((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                        placeholder="cliente@correo.com"
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                </>
              )}

              {customerFormError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {customerFormError}
                </div>
              ) : null}
            </div>
          </div>

          <SheetFooter className="border-t border-[var(--ops-border-strong)] px-5 py-4">
            <div className="flex w-full gap-3">
              <button
                type="button"
                onClick={closeCustomerSheet}
                disabled={customerSaving}
                className="flex-1 rounded-lg border border-[var(--ops-border-strong)] px-4 py-2.5 text-sm font-medium text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitCustomerForm}
                disabled={customerSaving}
                className="flex-1 cursor-pointer rounded-2xl bg-[var(--ripnel-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--ripnel-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {customerSaving
                  ? "Guardando..."
                  : customerSheetMode === "edit"
                    ? "Guardar cliente"
                    : "Crear y seleccionar"}
              </button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={priceSheetOpen}
        onOpenChange={(open) => {
          if (!open) {
            closePriceSheet()
          } else {
            setPriceSheetOpen(true)
          }
        }}
      >
        <SheetContent side="right" className="w-full border-l border-[var(--ops-border-strong)] bg-[var(--ops-surface)] sm:max-w-md">
          <SheetHeader className="border-b border-[var(--ops-border-strong)] px-5 py-4">
            <SheetTitle>Ajustar precio del item</SheetTitle>
            <SheetDescription>
              Define un precio manual y deja el motivo trazado en la venta.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {priceTargetItem ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] p-4">
                  <p className="text-sm font-semibold text-[var(--ops-text)]">{priceTargetItem.label}</p>
                  <p className="mt-1 text-xs text-[var(--ops-text-muted)]">{priceTargetItem.sku}</p>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-[var(--ops-text-muted)]">
                        {priceTargetPreviewItem?.price_type_applied === "wholesale" ? "Mayorista" : "Retail"}
                      </p>
                      <p className="font-semibold text-[var(--ops-text)]">
                        S/.{" "}
                        {formatMoney(
                          priceTargetPreviewItem?.unit_price_list ??
                            priceTargetItem.wholesale_price ??
                            priceTargetItem.retail_price
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-[var(--ops-text-muted)]">Cantidad</p>
                      <p className="font-semibold text-[var(--ops-text)]">{priceTargetItem.quantity}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-[var(--ops-text-muted)]">Regla aplicada</p>
                      <p className="font-semibold text-[var(--ops-text)]">
                        {priceTargetPreviewItem?.price_type_applied === "wholesale"
                          ? "Mayorista 3+"
                          : "Retail"}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                    Precio final por unidad
                  </label>
                  <input
                    value={priceForm.unit_price_final}
                    onChange={(event) =>
                      setPriceForm((current) => ({
                        ...current,
                        unit_price_final: event.target.value,
                      }))
                    }
                    placeholder="0.00"
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">
                    Motivo del ajuste
                  </label>
                  <input
                    value={priceForm.reason}
                    onChange={(event) =>
                      setPriceForm((current) => ({
                        ...current,
                        reason: event.target.value,
                      }))
                    }
                    placeholder="Cliente frecuente, cierre comercial, observacion..."
                    className={INPUT_CLASS}
                  />
                </div>

                {priceFormError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {priceFormError}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--ops-border-soft)] px-4 py-8 text-center text-sm text-[var(--ops-text-muted)]">
                Selecciona un item para ajustar su precio.
              </div>
            )}
          </div>

          <SheetFooter className="border-t border-[var(--ops-border-strong)] px-5 py-4">
            <div className="flex w-full gap-3">
              {priceTargetItem?.price_override ? (
                <button
                  type="button"
                  onClick={() => clearPriceAdjustment(priceTargetItem.variant_id)}
                  className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition hover:bg-[var(--ops-surface-muted)] ${buildSemanticChipClass("warning")}`}
                >
                  Quitar ajuste
                </button>
              ) : null}
              <button
                type="button"
                onClick={closePriceSheet}
                className="flex-1 rounded-lg border border-[var(--ops-border-strong)] px-4 py-2.5 text-sm font-medium text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitPriceAdjustment}
                className="flex-1 cursor-pointer rounded-2xl bg-[var(--ripnel-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--ripnel-accent-hover)]"
              >
                Guardar ajuste
              </button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PermissionGuard>
    </ErrorBoundary>
  )
}
