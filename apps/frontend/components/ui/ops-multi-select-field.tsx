"use client"

import type { ReactNode } from "react"
import { OpsFormField } from "@/components/ui/ops-form-field"
import {
  OpsMultiSelectMenu,
  OpsSelectionChip,
  type OpsOption,
} from "@/components/ui/ops-selection"
import { INFO_BOX_MUTED } from "@/components/ui/ops-control-styles"

type OpsMultiSelectFieldProps = {
  label: string
  required?: boolean
  optionalLabel?: boolean | string
  error?: string | null
  hint?: string
  density?: "default" | "compact"
  emptyMessage?: string
  selectedValues: string[]
  onToggle: (value: string) => void
  options: OpsOption[]
  placeholder: string
  formatCountLabel?: (count: number) => string
  disabled?: boolean
  renderChip?: (option: OpsOption, onRemove: () => void) => ReactNode
}

export function OpsMultiSelectField({
  label,
  required,
  optionalLabel,
  error,
  hint,
  density = "compact",
  emptyMessage,
  selectedValues,
  onToggle,
  options,
  placeholder,
  formatCountLabel,
  disabled = false,
  renderChip,
}: OpsMultiSelectFieldProps) {
  if (options.length === 0 && emptyMessage) {
    return (
      <OpsFormField
        label={label}
        required={required}
        optionalLabel={optionalLabel}
        error={error}
        hint={hint}
        density={density}
      >
        <div className={`${INFO_BOX_MUTED} text-sm text-[var(--ops-text-muted)]`}>
          {emptyMessage}
        </div>
      </OpsFormField>
    )
  }

  const dropdownOptions = options.filter(
    (opt) => !selectedValues.includes(opt.value),
  )
  const dropdownDisabled = disabled || dropdownOptions.length === 0

  return (
    <OpsFormField
      label={label}
      required={required}
      optionalLabel={optionalLabel}
      error={error}
      hint={hint}
      density={density}
    >
      <div className="space-y-2">
        <OpsMultiSelectMenu
          selectedValues={selectedValues}
          onToggle={onToggle}
          placeholder={placeholder}
          options={dropdownOptions}
          formatCountLabel={formatCountLabel}
          disabled={dropdownDisabled}
        />

        {selectedValues.length > 0 ? (
          <div className="flex min-h-8 flex-wrap gap-1.5">
            {selectedValues.map((value) => {
              const opt = options.find((o) => o.value === value)
              if (!opt) return null
              if (renderChip) return renderChip(opt, () => onToggle(value))

              return (
                <OpsSelectionChip
                  key={value}
                  label={opt.label}
                  leading={opt.leading}
                  removeMode="chip"
                  disabled={disabled}
                  onRemove={() => onToggle(value)}
                />
              )
            })}
          </div>
        ) : null}
      </div>
    </OpsFormField>
  )
}
