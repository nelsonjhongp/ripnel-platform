import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function DashboardEmptyState({
  title,
  description,
  compact = false,
  dashed = true,
  action,
}: {
  title?: string
  description: string
  compact?: boolean
  dashed?: boolean
  action?: ReactNode
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[120px] flex-col items-center justify-center rounded-xl border border-[var(--ops-border-soft)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_74%,var(--ops-surface))] px-4 text-center",
        dashed && "border-dashed",
        compact ? "py-5" : "py-8"
      )}
    >
      {title ? (
        <p className="text-sm font-semibold text-[var(--ops-text)]">{title}</p>
      ) : null}
      <p className={cn("max-w-[26rem] text-[var(--ops-text-muted)]", title ? "mt-1 text-xs" : "text-sm")}>
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
