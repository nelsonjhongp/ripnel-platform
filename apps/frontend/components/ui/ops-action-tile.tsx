"use client"

import Link from "next/link"

import { cn } from "@/lib/utils"

export interface OpsActionTileProps {
  icon: React.ReactNode
  label: string
  href: string
  tone?: "accent" | "warning" | "success" | "info" | "neutral"
}

const toneClasses: Record<NonNullable<OpsActionTileProps["tone"]>, string> = {
  accent:
    "bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_88%,var(--ops-surface))] text-[var(--ripnel-accent-hover)]",
  warning:
    "bg-[var(--ops-tone-warning-bg)] text-[var(--ops-tone-warning-text)]",
  success:
    "bg-[var(--ops-tone-success-bg)] text-[var(--ops-tone-success-text)]",
  info:
    "bg-[var(--ops-tone-info-bg)] text-[var(--ops-tone-info-text)]",
  neutral:
    "bg-[var(--ops-tone-neutral-bg)] text-[var(--ops-tone-neutral-text)]",
}

export function OpsActionTile({
  icon,
  label,
  href,
  tone = "neutral",
}: OpsActionTileProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3.5 py-2.5 text-sm font-medium text-[var(--ops-text)] transition hover:border-[var(--ops-border-soft)] hover:bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_56%,var(--ops-surface))]"
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg [&_svg]:h-3.5 [&_svg]:w-3.5",
          toneClasses[tone]
        )}
      >
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  )
}
