"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export function useApiGet<T>(
  fetcher: ((signal: AbortSignal) => Promise<T>) | null,
  deps: unknown[] = []
): {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
} {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const mountedRef = useRef(true)

  const refetch = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!fetcher) return

    let active = true
    const controller = new AbortController()

    queueMicrotask(() => {
      if (!active || !mountedRef.current) return

      setLoading(true)
      setError(null)

      fetcher(controller.signal)
        .then((result) => {
          if (active && mountedRef.current) {
            setData(result)
            setError(null)
          }
        })
        .catch((err: unknown) => {
          if (active && mountedRef.current) {
            if (err instanceof DOMException && err.name === "AbortError") return
            setError(err instanceof Error ? err.message : "Error al cargar")
            setData(null)
          }
        })
        .finally(() => {
          if (active && mountedRef.current) setLoading(false)
        })
    })

    return () => {
      active = false
      controller.abort()
    }
  }, [nonce, fetcher, ...deps])

  return { data, loading, error, refetch }
}
