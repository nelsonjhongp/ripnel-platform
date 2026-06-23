"use client"

import type { ReactNode, Ref } from "react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { SearchablePicker } from "@/components/ui/searchable-picker"
import { formatCurrency } from "@/lib/format-utils"
import { cn } from "@/lib/utils"

export interface ProductVariantOption {
  variant_id: string
  sku: string
  style_name: string
  style_code?: string | null
  size_code: string
  size_name?: string | null
  color_code: string
  color_name?: string | null
  stock?: number | null
  retail_price?: number | null
  wholesale_price?: number | null
}

export interface ProductVariantPickerProps<T extends ProductVariantOption> {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  items: T[]
  loading?: boolean
  error?: string | null
  loadingMessage?: string
  emptyMessage?: string
  idleMessage?: string
  minQueryLength?: number
  hasSearched?: boolean
  maxVisibleItems?: number
  highlightedIndex: number
  onHighlightChange: (index: number) => void
  selectedItemKey?: string
  onSelect: (item: T) => void
  closeOnSelect?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  openOnFocus?: boolean
  disabled?: boolean
  name?: string
  inputRef?: Ref<HTMLInputElement>
  showClear?: boolean
  onClear?: () => void
  showFilters?: boolean
  renderMeta?: (item: T) => ReactNode
  className?: string
}

function getUniqueValues<T extends ProductVariantOption>(
  items: T[],
  key: "size_code" | "color_code",
) {
  return Array.from(
    new Set(
      items
        .map((item) => String(item[key] || "").trim())
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right))
}

export function ProductVariantPicker<T extends ProductVariantOption>({
  value,
  onChange,
  placeholder,
  label,
  items,
  loading = false,
  error = null,
  loadingMessage,
  emptyMessage,
  idleMessage,
  minQueryLength = 0,
  hasSearched,
  maxVisibleItems = 6,
  highlightedIndex,
  onHighlightChange,
  selectedItemKey,
  onSelect,
  closeOnSelect = true,
  open,
  onOpenChange,
  openOnFocus = true,
  disabled = false,
  name,
  inputRef,
  showClear,
  onClear,
  showFilters = false,
  renderMeta,
  className,
}: ProductVariantPickerProps<T>) {
  const [sizeFilter, setSizeFilter] = useState("")
  const [colorFilter, setColorFilter] = useState("")
  const [onlyInStock, setOnlyInStock] = useState(false)

  const sizeOptions = useMemo(() => getUniqueValues(items, "size_code"), [items])
  const colorOptions = useMemo(() => getUniqueValues(items, "color_code"), [items])
  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (sizeFilter && item.size_code !== sizeFilter) return false
        if (colorFilter && item.color_code !== colorFilter) return false
        if (onlyInStock && Number(item.stock || 0) <= 0) return false
        return true
      }),
    [colorFilter, items, onlyInStock, sizeFilter],
  )

  const hasFilters =
    showFilters && (sizeOptions.length > 1 || colorOptions.length > 1)

  return (
    <div className={cn("space-y-2", className)}>
      <SearchablePicker
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        label={label}
        items={filteredItems}
        loading={loading}
        error={error}
        loadingMessage={loadingMessage}
        emptyMessage={emptyMessage}
        idleMessage={idleMessage}
        minQueryLength={minQueryLength}
        hasSearched={hasSearched}
        emptyStateMode="query"
        maxVisibleItems={maxVisibleItems}
        highlightedIndex={highlightedIndex}
        onHighlightChange={onHighlightChange}
        getItemKey={(variant) => variant.variant_id}
        selectedItemKey={selectedItemKey}
        onSelect={onSelect}
        closeOnSelect={closeOnSelect}
        open={open}
        onOpenChange={onOpenChange}
        openOnFocus={openOnFocus}
        disabled={disabled}
        name={name}
        inputRef={inputRef}
        autoComplete="off"
        inputMode="search"
        enterKeyHint="search"
        showClear={showClear}
        onClear={onClear}
        renderItem={(variant) => (
          <div className="flex w-full min-w-0 items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                  {variant.style_name}
                </p>
                <span className="shrink-0 text-[11px] font-medium text-[var(--ops-text-muted)]">
                  {variant.sku}
                </span>
              </div>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                <OpsStatusBadge size="xs" tone="neutral">
                  {variant.size_name || variant.size_code}
                </OpsStatusBadge>
                <OpsStatusBadge size="xs" tone="neutral">
                  {variant.color_name || variant.color_code}
                </OpsStatusBadge>
                <OpsStatusBadge
                  size="xs"
                  tone={Number(variant.stock || 0) > 0 ? "success" : "danger"}
                >
                  Stock {Number(variant.stock || 0)}
                </OpsStatusBadge>
                <span className="text-[11px] font-semibold text-[var(--ops-text)]">
                  {formatCurrency(Number(variant.retail_price || 0))}
                </span>
              </div>
            </div>
            {renderMeta ? (
              <div className="shrink-0 text-right">{renderMeta(variant)}</div>
            ) : null}
          </div>
        )}
        density="compact"
      />

      {hasFilters ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {sizeOptions.map((size) => (
            <Button
              key={size}
              type="button"
              variant={sizeFilter === size ? "accent" : "outline"}
              size="xs"
              className="h-6 rounded-full px-2"
              onClick={() => setSizeFilter((current) => (current === size ? "" : size))}
            >
              {size}
            </Button>
          ))}
          {colorOptions.map((color) => (
            <Button
              key={color}
              type="button"
              variant={colorFilter === color ? "accent" : "outline"}
              size="xs"
              className="h-6 rounded-full px-2"
              onClick={() => setColorFilter((current) => (current === color ? "" : color))}
            >
              {color}
            </Button>
          ))}
          <Button
            type="button"
            variant={onlyInStock ? "accent" : "outline"}
            size="xs"
            className="h-6 rounded-full px-2"
            onClick={() => setOnlyInStock((current) => !current)}
          >
            Con stock
          </Button>
        </div>
      ) : null}
    </div>
  )
}
