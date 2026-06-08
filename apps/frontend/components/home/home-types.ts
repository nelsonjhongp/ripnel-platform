export type HomeTone = "default" | "warning"

export type HomeScope = "personal" | "location" | "assigned_network"

export type HomeContext = {
  generated_at: string
  business_date: string
  location: {
    location_id: string
    name: string
    code: string | null
    type: string
  }
  user: {
    user_id: string
    full_name: string
    role_name: string | null
  }
}

export type HomeOverview = {
  context: HomeContext
  capabilities: {
    sales: boolean
    cash: boolean
    inventory: boolean
    admin: boolean
    transfers: {
      manage: boolean
      request_create: boolean
      request_view_own: boolean
      ship: boolean
      receive: boolean
      visible: boolean
    }
  }
  hero: {
    eyebrow: string
    title: string
    description: string
    tone: HomeTone
    cta: {
      label: string
      href: string
    } | null
  }
  kpis: Array<{
    key: string
    label: string
    value: string | number
    meta: string
    scope: HomeScope
    tone: HomeTone | "primary"
    href: string
  }>
  priorities: Array<{
    key: string
    title: string
    description: string
    href: string
    tone: HomeTone | "default"
  }>
  quick_actions: Array<{
    key: string
    label: string
    href: string
    description: string
    tone: HomeTone | "primary" | "default"
  }>
  sections: {
    transfer_requests: {
      visible: boolean
      counts: {
        open_for_store_count: number
        pending_approval_count: number
        pending_dispatch_count: number
        pending_receipts_count: number
      }
      latest: Array<{
        transfer_id: string
        transfer_number: string | null
        title: string
        flow: string
        status: string
        from_location_name: string
        from_location_code: string
        to_location_name: string
        to_location_code: string
        qty_requested_total: number
        qty_shipped_total: number
        happened_at: string
        href: string
      }>
      primary_action: {
        label: string
        href: string
      } | null
    } | null
    cash: {
      visible: boolean
      closing: {
        status: "open" | "closed"
      } | null
      consistency: {
        sales_total: number
        payment_total: number
        difference: number
        is_consistent: boolean
      } | null
    } | null
    inventory: {
      visible: boolean
      low_stock_threshold: number
      zero_stock_count: number
      low_stock_count: number
      critical_variants: Array<{
        variant_id: string
        sku: string
        style_name: string
        style_code: string
        size_code: string
        color_code: string
        qty: number
      }>
    } | null
    admin: {
      visible: boolean
      active_user_count: number
      active_location_count: number
      sales_today_count: number
      sales_today_total: number
      pending_requests_count: number
    } | null
    personal_sales: {
      visible: boolean
      today: {
        sale_count: number
        total_amount: number
      }
      week: {
        sale_count: number
        total_amount: number
      }
      last_sale: {
        sale_id: string
        sale_number: string | null
        customer_name_text: string | null
        total_amount: number
        currency: string
        confirmed_at: string
      } | null
    } | null
  }
}
