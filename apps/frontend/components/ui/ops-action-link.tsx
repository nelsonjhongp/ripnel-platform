"use client"

import Link from "next/link"

import { cn } from "@/lib/utils"

export interface OpsActionLinkProps {
  href: string
  children: React.ReactNode
  tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "info"
  size?: "sm" | "md"
  className?: string
}

const toneClasses: Record<NonNullable<OpsActionLinkProps["tone"]>, string> = {
  accent:
    "border-[color:color-mix(in_srgb,var(--ripnel-accent)_26%,var(--ops-border-strong))] text-[var(--ripnel-accent-hover)] hover:bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_52%,var(--ops-surface))]",
  success:
    "border-[color:color-mix(in_srgb,#10b981_28%,var(--ops-border-strong))] text-[color:color-mix(in_srgb,#059669_74%,var(--ops-text))] hover:bg-[color:color-mix(in_srgb,#10b981_10%,var(--ops-surface))]",
  warning:
    "border-[color:color-mix(in_srgb,#f59e0b_30%,var(--ops-border-strong))] text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))] hover:bg-[color:color-mix(in_srgb,#f59e0b_10%,var(--ops-surface))]",
  danger:
    "border-[color:color-mix(in_srgb,#f43f5e_28%,var(--ops-border-strong))] text-[color:color-mix(in_srgb,#be123c_74%,var(--ops-text))] hover:bg-[color:color-mix(in_srgb,#f43f5e_10%,var(--ops-surface))]",
  info:
    "border-[color:color-mix(in_srgb,#38bdf8_28%,var(--ops-border-strong))] text-[color:color-mix(in_srgb,#0369a1_74%,var(--ops-text))] hover:bg-[color:color-mix(in_srgb,#38bdf8_10%,var(--ops-surface))]",
  neutral:
    "border-[var(--ops-border-strong)] text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)]",
}

const sizeClasses: Record<NonNullable<OpsActionLinkProps["size"]>, string> = {
  sm: "h-8 px-3 text-[12px]",
  md: "h-8 px-4 text-[13px]",
}

export function OpsActionLink({
  href,
  children,
  tone = "neutral",
  size = "sm",
  className,
}: OpsActionLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center rounded-full border bg-[color:color-mix(in_srgb,var(--ops-surface)_84%,var(--ops-surface-muted))] font-medium transition",
        toneClasses[tone],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </Link>
  )
}
