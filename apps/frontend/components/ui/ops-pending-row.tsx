"use client"

import Link from "next/link"

import { cn } from "@/lib/utils"

export interface OpsPendingRowProps {
  icon: React.ReactNode
  title: string
  description: string
  ctaLabel: string
  ctaHref: string
  tone?: "critical" | "warning" | "info"
}

const iconToneClasses: Record<NonNullable<OpsPendingRowProps["tone"]>, string> = {
  critical: "bg-[color:color-mix(in_srgb,#f43f5e_10%,var(--ops-surface))] text-rose-700 dark:text-rose-400",
  warning: "bg-[color:color-mix(in_srgb,#f59e0b_12%,var(--ops-surface))] text-amber-700 dark:text-amber-400",
  info: "bg-[color:color-mix(in_srgb,#38bdf8_10%,var(--ops-surface))] text-sky-700 dark:text-sky-400",
}

const accentToneClasses: Record<NonNullable<OpsPendingRowProps["tone"]>, string> = {
  critical: "border-l-rose-500",
  warning: "border-l-amber-500",
  info: "border-l-sky-500",
}

const buttonToneClasses: Record<NonNullable<OpsPendingRowProps["tone"]>, string> = {
  critical:
    "border-rose-200 text-rose-700 hover:bg-[color:color-mix(in_srgb,#f43f5e_8%,var(--ops-surface))] dark:text-rose-400",
  warning:
    "border-amber-200 text-amber-700 hover:bg-[color:color-mix(in_srgb,#f59e0b_10%,var(--ops-surface))] dark:text-amber-400",
  info:
    "border-sky-200 text-sky-700 hover:bg-[color:color-mix(in_srgb,#38bdf8_8%,var(--ops-surface))] dark:text-sky-400",
}

export function OpsPendingRow({
  icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  tone = "info",
}: OpsPendingRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-transparent px-4 py-2.5",
        "border-l-2",
        accentToneClasses[tone]
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          iconToneClasses[tone]
        )}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--ops-text)]">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-[13px] text-[var(--ops-text-muted)]">
          {description}
        </p>
      </div>

      <Link
        href={ctaHref}
        className={cn(
          "inline-flex h-8 shrink-0 items-center justify-center self-center rounded-full border bg-[color:color-mix(in_srgb,var(--ops-surface)_84%,var(--ops-surface-muted))] px-4 text-[13px] font-medium transition",
          buttonToneClasses[tone]
        )}
      >
        {ctaLabel}
      </Link>
    </div>
  )
}
