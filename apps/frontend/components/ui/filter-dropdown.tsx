"use client"

import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface FilterDropdownOption {
  value: string
  label: string
}

export function FilterDropdown({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string
  value: string
  options: readonly FilterDropdownOption[]
  onChange: (value: string) => void
  className?: string
}) {
  const selectedLabel = options.find((o) => o.value === value)?.label || options[0]?.label || ""

  return (
    <div className={className}>
      {label ? (
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
          {label}
        </label>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="sales-field flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-left text-sm text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
          >
            <span className="flex-1 truncate">{selectedLabel}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-[var(--ops-text-muted)]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={8}
          className="min-w-[var(--radix-dropdown-menu-trigger-width)] border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-1"
        >
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            {options.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className="cursor-pointer rounded-md px-3 py-2 text-sm text-[var(--ops-text)] focus:bg-[var(--ops-surface-muted)] focus:text-[var(--ops-text)]"
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
