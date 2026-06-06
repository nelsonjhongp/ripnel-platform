import type { LucideIcon } from "lucide-react"

export interface SaleVariant {
  variant_id: string
  sku: string
  style_id: string
  style_name: string
  style_code: string
  size_code: string
  size_name: string | null
  color_code: string
  color_name: string | null
  retail_price: number | null
  wholesale_price: number | null
  stock: number
}

export interface GroupedStyle {
  style_id: string
  style_name: string
  style_code: string
  variants: SaleVariant[]
}

export interface SearchableStyle extends GroupedStyle {
  totalStock: number
  searchRank: number
  matchesScope: boolean
}

export interface PriceOverride {
  unit_price_final: number
  reason: string
}

export interface CartItem {
  variant_id: string
  sku: string
  style_name: string
  size_code: string
  size_name: string | null
  color_code: string
  color_name: string | null
  label: string
  quantity: number
  retail_price: number | null
  wholesale_price: number | null
  stock: number
  price_override: PriceOverride | null
}

export interface SaleDiscountState {
  mode: string
  value: string
  reason: string
}

export interface PaymentDraft {
  id: string
  method: string
  amount: string
  reference: string
}

export interface CustomerFormState {
  entry_mode: string
  document_type: string
  document_number: string
  full_name: string
  business_name: string
  commercial_name: string
  address: string
  phone: string
  email: string
}

export interface PriceFormState {
  unit_price_final: string
  reason: string
}

export interface PosCashState {
  status: string
  sale_enabled: boolean
  message?: string
}

export interface PosPricingConfig {
  wholesale_min_qty_total?: number
  wholesale_rule_type?: string | null
}

export interface PosContext {
  cash: PosCashState
  pricing: PosPricingConfig
}

export interface PosCustomer {
  customer_id: string
  document_type: string
  document_number: string
  full_name?: string
  business_name?: string
  commercial_name?: string
  display_name?: string
  address?: string
  phone?: string
  email?: string
  internal_code?: string
}

export interface PreviewItem {
  variant_id: string
  quantity: number
  style_name: string
  sku: string
  size_code: string
  size_name: string | null
  color_code: string
  color_name: string | null
  label: string
  unit_price_list: number | null
  unit_price_before_discount: number
  price_type_applied: string
  pricing_rule_applied: string | null
  line_subtotal_before_discount: number
  line_discount_amount: number
  line_subtotal: number
  price_override?: PriceOverride | null
  preview_unit_price_final: number
  line_tax: number
  line_total: number
  retail_price?: number | null
  wholesale_price?: number | null
  stock: number
}

export interface SalePreview {
  items: PreviewItem[]
  subtotal: number
  tax: number
  total: number
  taxRate: number
  hasMissingPrice: boolean
  baseSubtotal: number
  saleDiscountAmount: number
  priceMode: string
  wholesaleApplied: boolean
}

export interface MixedPayment {
  method: string
  amount: number | null
  reference: string | null
}

export interface MixedPaymentPreview {
  payments: MixedPayment[]
  enteredTotal: number
  difference: number
  error: string | null
}

export interface ProgressItem {
  id: string
  label: string
  icon: LucideIcon
  active: boolean
  complete: boolean
  suggested: boolean
  meta: string
}

export interface ConfirmedSale {
  sale_id: string
  sale_number: string
}

export type Stage = "products" | "customer" | "payment" | "summary"

export interface DocTypeOption {
  value: string
  label: string
}

export interface PaymentMethodOption {
  value: string
  label: string
}

export interface SaleDiscountOption {
  value: string
  label: string
}

export interface SaleDiscountReasonOption {
  value: string
  label: string
}

export interface SellerDocRule {
  label: string
  regex: RegExp
}

export const DOC_TYPES: DocTypeOption[] = [
  { value: "none", label: "Sin comprobante" },
  { value: "boleta", label: "Boleta (DNI/CE)" },
  { value: "factura", label: "Factura (RUC)" },
  { value: "proforma", label: "Proforma" },
]

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { value: "cash", label: "Efectivo" },
  { value: "yape", label: "Yape" },
  { value: "plin", label: "Plin" },
  { value: "transfer", label: "Transferencia" },
]

export const SALE_DISCOUNT_OPTIONS: SaleDiscountOption[] = [
  { value: "none", label: "Sin descuento" },
  { value: "percent", label: "Porcentaje" },
  { value: "amount", label: "Monto fijo" },
]

export const SALE_DISCOUNT_REASON_OPTIONS: SaleDiscountReasonOption[] = [
  { value: "", label: "Seleccionar motivo" },
  { value: "Promocion de tienda", label: "Promocion de tienda" },
  { value: "Ajuste comercial", label: "Ajuste comercial" },
  { value: "Fidelizacion", label: "Fidelizacion" },
  { value: "Autorizacion interna", label: "Autorizacion interna" },
  { value: "custom", label: "Motivo personalizado" },
]

export const TAX_RATE: Record<string, number> = {
  none: 0,
  proforma: 0,
  boleta: 0.18,
  factura: 0.18,
}

export const GENERIC_CUSTOMER_CODE = "SALE-CLI-001"

export const SELLER_DOC_RULES: Record<string, SellerDocRule> = {
  dni: { label: "DNI", regex: /^\d{8}$/ },
  ruc: { label: "RUC", regex: /^\d{11}$/ },
  ce: { label: "CE", regex: /^[A-Za-z0-9]{9,12}$/ },
  passport: { label: "Pasaporte", regex: /^[A-Za-z0-9]{6,15}$/ },
}
