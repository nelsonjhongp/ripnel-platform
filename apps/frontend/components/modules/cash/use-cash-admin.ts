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
import { buildCashAdminQuery } from "./cash-utils"
import { CAJA } from "./cash-messages"
import {
  buildCashLocationChartData,
  buildCashLocationOptions,
  buildCashTrendData,
  buildReopenCashPayload,
  CASH_ADMIN_DEFAULT_FILTERS,
  hasCashAdminActiveFilters,
  type RangeFilter,
  type StatusFilter,
} from "./cash-admin-logic"

export function useCashAdmin() {
  const [summary, setSummary] = useState<CashAdminSummaryResponse | null>(null)
  const [sessions, setSessions] = useState<CashAdminSessionsResponse | null>(
    null,
  )
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<RangeFilter>(
    CASH_ADMIN_DEFAULT_FILTERS.range,
  )
  const [status, setStatus] = useState<StatusFilter>(
    CASH_ADMIN_DEFAULT_FILTERS.status,
  )
  const [locationId, setLocationId] = useState(
    CASH_ADMIN_DEFAULT_FILTERS.locationId,
  )
  const [page, setPage] = useState(CASH_ADMIN_DEFAULT_FILTERS.page)
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
        body: JSON.stringify(buildReopenCashPayload(reopenNotes)),
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
    () => buildCashLocationOptions(locations),
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

  const trendData = useMemo(() => buildCashTrendData(summary), [summary])

  const locationChartData = useMemo(
    () => buildCashLocationChartData(summary),
    [summary],
  )

  const hasActiveFilters = hasCashAdminActiveFilters({
    range,
    status,
    locationId,
  })

  const clearFilters = useCallback(() => {
    setRange(CASH_ADMIN_DEFAULT_FILTERS.range)
    setStatus(CASH_ADMIN_DEFAULT_FILTERS.status)
    setLocationId(CASH_ADMIN_DEFAULT_FILTERS.locationId)
    setPage(CASH_ADMIN_DEFAULT_FILTERS.page)
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
