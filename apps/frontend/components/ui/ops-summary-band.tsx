"use client"

import { cn } from "@/lib/utils"

export interface OpsSummaryBandItem {
  icon: React.ReactNode
  label: string
  value: string | number
  meta?: string
  tone?: "accent" | "info" | "success" | "neutral"
}

export interface OpsSummaryBandProps {
  items: OpsSummaryBandItem[]
}

const iconToneClasses: Record<NonNullable<OpsSummaryBandItem["tone"]>, string> = {
  accent: "text-[var(--ripnel-accent)]",
  info: "text-sky-600 dark:text-sky-400",
  success: "text-emerald-600 dark:text-emerald-400",
  neutral: "text-[var(--ops-text-muted)]",
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
