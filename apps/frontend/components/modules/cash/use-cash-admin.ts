"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { apiFetch } from "@/lib/api"
import { showError, showSuccess } from "@/lib/toast"
import { explainApiError } from "@/lib/error-utils"

import type {
  CashAdminSessionsResponse,
  CashAdminSummaryResponse,
  LocationOption,
} from "./cash-types"
import { ADMIN_PAGE_SIZE } from "./cash-constants"
import { formatBusinessDate, buildCashAdminQuery } from "./cash-utils"
import { CAJA } from "./cash-messages"

type RangeFilter = "7d" | "30d" | "60d" | "90d"
type StatusFilter = "all" | "open" | "closed"

export function useCashAdmin() {
  const [summary, setSummary] = useState<CashAdminSummaryResponse | null>(null)
  const [sessions, setSessions] = useState<CashAdminSessionsResponse | null>(
    null,
  )
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<RangeFilter>("7d")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [locationId, setLocationId] = useState("all")
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)

  const [reopenTarget, setReopenTarget] = useState<string | null>(null)
  const [reopenNotes, setReopenNotes] = useState("")
  const [reopeningCash, setReopeningCash] = useState(false)

  const handleReopenCash = useCallback(async () => {
    if (!reopenTarget || reopeningCash) return
    setReopeningCash(true)
    try {
      await apiFetch(`/api/cash/${reopenTarget}/reopen`, {
        method: "PATCH",
        body: JSON.stringify({ reopen_notes: reopenNotes.trim() || null }),
      })
      setReopenTarget(null)
      setReopenNotes("")
      setReloadKey((k) => k + 1)
      showSuccess(
        CAJA.toast.reopenSuccess.title,
        CAJA.toast.reopenSuccess.desc,
      )
    } catch (e) {
      showError(
        CAJA.toast.reopenError.title,
        explainApiError(e, CAJA.toast.reopenError.fallback),
      )
    } finally {
      setReopeningCash(false)
    }
  }, [reopenTarget, reopeningCash, reopenNotes])

  const locationOptions: { value: string; label: string }[] = useMemo(
    () => [
      { value: "all", label: CAJA.admin.filters.allLocations },
      ...locations.map((l) => ({
        value: l.location_id,
        label: l.name,
      })),
    ],
    [locations],
  )

  useEffect(() => {
    let active = true

    async function loadLocations() {
      try {
        const data = await apiFetch<LocationOption[]>("/api/locations", {
          cache: "no-store",
        })

        if (active) {
          const normalized = Array.isArray(data)
            ? data.filter((item) => item.active !== false)
            : []
          setLocations(normalized)
        }
      } catch {
        if (active) {
          setLocations([])
        }
      }
    }

    loadLocations()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => setPage(1))
  }, [range, status, locationId])

  useEffect(() => {
    let active = true

    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        const summaryQuery = buildCashAdminQuery({
          range,
          status,
          locationId,
        })
        const sessionsQuery = buildCashAdminQuery({
          range,
          status,
          locationId,
          page,
          pageSize: ADMIN_PAGE_SIZE,
        })

        const [summaryData, sessionsData] = await Promise.all([
          apiFetch<CashAdminSummaryResponse>(
            `/api/cash/admin/summary?${summaryQuery}`,
            { cache: "no-store" },
          ),
          apiFetch<CashAdminSessionsResponse>(
            `/api/cash/admin/sessions?${sessionsQuery}`,
            { cache: "no-store" },
          ),
        ])

        if (active) {
          setSummary(summaryData)
          setSessions(sessionsData)
        }
      } catch (loadError) {
        if (active) {
          setSummary(null)
          setSessions(null)
          setError(
            explainApiError(
              loadError,
              CAJA.errors.loadFailed,
            ),
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [range, status, locationId, page, reloadKey])

  const trendData = useMemo(() => {
    return (summary?.trend || []).map((item) => ({
      ...item,
      short_date: formatBusinessDate(item.business_date).slice(0, 5),
    }))
  }, [summary])

  const locationChartData = useMemo(() => {
    return (summary?.by_location || []).slice(0, 8).map((item) => ({
      ...item,
      short_name:
        item.location_name.length > 14
          ? `${item.location_name.slice(0, 14)}\u2026`
          : item.location_name,
    }))
  }, [summary])

  const hasActiveFilters = range !== "7d" || status !== "all" || locationId !== "all"

  const clearFilters = useCallback(() => {
    setRange("7d")
    setStatus("all")
    setLocationId("all")
    setPage(1)
  }, [])

  return {
    summary,
    sessions,
    locations,
    loading,
    error,
    range,
    setRange,
    status,
    setStatus,
    locationId,
    setLocationId,
    page,
    setPage,
    reloadKey,
    setReloadKey,
    locationOptions,
    reopenTarget,
    setReopenTarget,
    reopenNotes,
    setReopenNotes,
    reopeningCash,
    handleReopenCash,
    trendData,
    locationChartData,
    hasActiveFilters,
    clearFilters,
  }
}
