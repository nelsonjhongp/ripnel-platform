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
    "bg-[color:color-mix(in_srgb,#f59e0b_10%,var(--ops-surface))] text-amber-700 dark:text-amber-400",
  success:
    "bg-[color:color-mix(in_srgb,#10b981_10%,var(--ops-surface))] text-emerald-700 dark:text-emerald-400",
  info:
    "bg-[color:color-mix(in_srgb,#38bdf8_10%,var(--ops-surface))] text-sky-700 dark:text-sky-400",
  neutral:
    "bg-[color:color-mix(in_srgb,#94a3b8_14%,var(--ops-surface))] text-slate-600 dark:text-slate-300",
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
