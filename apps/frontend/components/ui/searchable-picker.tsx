"use client"

import type { ReactNode, Ref } from "react"
import { useEffect, useId, useRef } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  CompactPickerEmpty,
  CompactPickerList,
  CompactPickerOption,
  CompactPickerPopover,
} from "@/components/ui/compact-picker"
import { Button } from "@/components/ui/button"

type SearchablePickerEmptyStateMode = "idle" | "query" | "always"

export interface SearchablePickerProps<T> {
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
  openOnFocus?: boolean
  placeholder?: string
  disabled?: boolean
  label?: string
  name?: string
  autoComplete?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  spellCheck?: boolean
  enterKeyHint?: React.HTMLAttributes<HTMLInputElement>["enterKeyHint"]
  inputRef?: Ref<HTMLInputElement>
  open: boolean
  onOpenChange: (open: boolean) => void
  items: T[]
  loading?: boolean
  error?: string | null
  loadingMessage?: string
  emptyMessage?: string
  idleMessage?: string
  minQueryLength?: number
  hasSearched?: boolean
  emptyStateMode?: SearchablePickerEmptyStateMode
  maxVisibleItems?: number
  highlightedIndex: number
  onHighlightChange: (index: number) => void
  getItemKey: (item: T) => string
  renderItem: (item: T) => ReactNode
  onSelect: (item: T) => void
  closeOnSelect?: boolean
  selectedItemKey?: string
  onClear?: () => void
  showClear?: boolean
  density?: "default" | "compact"
  className?: string
}

export function SearchablePicker<T>({
  value,
  onChange,
  onFocus,
  openOnFocus = false,
  placeholder = "Buscar…",
  disabled = false,
  label,
  name,
  autoComplete = "off",
  inputMode,
  spellCheck = false,
  enterKeyHint,
  inputRef,
  open,
  onOpenChange,
  items,
  loading = false,
  error = null,
  loadingMessage = "Buscando…",
  emptyMessage = "Sin resultados",
  idleMessage,
  minQueryLength = 0,
  hasSearched,
  emptyStateMode = "always",
  maxVisibleItems,
  highlightedIndex,
  onHighlightChange,
  getItemKey,
  renderItem,
  onSelect,
  closeOnSelect = true,
  selectedItemKey,
  onClear,
  showClear,
  density = "default",
  className,
}: SearchablePickerProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const defaultInputRef = useRef<HTMLInputElement | null>(null)
  const effectiveInputRef = inputRef || defaultInputRef
  const listId = useId()

  const visibleItems = maxVisibleItems ? items.slice(0, maxVisibleItems) : items

  const clampedIndex =
    visibleItems.length > 0
      ? Math.max(0, Math.min(highlightedIndex, visibleItems.length - 1))
      : 0

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [open, onOpenChange])

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault()
      onOpenChange(false)
      return
    }

    if (!visibleItems.length) return

    if (event.key === "ArrowDown") {
      event.preventDefault()
      onOpenChange(true)
      onHighlightChange(Math.min(highlightedIndex + 1, visibleItems.length - 1))
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      onOpenChange(true)
      onHighlightChange(Math.max(highlightedIndex - 1, 0))
      return
    }

    if (event.key === "Enter" && open) {
      event.preventDefault()
      const item = visibleItems[clampedIndex]
      if (item) {
        if (closeOnSelect) onOpenChange(false)
        onSelect(item)
      }
    }
  }

  const handleChange = (newValue: string) => {
    onChange(newValue)
    if (!open) onOpenChange(true)
    onHighlightChange(0)
  }

  const handleFocus = () => {
    if (openOnFocus) {
      onOpenChange(true)
      onHighlightChange(0)
    }
    onFocus?.()
  }

  const effectiveShowClear =
    showClear !== undefined ? showClear : Boolean(value && !disabled)

  const normalizedQueryLength = value.trim().length
  const meetsMinQueryLength = normalizedQueryLength >= minQueryLength
  const effectiveHasSearched =
    hasSearched !== undefined
      ? hasSearched
      : emptyStateMode === "always" || meetsMinQueryLength
  const emptyStateMessage =
    emptyStateMode !== "always" && (!meetsMinQueryLength || !effectiveHasSearched)
      ? (idleMessage ?? emptyMessage)
      : emptyMessage

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label ? (
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
          {label}
        </label>
      ) : null}

      <div
        className={cn(
          "sales-field flex items-center gap-2 rounded-lg transition",
          density === "compact" ? "h-9 px-2.5" : "h-10 px-3",
          disabled
            ? "cursor-not-allowed border-dashed bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_82%,var(--ops-surface))] text-[var(--ops-text-muted)]"
            : "hover:bg-[var(--ops-surface-muted)]",
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-[var(--ops-text-muted)]" />
        <input
          ref={effectiveInputRef as Ref<HTMLInputElement>}
          type="text"
          name={name}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          inputMode={inputMode}
          spellCheck={spellCheck}
          enterKeyHint={enterKeyHint}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-activedescendant={
            open && clampedIndex >= 0
              ? `picker-option-${listId}-${clampedIndex}`
              : undefined
          }
          aria-label={label || placeholder}
          className="h-full w-full bg-transparent text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)] disabled:cursor-not-allowed"
        />
        {effectiveShowClear ? (
          <Button
            type="button"
            variant="ghost"
            size={density === "compact" ? "icon-xs" : "icon-sm"}
            onClick={() => {
              onClear?.()
              onHighlightChange(0)
            }}
            className="rounded-lg text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)]"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </Button>
        ) : null}
      </div>

      {open ? (
        <CompactPickerPopover className="absolute left-0 right-0 top-[calc(100%+1px)] z-30 rounded-xl border border-[var(--ops-border-strong)]">
          {error ? (
            <CompactPickerEmpty>{error}</CompactPickerEmpty>
          ) : loading && visibleItems.length === 0 ? (
            <CompactPickerEmpty>{loadingMessage}</CompactPickerEmpty>
          ) : visibleItems.length === 0 ? (
            <CompactPickerEmpty>{emptyStateMessage}</CompactPickerEmpty>
          ) : (
            <CompactPickerList
              role="listbox"
              id={listId}
              className="max-h-72 overflow-y-auto"
            >
              <div className="divide-y divide-[var(--ops-border-strong)]">
                {visibleItems.map((item, index) => (
                  <CompactPickerOption
                    key={getItemKey(item)}
                    role="option"
                    aria-selected={index === clampedIndex}
                    id={`picker-option-${listId}-${index}`}
                    active={index === clampedIndex}
                    selected={selectedItemKey === getItemKey(item)}
                    onMouseEnter={() => onHighlightChange(index)}
                    onClick={() => {
                      if (closeOnSelect) onOpenChange(false)
                      onSelect(item)
                      onHighlightChange(0)
                    }}
                    className={density === "compact" ? "px-3 py-2.5" : "px-4 py-3"}
                  >
                    {renderItem(item)}
                  </CompactPickerOption>
                ))}
              </div>
            </CompactPickerList>
          )}
        </CompactPickerPopover>
      ) : null}
    </div>
  )
}
