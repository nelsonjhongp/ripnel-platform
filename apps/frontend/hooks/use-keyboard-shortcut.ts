"use client"

import { useEffect } from "react"

type ShortcutDef = {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  handler: () => void
  enabled?: boolean
}

export function useKeyboardShortcut(shortcut: ShortcutDef) {
  useEffect(() => {
    if (shortcut.enabled === false) return

    function onKeyDown(e: KeyboardEvent) {
      const matchKey = e.key.toLowerCase() === shortcut.key.toLowerCase()
      const matchCtrl = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey
      const matchAlt = shortcut.alt ? e.altKey : !e.altKey
      const matchShift = shortcut.shift ? e.shiftKey : !e.shiftKey
      const target = e.target as HTMLElement
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable

      if (matchKey && matchCtrl && matchAlt && matchShift && !isInput) {
        e.preventDefault()
        shortcut.handler()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [shortcut])
}

export function useKeyboardShortcuts(shortcuts: ShortcutDef[]) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable

      for (const s of shortcuts) {
        if (s.enabled === false) continue

        const matchKey = e.key.toLowerCase() === s.key.toLowerCase()
        const matchCtrl = s.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey
        const matchAlt = s.alt ? e.altKey : !e.altKey
        const matchShift = s.shift ? e.shiftKey : !e.shiftKey

        if (matchKey && matchCtrl && matchAlt && matchShift && !isInput) {
          e.preventDefault()
          s.handler()
          return
        }
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [shortcuts])
}
