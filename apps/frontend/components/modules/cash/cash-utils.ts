import type { CashClosing } from "./cash-types"
import { CAJA } from "./cash-messages"

export function formatAmount(value: number | string | undefined) {
  return `S/. ${Number(value || 0).toFixed(2)}`
}

export function todayPeruDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" })
}

export function addDaysToPeruDate(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00-05:00`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
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
  return status === "open" ? CAJA.statusLabels.pending : CAJA.statusLabels.closed
}

export function deriveConsistencyTone(isConsistent: boolean) {
  if (!isConsistent) {
    return "border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)]"
  }
  return "border-[var(--ops-tone-success-border)] bg-[var(--ops-tone-success-bg)]"
}

type BuildQueryParams = {
  range: string
  status: string
  locationId: string
  page?: number
  pageSize?: number
}

export function buildCashAdminQuery(params: BuildQueryParams) {
  const query = new URLSearchParams({ range: params.range })

  if (params.status !== "all") {
    query.set("status", params.status)
  }

  if (params.locationId !== "all") {
    query.set("locationId", params.locationId)
  }

  if (params.page) {
    query.set("page", String(params.page))
    query.set("pageSize", String(params.pageSize ?? 20))
  }

  return query.toString()
}
