"use client"

import { cn } from "@/lib/utils"

/**
 * @deprecated Prefer OpsMetricCard or OpsMetricPill for new modules.
 * Do not use in new screens; this wrapper is temporary compatibility.
 * This remains as a derived, denser KPI surface used by legacy home/dashboard layouts.
 */
export interface OpsMetricStripItemProps {
  label: string
  value: string | number
  tone?: "accent" | "warning" | "info" | "neutral"
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
    return "border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)] text-[var(--ops-tone-warning-text)]"
  }

  if (tone === "neutral") {
    return "border-[var(--ops-tone-neutral-border)] bg-[var(--ops-tone-neutral-bg)] text-[var(--ops-tone-neutral-text)]"
  }

  return "border-[var(--ops-tone-info-border)] bg-[var(--ops-tone-info-bg)] text-[var(--ops-tone-info-text)]"
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
