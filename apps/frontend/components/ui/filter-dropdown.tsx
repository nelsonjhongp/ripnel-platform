"use client"

import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"

export interface FilterDropdownOption {
  value: string
  label: string
  helper?: string
  badge?: string
  tone?: "neutral" | "accent" | "success" | "warning" | "danger"
}

export function FilterDropdown({
  label,
  value,
  options,
  onChange,
  className,
  inlineLabel = false,
  triggerClassName,
  disabled = false,
}: {
  label: string
  value: string
  options: readonly FilterDropdownOption[]
  onChange: (value: string) => void
  className?: string
  inlineLabel?: boolean
  triggerClassName?: string
  disabled?: boolean
}) {
  const selectedOption = options.find((o) => o.value === value) || options[0]
  const contentClass =
    "max-h-64 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto overscroll-contain border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-1"

  return (
    <div className={className}>
      {label && !inlineLabel ? (
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
          {label}
        </label>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={[
              "sales-field flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-left text-sm text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-transparent",
              inlineLabel ? "justify-between gap-3" : "",
              triggerClassName || "",
            ].join(" ")}
          >
            {label && inlineLabel ? (
              <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                {label}
              </span>
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="block truncate">{selectedOption?.label || ""}</span>
              {selectedOption?.helper ? (
                <span className="block truncate text-[11px] text-[var(--ops-text-muted)]">
                  {selectedOption.helper}
                </span>
              ) : null}
            </span>
            {selectedOption?.badge ? (
              <OpsStatusBadge tone={selectedOption.tone || "accent"} size="xs" className="shrink-0">
                {selectedOption.badge}
              </OpsStatusBadge>
            ) : null}
            <ChevronDown className="h-4 w-4 shrink-0 text-[var(--ops-text-muted)]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={8}
          className={contentClass}
        >
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            {options.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className="cursor-pointer rounded-md px-3 py-2 text-sm text-[var(--ops-text)] focus:bg-[var(--ops-surface-muted)] focus:text-[var(--ops-text)]"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-[var(--ops-text)]">{option.label}</div>
                    {option.helper ? (
                      <div className="truncate text-[11px] text-[var(--ops-text-muted)]">
                        {option.helper}
                      </div>
                    ) : null}
                  </div>
                  {option.badge ? (
                    <OpsStatusBadge tone={option.tone || "accent"} size="xs" className="shrink-0">
                      {option.badge}
                    </OpsStatusBadge>
                  ) : null}
                </div>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
