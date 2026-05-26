export type DashboardLocation = {
  location_id: string
  name: string
  code: string | null
  type: string
}

export type DashboardContext = {
  generated_at: string
  business_date: string
  date_from?: string
  location: DashboardLocation
  user: {
    user_id: string
    full_name: string
    role_name: string | null
  }
}

export type DashboardSections = {
  sales: boolean
  cash: boolean
  postsales: boolean
  inventory: boolean
  transfers: boolean
}

export type PaymentTotals = {
  cash: number
  yape: number
  plin: number
  transfer: number
  all: number
}

export type DashboardMetricComparison = {
  current: number
  previous: number | null
  delta: number | null
  delta_pct: number | null
  direction: "up" | "down" | "neutral"
  valid: boolean
}

export type SalesToday = {
  visible: boolean
  sale_count?: number
  total_amount?: number
  last_confirmed_at?: string | null
  by_method?: PaymentTotals
  comparisons?: {
    sale_count?: DashboardMetricComparison
    total_amount?: DashboardMetricComparison
    avg_ticket?: DashboardMetricComparison
  }
}

export type CashClosing = {
  cash_closing_id: string
  business_date: string
  status: "open" | "closed"
  total_all: number
  location_name: string
  opened_by_name?: string | null
  closed_by_name?: string | null
  closed_at?: string | null
}

export type CashSummary = {
  sale_count: number
  grand_total: number
  by_method: PaymentTotals
  consistency: CashConsistency
  comparisons?: {
    payment_total?: DashboardMetricComparison
  }
}

export type CashConsistency = {
  sales_total: number
  payment_total: number
  difference: number
  is_consistent: boolean
}

export type CashSection = {
  visible: boolean
  closing?: CashClosing | null
  sales_summary?: CashSummary
}

export type PostsalesItem = {
  sale_id: string
  sale_number: string | null
  customer_name_text: string | null
  total_amount: number
  currency: string
  business_date: string
  occurred_at: string
  cash_status: "open" | "closed" | "missing"
  exchange_allowed: boolean
  cancel_allowed: boolean
}

export type PostsalesSection = {
  visible: boolean
  recent_window_days?: number
  total_recent_confirmed?: number
  eligible_exchange_count?: number
  eligible_cancel_count?: number
  blocked_cancel_count?: number
  latest?: PostsalesItem[]
}

export type TransferItem = {
  transfer_id: string
  transfer_number: string | null
  status: string
  from_location_name: string
  to_location_name: string
  shipped_at: string | null
  updated_at: string
  qty_shipped_total: number
}

export type TransfersSection = {
  visible: boolean
  pending_receipts_count?: number
  pending_approval_count?: number
  pending_dispatch_count?: number
  latest?: TransferItem[]
}

export type InventoryItem = {
  variant_id: string
  sku: string
  style_name: string
  style_code: string
  size_code: string
  color_code: string
  qty: number
}

export type InventorySection = {
  visible: boolean
  low_stock_threshold?: number
  zero_stock_count?: number
  low_stock_count?: number
  critical_variants?: InventoryItem[]
}

export type Shortcut = {
  key: string
  label: string
  href: string
  description: string
}

export type DashboardOverview = {
  context: DashboardContext
  sections: DashboardSections
  sales_today: SalesToday
  cash: CashSection
  postsales: PostsalesSection
  transfers: TransfersSection
  inventory: InventorySection
  shortcuts: Shortcut[]
}

export type ActivityItem = {
  id: string
  type: string
  occurred_at: string
  title: string
  subtitle: string
  status: string
  href: string
}

export type DashboardActivity = {
  items: ActivityItem[]
}

export type OperationalPriority = {
  key: string
  title: string
  description: string
  href: string
  tone: "warning" | "danger" | "neutral"
}

export type CustomerAnalytics = {
  top_customers: Array<{
    customer_name: string
    sale_count: number
    total_amount: number
  }>
  top_products: Array<{
    product_name: string
    style_code: string
    qty_sold: number
    total_amount: number
  }>
  by_document_type: Array<{
    document_type: string
    sale_count: number
    total_amount: number
  }>
  by_weekday: Array<{
    weekday_number: number
    sale_count: number
    total_amount: number
  }>
}

export type DepartmentSalesData = {
  name: string
  sale_count: number
  total_amount: number
}

export type DepartmentSalesResponse = {
  context: {
    location_id: string
    date_from: string
    date_to: string
  }
  departments: DepartmentSalesData[]
}

export type PaymentBarData = {
  key: string
  label: string
  amount: number
}

export type PressureBarData = {
  key: string
  label: string
  value: number
}

export type CommercialActivityMetric = "amount" | "sales" | "avg_ticket"
export type CommercialActivityMode = "today" | "daily"

export type CommercialActivityRow = {
  location_id: string
  name: string
  code: string | null
  type: string
  is_default: boolean
}

export type CommercialActivityColumn = {
  key: string
  label: string
  short_label: string
}

export type CommercialActivityCell = {
  location_id: string
  column_key: string
  sale_count: number
  total_amount: number
  avg_ticket: number
}

export type CommercialActivityResponse = {
  visible: boolean
  context: {
    date_from: string
    date_to: string
    group: CommercialActivityMode
    default_metric: CommercialActivityMetric
    active_location_id: string
  }
  rows: CommercialActivityRow[]
  columns: CommercialActivityColumn[]
  cells: CommercialActivityCell[]
}
