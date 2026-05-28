import type { LucideIcon } from "lucide-react"
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"

import { OpsMetricCard } from "@/components/ui/ops-metric-card"
import { Skeleton } from "@/components/ui/skeleton"
import type { DashboardMetricComparison } from "@/lib/dashboard-types"

export type DashboardKpiTone = "neutral" | "success" | "warning" | "danger" | "purple"

const METRIC_TONE_MAP: Record<
  DashboardKpiTone,
  "neutral" | "success" | "warning" | "danger" | "accent"
> = {
  neutral: "neutral",
  success: "success",
  warning: "warning",
  danger: "danger",
  purple: "accent",
}

function DashboardKpiCardInner({
  label,
  value,
  trend,
  icon: Icon,
  tone,
  href,
  loading,
}: {
  label: string
  value: string
  trend?: DashboardMetricComparison | null
  icon: LucideIcon
  tone: DashboardKpiTone
  href?: string
  loading?: boolean
}) {
  const showTrend = Boolean(trend?.valid && trend.delta != null)
  const trendDirection = trend?.direction || "neutral"
  const TrendIcon =
    trendDirection === "up" ? ArrowUpRight : trendDirection === "down" ? ArrowDownRight : Minus

  const trendLabel = (() => {
    if (!showTrend || !trend) return null
    if (trend.delta_pct != null) {
      const prefix = trend.delta_pct > 0 ? "+" : ""
      return `${prefix}${trend.delta_pct.toFixed(0)}%`
    }
    const prefix = (trend.delta || 0) > 0 ? "+" : ""
    return `${prefix}${trend.delta?.toFixed(0) || "0"}`
  })()

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-4 py-4 shadow-[0_8px_24px_rgb(15_23_42/0.03)]">
        <div className="flex items-start gap-3">
          <Skeleton className="mt-0.5 h-9 w-9 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-7 w-28 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
      <OpsMetricCard
      icon={<Icon className="h-[18px] w-[18px]" />}
      label={label}
      value={value}
      tone={METRIC_TONE_MAP[tone]}
      href={href}
      className="min-h-[108px] px-4 py-3.5 shadow-[0_8px_24px_rgb(15_23_42/0.03)]"
      valueClassName="text-[1.42rem] font-semibold tracking-[-0.03em]"
      footer={
        showTrend && trendLabel ? (
          <span
            className={
              trendDirection === "up"
                ? "inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400"
                : trendDirection === "down"
                  ? "inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400"
                  : "inline-flex items-center gap-1 text-[11px] font-medium text-[var(--ops-text-muted)]"
            }
          >
            <TrendIcon className="h-3 w-3" />
            {trendLabel}
          </span>
        ) : undefined
      }
    />
  )
}

export function DashboardKpiCard({
  label,
  value,
  trend,
  icon,
  tone,
  href,
  loading = false,
}: {
  label: string
  value: string
  trend?: DashboardMetricComparison | null
  icon: LucideIcon
  tone: DashboardKpiTone
  href?: string
  loading?: boolean
}) {
  return (
    <DashboardKpiCardInner
      label={label}
      value={value}
      trend={trend}
      icon={icon}
      tone={tone}
      href={href}
      loading={loading}
    />
  )
}
