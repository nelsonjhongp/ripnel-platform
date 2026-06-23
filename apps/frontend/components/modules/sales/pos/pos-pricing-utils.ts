import type {
  CartItem,
  EffectivePriceMode,
  PosPricingConfig,
  PriceModeOverride,
  PreviewItem,
  SaleDiscountState,
  SalePreview,
} from "./pos-types"
import { TAX_RATE } from "./pos-types"

import { round2, parseAmountInput } from "./pos-utils"

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

export function computeSaleDiscountAmount(
  subtotalAmount: number,
  saleDiscount: SaleDiscountState | null
): number {
  if (!saleDiscount) return 0
  const value = parseAmountInput(saleDiscount.value)
  if (value === null || value < 0 || subtotalAmount <= 0) {
    return 0
  }

  if (saleDiscount.mode === "amount") {
    return round2(Math.min(value, subtotalAmount))
  }

  return round2((subtotalAmount * value) / 100)
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

export function resolveEffectivePriceMode(
  cart: CartItem[],
  pricingConfig: PosPricingConfig | null | undefined,
  pricingModeOverride: PriceModeOverride | "auto" = "auto"
): EffectivePriceMode {
  if (pricingModeOverride === "retail" || pricingModeOverride === "wholesale") {
    return pricingModeOverride
  }

  return shouldApplyWholesalePreview(cart, pricingConfig) ? "wholesale" : "retail"
}

export function resolveListPriceForMode(
  priceSource: Pick<CartItem, "retail_price" | "wholesale_price">,
  priceMode: EffectivePriceMode
): {
  unitPrice: number | null
  priceTypeApplied: EffectivePriceMode
} {
  if (
    priceMode === "wholesale" &&
    priceSource.wholesale_price !== null &&
    priceSource.wholesale_price !== undefined
  ) {
    return {
      unitPrice: Number(priceSource.wholesale_price || 0),
      priceTypeApplied: "wholesale",
    }
  }

  return {
    unitPrice:
      priceSource.retail_price !== null && priceSource.retail_price !== undefined
        ? Number(priceSource.retail_price || 0)
        : null,
    priceTypeApplied: "retail",
  }
}

export function buildForcedPriceOverrideReason(priceMode: EffectivePriceMode): string {
  return priceMode === "wholesale"
    ? "Modo de precio forzado: Mayorista"
    : "Modo de precio forzado: Minorista"
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

export function calculateSalePreview(
  cart: CartItem[],
  documentType: string,
  saleDiscount: SaleDiscountState | null,
  pricingConfig: PosPricingConfig | null | undefined,
  pricingModeOverride: PriceModeOverride | "auto" = "auto"
): SalePreview {
  const taxRate = TAX_RATE[documentType] ?? 0
  const effectivePriceMode = resolveEffectivePriceMode(
    cart,
    pricingConfig,
    pricingModeOverride
  )

  const preparedItems: PreparedCartItem[] = cart.map((item) => {
    const { unitPrice: autoUnitPrice, priceTypeApplied } = resolveListPriceForMode(
      item,
      effectivePriceMode
    )
    const unitPriceBeforeDiscount =
      item.price_override?.unit_price_final ?? Number(autoUnitPrice || 0)
    const lineSubtotalBeforeDiscount = round2(unitPriceBeforeDiscount * item.quantity)

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
    priceMode: effectivePriceMode,
    wholesaleApplied: effectivePriceMode === "wholesale",
  }
}
