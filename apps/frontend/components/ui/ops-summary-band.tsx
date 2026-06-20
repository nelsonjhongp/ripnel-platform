"use client"

import { cn } from "@/lib/utils"

/**
 * @deprecated Prefer OpsMetricCard, OpsMetricRow or OpsMetricInlineGroup for new modules.
 * Do not use in new screens; this wrapper is temporary compatibility.
 * This component stays as a composed summary strip for existing operational overviews.
 */
export interface OpsSummaryBandItem {
  icon: React.ReactNode
  label: string
  value: string | number
  meta?: string
  tone?: "accent" | "info" | "success" | "warning" | "neutral"
}

export interface OpsSummaryBandProps {
  items: OpsSummaryBandItem[]
}

const iconToneClasses: Record<NonNullable<OpsSummaryBandItem["tone"]>, string> = {
  accent: "text-[var(--ripnel-accent)]",
  info: "text-[var(--ops-tone-info-text)]",
  success: "text-[var(--ops-tone-success-text)]",
  warning: "text-[var(--ops-tone-warning-text)]",
  neutral: "text-[var(--ops-tone-neutral-text)]",
}

export function OpsSummaryBand({ items }: OpsSummaryBandProps) {
  return (
    <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-4 py-2.5">
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-3 px-2 py-1.5">
            <div
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center",
                iconToneClasses[item.tone ?? "neutral"]
              )}
            >
              {item.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                {item.label}
              </p>
              <div className="mt-1.5">
                <p className="text-xl font-semibold leading-none text-[var(--ops-text)]">
                  {item.value}
                </p>
                {item.meta ? (
                  <p className="mt-1 text-[13px] leading-5 text-[var(--ops-text-muted)]">
                    {item.meta}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
