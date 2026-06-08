import type {
  CartItem,
  CustomerFormState,
  GroupedStyle,
  PaymentDraft,
  PosCustomer,
  PosPricingConfig,
  PreviewItem,
  SaleDiscountState,
  SalePreview,
  SaleVariant,
  SearchableStyle,
} from "./pos-types"
import {
  PAYMENT_METHODS,
  SELLER_DOC_RULES,
  TAX_RATE,
} from "./pos-types"

import { round2, formatMoney } from "@/lib/format-utils"
export { round2, formatMoney }

export function trimOrNull(value: unknown): string | null {
  const normalized = String(value || "").trim()
  return normalized || null
}

export function parseAmountInput(value: unknown): number | null {
  if (value === undefined || value === null) return null
  const normalized = String(value).trim().replace(",", ".")
  if (!normalized) return null

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) return null

  return round2(parsed)
}

export function buildSemanticChipClass(tone = "neutral"): string {
  if (tone === "success") {
    return "border-[var(--ops-tone-success-border)] bg-[var(--ops-tone-success-bg)] text-[var(--ops-tone-success-text)]"
  }

  if (tone === "warning") {
    return "border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)] text-[var(--ops-tone-warning-text)]"
  }

  if (tone === "danger") {
    return "border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] text-[var(--ops-tone-danger-text)]"
  }

  if (tone === "accent") {
    return "border-[color:color-mix(in_srgb,var(--ripnel-accent)_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_82%,var(--ops-surface))] text-[color:color-mix(in_srgb,var(--ripnel-accent)_72%,var(--ops-text))]"
  }

  return "border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] text-[var(--ops-text-muted)]"
}

export function buildVariantTone(isWholesale: boolean): "success" | "neutral" {
  return isWholesale ? "success" : "neutral"
}

export function createPaymentDraft(method = "cash", amount = ""): PaymentDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method,
    amount,
    reference: "",
  }
}

export function createDefaultMixedPayments(
  _totalAmount: number,
  preferredMethod = "cash"
): PaymentDraft[] {
  const secondaryMethod =
    PAYMENT_METHODS.find((method) => method.value !== preferredMethod)?.value || "yape"

  return [
    createPaymentDraft(preferredMethod, ""),
    createPaymentDraft(secondaryMethod, ""),
  ]
}

export function buildCustomerDisplayName(customer: PosCustomer | null): string {
  if (!customer) return "Pendiente"

  return (
    customer.display_name ||
    customer.full_name ||
    customer.business_name ||
    customer.commercial_name ||
    "Cliente sin nombre"
  )
}

export function buildCustomerDocument(customer: PosCustomer | null): string {
  if (!customer || !customer.document_type || customer.document_type === "none") {
    return "Sin documento"
  }

  return `${String(customer.document_type).toUpperCase()} ${customer.document_number || ""}`.trim()
}

export function computeSaleDiscountAmount(
  subtotalAmount: number,
  saleDiscount: SaleDiscountState | null
): number {
  if (!saleDiscount) return 0
  const value = parseAmountInput(saleDiscount.value)
  if (value === null || value < 0 || subtotalAmount <= 0) {
    return 0
  }

  if (saleDiscount.mode === 'fixed') {
    return round2(Math.min(value, subtotalAmount))
  }

  return round2((subtotalAmount * value) / 100)
}

export interface PreparedCartItem extends CartItem {
  unit_price_list: number | null
  unit_price_before_discount: number
  price_type_applied: string
  pricing_rule_applied: string | null
  line_subtotal_before_discount: number
}

export interface DiscountedCartItem extends PreparedCartItem {
  line_discount_amount: number
  line_subtotal: number
}

export function allocateDiscountAcrossItems(
  items: PreparedCartItem[],
  discountAmount: number
): DiscountedCartItem[] {
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

export function applyTaxesToPreviewItems(
  items: DiscountedCartItem[],
  taxRate: number
): {
  items: PreviewItem[]
  subtotal: number
  tax: number
  total: number
} {
  const totalDocument = round2(
    items.reduce((accumulator, item) => accumulator + Number(item.line_subtotal || 0), 0)
  )
  const tax =
    taxRate > 0 ? round2(totalDocument - totalDocument / (1 + Number(taxRate || 0))) : 0
  let remainingTax = tax

  const computedItems = items.map((item, index) => {
    const lineSubtotal = round2(Number(item.line_subtotal || 0))
    const lineTax =
      taxRate <= 0
        ? 0
        : index === items.length - 1
          ? remainingTax
          : round2(lineSubtotal - lineSubtotal / (1 + Number(taxRate || 0)))
    remainingTax = round2(remainingTax - lineTax)

    return {
      variant_id: item.variant_id,
      quantity: item.quantity,
      style_name: item.style_name,
      sku: item.sku,
      size_code: item.size_code,
      size_name: item.size_name,
      color_code: item.color_code,
      color_name: item.color_name,
      label: item.label,
      unit_price_list: item.unit_price_list,
      unit_price_before_discount: item.unit_price_before_discount,
      price_type_applied: item.price_type_applied,
      pricing_rule_applied: item.pricing_rule_applied,
      line_subtotal_before_discount: item.line_subtotal_before_discount,
      line_discount_amount: item.line_discount_amount,
      line_subtotal: item.line_subtotal,
      preview_unit_price_final: round2(lineSubtotal / item.quantity),
      line_tax: lineTax,
      line_total: lineSubtotal,
      retail_price: item.retail_price,
      wholesale_price: item.wholesale_price,
      stock: item.stock,
      price_override: item.price_override,
    } satisfies PreviewItem
  })

  return {
    items: computedItems,
    subtotal: totalDocument,
    tax,
    total: totalDocument,
  }
}

export function shouldApplyWholesalePreview(
  cart: CartItem[],
  pricingConfig: PosPricingConfig | null | undefined
): boolean {
  const wholesaleMinQty = Number(pricingConfig?.wholesale_min_qty_total || 0)
  if (!wholesaleMinQty) {
    return false
  }

  const totalQuantity = cart.reduce(
    (accumulator, item) => accumulator + Number(item.quantity || 0),
    0
  )
  return totalQuantity >= wholesaleMinQty
}

export function calculateSalePreview(
  cart: CartItem[],
  documentType: string,
  saleDiscount: SaleDiscountState | null,
  pricingConfig: PosPricingConfig | null | undefined
): SalePreview {
  const taxRate = TAX_RATE[documentType] ?? 0
  const wholesaleApplies = shouldApplyWholesalePreview(cart, pricingConfig)

  const preparedItems: PreparedCartItem[] = cart.map((item) => {
    const autoUnitPrice =
      wholesaleApplies && item.wholesale_price !== null && item.wholesale_price !== undefined
        ? Number(item.wholesale_price || 0)
        : item.retail_price !== null && item.retail_price !== undefined
          ? Number(item.retail_price || 0)
          : null
    const unitPriceBeforeDiscount =
      item.price_override?.unit_price_final ?? Number(autoUnitPrice || 0)
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
      pricing_rule_applied:
        priceTypeApplied === "wholesale"
          ? pricingConfig?.wholesale_rule_type || null
          : null,
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

export function buildCashLabel(status: string): string {
  if (status === "open") return "Caja operativa abierta"
  if (status === "closed") return "Caja operativa cerrada"
  return "Caja pendiente de apertura"
}

export function buildCashTone(status: string): string {
  if (status === "open") return "sales-chip sales-chip-success"
  if (status === "closed") return "sales-chip sales-chip-danger"
  return "sales-chip sales-chip-warning"
}

// Note: getDocumentIcon and getPaymentMethodIcon remain in the page component
// since they need React component references (LucideIcon) that work better
// with direct JSX imports rather than string-based icon selection.

export function getPaymentMethodLabel(method: string): string {
  return PAYMENT_METHODS.find((option) => option.value === method)?.label || "Sin definir"
}

export function getPaymentReferenceMeta(method: string): {
  label: string
  placeholder: string
  helper: string
} {
  if (method === "cash") {
    return {
      label: "Referencia",
      placeholder: "Opcional",
      helper: "En efectivo es opcional. Solo usalo si necesitas dejar una observacion corta.",
    }
  }

  if (method === "transfer") {
    return {
      label: "Operacion / voucher",
      placeholder: "Nro. de operacion o voucher",
      helper: "Registra el numero de operacion o voucher para rastrear el deposito.",
    }
  }

  if (method === "yape" || method === "plin") {
    return {
      label: "Operacion / celular",
      placeholder: "Ultimos 4 digitos o codigo",
      helper: "Registra codigo o ultimos 4 digitos para identificar el abono.",
    }
  }

  return {
    label: "Referencia",
    placeholder: "Codigo de referencia",
    helper: "Usa este campo para dejar el dato que ayude a rastrear el pago.",
  }
}

export function isCustomerValidForDocumentType(
  customer: PosCustomer | null,
  documentType: string
): boolean {
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

export function getCustomerSearchFilter(documentType: string): {
  queryDocumentType: string | null
  localDocumentTypes: string[] | null
} {
  if (documentType === "factura") {
    return { queryDocumentType: "ruc", localDocumentTypes: ["ruc"] }
  }

  if (documentType === "boleta") {
    return { queryDocumentType: null, localDocumentTypes: ["dni", "ce"] }
  }

  return { queryDocumentType: null, localDocumentTypes: null }
}

export function filterCustomersByDocumentType(
  customers: PosCustomer[],
  documentType: string
): PosCustomer[] {
  const { localDocumentTypes } = getCustomerSearchFilter(documentType)

  if (!localDocumentTypes) {
    return customers
  }

  return (customers || []).filter((customer) => {
    const customerDocType = String(customer?.document_type || "").toLowerCase()
    return localDocumentTypes.includes(customerDocType)
  })
}

export function groupVariantsByStyle(variants: SaleVariant[]): GroupedStyle[] {
  const grouped = new Map<string, GroupedStyle>()

  for (const variant of variants) {
    if (!grouped.has(variant.style_id)) {
      grouped.set(variant.style_id, {
        style_id: variant.style_id,
        style_name: variant.style_name,
        style_code: variant.style_code,
        variants: [],
      })
    }

    grouped.get(variant.style_id)!.variants.push(variant)
  }

  return Array.from(grouped.values())
}

export function normalizeSearchValue(value: unknown): string {
  return String(value || "").trim().toLowerCase()
}

export function getStyleSearchMeta(
  style: GroupedStyle,
  rawQuery: string,
  searchScope: string
): { matches: boolean; rank: number } {
  const query = normalizeSearchValue(rawQuery)
  if (!query) {
    return { matches: true, rank: 2 }
  }

  const styleName = normalizeSearchValue(style.style_name)
  const styleCode = normalizeSearchValue(style.style_code)
  const variantSkus = (style.variants || []).map((variant) =>
    normalizeSearchValue(variant.sku)
  )

  const exactCodeMatch =
    styleCode === query || variantSkus.some((sku) => sku === query)
  const partialCodeMatch =
    (styleCode && styleCode.includes(query)) ||
    variantSkus.some((sku) => sku.includes(query))
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

export function buildProductSearchResults(
  styles: GroupedStyle[],
  rawQuery: string
): SearchableStyle[] {
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

      return String(left.style_name || "").localeCompare(
        String(right.style_name || "")
      )
    })
}

export function getVariantOptionValues(
  variants: SaleVariant[],
  key: keyof SaleVariant,
  filters: Record<string, string> = {}
): string[] {
  const values = new Set<string>()

  for (const variant of variants || []) {
    const matchesFilters = Object.entries(filters).every(([filterKey, filterValue]) => {
      if (!filterValue) {
        return true
      }

      return String(variant?.[filterKey as keyof SaleVariant] || "") === String(filterValue)
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

export function findVariantByAttributes(
  variants: SaleVariant[],
  sizeCode: string,
  colorCode: string
): SaleVariant | null {
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

export function explainApiError(
  error: unknown,
  fallback: string
): string {
  const e = error as { status?: number; message?: string }
  if (!e || typeof e !== "object" || !("status" in e)) {
    return fallback
  }

  if (e.status === 403) {
    return "Tu usuario no tiene permisos para operar ventas en este modulo."
  }

  if (e.status === 409 || e.status === 400) {
    return e.message || fallback
  }

  if (e.status === 401) {
    return "La sesion ya no es valida. Inicia sesion otra vez para continuar."
  }

  return e.message || fallback
}

export function createEmptyCustomerForm(
  mode = "retail"
): CustomerFormState {
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

export function buildCustomerFormFromCustomer(
  customer: PosCustomer
): CustomerFormState {
  const entryMode =
    String(customer?.document_type || "").toLowerCase() === "ruc"
      ? "factura"
      : "retail"

  return {
    entry_mode: entryMode,
    document_type:
      customer?.document_type || (entryMode === "factura" ? "ruc" : "dni"),
    document_number: customer?.document_number || "",
    full_name: customer?.full_name || "",
    business_name: customer?.business_name || "",
    commercial_name: customer?.commercial_name || "",
    address: customer?.address || "",
    phone: customer?.phone || "",
    email: customer?.email || "",
  }
}

export function validateCustomerForm(form: CustomerFormState): string | null {
  if (form.entry_mode === "factura") {
    if (!trimOrNull(form.business_name)) {
      return "La razon social es obligatoria para cliente factura."
    }

    if (
      !SELLER_DOC_RULES.ruc.regex.test(
        String(form.document_number || "").trim()
      )
    ) {
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

  if (
    !rule.regex.test(String(form.document_number || "").trim())
  ) {
    return `Formato invalido para ${rule.label}.`
  }

  return null
}

export function buildCustomerPayload(form: CustomerFormState): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    document_type:
      form.entry_mode === "factura" ? "ruc" : form.document_type,
    document_number:
      form.entry_mode === "factura"
        ? trimOrNull(form.document_number)
        : form.document_type === "none"
          ? null
          : trimOrNull(form.document_number),
    full_name:
      form.entry_mode === "retail" ? trimOrNull(form.full_name) : null,
    business_name: trimOrNull(form.business_name),
    commercial_name: trimOrNull(form.commercial_name),
    address: trimOrNull(form.address),
    phone: trimOrNull(form.phone),
    email: trimOrNull(form.email),
    customer_type: "retail",
  }

  if (
    payload.document_type === "passport" &&
    payload.document_number
  ) {
    payload.document_number = String(payload.document_number).toUpperCase()
  }

  return payload
}

export function replaceCustomerInResults(
  results: PosCustomer[],
  customer: PosCustomer
): PosCustomer[] {
  const filtered = (results || []).filter(
    (item) => item.customer_id !== customer.customer_id
  )
  return [customer, ...filtered].slice(0, 8)
}
