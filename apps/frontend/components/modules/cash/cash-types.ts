export type PaymentTotals = {
  cash: number
  yape: number
  plin: number
  transfer: number
  all: number
}

export type SalesConsistency = {
  payment_total: number
  difference: number
  is_consistent: boolean
}

export type SalesSummary = {
  sale_count: number
  grand_total: number
  by_method: PaymentTotals
  consistency: SalesConsistency
}

export type CashClosing = {
  cash_closing_id: string
  location_id: string
  location_name: string
  business_date: string
  status: "open" | "closed"
  opened_by: string | null
  opened_by_name: string | null
  closed_by: string | null
  closed_by_name: string | null
  reopened_by: string | null
  reopened_by_name: string | null
  reopened_at: string | null
  reopen_notes: string | null
  opening_balance: number
  closing_balance_declared: number | null
  total_cash: number
  total_yape: number
  total_plin: number
  total_transfer: number
  total_all: number
  notes: string | null
  created_at: string
  closed_at: string | null
  sale_count?: number
  grand_total?: number
  payment_total?: number
  difference?: number
  is_consistent?: boolean
}

export type CashClosingsResponse = {
  items: CashClosing[]
  pagination: {
    page: number
    page_size: number
    total_items: number
    total_pages: number
  }
}

export type CashClosingDetail = CashClosing & {
  sales_summary: SalesSummary
}

export type CurrentCashResponse = {
  closing: CashClosing | null
  business_date: string
  sales_summary: SalesSummary
}

export type CashHistoryFilters = {
  range: "7d" | "30d" | "60d"
  status: "all" | "open" | "closed"
  location_id?: string | null
}

export type CashAdminSummaryStats = {
  session_count: number
  open_count: number
  closed_count: number
  open_location_count: number
  total_registered: number
}

export type CashAdminTrendPoint = {
  business_date: string
  session_count: number
  open_count: number
  closed_count: number
  total_registered: number
}

export type CashAdminLocationPoint = {
  location_id: string
  location_name: string
  session_count: number
  open_count: number
  closed_count: number
  total_registered: number
}

export type CashAdminSummaryResponse = {
  filters: CashHistoryFilters
  stats: CashAdminSummaryStats
  trend: CashAdminTrendPoint[]
  by_location: CashAdminLocationPoint[]
  alerts: {
    open_locations: Array<{
      location_id: string
      location_name: string
      open_count: number
    }>
    inconsistent_sessions: CashClosing[]
  }
}

export type CashAdminSessionsResponse = {
  filters: CashHistoryFilters
  items: CashClosing[]
  pagination: {
    page: number
    page_size: number
    total_items: number
    total_pages: number
  }
}

export type LocationOption = {
  location_id: string
  name: string
  code?: string
  active?: boolean
}
