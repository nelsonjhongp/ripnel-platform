"use client"

import type { Ref } from "react"

import { SearchablePicker } from "@/components/ui/searchable-picker"
import type { PosCustomer } from "@/components/modules/sales/pos/pos-types"
import {
  buildCustomerDisplayName,
  buildCustomerDocument,
} from "@/components/modules/sales/pos/pos-customer-utils"

interface CustomerPickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  openOnFocus?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  items: PosCustomer[]
  loading?: boolean
  loadingMessage?: string
  emptyMessage?: string
  idleMessage?: string
  hasSearched?: boolean
  highlightedIndex: number
  onHighlightChange: (index: number) => void
  onSelect: (customer: PosCustomer) => void
  onClear?: () => void
  inputRef?: Ref<HTMLInputElement>
  name?: string
  showClear?: boolean
  className?: string
}

export function CustomerPicker({
  value,
  onChange,
  placeholder,
  openOnFocus = true,
  open,
  onOpenChange,
  items,
  loading = false,
  loadingMessage,
  emptyMessage,
  idleMessage,
  hasSearched,
  highlightedIndex,
  onHighlightChange,
  onSelect,
  onClear,
  inputRef,
  name,
  showClear,
  className,
}: CustomerPickerProps) {
  return (
    <SearchablePicker
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      openOnFocus={openOnFocus}
      open={open}
      onOpenChange={onOpenChange}
      items={items}
      loading={loading}
      loadingMessage={loadingMessage}
      emptyMessage={emptyMessage}
      idleMessage={idleMessage}
      hasSearched={hasSearched}
      emptyStateMode="idle"
      maxVisibleItems={6}
      highlightedIndex={highlightedIndex}
      onHighlightChange={onHighlightChange}
      getItemKey={(customer) => customer.customer_id}
      renderItem={(customer) => (
        <div className="flex w-full min-w-0 items-center gap-2.5 text-sm">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-[var(--ops-text)]">
              {buildCustomerDisplayName(customer)}
            </p>
            <p className="text-[11px] text-[var(--ops-text-muted)]">
              {buildCustomerDocument(customer)}
            </p>
          </div>
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
