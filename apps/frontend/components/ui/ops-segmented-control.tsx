"use client"

import { cn } from "@/lib/utils"

export interface OpsSegmentedControlOption<T extends string = string> {
  value: T
  label: string
}

export function OpsSegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  tone = "default",
  size = "default",
  variant = "default",
  disabled = false,
  className,
}: {
  options: readonly OpsSegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  tone?: "default" | "accent"
  size?: "default" | "compact"
  variant?: "default" | "switch" | "chip"
  disabled?: boolean
  className?: string
}) {
  const activeClass =
    tone === "accent"
      ? "bg-[var(--ripnel-accent)] text-white"
      : "bg-[var(--ops-text)] text-[var(--ops-surface)]"

  const inactiveClass =
    "sales-field text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ripnel-accent)]"
  const sizeClass =
    size === "compact"
      ? "rounded-md px-2.5 py-1 text-[12px] font-medium"
      : "rounded-lg px-3 py-1.5 text-sm font-medium"
  const switchContainerClass =
    tone === "accent"
      ? size === "compact"
        ? "inline-flex items-center overflow-hidden rounded-lg border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_82%,var(--ops-surface))]"
        : "inline-flex items-center overflow-hidden rounded-lg border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_82%,var(--ops-surface))]"
      : size === "compact"
        ? "inline-flex items-center overflow-hidden rounded-lg border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_82%,var(--ops-surface))]"
        : "inline-flex items-center overflow-hidden rounded-lg border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_82%,var(--ops-surface))]"
  const switchButtonSizeClass =
    size === "compact"
      ? "min-h-7 rounded-none px-2.5 py-1 text-[12px] font-medium font-sans leading-none"
      : "min-h-8 rounded-none px-3 py-1.5 text-sm font-medium font-sans leading-none"
  const switchActiveClass =
    tone === "accent"
      ? "bg-[#b07ae4] text-white"
      : "bg-[var(--ops-surface)] text-[var(--ops-text)]"
  const switchInactiveClass =
    tone === "accent"
      ? "bg-transparent text-[var(--ops-text)] hover:bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_68%,var(--ops-surface))] hover:text-[var(--ops-text)]"
      : "border border-transparent bg-transparent text-[var(--ops-text-muted)] hover:bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_92%,var(--ops-surface))] hover:text-[var(--ops-text)]"

  if (variant === "switch") {
    return (
      <div
        className={cn("flex flex-wrap", className)}
        role="group"
        aria-label="Selector segmentado"
      >
        <div className={switchContainerClass}>
          {options.map((option) => {
            const isActive = value === option.value

            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange(option.value)}
                aria-pressed={isActive}
                className={cn(
                  switchButtonSizeClass,
                  "cursor-pointer tracking-normal transition focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ripnel-accent)] focus-visible:ring-inset",
                  option.value === options[0]?.value ? "rounded-l-lg" : "",
                  option.value === options[options.length - 1]?.value ? "rounded-r-lg" : "",
                  isActive ? switchActiveClass : switchInactiveClass,
                  disabled ? "cursor-not-allowed opacity-60" : "",
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (variant === "chip") {
    const chipSelectedClass =
      tone === "accent"
        ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_38%,var(--ops-border-strong))] bg-[var(--ripnel-accent-soft)] font-semibold text-[var(--ripnel-accent-hover)]"
        : "border-[var(--ops-text)] bg-[var(--ops-text)] font-semibold text-[var(--ops-surface)]"

    const chipUnselectedClass =
      "border-[var(--ops-border-strong)] bg-[var(--ops-surface)] text-[var(--ops-text)] hover:border-[color:color-mix(in_srgb,var(--ripnel-accent)_28%,var(--ops-border-strong))] hover:bg-[var(--ops-surface-muted)]"

    return (
      <div
        className={cn("flex flex-wrap gap-2", className)}
        role="group"
        aria-label="Selector segmentado"
      >
        {options.map((option) => {
          const isActive = value === option.value

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              aria-pressed={isActive}
              className={cn(
                "inline-flex h-7 cursor-pointer items-center rounded-lg border px-2.5 text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ripnel-accent)]",
                isActive ? chipSelectedClass : chipUnselectedClass,
                disabled ? "cursor-not-allowed opacity-60" : "",
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            sizeClass,
            "cursor-pointer transition",
            value === option.value ? activeClass : inactiveClass,
            disabled ? "cursor-not-allowed opacity-60" : "",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
