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
    "border-[color:color-mix(in_srgb,#10b981_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_74%,var(--ops-text))]",
  warning:
    "border-[color:color-mix(in_srgb,#f59e0b_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]",
  danger:
    "border-[color:color-mix(in_srgb,#f43f5e_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f43f5e_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#be123c_74%,var(--ops-text))]",
  accent:
    "border-[color:color-mix(in_srgb,var(--ripnel-accent)_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_82%,var(--ops-surface))] text-[color:color-mix(in_srgb,var(--ripnel-accent)_72%,var(--ops-text))]",
  neutral:
    "border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] text-[var(--ops-text-muted)]",
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
        "inline-flex items-center rounded-full border font-semibold",
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
