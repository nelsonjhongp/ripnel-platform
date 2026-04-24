"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
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
  ShieldCheck,
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
import { ApiError, apiFetch, unwrapApiData } from "@/lib/api"

const DOC_TYPES = [
  { value: "none", label: "Sin comprobante" },
  { value: "boleta", label: "Boleta (DNI/CE)" },
  { value: "factura", label: "Factura (RUC)" },
  { value: "proforma", label: "Proforma" },
]

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "yape", label: "Yape" },
  { value: "plin", label: "Plin" },
  { value: "transfer", label: "Transferencia" },
]

const SALE_DISCOUNT_OPTIONS = [
  { value: "none", label: "Sin descuento" },
  { value: "percent", label: "Desc. %" },
  { value: "amount", label: "Monto fijo" },
]

const TAX_RATE = { none: 0, proforma: 0, boleta: 0.18, factura: 0.18 }
const GENERIC_CUSTOMER_CODE = "SALE-CLI-001"
const SELLER_DOC_RULES = {
  dni: { label: "DNI", regex: /^\d{8}$/ },
  ruc: { label: "RUC", regex: /^\d{11}$/ },
  ce: { label: "CE", regex: /^[A-Za-z0-9]{9,12}$/ },
  passport: { label: "Pasaporte", regex: /^[A-Za-z0-9]{6,15}$/ },
}

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"

function round2(value) {
  return Math.round(value * 100) / 100
}

function trimOrNull(value) {
  const normalized = String(value || "").trim()
  return normalized || null
}

function formatMoney(value) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized.toFixed(2) : "--"
}

function parseAmountInput(value) {
  if (value === undefined || value === null) return null
  const normalized = String(value).trim().replace(",", ".")
  if (!normalized) return null

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) return null

  return round2(parsed)
}

function createPaymentDraft(method = "cash", amount = "") {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method,
    amount,
    reference: "",
  }
}

function createDefaultMixedPayments(totalAmount, preferredMethod = "cash") {
  const secondaryMethod =
    PAYMENT_METHODS.find((method) => method.value !== preferredMethod)?.value || "yape"
  const normalizedTotal = totalAmount > 0 ? formatMoney(totalAmount) : ""

  return [
    createPaymentDraft(preferredMethod, normalizedTotal),
    createPaymentDraft(secondaryMethod, ""),
  ]
}

function buildCustomerDisplayName(customer) {
  if (!customer) return "Cliente no seleccionado"

  return (
    customer.display_name ||
    customer.full_name ||
    customer.business_name ||
    customer.commercial_name ||
    "Cliente sin nombre"
  )
}

function buildCustomerDocument(customer) {
  if (!customer || !customer.document_type || customer.document_type === "none") {
    return "Sin documento"
  }

  return `${String(customer.document_type).toUpperCase()} ${customer.document_number || ""}`.trim()
}

function computeSaleDiscountAmount(subtotalAmount, saleDiscount) {
  if (!saleDiscount || saleDiscount.mode === "none") {
    return 0
  }

  const value = parseAmountInput(saleDiscount.value)
  if (value === null || subtotalAmount <= 0) {
    return 0
  }

  if (saleDiscount.mode === "percent") {
    return round2((subtotalAmount * value) / 100)
  }

  return Math.min(round2(value), subtotalAmount)
}

function allocateDiscountAcrossItems(items, discountAmount) {
  if (!items.length || discountAmount <= 0) {
    return items.map((item) => ({
      ...item,
      line_discount_amount: 0,
      line_subtotal: item.line_subtotal_before_discount,
    }))
  }

  const totalBase = round2(
    items.reduce(
      (accumulator, item) => accumulator + Number(item.line_subtotal_before_discount || 0),
      0
    )
  )

  let remainingDiscount = discountAmount

  return items.map((item, index) => {
    const lineBase = round2(Number(item.line_subtotal_before_discount || 0))
    const proportionalDiscount =
      index === items.length - 1
        ? remainingDiscount
        : round2((discountAmount * lineBase) / totalBase)
    const lineDiscount = Math.min(lineBase, Math.max(proportionalDiscount, 0), remainingDiscount)

    remainingDiscount = round2(remainingDiscount - lineDiscount)

    return {
      ...item,
      line_discount_amount: lineDiscount,
      line_subtotal: round2(lineBase - lineDiscount),
    }
  })
}

function applyTaxesToPreviewItems(items, taxRate) {
  const subtotal = round2(
    items.reduce((accumulator, item) => accumulator + Number(item.line_subtotal || 0), 0)
  )
  const tax = round2(subtotal * taxRate)
  let remainingTax = tax

  const computedItems = items.map((item, index) => {
    const lineTax = index === items.length - 1 ? remainingTax : round2(item.line_subtotal * taxRate)
    remainingTax = round2(remainingTax - lineTax)

    return {
      ...item,
      preview_unit_price_final: round2(item.line_subtotal / item.quantity),
      line_tax: lineTax,
      line_total: round2(item.line_subtotal + lineTax),
    }
  })

  return {
    items: computedItems,
    subtotal,
    tax,
    total: round2(subtotal + tax),
  }
}

function shouldApplyWholesalePreview(cart, pricingConfig) {
  const wholesaleMinQty = Number(pricingConfig?.wholesale_min_qty_total || 0)
  if (!wholesaleMinQty) {
    return false
  }

  const totalQuantity = cart.reduce((accumulator, item) => accumulator + Number(item.quantity || 0), 0)
  return totalQuantity >= wholesaleMinQty
}

function calculateSalePreview(cart, documentType, saleDiscount, pricingConfig) {
  const taxRate = TAX_RATE[documentType] ?? 0
  const wholesaleApplies = shouldApplyWholesalePreview(cart, pricingConfig)

  const preparedItems = cart.map((item) => {
    const autoUnitPrice =
      wholesaleApplies && item.wholesale_price !== null && item.wholesale_price !== undefined
        ? Number(item.wholesale_price || 0)
        : item.retail_price !== null && item.retail_price !== undefined
          ? Number(item.retail_price || 0)
          : null
    const unitPriceBeforeDiscount = item.price_override?.unit_price_final ?? Number(autoUnitPrice || 0)
    const lineSubtotalBeforeDiscount = round2(unitPriceBeforeDiscount * item.quantity)
    const priceTypeApplied =
      wholesaleApplies && item.wholesale_price !== null && item.wholesale_price !== undefined
        ? "wholesale"
        : "retail"

    return {
      ...item,
      unit_price_list: autoUnitPrice,
      unit_price_before_discount: unitPriceBeforeDiscount,
      price_type_applied: priceTypeApplied,
      pricing_rule_applied: priceTypeApplied === "wholesale" ? pricingConfig?.wholesale_rule_type || null : null,
      line_subtotal_before_discount: lineSubtotalBeforeDiscount,
    }
  })
  const hasMissingPrice = preparedItems.some(
    (item) => item.unit_price_list === null || item.unit_price_list === undefined
  )

  const baseSubtotal = round2(
    preparedItems.reduce(
      (accumulator, item) => accumulator + Number(item.line_subtotal_before_discount || 0),
      0
    )
  )
  const saleDiscountAmount = computeSaleDiscountAmount(baseSubtotal, saleDiscount)
  const discountedItems = allocateDiscountAcrossItems(preparedItems, saleDiscountAmount)
  const taxedPreview = applyTaxesToPreviewItems(discountedItems, taxRate)

  return {
    ...taxedPreview,
    taxRate,
    hasMissingPrice,
    baseSubtotal,
    saleDiscountAmount,
    priceMode: wholesaleApplies ? "wholesale" : "retail",
    wholesaleApplied: wholesaleApplies,
  }
}

function buildCashLabel(status) {
  if (status === "open") return "Caja operativa abierta"
  if (status === "closed") return "Caja operativa cerrada"
  return "Caja pendiente de apertura"
}

function buildCashTone(status) {
  if (status === "open") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (status === "closed") return "border-rose-200 bg-rose-50 text-rose-800"
  return "border-amber-200 bg-amber-50 text-amber-800"
}

function getDocumentIcon(documentType) {
  if (documentType === "factura") return Receipt
  if (documentType === "boleta") return CreditCard
  if (documentType === "proforma") return BadgeCheck
  return CircleAlert
}

function getPaymentMethodIcon(method) {
  if (method === "cash") return Banknote
  if (method === "transfer") return Landmark
  return Smartphone
}

function isCustomerValidForDocumentType(customer, documentType) {
  if (!customer) return false
  const customerDocType = String(customer.document_type || "").toLowerCase()

  if (documentType === "boleta") {
    const documentNumber = String(customer.document_number || "").trim()

    if (customerDocType === "dni") {
      return /^\d{8}$/.test(documentNumber)
    }

    if (customerDocType === "ce") {
      return /^\d{9}$/.test(documentNumber)
    }

    return false
  }

  if (documentType === "factura") {
    return (
      customerDocType === "ruc" &&
      Boolean(customer.document_number) &&
      Boolean(customer.address)
    )
  }

  return true
}

function getCustomerSearchFilter(documentType) {
  if (documentType === "factura") {
    return { queryDocumentType: "ruc", localDocumentTypes: ["ruc"] }
  }

  if (documentType === "boleta") {
    return { queryDocumentType: null, localDocumentTypes: ["dni", "ce"] }
  }

  return { queryDocumentType: null, localDocumentTypes: null }
}

function filterCustomersByDocumentType(customers, documentType) {
  const { localDocumentTypes } = getCustomerSearchFilter(documentType)

  if (!localDocumentTypes) {
    return customers
  }

  return (customers || []).filter((customer) => {
    const customerDocType = String(customer?.document_type || "").toLowerCase()
    return localDocumentTypes.includes(customerDocType)
  })
}

function groupVariantsByStyle(variants) {
  const grouped = new Map()

  for (const variant of variants) {
    if (!grouped.has(variant.style_id)) {
      grouped.set(variant.style_id, {
        style_id: variant.style_id,
        style_name: variant.style_name,
        style_code: variant.style_code,
        variants: [],
      })
    }

    grouped.get(variant.style_id).variants.push(variant)
  }

  return Array.from(grouped.values())
}

function normalizeSearchValue(value) {
  return String(value || "").trim().toLowerCase()
}

function getStyleSearchMeta(style, rawQuery, searchScope) {
  const query = normalizeSearchValue(rawQuery)
  if (!query) {
    return { matches: true, rank: 2 }
  }

  const styleName = normalizeSearchValue(style.style_name)
  const styleCode = normalizeSearchValue(style.style_code)
  const variantSkus = (style.variants || []).map((variant) => normalizeSearchValue(variant.sku))

  const exactCodeMatch = styleCode === query || variantSkus.some((sku) => sku === query)
  const partialCodeMatch =
    (styleCode && styleCode.includes(query)) || variantSkus.some((sku) => sku.includes(query))
  const nameMatch = styleName.includes(query)

  if (searchScope === "code") {
    if (exactCodeMatch) return { matches: true, rank: 0 }
    if (partialCodeMatch) return { matches: true, rank: 1 }
    return { matches: false, rank: 99 }
  }

  if (searchScope === "name") {
    return { matches: nameMatch, rank: nameMatch ? 2 : 99 }
  }

  if (exactCodeMatch) return { matches: true, rank: 0 }
  if (partialCodeMatch) return { matches: true, rank: 1 }
  if (nameMatch) return { matches: true, rank: 2 }

  return { matches: false, rank: 99 }
}

function buildProductSearchResults(styles, rawQuery) {
  return styles
    .map((style) => {
      const totalStock = style.variants.reduce(
        (accumulator, variant) => accumulator + Number(variant.stock || 0),
        0
      )
      const searchMeta = getStyleSearchMeta(style, rawQuery, "all")

      return {
        ...style,
        totalStock,
        searchRank: searchMeta.rank,
        matchesScope: searchMeta.matches,
      }
    })
    .filter((style) => style.matchesScope)
    .sort((left, right) => {
      if (left.searchRank !== right.searchRank) {
        return left.searchRank - right.searchRank
      }

      const leftHasStock = left.totalStock > 0 ? 1 : 0
      const rightHasStock = right.totalStock > 0 ? 1 : 0
      if (leftHasStock !== rightHasStock) {
        return rightHasStock - leftHasStock
      }

      if (left.totalStock !== right.totalStock) {
        return right.totalStock - left.totalStock
      }

      return String(left.style_name || "").localeCompare(String(right.style_name || ""))
    })
}

function getVariantOptionValues(variants, key, filters = {}) {
  const values = new Set()

  for (const variant of variants || []) {
    const matchesFilters = Object.entries(filters).every(([filterKey, filterValue]) => {
      if (!filterValue) {
        return true
      }

      return String(variant?.[filterKey] || "") === String(filterValue)
    })

    if (!matchesFilters) {
      continue
    }

    const optionValue = String(variant?.[key] || "").trim()
    if (optionValue) {
      values.add(optionValue)
    }
  }

  return Array.from(values).sort((left, right) => left.localeCompare(right))
}

function findVariantByAttributes(variants, sizeCode, colorCode) {
  if (!sizeCode || !colorCode) {
    return null
  }

  return (
    (variants || []).find(
      (variant) =>
        String(variant.size_code || "") === String(sizeCode) &&
        String(variant.color_code || "") === String(colorCode)
    ) || null
  )
}

function explainApiError(error, fallback) {
  if (!(error instanceof ApiError)) {
    return fallback
  }

  if (error.status === 403) {
    return "Tu usuario no tiene permisos para operar ventas en este modulo."
  }

  if (error.status === 409) {
    return error.message
  }

  if (error.status === 401) {
    return "La sesion ya no es valida. Inicia sesion otra vez para continuar."
  }

  return error.message || fallback
}

function createEmptyCustomerForm(mode = "retail") {
  if (mode === "factura") {
    return {
      entry_mode: "factura",
      document_type: "ruc",
      document_number: "",
      full_name: "",
      business_name: "",
      commercial_name: "",
      address: "",
      phone: "",
      email: "",
    }
  }

  return {
    entry_mode: "retail",
    document_type: "dni",
    document_number: "",
    full_name: "",
    business_name: "",
    commercial_name: "",
    address: "",
    phone: "",
    email: "",
  }
}

function buildCustomerFormFromCustomer(customer) {
  const entryMode = String(customer?.document_type || "").toLowerCase() === "ruc" ? "factura" : "retail"

  return {
    entry_mode: entryMode,
    document_type: customer?.document_type || (entryMode === "factura" ? "ruc" : "dni"),
    document_number: customer?.document_number || "",
    full_name: customer?.full_name || "",
    business_name: customer?.business_name || "",
    commercial_name: customer?.commercial_name || "",
    address: customer?.address || "",
    phone: customer?.phone || "",
    email: customer?.email || "",
  }
}

function validateCustomerForm(form) {
  if (form.entry_mode === "factura") {
    if (!trimOrNull(form.business_name)) {
      return "La razon social es obligatoria para cliente factura."
    }

    if (!SELLER_DOC_RULES.ruc.regex.test(String(form.document_number || "").trim())) {
      return "El RUC debe tener 11 digitos."
    }

    if (!trimOrNull(form.address)) {
      return "La direccion fiscal es obligatoria para factura."
    }

    return null
  }

  if (!trimOrNull(form.full_name)) {
    return "Ingresa el nombre completo del cliente."
  }

  if (form.document_type === "none") {
    if (String(form.document_number || "").trim()) {
      return "Si el cliente no tiene documento, el numero debe ir vacio."
    }

    return null
  }

  const rule = SELLER_DOC_RULES[form.document_type]

  if (!rule) {
    return "Selecciona un tipo de documento valido."
  }

  if (!rule.regex.test(String(form.document_number || "").trim())) {
    return `Formato invalido para ${rule.label}.`
  }

  return null
}

function buildCustomerPayload(form) {
  const payload = {
    document_type: form.entry_mode === "factura" ? "ruc" : form.document_type,
    document_number:
      form.entry_mode === "factura"
        ? trimOrNull(form.document_number)
        : form.document_type === "none"
          ? null
          : trimOrNull(form.document_number),
    full_name: form.entry_mode === "retail" ? trimOrNull(form.full_name) : null,
    business_name: trimOrNull(form.business_name),
    commercial_name: trimOrNull(form.commercial_name),
    address: trimOrNull(form.address),
    phone: trimOrNull(form.phone),
    email: trimOrNull(form.email),
    customer_type: "retail",
  }

  if (payload.document_type === "passport" && payload.document_number) {
    payload.document_number = payload.document_number.toUpperCase()
  }

  return payload
}

function replaceCustomerInResults(results, customer) {
  const filtered = (results || []).filter((item) => item.customer_id !== customer.customer_id)
  return [customer, ...filtered].slice(0, 8)
}

export default function NuevaVentaPage() {
  const { user, defaultLocation, locationsLoading, has } = useAuth()
  const productPickerRef = useRef(null)
  const productSearchInputRef = useRef(null)
  const customerPickerRef = useRef(null)
  const customerSearchInputRef = useRef(null)
  const documentPickerRef = useRef(null)

  const [query, setQuery] = useState("")
  const [variants, setVariants] = useState([])
  const [loadingVariants, setLoadingVariants] = useState(false)
  const [productPickerOpen, setProductPickerOpen] = useState(false)
  const [highlightedProductIndex, setHighlightedProductIndex] = useState(0)
  const [selectedProductStyle, setSelectedProductStyle] = useState(null)
  const [selectedSizeCode, setSelectedSizeCode] = useState("")
  const [selectedColorCode, setSelectedColorCode] = useState("")

  const [cart, setCart] = useState([])

  const [documentType, setDocumentType] = useState("none")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [paymentMode, setPaymentMode] = useState("single")
  const [mixedPayments, setMixedPayments] = useState(() => createDefaultMixedPayments(0, "cash"))
  const [saleDiscount, setSaleDiscount] = useState({
    mode: "none",
    value: "",
    reason: "",
  })

  const [customerQuery, setCustomerQuery] = useState("")
  const [customerResults, setCustomerResults] = useState([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false)
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(0)
  const [documentPickerOpen, setDocumentPickerOpen] = useState(false)
  const [genericCustomer, setGenericCustomer] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  const [posContext, setPosContext] = useState(null)
  const [posContextLoading, setPosContextLoading] = useState(false)
  const [posContextError, setPosContextError] = useState(null)

  const [customerSheetOpen, setCustomerSheetOpen] = useState(false)
  const [customerSheetMode, setCustomerSheetMode] = useState("create")
  const [customerForm, setCustomerForm] = useState(createEmptyCustomerForm())
  const [customerFormError, setCustomerFormError] = useState(null)
  const [customerSaving, setCustomerSaving] = useState(false)
  const [priceSheetOpen, setPriceSheetOpen] = useState(false)
  const [priceTargetId, setPriceTargetId] = useState(null)
  const [priceForm, setPriceForm] = useState({
    unit_price_final: "",
    reason: "",
  })
  const [priceFormError, setPriceFormError] = useState(null)

  const [submitting, setSubmitting] = useState(false)
  const [confirmedSale, setConfirmedSale] = useState(null)
  const [error, setError] = useState(null)

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
      })
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
      setSelectedCustomer((current) => current || generic)
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

    function handlePointerDown(event) {
      if (productPickerRef.current && !productPickerRef.current.contains(event.target)) {
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

    function handlePointerDown(event) {
      if (customerPickerRef.current && !customerPickerRef.current.contains(event.target)) {
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

    function handlePointerDown(event) {
      if (documentPickerRef.current && !documentPickerRef.current.contains(event.target)) {
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
      positivePayments.reduce((accumulator, payment) => accumulator + payment.amountValue, 0)
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

  useEffect(() => {
    if (paymentMode === "mixed" && mixedPayments.length === 0) {
      setMixedPayments(createDefaultMixedPayments(totals.total, paymentMethod))
    }
  }, [mixedPayments.length, paymentMethod, paymentMode, totals.total])

  function setPaymentModeWithDefaults(nextMode) {
    setPaymentMode(nextMode)

    if (nextMode === "mixed") {
      setMixedPayments((current) =>
        current.length > 0 ? current : createDefaultMixedPayments(totals.total, paymentMethod)
      )
    }
  }

  function updateMixedPaymentDraft(draftId, field, value) {
    setMixedPayments((current) =>
      current.map((payment) => (payment.id === draftId ? { ...payment, [field]: value } : payment))
    )
  }

  function addMixedPaymentDraft() {
    setMixedPayments((current) => [...current, createPaymentDraft("transfer", "")])
  }

  function removeMixedPaymentDraft(draftId) {
    setMixedPayments((current) =>
      current.length <= 2 ? current : current.filter((payment) => payment.id !== draftId)
    )
  }

  function openPriceSheet(item) {
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

  function clearPriceAdjustment(variantId) {
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

  function addToCart(variant) {
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
          color_code: variant.color_code,
          label: `${variant.style_name} - ${variant.size_code} / ${variant.color_code}`,
          quantity: 1,
          retail_price: variant.retail_price,
          wholesale_price: variant.wholesale_price,
          stock: availableStock,
          price_override: null,
        },
      ]
    })
  }

  function updateQty(variantId, delta) {
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

  function removeFromCart(variantId) {
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

  function selectProductStyle(style) {
    setSelectedProductStyle(style)
    setSelectedSizeCode("")
    setSelectedColorCode("")
    setQuery("")
    setHighlightedProductIndex(0)
    setProductPickerOpen(false)
  }

  function selectCustomer(customer) {
    setSelectedCustomer(customer)
    setCustomerQuery("")
    setCustomerResults([])
    setHighlightedCustomerIndex(0)
    setCustomerPickerOpen(false)
  }

  function openCustomerSheet(mode) {
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

      const savedCustomer = unwrapApiData(response)

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
      const payload = {
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
      })

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
    <PermissionGuard permission="sales.pos">
      <Sheet open={customerSheetOpen} onOpenChange={setCustomerSheetOpen}>
        <TooltipProvider delayDuration={120}>
          <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_35%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
            <div className="mx-auto max-w-7xl space-y-4">
              <header className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-violet-600">
                      Punto de venta
                    </p>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
                      Nueva venta
                    </h1>
                  </div>

                  <div className="flex flex-wrap items-start justify-end gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                      <MapPin className="h-3.5 w-3.5 text-violet-600" />
                      {locationsLoading ? "Cargando sede..." : defaultLocation?.name || "Sin sede asignada"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                        posContextLoading
                          ? "border-slate-200 bg-slate-50 text-slate-700"
                          : buildCashTone(cashStatus)
                      }`}
                    >
                      {posContextLoading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
                      {posContextLoading ? "Validando caja" : buildCashLabel(cashStatus)}
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-slate-700"
                          aria-label="Reglas del punto de venta"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={8}>
                        El backend valida caja, stock y el precio vigente segun la regla comercial activa al confirmar.
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href="/clientes"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                          aria-label="Ir a clientes"
                        >
                          <Users className="h-4 w-4" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={8}>
                        Clientes
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href="/transaction-history"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                          aria-label="Ir al historial de ventas"
                        >
                          <History className="h-4 w-4" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={8}>
                        Historial
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </header>

              {!defaultLocation?.location_id && !locationsLoading ? (
                <InlineStatusCard
                  title="No hay sede operativa activa"
                  description="Debes tener una sede default asignada para registrar ventas. Configurala desde tu cuenta o solicita apoyo al administrador."
                  tone="warning"
                  icon={<MapPin className="h-5 w-5" />}
                />
              ) : null}

              {confirmedSale ? (
                <div className="rounded-3xl border border-emerald-300 bg-emerald-50 p-5 shadow-md">
                  <div className="flex flex-wrap items-center gap-3">
                    <BadgeCheck className="h-6 w-6 shrink-0 text-emerald-600" />
                    <div className="flex-1">
                      <p className="font-semibold text-emerald-800">
                        Venta confirmada: {confirmedSale.sale_number}
                      </p>
                      <p className="text-sm text-emerald-700">
                        La venta quedo registrada y el stock ya fue descontado.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/purchase-system/${confirmedSale.sale_id}`}
                        className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                      >
                        Ver detalle
                      </Link>
                      <Link
                        href="/transaction-history"
                        className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                      >
                        Ver historial
                      </Link>
                      {has("sales.postsale.view") ? (
                        <Link
                          href={`/postventa/${confirmedSale.sale_id}`}
                          className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                        >
                          Ir a postventa
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setConfirmedSale(null)}
                        className="rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
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

              <div className="relative">
                {cashOverlayVisible ? (
                  <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[28px] bg-slate-950/58 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl bg-slate-950/95 p-6 text-white shadow-2xl ring-1 ring-white/10">
                      <div className="flex items-start gap-3">
                        <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                        <div className="space-y-2">
                          <p className="text-lg font-semibold">Venta bloqueada por caja</p>
                          <p className="text-sm leading-6 text-slate-200">
                            {posContext?.cash?.message ||
                              "No pudimos validar la caja operativa de esta sede."}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {canOpenCashModule ? (
                          <Link
                            href="/caja"
                            className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                          >
                            Ir a caja del dia
                          </Link>
                        ) : (
                          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200">
                            Coordina con caja o con un administrador para habilitar la venta.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                <section className="grid gap-4 xl:grid-cols-2">
                  <div className="contents">
                    <article
                      className={`relative rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6 xl:order-2 xl:col-span-2 ${
                        productPickerOpen ? "z-30" : "z-0"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                            2
                          </span>
                          <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-slate-800">Productos</h2>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:text-slate-700"
                                  aria-label="Ayuda de productos"
                                >
                                  <Info className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" sideOffset={8}>
                                Busca por estilo, SKU, talla o color.
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-500 opacity-80"
                        >
                          <ScanLine className="h-4 w-4" />
                          Escanear producto
                        </button>
                      </div>

                      <div ref={productPickerRef} className="relative mt-4">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
                          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-48 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        />
                        {selectedProductStyle || query ? (
                          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                            {selectedProductStyle && !query && !productPickerOpen ? (
                              <>
                                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                                  Stock {selectedProductStyle.totalStock}
                                </span>
                                {selectedProductStyle.style_code ? (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                    {selectedProductStyle.style_code}
                                  </span>
                                ) : null}
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
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
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-slate-800"
                              aria-label="Limpiar producto"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : null}

                        {productPickerOpen ? (
                          <div className="absolute left-0 right-0 top-[calc(100%+0.55rem)] z-20 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                            {loadingVariants ? (
                              <p className="px-3 py-4 text-sm text-slate-500">Buscando productos...</p>
                            ) : !defaultLocation?.location_id ? (
                              <p className="px-3 py-4 text-sm text-slate-500">
                                Configura una sede para operar ventas.
                              </p>
                            ) : styles.length === 0 ? (
                              <p className="px-3 py-4 text-sm text-slate-500">
                                No hay productos vendibles para la sede actual.
                              </p>
                            ) : searchableStyles.length === 0 ? (
                              <p className="px-3 py-4 text-sm text-slate-500">
                                No encontramos coincidencias para esta busqueda.
                              </p>
                            ) : (
                              <div
                                className="max-h-72 overflow-y-auto p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                style={{ scrollbarWidth: "none" }}
                              >
                                <div className="space-y-1.5">
                                  {searchableStyles.map((style, index) => {
                                    const isHighlighted = index === highlightedProductIndex
                                    return (
                                      <button
                                        key={style.style_id}
                                        type="button"
                                        onMouseEnter={() => setHighlightedProductIndex(index)}
                                        onClick={() => selectProductStyle(style)}
                                        className={`block w-full rounded-2xl border px-3 py-2.5 text-left transition ${
                                          isHighlighted
                                            ? "border-violet-300 bg-violet-50"
                                            : "border-transparent bg-slate-50 hover:border-violet-200 hover:bg-violet-50/70"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-slate-900">
                                              {style.style_name}
                                            </p>
                                            <p className="mt-0.5 text-[11px] text-slate-500">
                                              {style.variants.length} variante
                                              {style.variants.length === 1 ? "" : "s"}
                                            </p>
                                          </div>
                                          <span
                                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                              style.totalStock > 0
                                                ? "bg-emerald-50 text-emerald-700"
                                                : "bg-rose-50 text-rose-700"
                                            }`}
                                          >
                                            {style.totalStock}
                                          </span>
                                        </div>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        {!selectedProductStyle ? (
                          <p className="text-sm text-slate-500">
                            Selecciona un producto para configurar talla, color y agregarlo a la venta.
                          </p>
                        ) : (
                          <div className="flex flex-wrap items-end gap-3">
                            <label className="w-24 space-y-1.5">
                              <span className="text-[11px] font-medium text-slate-500">Talla</span>
                              <select
                                value={selectedSizeCode}
                                onChange={(event) => setSelectedSizeCode(event.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                              >
                                <option value="">{sizeOptions.length ? "Talla" : "Sin tallas"}</option>
                                {sizeOptions.map((sizeCode) => (
                                  <option key={sizeCode} value={sizeCode}>
                                    {sizeCode}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="min-w-[160px] flex-1 space-y-1.5 sm:w-48 sm:flex-none">
                              <span className="text-[11px] font-medium text-slate-500">Color</span>
                              <select
                                value={selectedColorCode}
                                onChange={(event) => setSelectedColorCode(event.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                              >
                                <option value="">
                                  {colorOptions.length ? "Selecciona color" : "Sin colores"}
                                </option>
                                {colorOptions.map((colorCode) => (
                                  <option key={colorCode} value={colorCode}>
                                    {colorCode}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <div className="min-w-[220px] flex-1 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2.5">
                              {!selectedVariant ? (
                                <p className="text-sm text-slate-500">Completa talla y color.</p>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                  <span className="font-semibold text-slate-900">
                                    {selectedVariant.size_code} / {selectedVariant.color_code}
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-slate-500">{selectedVariant.sku}</span>
                                  <span className="text-slate-300">•</span>
                                  <span className="font-medium text-slate-700">
                                    {selectedVariantAutoPrice !== null &&
                                    selectedVariantAutoPrice !== undefined
                                      ? `S/. ${formatMoney(selectedVariantAutoPrice)}`
                                      : "Sin precio"}
                                  </span>
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                    {previewWholesaleApplies &&
                                    selectedVariant.wholesale_price !== null &&
                                    selectedVariant.wholesale_price !== undefined
                                      ? "Mayorista"
                                      : "Retail"}
                                  </span>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                      Number(selectedVariant.stock || 0) > 0
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-rose-50 text-rose-700"
                                    }`}
                                  >
                                    Stock {Number(selectedVariant.stock || 0)}
                                  </span>
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => selectedVariant && addToCart(selectedVariant)}
                              disabled={
                                !selectedVariant ||
                                (selectedVariant.retail_price === null &&
                                  selectedVariant.wholesale_price === null) ||
                                (selectedVariant.retail_price === undefined &&
                                  selectedVariant.wholesale_price === undefined) ||
                                Number(selectedVariant.stock || 0) <= 0
                              }
                              className="h-11 min-w-[112px] rounded-xl bg-violet-700 px-4 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
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
                            </button>
                          </div>
                        )}
                      </div>
                    </article>

                    <article className="relative z-0 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6 xl:order-3 xl:col-span-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <ShoppingBasket className="h-5 w-5 text-violet-600" />
                          <h2 className="text-lg font-semibold text-slate-800">Detalle de venta</h2>
                        </div>
                        <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                          {totals.wholesaleApplied
                            ? `Precio aplicado: mayorista por ${posContext?.pricing?.wholesale_min_qty_total || 3}+ uds.`
                            : "Precio aplicado: retail segun vigencia"}
                        </span>
                      </div>

                      {cart.length === 0 ? (
                        <p className="mt-4 rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">
                          Aun no hay productos agregados a la venta.
                        </p>
                      ) : (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50">
                          <div className="hidden border-b border-slate-200 bg-slate-100/80 px-4 py-2 xl:grid xl:grid-cols-[minmax(0,1.7fr)_140px_140px_140px_96px] xl:items-center xl:gap-5">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Producto</span>
                            <span className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Cantidad</span>
                            <span className="text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Precio final</span>
                            <span className="text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Subtotal</span>
                            <span className="text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Acciones</span>
                          </div>

                          <div className="max-h-[360px] overflow-y-auto">
                            {totals.items.map((item, index) => (
                              <div
                                key={item.variant_id}
                                className={`px-4 py-3 ${index !== totals.items.length - 1 ? "border-b border-slate-200" : ""}`}
                              >
                                <div className="flex flex-col gap-3 xl:grid xl:grid-cols-[minmax(0,1.7fr)_140px_140px_140px_96px] xl:items-center xl:gap-5">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                      <p className="truncate text-sm font-semibold text-slate-900">
                                        {item.style_name}
                                      </p>
                                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-600">
                                        <span className="rounded-full bg-slate-200 px-2 py-0.5">
                                          Talla {item.size_code}
                                        </span>
                                        <span className="rounded-full bg-slate-200 px-2 py-0.5">
                                          Color {item.color_code}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                      <span>{item.sku}</span>
                                      <span className="text-slate-300">•</span>
                                      <span>
                                        {item.price_type_applied === "wholesale" ? "Mayorista" : "Retail"} S/.{" "}
                                        {formatMoney(item.unit_price_list)}
                                      </span>
                                      {item.price_override ? (
                                        <>
                                          <span className="text-slate-300">•</span>
                                          <span className="font-medium text-violet-700">
                                            Ajuste manual activo
                                          </span>
                                        </>
                                      ) : null}
                                    </div>
                                    {item.price_override?.reason ? (
                                      <p className="mt-1 text-[11px] text-violet-700">
                                        Motivo del ajuste: {item.price_override.reason}
                                      </p>
                                    ) : null}
                                  </div>

                                  <div className="flex items-center justify-between gap-3 xl:justify-center">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 xl:hidden">
                                      Cantidad
                                    </p>
                                    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-1.5 py-1">
                                      <button
                                        type="button"
                                        onClick={() => updateQty(item.variant_id, -1)}
                                        className="rounded-lg border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-100"
                                      >
                                        <Minus className="h-3 w-3" />
                                      </button>
                                      <span className="min-w-8 text-center text-sm font-semibold text-slate-800">
                                        {item.quantity}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => updateQty(item.variant_id, 1)}
                                        disabled={item.quantity >= item.stock}
                                        className="rounded-lg border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="text-left xl:text-right">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 xl:hidden">
                                      Precio final
                                    </p>
                                    <p className="font-semibold text-slate-800">
                                      S/. {formatMoney(item.preview_unit_price_final)}
                                    </p>
                                  </div>

                                  <div className="text-left xl:text-right">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 xl:hidden">
                                      Subtotal
                                    </p>
                                    <p className="font-semibold text-slate-900">
                                      S/. {formatMoney(item.line_subtotal)}
                                    </p>
                                    {item.line_discount_amount > 0 ? (
                                      <p className="mt-0.5 text-[11px] font-semibold text-amber-700">
                                        Desc. - S/. {formatMoney(item.line_discount_amount)}
                                      </p>
                                    ) : null}
                                  </div>

                                  <div className="flex items-center justify-between gap-2 xl:justify-end">
                                    <div className="flex items-center gap-1">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            type="button"
                                            onClick={() => openPriceSheet(item)}
                                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
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
                                          className="rounded-lg p-1 text-slate-400 transition hover:bg-white hover:text-amber-600"
                                          aria-label="Quitar ajuste"
                                        >
                                          <CircleAlert className="h-4 w-4" />
                                        </button>
                                      ) : null}
                                      <button
                                        type="button"
                                        onClick={() => removeFromCart(item.variant_id)}
                                        className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 transition hover:border-red-300 hover:bg-red-100 hover:text-red-700"
                                        aria-label="Quitar producto"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  </div>

                  <div className="contents">
                    <article
                      className={`relative rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6 xl:order-1 xl:col-span-2 ${
                        customerPickerOpen || documentPickerOpen ? "z-30" : "z-0"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                            1
                          </span>
                          <h2 className="text-lg font-semibold text-slate-800">Cliente</h2>
                        </div>

                        <button
                          type="button"
                          onClick={() => openCustomerSheet("create")}
                          className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800 transition hover:bg-violet-100"
                        >
                          <UserPlus className="h-4 w-4" />
                          Crear cliente
                        </button>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)]">
                          <div ref={documentPickerRef} className="relative">
                            <button
                              type="button"
                              onClick={() => setDocumentPickerOpen((current) => !current)}
                              className="flex h-full w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-violet-300"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <ActiveDocumentIcon className="h-4 w-4 shrink-0 text-violet-600" />
                                <span className="truncate">{activeDocumentOption.label}</span>
                              </span>
                              <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                            </button>

                            {documentPickerOpen ? (
                              <div className="absolute left-0 right-0 top-[calc(100%+0.55rem)] z-30 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
                                <div className="p-1.5">
                                  <div className="space-y-1.5">
                                    {DOC_TYPES.map((docType) => {
                                      const Icon = getDocumentIcon(docType.value)
                                      const selected = documentType === docType.value
                                      return (
                                        <button
                                          key={docType.value}
                                          type="button"
                                          onClick={() => {
                                            setDocumentType(docType.value)
                                            setDocumentPickerOpen(false)
                                          }}
                                          className={`flex w-full items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm transition ${
                                            selected
                                              ? "border-violet-300 bg-violet-50 font-semibold text-violet-800"
                                              : "border-transparent bg-slate-50 text-slate-700 hover:border-violet-200 hover:bg-violet-50/70"
                                          }`}
                                        >
                                          <Icon className="h-4 w-4" />
                                          <span>{docType.label}</span>
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div ref={customerPickerRef} className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
                              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-10 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                            />
                            {selectedCustomer || customerQuery ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomerQuery("")
                                  if (genericCustomer) {
                                    setSelectedCustomer(genericCustomer)
                                  }
                                  focusCustomerSearch()
                                }}
                                className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-slate-800"
                                aria-label="Limpiar cliente"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            ) : null}

                            {customerPickerOpen ? (
                              <div className="absolute left-0 right-0 top-[calc(100%+0.55rem)] z-30 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
                                {loadingCustomers ? (
                                  <p className="px-3 py-4 text-sm text-slate-500">Buscando clientes...</p>
                                ) : customerResults.length > 0 ? (
                                  <div
                                    className="max-h-72 overflow-y-auto p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                    style={{ scrollbarWidth: "none" }}
                                  >
                                    <div className="space-y-1.5">
                                      {customerResults.map((customer, index) => {
                                        const isHighlighted = index === highlightedCustomerIndex
                                        return (
                                          <button
                                            key={customer.customer_id}
                                            type="button"
                                            onMouseEnter={() => setHighlightedCustomerIndex(index)}
                                            onClick={() => selectCustomer(customer)}
                                            className={`block w-full rounded-2xl border px-3 py-2.5 text-left transition ${
                                              isHighlighted
                                                ? "border-violet-300 bg-violet-50"
                                                : "border-transparent bg-slate-50 hover:border-violet-200 hover:bg-violet-50/70"
                                            }`}
                                          >
                                            <span className="block truncate text-sm font-semibold text-slate-900">
                                              {buildCustomerDisplayName(customer)}
                                            </span>
                                            <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                                              {buildCustomerDocument(customer)}
                                            </span>
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="px-3 py-4 text-sm text-slate-500">
                                    No encontramos coincidencias. Puedes crear el cliente y seguir con la venta.
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex flex-wrap items-start gap-3 xl:grid xl:grid-cols-[minmax(0,1.15fr)_max-content_minmax(0,1fr)_max-content_max-content] xl:items-center">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {buildCustomerDisplayName(selectedCustomer)}
                              </p>
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-xs text-slate-500">
                                {buildCustomerDocument(selectedCustomer)}
                              </p>
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-xs text-slate-500">
                                {selectedCustomer?.address || "Venta de mostrador"}
                              </p>
                            </div>

                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                customerIsValid
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {customerIsValid
                                ? "Listo para el comprobante"
                                : documentType === "factura"
                                  ? "Falta RUC o direccion"
                                  : documentType === "boleta"
                                    ? "Falta DNI o CE valido"
                                    : "Venta libre"}
                            </span>

                            <div className="flex flex-wrap items-center gap-2 justify-self-end">
                              {canEditSelectedCustomer ? (
                                <button
                                  type="button"
                                  onClick={() => openCustomerSheet("edit")}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                  <PencilLine className="h-3.5 w-3.5" />
                                  Editar
                                </button>
                              ) : null}

                              {genericCustomer &&
                              selectedCustomer?.customer_id !== genericCustomer.customer_id ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedCustomer(genericCustomer)}
                                  className="inline-flex items-center rounded-xl px-2 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
                                >
                                  Usar mostrador
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {!customerIsValid ? (
                          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 md:text-[13px]">
                            {documentType === "boleta"
                              ? "Para boleta debes seleccionar un cliente con DNI o CE valido."
                              : "Para factura debes seleccionar un cliente con RUC y direccion fiscal."}
                          </p>
                        ) : null}
                      </div>
                    </article>

                    <article className="relative z-0 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur xl:order-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                          3
                        </span>
                        <h2 className="text-lg font-semibold text-slate-800">Cobro y confirmacion</h2>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            customerIsValid
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {activeDocumentOption.label}
                        </span>
                      </div>

                      <div className="mt-4 space-y-4">
                        <div>
                          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                            <label className="block text-xs font-medium text-slate-600">
                              Metodo de pago
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPaymentModeWithDefaults("single")}
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                                  paymentMode === "single"
                                    ? "border border-violet-300 bg-violet-50 text-violet-800"
                                    : "border border-slate-200 bg-white text-slate-500"
                                }`}
                              >
                                Pago unico
                              </button>
                              <button
                                type="button"
                                onClick={() => setPaymentModeWithDefaults("mixed")}
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                                  paymentMode === "mixed"
                                    ? "border border-violet-300 bg-violet-50 text-violet-800"
                                    : "border border-slate-200 bg-white text-slate-500"
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
                                    className={`rounded-2xl border px-3 py-2.5 text-sm transition ${
                                      selected
                                        ? "border-violet-400 bg-violet-50 font-semibold text-violet-800 ring-1 ring-violet-300"
                                        : "border-slate-200 bg-white text-slate-700 hover:border-violet-200"
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
                            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs text-slate-600">
                                  Divide el cobro. La suma debe coincidir con el total de la venta.
                                </p>
                                <button
                                  type="button"
                                  onClick={addMixedPaymentDraft}
                                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                >
                                  Agregar linea
                                </button>
                              </div>

                              <div className="space-y-2">
                                {mixedPayments.map((payment, index) => (
                                  <div
                                    key={payment.id}
                                    className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_0.8fr_1fr_auto]"
                                  >
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

                                    <input
                                      value={payment.amount}
                                      onChange={(event) =>
                                        updateMixedPaymentDraft(payment.id, "amount", event.target.value)
                                      }
                                      placeholder="0.00"
                                      className={INPUT_CLASS}
                                    />

                                    <input
                                      value={payment.reference}
                                      onChange={(event) =>
                                        updateMixedPaymentDraft(payment.id, "reference", event.target.value)
                                      }
                                      placeholder={`Referencia ${index + 1} (opcional)`}
                                      className={INPUT_CLASS}
                                    />

                                    <button
                                      type="button"
                                      onClick={() => removeMixedPaymentDraft(payment.id)}
                                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
                                      disabled={mixedPayments.length <= 2}
                                    >
                                      Quitar
                                    </button>
                                  </div>
                                ))}
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="text-slate-500">
                                  Asignado: S/. {formatMoney(mixedPaymentsPreview.enteredTotal)}
                                </span>
                                <span
                                  className={
                                    Math.abs(mixedPaymentsPreview.difference) < 0.01
                                      ? "font-semibold text-emerald-700"
                                      : "font-semibold text-amber-700"
                                  }
                                >
                                  {Math.abs(mixedPaymentsPreview.difference) < 0.01
                                    ? "Pago mixto cuadrado"
                                    : mixedPaymentsPreview.difference > 0
                                      ? `Faltan S/. ${formatMoney(mixedPaymentsPreview.difference)}`
                                      : `Excede S/. ${formatMoney(Math.abs(mixedPaymentsPreview.difference))}`}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>

                    <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur xl:order-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-violet-600" />
                          <h2 className="text-lg font-semibold text-slate-800">Resumen</h2>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                aria-label="Informacion del resumen"
                              >
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" sideOffset={8}>
                              El precio final se valida con el backend usando el precio vigente segun la regla comercial activa.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                            cashReady
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {cashReady ? (
                            <ShieldCheck className="h-3.5 w-3.5" />
                          ) : (
                            <ShieldAlert className="h-3.5 w-3.5" />
                          )}
                          {cashReady ? "Listo para confirmar" : "Pendiente por validar"}
                        </span>
                      </div>

                      {cartCount > 0 ? (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-800">
                                Ajustes comerciales
                              </p>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="rounded-full p-1 text-slate-400 transition hover:bg-white hover:text-slate-600"
                                    aria-label="Informacion de ajustes comerciales"
                                  >
                                    <Info className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" sideOffset={8}>
                                  Aplica descuento general aqui y precio manual desde el detalle.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                              Reglas comerciales
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {SALE_DISCOUNT_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() =>
                                  setSaleDiscount((current) => ({
                                    ...current,
                                    mode: option.value,
                                    value: option.value === "none" ? "" : current.value,
                                    reason: option.value === "none" ? "" : current.reason,
                                  }))
                                }
                                className={`rounded-xl border px-3 py-2 text-sm transition ${
                                  saleDiscount.mode === option.value
                                    ? "border-violet-300 bg-violet-50 font-semibold text-violet-800"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-violet-200"
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>

                          {saleDiscount.mode !== "none" ? (
                            <div className="mt-3 grid gap-3 md:grid-cols-[0.85fr_1.15fr]">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">
                                  {saleDiscount.mode === "percent" ? "Descuento %" : "Descuento S/."}
                                </label>
                                <input
                                  value={saleDiscount.value}
                                  onChange={(event) =>
                                    setSaleDiscount((current) => ({
                                      ...current,
                                      value: event.target.value,
                                    }))
                                  }
                                  placeholder={saleDiscount.mode === "percent" ? "10" : "15.00"}
                                  className={INPUT_CLASS}
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">
                                  Motivo comercial
                                </label>
                                <input
                                  value={saleDiscount.reason}
                                  onChange={(event) =>
                                    setSaleDiscount((current) => ({
                                      ...current,
                                      reason: event.target.value,
                                    }))
                                  }
                                  placeholder="Cliente frecuente, cierre, ajuste comercial..."
                                  className={INPUT_CLASS}
                                />
                              </div>
                            </div>
                          ) : null}

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <span>Precio manual por item</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="rounded-full p-1 text-slate-400 transition hover:bg-white hover:text-slate-600"
                                    aria-label="Informacion de precio manual"
                                  >
                                    <Info className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" sideOffset={8}>
                                  Disponible desde Detalle de venta para cada item.
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <span className="font-semibold text-slate-700">
                              Descuento aplicado: S/. {formatMoney(totals.saleDiscountAmount)}
                            </span>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-4 space-y-2 text-sm">
                        <div
                          className={`rounded-2xl border px-3 py-2 ${
                            cashReady
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-amber-200 bg-amber-50 text-amber-800"
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
                                  className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                                >
                                  Ir a Caja del dia
                                </Link>
                              ) : (
                                <span className="text-xs">Solicita apertura a caja/admin.</span>
                              )
                            ) : null}
                          </div>
                        </div>

                        {totals.saleDiscountAmount > 0 ? (
                          <div className="flex justify-between text-slate-600">
                            <span>Subtotal base</span>
                            <span>S/. {formatMoney(totals.baseSubtotal)}</span>
                          </div>
                        ) : null}
                        <div className="flex justify-between text-slate-600">
                          <span>Subtotal</span>
                          <span>S/. {formatMoney(totals.subtotal)}</span>
                        </div>
                        {totals.saleDiscountAmount > 0 ? (
                          <div className="flex justify-between text-amber-700">
                            <span>Descuento</span>
                            <span>- S/. {formatMoney(totals.saleDiscountAmount)}</span>
                          </div>
                        ) : null}
                        <div className="flex justify-between text-slate-600">
                          <span>IGV ({(totals.taxRate * 100).toFixed(0)}%)</span>
                          <span>S/. {formatMoney(totals.tax)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                          <span>Total</span>
                          <span>S/. {formatMoney(totals.total)}</span>
                        </div>
                      </div>

                      {totals.hasMissingPrice ? (
                        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                          Hay items sin precio vigente. El backend rechazara la venta hasta que exista
                          un precio activo.
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span
                          className={
                            submitDisabled ? "font-medium text-amber-700" : "font-medium text-emerald-700"
                          }
                        >
                          {summaryStatusMessage}
                        </span>
                        {paymentMode === "mixed" ? (
                          <span className="text-xs font-semibold text-slate-500">
                            {Math.abs(mixedPaymentsPreview.difference) < 0.01
                              ? "Pago mixto listo"
                              : `Diferencia: S/. ${formatMoney(Math.abs(mixedPaymentsPreview.difference))}`}
                          </span>
                        ) : null}
                      </div>

                      {error ? (
                        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          {error}
                        </p>
                      ) : null}

                      <button
                        type="button"
                        onClick={confirmSale}
                        disabled={submitDisabled}
                        className="mt-4 w-full rounded-2xl bg-violet-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {submitting ? "Procesando..." : "Confirmar venta"}
                      </button>
                    </article>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </TooltipProvider>

        <SheetContent side="right" className="w-full border-l border-slate-200 bg-white sm:max-w-lg">
          <SheetHeader className="border-b border-slate-200 px-5 py-4">
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
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Tipo de alta
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerForm(createEmptyCustomerForm("retail"))}
                    disabled={customerSheetMode === "edit"}
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                      customerForm.entry_mode === "retail"
                        ? "border-violet-400 bg-violet-50 font-semibold text-violet-800 ring-1 ring-violet-300"
                        : "border-slate-200 text-slate-700 hover:border-violet-200"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    Cliente retail
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerForm(createEmptyCustomerForm("factura"))}
                    disabled={customerSheetMode === "edit"}
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                      customerForm.entry_mode === "factura"
                        ? "border-violet-400 bg-violet-50 font-semibold text-violet-800 ring-1 ring-violet-300"
                        : "border-slate-200 text-slate-700 hover:border-violet-200"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    Cliente factura
                  </button>
                </div>
              </div>

              {customerForm.entry_mode === "factura" ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
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
                    <label className="mb-1 block text-xs font-medium text-slate-600">
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
                    <label className="mb-1 block text-xs font-medium text-slate-600">
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
                      <label className="mb-1 block text-xs font-medium text-slate-600">
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
                      <label className="mb-1 block text-xs font-medium text-slate-600">
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
                      <label className="mb-1 block text-xs font-medium text-slate-600">
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
                      <label className="mb-1 block text-xs font-medium text-slate-600">
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
                          customerForm.document_type === "none" ? "bg-slate-100" : ""
                        }`}
                        disabled={customerForm.document_type === "none"}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
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
                      <label className="mb-1 block text-xs font-medium text-slate-600">
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
                      <label className="mb-1 block text-xs font-medium text-slate-600">
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

          <SheetFooter className="border-t border-slate-200 px-5 py-4">
            <div className="flex w-full gap-3">
              <button
                type="button"
                onClick={closeCustomerSheet}
                disabled={customerSaving}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitCustomerForm}
                disabled={customerSaving}
                className="flex-1 rounded-2xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:opacity-50"
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
        <SheetContent side="right" className="w-full border-l border-slate-200 bg-white sm:max-w-md">
          <SheetHeader className="border-b border-slate-200 px-5 py-4">
            <SheetTitle>Ajustar precio del item</SheetTitle>
            <SheetDescription>
              Define un precio manual y deja el motivo trazado en la venta.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {priceTargetItem ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">{priceTargetItem.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{priceTargetItem.sku}</p>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">
                        {priceTargetPreviewItem?.price_type_applied === "wholesale" ? "Mayorista" : "Retail"}
                      </p>
                      <p className="font-semibold text-slate-800">
                        S/.{" "}
                        {formatMoney(
                          priceTargetPreviewItem?.unit_price_list ??
                            priceTargetItem.wholesale_price ??
                            priceTargetItem.retail_price
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Cantidad</p>
                      <p className="font-semibold text-slate-800">{priceTargetItem.quantity}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Regla aplicada</p>
                      <p className="font-semibold text-slate-800">
                        {priceTargetPreviewItem?.price_type_applied === "wholesale"
                          ? "Mayorista 3+"
                          : "Retail"}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
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
                  <label className="mb-1 block text-xs font-medium text-slate-600">
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
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                Selecciona un item para ajustar su precio.
              </div>
            )}
          </div>

          <SheetFooter className="border-t border-slate-200 px-5 py-4">
            <div className="flex w-full gap-3">
              {priceTargetItem?.price_override ? (
                <button
                  type="button"
                  onClick={() => clearPriceAdjustment(priceTargetItem.variant_id)}
                  className="rounded-2xl border border-amber-200 px-4 py-2.5 text-sm font-medium text-amber-700 transition hover:bg-amber-50"
                >
                  Quitar ajuste
                </button>
              ) : null}
              <button
                type="button"
                onClick={closePriceSheet}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitPriceAdjustment}
                className="flex-1 rounded-2xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800"
              >
                Guardar ajuste
              </button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PermissionGuard>
  )
}
