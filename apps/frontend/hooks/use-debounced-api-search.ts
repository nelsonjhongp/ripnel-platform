"use client"

import { useCallback, useEffect, useState } from "react"
import type { Dispatch, SetStateAction } from "react"

type UseDebouncedApiSearchOptions<T> = {
  enabled: boolean
  fetcher: (signal: AbortSignal) => Promise<T[]>
  debounceMs?: number
  searchValue?: string
  minSearchLength?: number
  getErrorMessage?: (error: unknown) => string
  resetWhenDisabled?: boolean
}

type UseDebouncedApiSearchResult<T> = {
  results: T[]
  setResults: Dispatch<SetStateAction<T[]>>
  loading: boolean
  error: string | null
  hasSearched: boolean
  refetch: () => void
  reset: () => void
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

export function useDebouncedApiSearch<T>({
  enabled,
  fetcher,
  debounceMs = 250,
  searchValue = "",
  minSearchLength = 0,
  getErrorMessage,
  resetWhenDisabled = true,
}: UseDebouncedApiSearchOptions<T>): UseDebouncedApiSearchResult<T> {
  const [results, setResults] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [nonce, setNonce] = useState(0)

  const refetch = useCallback(() => setNonce((current) => current + 1), [])

  const reset = useCallback(() => {
    setResults([])
    setLoading(false)
    setError(null)
    setHasSearched(false)
  }, [])

  useEffect(() => {
    const normalizedSearch = searchValue.trim()
    const canSearch = enabled && normalizedSearch.length >= minSearchLength

    if (!canSearch) {
      let active = true
      if (resetWhenDisabled) {
        queueMicrotask(() => {
          if (active) reset()
        })
      }
      return () => {
        active = false
      }
    }

    const controller = new AbortController()
    let active = true

    const timeoutId = window.setTimeout(async () => {
      setLoading(true)
      setError(null)

      try {
        const nextResults = await fetcher(controller.signal)
        if (!active) return
        setResults(nextResults)
        setError(null)
      } catch (searchError) {
        if (!active || isAbortError(searchError) || controller.signal.aborted) return
        setResults([])
        setError(
          getErrorMessage
            ? getErrorMessage(searchError)
            : searchError instanceof Error
              ? searchError.message
              : "Error al buscar"
        )
      } finally {
        if (active) {
          setHasSearched(true)
          setLoading(false)
        }
      }
    }, debounceMs)

    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [
    debounceMs,
    enabled,
    fetcher,
    getErrorMessage,
    minSearchLength,
    nonce,
    reset,
    resetWhenDisabled,
    searchValue,
  ])

  return {
    results,
    setResults,
    loading,
    error,
    hasSearched,
    refetch,
    reset,
  }
}
