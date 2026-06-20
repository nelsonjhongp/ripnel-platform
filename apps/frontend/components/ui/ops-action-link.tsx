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
    "border-[var(--ops-tone-success-border)] text-[var(--ops-tone-success-text)] hover:bg-[var(--ops-tone-success-bg)]",
  warning:
    "border-[var(--ops-tone-warning-border)] text-[var(--ops-tone-warning-text)] hover:bg-[var(--ops-tone-warning-bg)]",
  danger:
    "border-[var(--ops-tone-danger-border)] text-[var(--ops-tone-danger-text)] hover:bg-[var(--ops-tone-danger-bg)]",
  info:
    "border-[var(--ops-tone-info-border)] text-[var(--ops-tone-info-text)] hover:bg-[var(--ops-tone-info-bg)]",
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
        "inline-flex items-center rounded-lg border bg-[color:color-mix(in_srgb,var(--ops-surface)_84%,var(--ops-surface-muted))] font-medium transition",
        toneClasses[tone],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </Link>
  )
}
