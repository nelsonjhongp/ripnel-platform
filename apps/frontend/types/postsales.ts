export type PostsaleAvailability = {
  exchange: {
    allowed: boolean
    reasons: string[]
  }
  cancel: {
    allowed: boolean
    reasons: string[]
  }
}

export type SaleLine = {
  sale_detail_id: string
  variant_id: string
  sku: string
  style_name: string
  style_code: string
  size_code: string
  size_name: string
  color_code: string
  color_name: string
  quantity: number
  unit_price_list: number
  unit_price_final: number
  line_subtotal: number
  line_tax: number
  line_total: number
  exchanged_qty: number
}

export type SalePayment = {
  payment_id: string
  method: string
  amount: number
  reference: string | null
  paid_at: string
}

export type PaymentReversal = {
  payment_reversal_id: string
  payment_id: string
  method: string
  amount: number
  reason: string
  notes: string | null
  reversed_at: string
  reversed_by_name: string | null
}

export type ExchangeLine = {
  exchange_line_id: string
  direction: "IN" | "OUT"
  variant_id: string
  sku: string
  style_name: string
  style_code: string
  size_code: string
  color_code: string
  quantity: number
  unit_reference_price: number | null
  unit_price_list: number | null
  unit_price_final: number | null
  line_subtotal: number
  line_tax: number
  line_total: number
  price_source: string | null
}

export type ExchangeRecord = {
  exchange_id: string
  exchange_number: string | null
  status: string
  reason: string | null
  notes: string | null
  original_total: number
  replacement_total: number
  difference_amount: number
  settlement_type: "none" | "charge" | "refund_pending" | "credit_pending"
  settlement_payment_id: string | null
  created_by_name: string | null
  confirmed_by_name: string | null
  confirmed_at: string | null
  created_at: string
  lines: ExchangeLine[]
}

export type PostsaleContext = {
  sale: {
    sale_id: string
    sale_number: string | null
    status: string
    document_type: string
    customer_name_text: string | null
    customer_doc_type: string | null
    customer_doc_number: string | null
    customer_address_text: string | null
    location_name: string
    seller_name: string
    subtotal_amount: number
    sale_discount_amount: number
    tax_amount: number
    tax_rate: number
    total_amount: number
    currency: string
    notes: string | null
    business_date: string
    confirmed_at: string | null
    created_at: string
    cash_status: "open" | "closed" | "missing"
    details: SaleLine[]
    payments: SalePayment[]
  }
  payment_reversals: PaymentReversal[]
  cancellation: {
    sale_cancellation_id: string
    reason: string
    notes: string | null
    cancelled_at: string
    cancelled_by_name: string | null
  } | null
  exchanges: ExchangeRecord[]
  cash_closing: {
    cash_closing_id: string
    business_date: string
    status: "open" | "closed" | "missing"
  } | null
  availability: PostsaleAvailability
}

export type SellableVariant = {
  variant_id: string
  sku: string
  style_name: string
  style_code: string
  size_code: string
  size_name: string
  color_code: string
  color_name: string
  stock: number
  retail_price: number
}

export type EligibleSale = {
  sale_id: string
  sale_number: string | null
  status: string
  document_type: string
  customer_name_text: string | null
  total_amount: number
  currency: string
  seller_name: string
  location_name: string
  confirmed_at: string | null
  created_at: string
  business_date: string
  cash_status: "open" | "closed" | "missing"
  confirmed_exchange_count: number
  availability: PostsaleAvailability
}
