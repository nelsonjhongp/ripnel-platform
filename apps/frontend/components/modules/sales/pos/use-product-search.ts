"use client"

import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/lib/api"
import type { PriceModeOverride, SaleVariant, SearchableStyle } from "./pos-types"
import {
  buildProductSearchResults,
  explainApiError,
  findVariantByAttributes,
  getVariantOptionValues,
  groupVariantsByStyle,
} from "./pos-utils"

export function useProductSearch(locationId: string | undefined) {
  const [query, setQuery] = useState("")
  const [variants, setVariants] = useState<SaleVariant[]>([])
  const [loadingVariants, setLoadingVariants] = useState(false)
  const [productPickerOpen, setProductPickerOpen] = useState(false)
  const [highlightedProductIndex, setHighlightedProductIndex] = useState(0)
  const [selectedProductStyle, setSelectedProductStyle] =
    useState<SearchableStyle | null>(null)
  const [selectedSizeCode, setSelectedSizeCode] = useState("")
  const [selectedColorCode, setSelectedColorCode] = useState("")
  const [pricingModeOverride, setPricingModeOverride] =
    useState<PriceModeOverride>("auto")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!locationId) {
      void Promise.resolve().then(() => {
        setVariants([])
        setProductPickerOpen(false)
        setSelectedProductStyle(null)
      })
      return
    }

    let active = true
    const timeoutId = window.setTimeout(async () => {
      setLoadingVariants(true)

      try {
        const params = new URLSearchParams()
        if (query.trim()) params.set("q", query.trim())
        const path = params.toString()
          ? `/api/sales/sellable-variants?${params.toString()}`
          : "/api/sales/sellable-variants"
        const response = await apiFetch(path)

        if (!active) return
        setError(null)
        setVariants(Array.isArray(response) ? response : [])
      } catch (fetchError) {
        if (!active) return
        setVariants([])
        setError(explainApiError(fetchError, "No se pudieron cargar productos."))
      } finally {
        if (active) setLoadingVariants(false)
      }
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timeoutId)
    }
  }, [locationId, query])

  const styles = useMemo(() => groupVariantsByStyle(variants), [variants])
  const catalogStyles = useMemo(
    () => buildProductSearchResults(styles, ""),
    [styles],
  )
  const searchableStyles = useMemo(
    () => (query.trim() ? buildProductSearchResults(styles, query) : catalogStyles),
    [catalogStyles, query, styles],
  )

  const sizeOptions = useMemo(
    () =>
      getVariantOptionValues(
        selectedProductStyle?.variants || [],
        "size_code",
        selectedColorCode ? { color_code: selectedColorCode } : {},
      ),
    [selectedColorCode, selectedProductStyle?.variants],
  )

  const colorOptions = useMemo(
    () =>
      getVariantOptionValues(
        selectedProductStyle?.variants || [],
        "color_code",
        selectedSizeCode ? { size_code: selectedSizeCode } : {},
      ),
    [selectedProductStyle?.variants, selectedSizeCode],
  )

  const selectedVariant = useMemo(
    () =>
      findVariantByAttributes(
        selectedProductStyle?.variants || [],
        selectedSizeCode,
        selectedColorCode,
      ),
    [selectedColorCode, selectedProductStyle?.variants, selectedSizeCode],
  )

  useEffect(() => {
    void Promise.resolve().then(() =>
      setHighlightedProductIndex((current) =>
        Math.min(Math.max(current, 0), Math.max(searchableStyles.length - 1, 0)),
      ),
    )
  }, [searchableStyles.length])

  useEffect(() => {
    if (!selectedProductStyle?.style_id) return
    const refreshedStyle =
      catalogStyles.find((style) => style.style_id === selectedProductStyle.style_id) ||
      null
    if (refreshedStyle) {
      void Promise.resolve().then(() => setSelectedProductStyle(refreshedStyle))
    }
  }, [catalogStyles, selectedProductStyle?.style_id])

  useEffect(() => {
    if (!selectedProductStyle) {
      void Promise.resolve().then(() => {
        setSelectedSizeCode("")
        setSelectedColorCode("")
      })
      return
    }

    void Promise.resolve().then(() => {
      setSelectedSizeCode((current) => {
        if (current && sizeOptions.includes(current)) return current
        return sizeOptions.length === 1 ? sizeOptions[0] : ""
      })
    })
  }, [selectedProductStyle, sizeOptions])

  useEffect(() => {
    if (!selectedProductStyle) return

    void Promise.resolve().then(() => {
      setSelectedColorCode((current) => {
        if (current && colorOptions.includes(current)) return current
        return colorOptions.length === 1 ? colorOptions[0] : ""
      })
    })
  }, [colorOptions, selectedProductStyle])

  function selectProductStyle(style: SearchableStyle | null) {
    setSelectedProductStyle(style)
    setSelectedSizeCode("")
    setSelectedColorCode("")
    setQuery("")
    setHighlightedProductIndex(0)
    setProductPickerOpen(false)
  }

  return {
    query,
    setQuery,
    loadingVariants,
    productPickerOpen,
    setProductPickerOpen,
    highlightedProductIndex,
    setHighlightedProductIndex,
    selectedProductStyle,
    selectedSizeCode,
    setSelectedSizeCode,
    selectedColorCode,
    setSelectedColorCode,
    selectedVariant,
    searchableStyles,
    pricingModeOverride,
    setPricingModeOverride,
    sizeOptions,
    colorOptions,
    error,
    setError,
    selectProductStyle,
    catalogStyles,
  }
}
