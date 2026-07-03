"use client"

import { useId, useState, type ReactNode } from "react"
import { Check, ChevronDown, Plus, X } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select as SelectPrimitive } from "radix-ui"
import {
  opsSelectContentClassName,
  opsDropdownContentClassName,
  opsSelectOptionClassName,
  opsSelectTriggerClassName,
  opsFieldLabelClassName,
} from "@/components/ui/ops-control-styles"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { cn } from "@/lib/utils"

export type OpsOption = {
  value: string
  label: string
  helper?: string
  disabled?: boolean
  leading?: ReactNode
  trailing?: ReactNode
  layout?: "stacked" | "between"
  badge?: string
  tone?: "neutral" | "accent" | "success" | "warning" | "danger"
}

function OpsOptionContent({ option }: { option: OpsOption }) {
  if (option.layout === "between") {
    return (
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {option.leading ? <span className="shrink-0">{option.leading}</span> : null}
          <p className="truncate text-sm font-medium text-[var(--ops-text)]">{option.label}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {option.badge ? (
            <OpsStatusBadge tone={option.tone || "accent"} size="xs">
              {option.badge}
            </OpsStatusBadge>
          ) : null}
          {option.trailing ? <span className="shrink-0">{option.trailing}</span> : null}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 items-start gap-2">
      {option.leading ? <span className="mt-0.5 shrink-0">{option.leading}</span> : null}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--ops-text)]">{option.label}</p>
        {option.helper ? (
          <p className="mt-0.5 text-xs text-[var(--ops-text-muted)]">{option.helper}</p>
        ) : null}
      </div>
      {option.badge ? (
        <OpsStatusBadge tone={option.tone || "accent"} size="xs" className="shrink-0">
          {option.badge}
        </OpsStatusBadge>
      ) : null}
    </div>
  )
}

export function OpsSelect({
  id,
  value,
  onValueChange,
  onChange,
  placeholder,
  options,
  disabled = false,
  label,
  inlineLabel = false,
  triggerLabel,
  triggerContent,
  className,
  triggerClassName,
  error,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: {
  id?: string
  value: string
  onValueChange?: (value: string) => void
  onChange?: (value: string) => void
  placeholder?: string
  options: readonly OpsOption[]
  disabled?: boolean
  label?: string
  inlineLabel?: boolean
  triggerLabel?: (option: OpsOption | null) => string
  triggerContent?: (option: OpsOption | null) => ReactNode
  className?: string
  triggerClassName?: string
  error?: string | null
  "aria-describedby"?: string
  "aria-invalid"?: boolean | "true" | "false"
}) {
  const generatedId = useId()
  const contentId = useId()
  const [open, setOpen] = useState(false)
  const handleChange = onValueChange || onChange || (() => {})
  const selectedOption = options.find((option) => option.value === value) || null
  const resolvedPlaceholder = placeholder || "Seleccionar..."
  const triggerId = id ?? (label && !inlineLabel ? generatedId : undefined)
  const hasError = Boolean(error) || ariaInvalid === true || ariaInvalid === "true"

  const trigger = (
    <SelectPrimitive.Trigger asChild>
      <button
        id={triggerId}
        type="button"
        role="combobox"
        disabled={disabled}
        aria-controls={contentId}
        aria-describedby={ariaDescribedBy}
        aria-expanded={open}
        aria-invalid={hasError ? true : ariaInvalid}
        data-ops-select-trigger
        data-invalid={hasError ? "true" : undefined}
        className={cn(
          opsSelectTriggerClassName,
          inlineLabel && label ? "justify-between gap-3" : "",
          !label ? className : triggerClassName,
          hasError && "border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)]",
        )}
      >
        {inlineLabel && label ? (
          <span className={`shrink-0 ${opsFieldLabelClassName}`}>{label}</span>
        ) : null}
        <span className="min-w-0 flex-1">
          {selectedOption ? (
            triggerContent ? (
              triggerContent(selectedOption)
            ) : (
              <span className="block truncate text-[var(--ops-text)]">
                {triggerLabel ? triggerLabel(selectedOption) : selectedOption.label}
              </span>
            )
          ) : (
            <span className="block truncate text-[var(--ops-text-muted)]">{resolvedPlaceholder}</span>
          )}
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--ops-text-muted)]" />
        </SelectPrimitive.Icon>
      </button>
    </SelectPrimitive.Trigger>
  )

  const content = (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        id={contentId}
        position="popper"
        sideOffset={4}
        className={opsSelectContentClassName}
      >
        <SelectPrimitive.Viewport>
          {options.map((option) => (
            <SelectPrimitive.Item
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className={opsSelectOptionClassName}
            >
              <SelectPrimitive.ItemText>
                <OpsOptionContent option={option} />
              </SelectPrimitive.ItemText>
            </SelectPrimitive.Item>
          ))}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )

  const selectElement = (
    <SelectPrimitive.Root
      value={value}
      onValueChange={handleChange}
      disabled={disabled}
      open={open}
      onOpenChange={setOpen}
    >
      {trigger}
      {content}
    </SelectPrimitive.Root>
  )

  if (!label) return selectElement

  return (
    <div className={className}>
      {!inlineLabel && (
        <label htmlFor={triggerId} className={`mb-1 ${opsFieldLabelClassName}`}>{label}</label>
      )}
      {selectElement}
    </div>
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
        <button type="button" className={opsSelectTriggerClassName} disabled={disabled}>
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
      <DropdownMenuContent align="start" sideOffset={4} className={opsDropdownContentClassName}>
        {options.map((option) => {
          const checked = selectedValues.includes(option.value)

          return (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={checked}
              disabled={option.disabled}
              onCheckedChange={() => onToggle(option.value)}
              onSelect={(event) => event.preventDefault()}
              className={opsSelectOptionClassName}
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
  disabled = false,
  removeMode = "icon",
}: {
  label: string
  onRemove?: () => void
  selected?: boolean
  leading?: ReactNode
  title?: string
  disabled?: boolean
  removeMode?: "icon" | "chip"
}) {
  const chipClassName = cn(
    "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
    selected
      ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_28%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_76%,var(--ops-surface))] text-[var(--ripnel-accent-hover)]"
      : "border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] text-[var(--ops-text-muted)]"
  )

  if (removeMode === "chip" && onRemove) {
    return (
      <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={onRemove}
        aria-label={`Quitar ${label}`}
        className={cn(
          chipClassName,
          "cursor-pointer transition hover:bg-[var(--ops-surface)] hover:text-[var(--ops-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ripnel-accent-soft)]",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        {selected ? <Check className="h-3 w-3" /> : null}
        {leading ? <span className="shrink-0">{leading}</span> : null}
        <span>{label}</span>
        <X className="h-3 w-3 shrink-0" aria-hidden="true" />
      </button>
    )
  }

  return (
    <span
      title={title}
      className={chipClassName}
    >
      {selected ? <Check className="h-3 w-3" /> : null}
      {leading ? <span className="shrink-0">{leading}</span> : null}
      <span>{label}</span>
      {onRemove ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className={cn(
            "inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-current transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ripnel-accent-soft)] dark:hover:bg-white/10",
            disabled && "cursor-not-allowed opacity-60",
          )}
          aria-label={`Quitar ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  )
}

export function OpsToggleChip({
  label,
  selected,
  onToggle,
  disabled = false,
  title,
}: {
  label: string
  selected: boolean
  onToggle: () => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "inline-flex min-h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ripnel-accent-soft)]",
        selected
          ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_82%,var(--ops-surface))] text-[var(--ripnel-accent-hover)]"
          : "border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface)] hover:text-[var(--ops-text)]",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      {selected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
      {label}
    </button>
  )
}

export function OpsColorSwatch({
  hex,
  className,
}: {
  hex?: string | null
  className?: string
}) {
  const colorValue =
    typeof hex === "string" && hex.trim()
      ? hex
      : "var(--ops-surface-muted)"

  return (
    <span
      className={cn(
        "inline-flex h-3.5 w-3.5 rounded-full border border-[var(--ops-border-soft)]",
        className,
      )}
      style={{ backgroundColor: colorValue }}
    />
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
