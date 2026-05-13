"use client"

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
    danger: "bg-[color:color-mix(in_srgb,#f43f5e_60%,transparent)]",
    warning: "bg-[color:color-mix(in_srgb,#f59e0b_60%,transparent)]",
    success: "bg-[color:color-mix(in_srgb,#10b981_60%,transparent)]",
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
