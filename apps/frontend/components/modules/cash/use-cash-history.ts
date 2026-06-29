"use client"

import { useCallback, useMemo, useState } from "react"

import { apiFetch } from "@/lib/api"
import { useApiGet } from "@/hooks/use-api-get"

import type { CashClosingsResponse } from "./cash-types"
import { HISTORY_PAGE_SIZE } from "./cash-constants"
import { addDaysToPeruDate, todayPeruDate } from "./cash-utils"

type StatusFilter = "all" | "open" | "closed"

const todayStr = todayPeruDate()
const defaultFrom = addDaysToPeruDate(todayStr, -30)

export function useCashHistory() {
  const [status, setStatus] = useState<StatusFilter>("all")
  const [dateFrom, setDateFrom] = useState(defaultFrom)
  const [dateTo, setDateTo] = useState(todayStr)
  const [page, setPage] = useState(1)

  const queryParts: string[] = []
  if (status !== "all") queryParts.push(`status=${status}`)
  queryParts.push(`date_from=${dateFrom}`, `date_to=${dateTo}`)
  queryParts.push(`page=${page}`, `pageSize=${HISTORY_PAGE_SIZE}`)
  const query = queryParts.join("&")

  const {
    data,
    loading,
    error,
    refetch: rawRefetch,
  } = useApiGet(
    () =>
      apiFetch<CashClosingsResponse>(`/api/cash?${query}`, {
        cache: "no-store",
      }),
    [query],
  )

  const items = useMemo(() => data?.items ?? [], [data?.items])
  const pagination = data?.pagination

  const hasActiveFilters =
    status !== "all" || dateFrom !== defaultFrom || dateTo !== todayStr

  const clearFilters = useCallback(() => {
    setStatus("all")
    setDateFrom(defaultFrom)
    setDateTo(todayStr)
    setPage(1)
  }, [])

  return {
    status,
    setStatus,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    page,
    setPage,
    data,
    items,
    pagination,
    loading,
    error: error ?? null,
    hasActiveFilters,
    clearFilters,
    refetch: rawRefetch,
  }
}
