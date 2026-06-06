export type DocRule = {
  label: string
  regex: RegExp
}

export const DOC_RULES: Record<string, DocRule> = {
  dni: { label: "DNI", regex: /^\d{8}$/ },
  ruc: { label: "RUC", regex: /^\d{11}$/ },
  ce: { label: "CE", regex: /^[A-Za-z0-9]{9,12}$/ },
  passport: { label: "Pasaporte", regex: /^[A-Za-z0-9]{6,15}$/ },
}

export type PaymentMethodOption = {
  value: string
  label: string
}

export const PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
  { value: "cash", label: "Efectivo" },
  { value: "yape", label: "Yape" },
  { value: "plin", label: "Plin" },
  { value: "transfer", label: "Transferencia" },
  { value: "card", label: "Tarjeta" },
  { value: "credit", label: "Crédito" },
]

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  efectivo: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  transfer: "Transferencia",
  transferencia: "Transferencia",
  card: "Tarjeta",
  tarjeta: "Tarjeta",
  credit: "Crédito",
  credito: "Crédito",
}

export type SaleStatus = "confirmed" | "draft" | "cancelled"

export const SALE_STATUS_META: Record<SaleStatus, { label: string }> = {
  confirmed: { label: "Confirmada" },
  draft: { label: "Pendiente" },
  cancelled: { label: "Anulada" },
}

export const SALE_STATUS_TONES: Record<SaleStatus, "success" | "warning" | "danger" | "neutral" | "accent"> = {
  confirmed: "success",
  draft: "warning",
  cancelled: "danger",
}

export type SaleItem = {
  sale_id: string
  sale_number: string | null
  status: SaleStatus
  document_type: string
  customer_name_text: string | null
  subtotal_amount: number
  tax_amount: number
  sale_discount_amount: number
  total_amount: number
  currency: string
  confirmed_at: string | null
  created_at: string
  location_name: string
  seller_name: string
}

export type SalesPageResponse = {
  items: SaleItem[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}
