"use client"

import { cn } from "@/lib/utils"

export interface OpsStatusBadgeProps {
  children: React.ReactNode
  tone?: "neutral" | "accent" | "success" | "warning" | "danger"
  size?: "xs" | "sm"
  icon?: React.ReactNode
  className?: string
}

const toneClasses: Record<
  NonNullable<OpsStatusBadgeProps["tone"]>,
  string
> = {
  success:
    "bg-[var(--ops-tone-success-bg)] text-[var(--ops-tone-success-text)]",
  warning:
    "bg-[var(--ops-tone-warning-bg)] text-[var(--ops-tone-warning-text)]",
  danger:
    "bg-[var(--ops-tone-danger-bg)] text-[var(--ops-tone-danger-text)]",
  accent:
    "bg-[var(--ripnel-accent-soft)] text-[var(--ripnel-accent-hover)]",
  neutral:
    "bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]",
}

const sizeClasses: Record<NonNullable<OpsStatusBadgeProps["size"]>, string> = {
  xs: "gap-1 px-2 py-0.5 text-[10px]",
  sm: "gap-1.5 px-2.5 py-1 text-[11px]",
}

export function OpsStatusBadge({
  children,
  tone = "neutral",
  size = "sm",
  icon,
  className,
}: OpsStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold",
        toneClasses[tone],
        sizeClasses[size],
        className
      )}
    >
      {icon ? <span className="[&_svg]:h-3 [&_svg]:w-3">{icon}</span> : null}
      <span>{children}</span>
    </span>
  )
}
