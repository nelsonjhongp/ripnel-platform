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

export type CashClosingDetail = CashClosing & {
  sales_summary: SalesSummary
}

export type CurrentCashResponse = {
  closing: CashClosing | null
  business_date: string
  sales_summary: SalesSummary
}

export type CashHistoryFilters = {
  range: "7d" | "30d"
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

export function formatAmount(value: number | string | undefined) {
  return `S/. ${Number(value || 0).toFixed(2)}`
}

export function formatBusinessDate(value: string | null | undefined) {
  if (!value) return "-"

  const normalized = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split("-")
    return `${day}/${month}/${year}`
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    return normalized
  }

  return parsed.toLocaleDateString("es-PE", { timeZone: "America/Lima" })
}

export function getCashStatusLabel(status: CashClosing["status"]) {
  return status === "open" ? "Pendiente de cierre" : "Cerrada"
}

export function getCashStatusTone(status: CashClosing["status"]) {
  return status === "open"
    ? "sales-chip sales-chip-warning"
    : "sales-chip sales-chip-neutral"
}
