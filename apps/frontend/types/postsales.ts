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
}

export type SalePayment = {
  payment_id: string
  method: string
  amount: number
  reference: string | null
  paid_at: string
}
