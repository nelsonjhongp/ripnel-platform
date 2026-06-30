"use client"

import { COVERAGE_BAR_DANGER, COVERAGE_BAR_WARNING, COVERAGE_BAR_SUCCESS } from "./pricing-constants"

export function CoverageBar({
  current,
  total,
}: {
  current: number
  total: number
}) {
  const pct = total === 0 ? 0 : Math.max(0, Math.min(100, Math.round((current / total) * 100)))

  const variant =
    current === 0 ? "danger" : current === total ? "success" : "warning"

  const barColor = {
    danger: COVERAGE_BAR_DANGER,
    warning: COVERAGE_BAR_WARNING,
    success: COVERAGE_BAR_SUCCESS,
  }[variant]

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="tabular-nums text-xs font-semibold text-[var(--ops-text)]">
        {current}/{total}
      </span>
      <span className="h-1.5 rounded-full w-16 bg-[var(--ops-surface-muted)]">
        <span
          className={`block h-full rounded-full transition-[width] duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </span>
    </span>
  )
}
