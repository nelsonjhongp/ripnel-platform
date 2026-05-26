"use client"

import { cn } from "@/lib/utils"

export interface OpsMetricStripItemProps {
  label: string
  value: string | number
  tone?: "accent" | "warning" | "info"
  isNeutral?: boolean
}

function stripToneClass(
  tone: NonNullable<OpsMetricStripItemProps["tone"]>,
  isNeutral: boolean
) {
  if (isNeutral) {
    return "border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] text-[var(--ops-text)]"
  }

  if (tone === "accent") {
    return "border-[color:color-mix(in_srgb,var(--ripnel-accent)_18%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_76%,var(--ops-surface))] text-[var(--ops-text)]"
  }

  if (tone === "warning") {
    return "border-[color:color-mix(in_srgb,#f59e0b_20%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_10%,var(--ops-surface))] text-amber-800 dark:text-amber-300"
  }

  return "border-[color:color-mix(in_srgb,#38bdf8_20%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#38bdf8_8%,var(--ops-surface))] text-sky-800 dark:text-sky-300"
}

export function OpsMetricStripItem({
  label,
  value,
  tone = "accent",
  isNeutral = false,
}: OpsMetricStripItemProps) {
  return (
    <div
      className={cn(
        "flex min-h-[90px] flex-col justify-between rounded-xl border px-4 py-3",
        stripToneClass(tone, isNeutral)
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-[var(--ops-text)]">{value}</p>
    </div>
  )
}
