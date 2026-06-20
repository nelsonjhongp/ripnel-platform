"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { ApiError, AUTH_ERROR_EVENT, apiFetch } from "@/lib/api"

export type TopbarNotificationSeverity = "danger" | "warning" | "default"

export type TopbarNotificationItem = {
  id: string
  module: string
  kind: string
  severity: TopbarNotificationSeverity
  title: string
  description: string
  href: string
  action_label: string
  location_scope: {
    location_id: string
    name: string
    code: string | null
    type: string
  }
  created_at: string
}

export type TopbarNotificationsResponse = {
  context: {
    generated_at: string
    business_date: string
  }
  summary: {
    total: number
    danger_count: number
    warning_count: number
    default_count: number
  }
  items: TopbarNotificationItem[]
}

type NotificationsContextValue = {
  notifications: TopbarNotificationsResponse | null
  loading: boolean
  refreshing: boolean
  error: string | null
  refresh: (options?: { silent?: boolean }) => Promise<void>
}

const NotificationsContext = React.createContext<NotificationsContextValue | null>(null)

function explainNotificationsError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return "Necesitas una sede default activa para ver alertas operativas."
    }

    if (error.status === 401) {
      return "Tu sesión ya no es válida."
    }

    return error.message || "No pudimos cargar las alertas operativas."
  }

  return "No pudimos cargar las alertas operativas."
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hasLoadedRef = React.useRef(false)
  const unauthRef = React.useRef(false)
  const refreshingRef = React.useRef(false)
  const [notifications, setNotifications] = React.useState<TopbarNotificationsResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    function handleAuthError() {
      unauthRef.current = true
      setError("Tu sesión ya no es válida.")
      setNotifications(null)
      setLoading(false)
      setRefreshing(false)
    }

    window.addEventListener(AUTH_ERROR_EVENT, handleAuthError)
    return () => window.removeEventListener(AUTH_ERROR_EVENT, handleAuthError)
  }, [])

  const refresh = React.useCallback(async (options: { silent?: boolean } = {}) => {
    if (unauthRef.current) return
    if (refreshingRef.current) return

    const isSilent = options.silent === true

    if (isSilent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    refreshingRef.current = true
    setError(null)

    try {
      const payload = await apiFetch<TopbarNotificationsResponse>("/api/notifications/topbar", {
        cache: "no-store",
        suppressAuthEvent: true,
      })
      setNotifications(payload)
      hasLoadedRef.current = true
    } catch (loadError) {
      const apiErr = loadError instanceof ApiError ? loadError : null
      if (apiErr?.status === 401) {
        unauthRef.current = true
        setLoading(false)
        setRefreshing(false)
        refreshingRef.current = false
        return
      }
      setError(explainNotificationsError(loadError))
      setNotifications((current) => current)
    } finally {
      setLoading(false)
      setRefreshing(false)
      refreshingRef.current = false
    }
  }, [])

  React.useEffect(() => {
    void refresh({ silent: hasLoadedRef.current })
  }, [pathname, refresh])

  React.useEffect(() => {
    function handleFocus() {
      void refresh({ silent: true })
    }

    window.addEventListener("focus", handleFocus)
    return () => {
      window.removeEventListener("focus", handleFocus)
    }
  }, [refresh])

  React.useEffect(() => {
    const POLL_INTERVAL_MS = 60_000

    const intervalId = setInterval(() => {
      if (unauthRef.current) return
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return
      void refresh({ silent: true })
    }, POLL_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [refresh])

  const value = React.useMemo(
    () => ({
      notifications,
      loading,
      refreshing,
      error,
      refresh,
    }),
    [notifications, loading, refreshing, error, refresh]
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useTopbarNotifications() {
  const context = React.useContext(NotificationsContext)

  if (!context) {
    throw new Error("useTopbarNotifications must be used within NotificationsProvider")
  }

  return context
}
