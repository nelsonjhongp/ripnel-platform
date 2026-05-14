import { apiFetch } from "@/lib/api"
import type { DashboardOverview, DashboardActivity, CustomerAnalytics, DepartmentSalesResponse } from "@/lib/dashboard-types"

export async function fetchDashboardOverview(params?: { date_from?: string; date_to?: string }): Promise<DashboardOverview> {
  const searchParams = new URLSearchParams()
  if (params?.date_from) searchParams.set("date_from", params.date_from)
  if (params?.date_to) searchParams.set("date_to", params.date_to)
  const qs = searchParams.toString()
  return apiFetch<DashboardOverview>(`/api/dashboard/overview${qs ? `?${qs}` : ""}`, { cache: "no-store" })
}

export async function fetchSalesByDepartment(params: {
  date_from: string
  date_to: string
}): Promise<DepartmentSalesResponse> {
  const searchParams = new URLSearchParams()
  searchParams.set("date_from", params.date_from)
  searchParams.set("date_to", params.date_to)
  return apiFetch<DepartmentSalesResponse>(`/api/dashboard/sales-by-department?${searchParams.toString()}`, { cache: "no-store" })
}

export async function fetchDashboardActivity(): Promise<DashboardActivity> {
  return apiFetch<DashboardActivity>("/api/dashboard/activity", { cache: "no-store" })
}

export async function fetchCustomerAnalytics(params: {
  date_from: string
  date_to: string
  limit?: number
}): Promise<CustomerAnalytics> {
  const searchParams = new URLSearchParams()
  searchParams.set("date_from", params.date_from)
  searchParams.set("date_to", params.date_to)
  if (params.limit) searchParams.set("limit", String(params.limit))
  return apiFetch<CustomerAnalytics>(`/api/sales/analytics/customers?${searchParams.toString()}`, { cache: "no-store" })
}
