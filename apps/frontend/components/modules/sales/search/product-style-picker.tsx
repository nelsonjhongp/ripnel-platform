"use client"

import type { Ref } from "react"

import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { SearchablePicker } from "@/components/ui/searchable-picker"
import type { SearchableStyle } from "@/components/modules/sales/pos/pos-types"

interface ProductStylePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  items: SearchableStyle[]
  loading?: boolean
  loadingMessage?: string
  emptyMessage?: string
  maxVisibleItems?: number
  highlightedIndex: number
  onHighlightChange: (index: number) => void
  onSelect: (style: SearchableStyle) => void
  onClear?: () => void
  inputRef?: Ref<HTMLInputElement>
  name?: string
  showClear?: boolean
  className?: string
}

export function ProductStylePicker({
  value,
  onChange,
  placeholder,
  disabled = false,
  open,
  onOpenChange,
  items,
  loading = false,
  loadingMessage,
  emptyMessage,
  maxVisibleItems = 6,
  highlightedIndex,
  onHighlightChange,
  onSelect,
  onClear,
  inputRef,
  name,
  showClear,
  className,
}: ProductStylePickerProps) {
  return (
    <SearchablePicker
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      openOnFocus
      open={open}
      onOpenChange={onOpenChange}
      items={items}
      loading={loading}
      loadingMessage={loadingMessage}
      emptyMessage={emptyMessage}
      maxVisibleItems={maxVisibleItems}
      highlightedIndex={highlightedIndex}
      onHighlightChange={onHighlightChange}
      getItemKey={(style) => style.style_id}
      renderItem={(style) => (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex gap-3">
            <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
              {style.style_name}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--ops-text-muted)]">
              {style.variants.length} variante{style.variants.length === 1 ? "" : "s"}
            </p>
          </div>
          <OpsStatusBadge
            tone={style.totalStock > 0 ? "success" : "danger"}
            size="xs"
            className="shrink-0"
          >
            {style.totalStock > 0 ? `Stock ${style.totalStock}` : "Sin stock"}
          </OpsStatusBadge>
        </div>
      )}
      onSelect={onSelect}
      onClear={onClear}
      inputRef={inputRef}
      name={name}
      autoComplete="off"
      inputMode="search"
      enterKeyHint="search"
      showClear={showClear}
      density="compact"
      className={className}
    />
  )
}
