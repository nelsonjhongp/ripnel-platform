"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type ThemeMode = "light" | "dark"
export type ThemePreset = "slate" | "stone" | "graphite"

export type VisualPreferences = {
  themeMode: ThemeMode
  themePreset: ThemePreset
}

type VisualPreferencesContextValue = {
  preferences: VisualPreferences
  savePreferences: (nextPreferences: VisualPreferences) => void
  resetPreferences: () => void
}

const STORAGE_KEY = "ripnel.visual-preferences"

const DEFAULT_PREFERENCES: VisualPreferences = {
  themeMode: "light",
  themePreset: "stone",
}

const VisualPreferencesContext = createContext<VisualPreferencesContextValue | null>(null)

function normalizePreferences(value: unknown): VisualPreferences {
  if (!value || typeof value !== "object") {
    return DEFAULT_PREFERENCES
  }

  const candidate = value as Partial<VisualPreferences>
  const themeMode = candidate.themeMode === "dark" ? "dark" : "light"
  const themePreset =
    candidate.themePreset === "slate" ||
    candidate.themePreset === "stone" ||
    candidate.themePreset === "graphite"
      ? candidate.themePreset
      : themeMode === "dark"
        ? "graphite"
        : "stone"

  return {
    themeMode,
    themePreset,
  }
}

function applyPreferencesToDocument(preferences: VisualPreferences) {
  const root = document.documentElement
  const isDark = preferences.themeMode === "dark"

  root.classList.toggle("dark", isDark)
  root.dataset.themeMode = preferences.themeMode
  root.dataset.themePreset = preferences.themePreset
  root.style.colorScheme = isDark ? "dark" : "light"
}

export function VisualPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<VisualPreferences>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_PREFERENCES
    }

    try {
      const rawValue = window.localStorage.getItem(STORAGE_KEY)
      return rawValue ? normalizePreferences(JSON.parse(rawValue)) : DEFAULT_PREFERENCES
    } catch {
      return DEFAULT_PREFERENCES
    }
  })

  useEffect(() => {
    applyPreferencesToDocument(preferences)
  }, [preferences])

  const contextValue = useMemo<VisualPreferencesContextValue>(
    () => ({
      preferences,
      savePreferences(nextPreferences) {
        const normalized = normalizePreferences(nextPreferences)
        setPreferences(normalized)
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
        applyPreferencesToDocument(normalized)
      },
      resetPreferences() {
        setPreferences(DEFAULT_PREFERENCES)
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES))
        applyPreferencesToDocument(DEFAULT_PREFERENCES)
      },
    }),
    [preferences]
  )

  return (
    <VisualPreferencesContext.Provider value={contextValue}>
      {children}
    </VisualPreferencesContext.Provider>
  )
}

export function useVisualPreferences() {
  const context = useContext(VisualPreferencesContext)

  if (!context) {
    throw new Error("useVisualPreferences must be used inside VisualPreferencesProvider")
  }

  return context
}

export { DEFAULT_PREFERENCES, STORAGE_KEY as VISUAL_PREFERENCES_STORAGE_KEY }
