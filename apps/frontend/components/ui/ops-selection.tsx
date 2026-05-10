"use client"

import type { ReactNode } from "react"
import { Check, ChevronDown, X } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type OpsOption = {
  value: string
  label: string
  helper?: string
  disabled?: boolean
  leading?: ReactNode
}

const opsPickerTriggerClass =
  "flex h-10 w-full cursor-pointer items-center justify-between rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3.5 text-left text-sm text-[var(--ops-text)] outline-none transition hover:border-[var(--ops-border-soft)] hover:bg-[var(--ops-surface-muted)] focus-visible:border-[var(--ripnel-accent)] focus-visible:ring-2 focus-visible:ring-[var(--ripnel-accent-soft)] disabled:cursor-not-allowed disabled:opacity-60"
const opsPickerContentClass =
  "max-h-64 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto overscroll-contain border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-1"

function OpsOptionContent({ option }: { option: OpsOption }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      {option.leading ? <span className="mt-0.5 shrink-0">{option.leading}</span> : null}
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--ops-text)]">{option.label}</p>
        {option.helper ? (
          <p className="mt-0.5 text-xs text-[var(--ops-text-muted)]">{option.helper}</p>
        ) : null}
      </div>
    </div>
  )
}

export function OpsSelectMenu({
  value,
  onValueChange,
  placeholder,
  options,
  disabled = false,
  triggerLabel,
}: {
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  options: OpsOption[]
  disabled?: boolean
  triggerLabel?: (option: OpsOption | null) => string
}) {
  const selectedOption = options.find((option) => option.value === value) || null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button type="button" className={opsPickerTriggerClass} disabled={disabled}>
          <span className={selectedOption ? "text-[var(--ops-text)]" : "text-[var(--ops-text-muted)]"}>
            {selectedOption ? (triggerLabel ? triggerLabel(selectedOption) : selectedOption.label) : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--ops-text-muted)]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className={opsPickerContentClass}>
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="cursor-pointer gap-2 rounded-lg px-2 py-2"
            >
              <OpsOptionContent option={option} />
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function OpsMultiSelectMenu({
  selectedValues,
  onToggle,
  placeholder,
  options,
  disabled = false,
  formatCountLabel,
}: {
  selectedValues: string[]
  onToggle: (value: string) => void
  placeholder: string
  options: OpsOption[]
  disabled?: boolean
  formatCountLabel?: (count: number) => string
}) {
  const selectedCount = selectedValues.length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button type="button" className={opsPickerTriggerClass} disabled={disabled}>
          <span className={selectedCount ? "text-[var(--ops-text)]" : "text-[var(--ops-text-muted)]"}>
            {selectedCount
              ? formatCountLabel
                ? formatCountLabel(selectedCount)
                : `${selectedCount} seleccionada${selectedCount === 1 ? "" : "s"}`
              : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--ops-text-muted)]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className={opsPickerContentClass}>
        {options.map((option) => {
          const checked = selectedValues.includes(option.value)

          return (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={checked}
              disabled={option.disabled}
              onCheckedChange={() => onToggle(option.value)}
              onSelect={(event) => event.preventDefault()}
              className="cursor-pointer gap-2 rounded-lg px-2 py-2"
            >
              <OpsOptionContent option={option} />
            </DropdownMenuCheckboxItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function OpsSelectionChip({
  label,
  onRemove,
  selected = false,
  leading,
  title,
}: {
  label: string
  onRemove?: () => void
  selected?: boolean
  leading?: ReactNode
  title?: string
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        selected
          ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_28%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_76%,var(--ops-surface))] text-[var(--ripnel-accent-hover)]"
          : "border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] text-[var(--ops-text-muted)]"
      )}
    >
      {selected ? <Check className="h-3 w-3" /> : null}
      {leading ? <span className="shrink-0">{leading}</span> : null}
      <span>{label}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-current transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ripnel-accent-soft)] dark:hover:bg-white/10"
          aria-label={`Quitar ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  )
}

export function OpsReadonlyFieldState({
  value,
  placeholder,
  badge = "Automático",
  className,
}: {
  value: string
  placeholder?: string
  badge?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-10 items-center justify-between gap-3 rounded-xl border border-[var(--ops-border-soft)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_82%,var(--ops-surface))] px-3.5 text-sm",
        className
      )}
    >
      <span className={value ? "text-[var(--ops-text-muted)]" : "text-[color:color-mix(in_srgb,var(--ops-text-muted)_86%,transparent)]"}>
        {value || placeholder || ""}
      </span>
      <span className="inline-flex shrink-0 rounded-full border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ops-text-muted)]">
        {badge}
      </span>
    </div>
  )
}
