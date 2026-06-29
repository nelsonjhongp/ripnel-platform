"use client"

import type {
  CashAdminLocationPoint,
  CashAdminSummaryResponse,
  LocationOption,
} from "./cash-types"
import { CAJA } from "./cash-messages"
import { formatBusinessDate } from "./cash-utils"

export type RangeFilter = "7d" | "30d" | "60d"
export type StatusFilter = "all" | "open" | "closed"

export const CASH_ADMIN_DEFAULT_FILTERS = {
  range: "7d" as RangeFilter,
  status: "all" as StatusFilter,
  locationId: "all",
  page: 1,
}

export function buildReopenCashPayload(reopenNotes: string) {
  return {
    reopen_notes: reopenNotes.trim() || null,
  }
}

export function buildCashLocationOptions(locations: LocationOption[]) {
  return [
    { value: "all", label: CAJA.admin.filters.allLocations },
    ...locations.map((location) => ({
      value: location.location_id,
      label: location.name,
    })),
  ]
}

export function buildCashTrendData(summary: CashAdminSummaryResponse | null) {
  return (summary?.trend || []).map((item) => ({
    ...item,
    short_date: formatBusinessDate(item.business_date).slice(0, 5),
  }))
}

export function buildCashLocationChartData(
  summary: CashAdminSummaryResponse | null,
) {
  return (summary?.by_location || []).slice(0, 8).map(
    (item: CashAdminLocationPoint) => ({
      ...item,
      short_name:
        item.location_name.length > 14
          ? `${item.location_name.slice(0, 14)}\u2026`
          : item.location_name,
    }),
  )
}

export function hasCashAdminActiveFilters({
  range,
  status,
  locationId,
}: {
  range: RangeFilter
  status: StatusFilter
  locationId: string
}) {
  return (
    range !== CASH_ADMIN_DEFAULT_FILTERS.range ||
    status !== CASH_ADMIN_DEFAULT_FILTERS.status ||
    locationId !== CASH_ADMIN_DEFAULT_FILTERS.locationId
  )
}
