"use client"

import { useEffect, useMemo, useState } from "react"

import { apiFetch } from "@/lib/api"
import { useApiGet } from "@/hooks/use-api-get"

import type { CashClosingDetail } from "./cash-types"
import { deriveConsistencyTone } from "./cash-utils"

export function useCashDetail(params: Promise<{ id: string }>) {
  const [cashId, setCashId] = useState<string | null>(null)

  const { data: closing, loading, error } = useApiGet(
    cashId
      ? () => apiFetch<CashClosingDetail>(`/api/cash/${cashId}`)
      : null,
    [cashId],
  )

  useEffect(() => {
    let active = true

    params.then(({ id }) => {
      if (active) {
        setCashId(id)
      }
    })

    return () => {
      active = false
    }
  }, [params])

  const consistencyTone = useMemo(() => {
    if (!closing?.sales_summary.consistency.is_consistent) {
      return deriveConsistencyTone(false)
    }
    return deriveConsistencyTone(true)
  }, [closing])

  return { closing, loading, error, consistencyTone }
}
