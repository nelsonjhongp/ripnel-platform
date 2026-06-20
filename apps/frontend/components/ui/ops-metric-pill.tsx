import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export type OpsMetricPillTone = "default" | "accent" | "warning" | "success"

export type OpsMetricPillProps = {
  label: string
  value: string | number
  tone?: OpsMetricPillTone
  active?: boolean
  onClick?: () => void
  icon?: ReactNode
  grouped?: boolean
  className?: string
}

const toneClasses: Record<
  OpsMetricPillTone,
  {
    base: string
    icon: string
  }
> = {
  default: {
    base: "border-[var(--ops-border-strong)] bg-[var(--ops-surface)]",
    icon: "text-[var(--ops-text-muted)]",
  },
  accent: {
    base: "border-[var(--ops-border-strong)] bg-[var(--ops-surface)]",
    icon: "text-[var(--ripnel-accent-hover)]",
  },
  warning: {
    base: "border-[var(--ops-border-strong)] bg-[var(--ops-surface)]",
    icon: "text-[var(--ops-tone-warning-text)]",
  },
  success: {
    base: "border-[var(--ops-border-strong)] bg-[var(--ops-surface)]",
    icon: "text-[var(--ops-tone-success-text)]",
  },
}

export function OpsMetricPill({
  label,
  value,
  tone = "default",
  active = false,
  onClick,
  icon,
  grouped = false,
  className,
}: OpsMetricPillProps) {
  const toneStyle = toneClasses[tone]

  const content = (
    <span className="inline-flex min-w-0 items-center gap-2">
      {icon ? (
        <span
          className={cn(
            "flex h-3.5 w-3.5 shrink-0 items-center justify-center",
            toneStyle.icon
          )}
        >
          {icon}
        </span>
      ) : null}
      {label ? (
        <span
          className={cn(
            "truncate text-[10px] font-semibold uppercase tracking-[0.14em]",
            "text-[var(--ops-text-muted)]"
          )}
        >
          {label}
        </span>
      ) : null}
      {label ? (
        <span className="h-3.5 w-px shrink-0 bg-[color:color-mix(in_srgb,var(--ops-border-strong)_88%,transparent)]" />
      ) : null}
      <span
        className={cn(
          "shrink-0 text-[14px] font-semibold leading-none tabular-nums",
          "text-[var(--ops-text)]"
        )}
      >
        {value}
      </span>
    </span>
  )

  const sharedClassName = cn(
    "inline-flex items-center border transition",
    grouped ? "w-full rounded-lg px-3 py-2.5 sm:px-3.5" : "rounded-full px-3 py-2",
    toneStyle.base,
    active &&
      "border-[color:color-mix(in_srgb,var(--ops-border-soft)_84%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_28%,var(--ops-surface))] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]",
    onClick &&
      "cursor-pointer hover:border-[color:color-mix(in_srgb,var(--ripnel-accent)_24%,var(--ops-border-strong))] hover:bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))]",
    className
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={sharedClassName}>
        {content}
      </button>
    )
  }

  return <div className={sharedClassName}>{content}</div>
}
