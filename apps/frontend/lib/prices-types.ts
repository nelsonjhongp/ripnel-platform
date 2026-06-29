export type PriceType = "retail" | "wholesale"

export type ValidityStatus = "active" | "scheduled" | "expired" | "inactive"

export type PriceRow = {
  style_size_price_id: string
  style_id: string
  style_code: string
  style_name: string
  size_id: string
  size_code: string
  size_name: string
  price_type: PriceType
  price: number
  start_date: string
  end_date: string | null
  active: boolean
  validity_status: ValidityStatus
}

export type PricingRuleRow = {
  rule_id: string
  rule_type: string
  min_qty: number
  active: boolean
  valid_from: string | null
  valid_to: string | null
}

export type ProductSummaryStatus =
  | "inactive"
  | "draft"
  | "pending_variants"
  | "pending_prices"
  | "ready_no_stock"
  | "ready"

export type ProductSummary = {
  style_id: string
  style_code: string | null
  name: string
  description: string | null
  active: boolean
  garment_type_name: string
  configured_size_count: number
  configured_color_count: number
  expected_variant_count: number
  variant_count: number
  active_variant_count: number
  inventory_row_count: number
  stocked_variant_count: number
  total_stock_qty: number
  retail_sizes_covered_count: number
  wholesale_sizes_covered_count: number
  missing_retail_size_count: number
  missing_wholesale_size_count: number
  sizes_with_stock_without_retail_count: number
  status: ProductSummaryStatus
  next_step_label: string
  warnings: {
    missing_wholesale_prices: boolean
    stock_without_retail_price: boolean
  }
}

export type PriceCatalogRow = {
  style_id: string
  style_code: string | null
  style_name: string
  active: boolean
  garment_type_name: string
  configured_size_count: number
  size_codes?: string[]
  configured_color_count: number
  variant_count: number
  active_variant_count: number
  inventory_row_count: number
  total_stock_qty: number
  retail_sizes_covered_count: number
  wholesale_sizes_covered_count: number
  missing_retail_size_count: number
  missing_wholesale_size_count: number
  sizes_with_stock_without_retail_count: number
  status: ProductSummaryStatus
  next_step_label: string
  warnings: ProductSummary["warnings"]
}

export type WorkspaceSize = {
  size_id: string
  code: string
  name: string
  sort_order: number
  active: boolean
  has_current_retail_price: boolean
  has_current_wholesale_price: boolean
  retail_price_count: number
  wholesale_price_count: number
  current_retail_price: number | null
  current_wholesale_price: number | null
  stock_qty: number
  has_stock: boolean
}

export type WorkspaceColor = {
  color_id: string
  code: string | null
  name: string
  hex: string | null
  active: boolean
}

export type PriceWorkspace = {
  product: ProductSummary
  configured_sizes: WorkspaceSize[]
  configured_colors: WorkspaceColor[]
  price_rows: PriceRow[]
  pricing_rules: PricingRuleRow[]
}

export type PriceCoverageGap = {
  style_id: string
  style_code: string | null
  style_name: string
  variant_count: number
  inventory_row_count: number
  price_row_count: number
  configured_size_count: number
  retail_sizes_covered_count: number
  missing_retail_size_count: number
  sizes_with_stock_without_retail_count: number
  total_stock_qty: number
  status: ProductSummaryStatus
}

export type ProductsResponse = {
  items: ProductSummary[]
  pagination: {
    page: number
    page_size: number
    total_items: number
    total_pages: number
  }
}
