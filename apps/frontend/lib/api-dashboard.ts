import { apiFetch } from "@/lib/api"
import type {
  CommercialActivityMode,
  CommercialActivityResponse,
  DashboardOverview,
  DashboardActivity,
  CustomerAnalytics,
  DepartmentSalesResponse,
} from "@/lib/dashboard-types"

type DashboardQueryParams = {
  date_from?: string
  date_to?: string
  location_scope?: "all" | "single"
  location_id?: string | null
}

function buildDashboardSearchParams(params?: DashboardQueryParams) {
  const searchParams = new URLSearchParams()
  if (params?.date_from) searchParams.set("date_from", params.date_from)
  if (params?.date_to) searchParams.set("date_to", params.date_to)
  if (params?.location_scope) searchParams.set("location_scope", params.location_scope)
  if (params?.location_id) searchParams.set("location_id", params.location_id)
  return searchParams
}

export async function fetchDashboardOverview(params?: DashboardQueryParams): Promise<DashboardOverview> {
  const searchParams = buildDashboardSearchParams(params)
  const qs = searchParams.toString()
  return apiFetch<DashboardOverview>(`/api/dashboard/overview${qs ? `?${qs}` : ""}`, { cache: "no-store" })
}

export async function fetchSalesByDepartment(params: {
  date_from: string
  date_to: string
  location_scope?: "all" | "single"
  location_id?: string | null
}): Promise<DepartmentSalesResponse> {
  const searchParams = buildDashboardSearchParams(params)
  return apiFetch<DepartmentSalesResponse>(`/api/dashboard/sales-by-department?${searchParams.toString()}`, { cache: "no-store" })
}

export async function fetchDashboardActivity(): Promise<DashboardActivity> {
  return apiFetch<DashboardActivity>("/api/dashboard/activity", { cache: "no-store" })
}

export async function fetchCustomerAnalytics(params: {
  date_from: string
  date_to: string
  limit?: number
  location_scope?: "all" | "single"
  location_id?: string | null
}): Promise<CustomerAnalytics> {
  const searchParams = buildDashboardSearchParams(params)
  if (params.limit) searchParams.set("limit", String(params.limit))
  return apiFetch<CustomerAnalytics>(`/api/sales/analytics/customers?${searchParams.toString()}`, { cache: "no-store" })
}

export async function fetchCommercialActivity(params: {
  date_from: string
  date_to: string
  group: CommercialActivityMode
  location_scope?: "all" | "single"
  location_id?: string | null
}): Promise<CommercialActivityResponse> {
  const searchParams = buildDashboardSearchParams(params)
  searchParams.set("group", params.group)

  return apiFetch<CommercialActivityResponse>(`/api/dashboard/commercial-activity?${searchParams.toString()}`, {
    cache: "no-store",
  })
}
