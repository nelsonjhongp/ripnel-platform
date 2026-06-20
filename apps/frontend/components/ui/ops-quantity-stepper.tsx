"use client"

import { ChevronDown, ChevronUp, Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

type OpsQuantityStepperProps = {
  value: string | number
  onChange?: (value: string) => void
  onIncrement?: () => void
  onDecrement?: () => void
  disabled?: boolean
  min?: number
  max?: number
  className?: string
  inputClassName?: string
  layout?: "default" | "horizontal"
  size?: "sm" | "default"
}

export function OpsQuantityStepper({
  value,
  onChange,
  onIncrement,
  onDecrement,
  disabled = false,
  min = 1,
  max,
  className,
  inputClassName,
  layout = "default",
  size = "default",
}: OpsQuantityStepperProps) {
  const numericValue = typeof value === "number" ? value : Number(value)
  const hasNumericValue = Number.isFinite(numericValue)
  const canDecrement =
    !disabled && hasNumericValue && numericValue > min
  const canIncrement =
    !disabled &&
    hasNumericValue &&
    (typeof max !== "number" || numericValue < max)

  if (layout === "horizontal") {
    const isSm = size === "sm"
    return (
      <div
        className={cn(
          "inline-flex items-center overflow-hidden rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)]",
          isSm ? "h-7" : "h-9",
          !isSm && "shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
          className
        )}
      >
        <button
          type="button"
          onClick={onDecrement}
          disabled={!canDecrement}
          className={cn(
            "inline-flex items-center justify-center border-r border-[var(--ops-border-strong)] text-[var(--ops-text-muted)] transition hover:bg-[var(--ops-surface-muted)] active:bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_42%,var(--ops-border-strong))] disabled:opacity-40",
            isSm ? "h-7 w-8" : "h-9 w-9"
          )}
          aria-label="Disminuir cantidad"
        >
          <Minus className={isSm ? "h-3 w-3" : "h-4 w-4"} />
        </button>

        {onChange ? (
          <input
            type="number"
            min={min}
            max={max}
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            className={cn(
              "border-0 bg-transparent text-center font-semibold text-[var(--ops-text)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
              isSm ? "h-7 min-w-9 px-1 text-sm" : "h-9 w-12 px-2 text-sm",
              inputClassName
            )}
          />
        ) : (
          <span
            className={cn(
              "inline-flex items-center justify-center font-semibold text-[var(--ops-text)]",
              isSm ? "h-7 min-w-9 text-sm" : "h-9 min-w-[3rem] text-sm"
            )}
          >
            {numericValue}
          </span>
        )}

        <button
          type="button"
          onClick={onIncrement}
          disabled={!canIncrement}
          className={cn(
            "inline-flex items-center justify-center border-l border-[var(--ops-border-strong)] text-[var(--ops-text-muted)] transition hover:bg-[var(--ops-surface-muted)] active:bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_42%,var(--ops-border-strong))] disabled:opacity-40",
            isSm ? "h-7 w-8" : "h-9 w-9"
          )}
          aria-label="Aumentar cantidad"
        >
          <Plus className={isSm ? "h-3 w-3" : "h-4 w-4"} />
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex h-10 items-stretch gap-0 rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-field)] pl-3 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--ops-surface)_74%,transparent)] overflow-hidden",
        disabled && "cursor-not-allowed bg-[var(--ops-surface-muted)] opacity-70",
        className
      )}
    >
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        className={cn(
          "h-full w-full min-w-0 bg-transparent pr-2 text-center text-sm font-semibold tabular-nums text-[var(--ops-text)] outline-none disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          inputClassName
        )}
      />

      <div className="flex h-full w-7 shrink-0 flex-col border-l border-[var(--ops-border-strong)]">
        <button
          type="button"
          onClick={onIncrement}
          disabled={!canIncrement}
          className={cn(
            "inline-flex h-1/2 w-full items-center justify-center border-b border-[var(--ops-border-strong)] transition",
            canIncrement
              ? "cursor-pointer text-[var(--ripnel-accent-hover)] hover:bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_78%,var(--ops-surface))]"
              : "cursor-not-allowed text-[var(--ops-text-muted)]"
          )}
          aria-label="Aumentar cantidad"
        >
          <ChevronUp className="h-3 w-3" />
        </button>

        <button
          type="button"
          onClick={onDecrement}
          disabled={!canDecrement}
          className={cn(
            "inline-flex h-1/2 w-full items-center justify-center transition",
            canDecrement
              ? "cursor-pointer text-[var(--ops-tone-warning-text)] hover:bg-[var(--ops-tone-warning-bg)]"
              : "cursor-not-allowed text-[var(--ops-text-muted)]"
          )}
          aria-label="Disminuir cantidad"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
