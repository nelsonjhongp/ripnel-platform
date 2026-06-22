"use client"

import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/lib/api"
import { explainApiError } from "@/lib/error-utils"
import { type PostsaleContext, type SellableVariant } from "@/types/postsales"
import { PS } from "./postsales-messages"

export function useReplacementSearch(
  context: PostsaleContext | null,
  hasPermission: boolean,
) {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<SellableVariant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState("")

  useEffect(() => {
    const canSearch =
      Boolean(context) &&
      hasPermission &&
      context?.availability.exchange.allowed &&
      search.trim().length >= 2

    if (!canSearch) {
      queueMicrotask(() => {
        setResults([])
        setLoading(false)
        setError(null)
      })
      return
    }

    const controller = new AbortController()
    let active = true

    const timeoutId = window.setTimeout(async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({ q: search.trim() })
        const data = await apiFetch<SellableVariant[]>(
          `/api/sales/sellable-variants?${params.toString()}`,
          { cache: "no-store", signal: controller.signal },
        )

        if (active) setResults(Array.isArray(data) ? data : [])
      } catch (loadError) {
        if (!active || controller.signal.aborted) return
        setResults([])
        setError(explainApiError(loadError, PS.detail.lines.noMatch))
      } finally {
        if (active) setLoading(false)
      }
    }, 250)

    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [context, hasPermission, search])

  const selectedReplacement = useMemo(
    () => results.find((v) => v.variant_id === selectedVariantId) || null,
    [results, selectedVariantId],
  )

  return {
    replacementSearch: search,
    setReplacementSearch: setSearch,
    replacementResults: results,
    replacementLoading: loading,
    replacementError: error,
    selectedReplacementVariantId: selectedVariantId,
    setSelectedReplacementVariantId: setSelectedVariantId,
    selectedReplacement,
  }
}
