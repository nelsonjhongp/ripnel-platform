"use client"

import { cn } from "@/lib/utils"

export interface OpsMetricRowProps {
  label: React.ReactNode
  value: string
  tone?: "default" | "warning" | "danger"
}

export function OpsMetricRow({
  label,
  value,
  tone = "default",
}: OpsMetricRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[13px] text-[var(--ops-text-muted)]">{label}</span>
      <span
        className={cn(
          "font-semibold",
          tone === "warning" && "text-[var(--ops-tone-warning-text)]",
          tone === "danger" && "text-[var(--ops-tone-danger-text)]",
          tone === "default" && "text-[var(--ops-text)]"
        )}
      >
        {value}
      </span>
    </div>
  )
}
