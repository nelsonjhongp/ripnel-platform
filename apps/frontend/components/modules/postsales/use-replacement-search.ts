"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import { explainApiError } from "@/lib/error-utils"
import { useDebouncedApiSearch } from "@/hooks/use-debounced-api-search"
import type { PostsaleContext, SellableVariant } from "@/types/postsales"
import { PS } from "./postsales-messages"

export function useReplacementSearch(
  context: PostsaleContext | null,
  hasPermission: boolean,
  open: boolean,
  excludeVariantId?: string,
) {
  const [search, setSearch] = useState("")
  const [selectedVariantId, setSelectedVariantId] = useState("")
  const [selectedReplacement, setSelectedReplacement] =
    useState<SellableVariant | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const canSearch =
    open &&
    Boolean(context) &&
    hasPermission &&
    Boolean(context?.availability.exchange.allowed)

  const fetchReplacements = useCallback(
    async (signal: AbortSignal) => {
      const params = new URLSearchParams({ q: search.trim() })
      const data = await apiFetch<SellableVariant[]>(
        `/api/sales/sellable-variants?${params.toString()}`,
        { cache: "no-store", signal },
      )

      return Array.isArray(data) ? data : []
    },
    [search],
  )

  const getSearchErrorMessage = useCallback(
    (loadError: unknown) => explainApiError(loadError, PS.exchangeDialog.noResults),
    [],
  )

  const {
    results,
    loading,
    error,
    hasSearched,
    reset: resetSearch,
  } = useDebouncedApiSearch<SellableVariant>({
    enabled: canSearch,
    fetcher: fetchReplacements,
    getErrorMessage: getSearchErrorMessage,
    minSearchLength: 2,
    searchValue: search,
  })

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
    resetSearch()
    setHighlightedIndex(0)
  }, [resetSearch])

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
    resetSearch()
    setPickerOpen(false)
    setHighlightedIndex(0)
  }, [resetSearch])

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
