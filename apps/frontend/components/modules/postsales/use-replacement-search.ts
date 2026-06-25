"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import { explainApiError } from "@/lib/error-utils"
import type { PostsaleContext, SellableVariant } from "@/types/postsales"
import { PS } from "./postsales-messages"

export function useReplacementSearch(
  context: PostsaleContext | null,
  hasPermission: boolean,
  open: boolean,
  excludeVariantId?: string,
) {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<SellableVariant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState("")
  const [selectedReplacement, setSelectedReplacement] =
    useState<SellableVariant | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  useEffect(() => {
    if (!open) return

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
        setHasSearched(false)
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
        setError(explainApiError(loadError, PS.exchangeDialog.noResults))
      } finally {
        if (active) {
          setHasSearched(true)
          setLoading(false)
        }
      }
    }, 250)

    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [context, hasPermission, search, open])

  const filteredResults = useMemo(
    () =>
      excludeVariantId
        ? results.filter((v) => v.variant_id !== excludeVariantId)
        : results,
    [results, excludeVariantId],
  )

  const handleSelect = useCallback((variant: SellableVariant) => {
    setSelectedVariantId(variant.variant_id)
    setSelectedReplacement(variant)
    setPickerOpen(false)
    setSearch("")
    setResults([])
    setHasSearched(false)
    setHighlightedIndex(0)
  }, [])

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val)
    setSelectedVariantId("")
    setSelectedReplacement(null)
    setHighlightedIndex(0)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedVariantId("")
    setSelectedReplacement(null)
    setSearch("")
    setResults([])
    setError(null)
    setHasSearched(false)
    setPickerOpen(false)
    setHighlightedIndex(0)
  }, [])

  useEffect(() => {
    if (!open) queueMicrotask(clearSelection)
  }, [clearSelection, open])

  return {
    replacementSearch: search,
    setReplacementSearch: handleSearchChange,
    replacementResults: filteredResults,
    replacementLoading: loading,
    replacementError: error,
    replacementHasSearched: hasSearched,
    selectedReplacementVariantId: selectedVariantId,
    setSelectedReplacementVariantId: setSelectedVariantId,
    selectedReplacement,
    replacementPickerOpen: pickerOpen,
    setReplacementPickerOpen: setPickerOpen,
    replacementHighlightedIndex: highlightedIndex,
    setReplacementHighlightedIndex: setHighlightedIndex,
    handleSelectReplacement: handleSelect,
    clearReplacementSelection: clearSelection,
  }
}
