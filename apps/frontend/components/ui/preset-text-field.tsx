"use client"

import { useMemo, useState } from "react"
import { Eraser, ListRestart, PencilLine } from "lucide-react"

import { OpsSelect, type OpsOption } from "@/components/ui/ops-selection"
import { cn } from "@/lib/utils"

export type PresetTextFieldProps = {
  value: string
  onChange: (value: string) => void
  presets: readonly string[]
  label?: string
  required?: boolean
  error?: string | null
  hint?: string
  renderLabel?: boolean
  placeholder?: string
  maxLength?: number
  onClear?: () => void
  textareaRows?: number
  textareaClassName?: string
  className?: string
}

type FieldMode = "preset" | "manual"

function isPreset(value: string, presets: readonly string[]): boolean {
  return presets.includes(value)
}

const TOGGLE_BUTTON_CLASS =
  "inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-[var(--ops-text-muted)] transition hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ripnel-accent-soft)]"

const CLEAR_BUTTON_CLASS =
  "inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-[var(--ops-text-muted)] transition hover:bg-[color:color-mix(in_srgb,#dc2626_8%,transparent)] hover:text-[color:color-mix(in_srgb,#dc2626_88%,var(--ops-text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,#dc2626_18%,transparent)]"

const LABEL_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]"

export function PresetTextField({
  value,
  onChange,
  presets,
  label,
  required = false,
  error,
  hint,
  renderLabel = true,
  placeholder = "Selecciona un motivo",
  maxLength = 200,
  onClear,
  textareaRows = 3,
  textareaClassName,
  className,
}: PresetTextFieldProps) {
  const initialMode: FieldMode = isPreset(value, presets) || !value.trim() ? "preset" : "manual"
  const [mode, setMode] = useState<FieldMode>(initialMode)
  const [selectedPreset, setSelectedPreset] = useState(isPreset(value, presets) ? value : "")

  const presetOptions = useMemo<OpsOption[]>(
    () => presets.map((preset) => ({ value: preset, label: preset })),
    [presets]
  )

  function handleToggle() {
    if (mode === "preset") {
      setMode("manual")
      setSelectedPreset("")
      onChange("")
    } else {
      setMode("preset")
      if (selectedPreset) {
        onChange(selectedPreset)
      } else {
        onChange("")
      }
    }
  }

  function handlePresetChange(presetValue: string) {
    setSelectedPreset(presetValue)
    onChange(presetValue)
  }

  const hasToggleOrClear = !renderLabel || onClear

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && renderLabel ? (
        <div className="flex items-center justify-between gap-3">
          <span className={cn(LABEL_CLASS, error ? "text-[var(--ops-tone-danger-text)]" : undefined)}>
            {label}
            {required ? (
              <span className="ml-0.5 text-sm leading-none text-[var(--ops-tone-danger-text)]">*</span>
            ) : null}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggle}
              className={TOGGLE_BUTTON_CLASS}
            >
              {mode === "preset" ? (
                <>
                  <PencilLine className="h-3.5 w-3.5" />
                  Manual
                </>
              ) : (
                <>
                  <ListRestart className="h-3.5 w-3.5" />
                  Usar opciones
                </>
              )}
            </button>

            {onClear ? (
              <button
                type="button"
                onClick={onClear}
                className={CLEAR_BUTTON_CLASS}
              >
                <Eraser className="h-3.5 w-3.5" />
                Limpiar
              </button>
            ) : null}
          </div>
        </div>
      ) : hasToggleOrClear ? (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleToggle}
            className={TOGGLE_BUTTON_CLASS}
          >
            {mode === "preset" ? (
              <>
                <PencilLine className="h-3.5 w-3.5" />
                Manual
              </>
            ) : (
              <>
                <ListRestart className="h-3.5 w-3.5" />
                Usar opciones
              </>
            )}
          </button>

          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className={CLEAR_BUTTON_CLASS}
            >
              <Eraser className="h-3.5 w-3.5" />
              Limpiar
            </button>
          ) : null}
        </div>
      ) : null}

      <div data-field-error={error ? "true" : undefined} className="space-y-1.5">
        {mode === "preset" ? (
          <OpsSelect
            value={selectedPreset}
            onValueChange={handlePresetChange}
            placeholder={placeholder}
            options={presetOptions}
          />
        ) : (
          <>
            <textarea
              value={value}
              onChange={(event) => onChange(event.target.value)}
              rows={textareaRows}
              maxLength={maxLength}
              placeholder="Describe el motivo del ajuste…"
              className={cn(
                "w-full min-h-[80px] rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3.5 py-2.5 text-sm text-[var(--ops-text)] outline-none resize-y placeholder:text-[var(--ops-text-muted)]",
                error
                  ? "border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)]"
                  : undefined,
                textareaClassName
              )}
            />
            <div className="flex justify-end">
              <span className="text-[11px] font-medium tabular-nums text-[var(--ops-text-muted)]">
                {value.length}/{maxLength}
              </span>
            </div>
          </>
        )}
        {error ? (
          <p role="alert" className="text-[11px] font-medium text-[var(--ops-tone-danger-text)]">
            {error}
          </p>
        ) : hint ? (
          <p className="text-[11px] text-[var(--ops-text-muted)]">{hint}</p>
        ) : null}
      </div>
    </div>
  )
}

export default PresetTextField
