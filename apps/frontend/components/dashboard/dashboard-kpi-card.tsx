import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export type DashboardKpiTone = "neutral" | "success" | "warning" | "danger" | "purple"

const TONE_STYLES: Record<DashboardKpiTone, string> = {
  neutral:
    "border-[color:color-mix(in_srgb,var(--ops-border-soft)_88%,transparent)] bg-white text-[var(--ops-text)]",
  success:
    "border-[color:color-mix(in_srgb,var(--ops-border-soft)_88%,transparent)] bg-white text-[var(--ops-text)]",
  warning:
    "border-[color:color-mix(in_srgb,var(--ops-border-soft)_88%,transparent)] bg-white text-[var(--ops-text)]",
  danger:
    "border-[color:color-mix(in_srgb,var(--ops-border-soft)_88%,transparent)] bg-white text-[var(--ops-text)]",
  purple:
    "border-[color:color-mix(in_srgb,var(--ops-border-soft)_88%,transparent)] bg-white text-[var(--ops-text)]",
}

const ICON_PANEL_STYLES: Record<DashboardKpiTone, string> = {
  neutral:
    "border-[color:color-mix(in_srgb,#4f46e5_10%,transparent)] bg-[color:color-mix(in_srgb,#4f46e5_10%,white)]",
  success:
    "border-[color:color-mix(in_srgb,#10b981_16%,transparent)] bg-[color:color-mix(in_srgb,#10b981_10%,white)]",
  warning:
    "border-[color:color-mix(in_srgb,#f59e0b_16%,transparent)] bg-[color:color-mix(in_srgb,#f59e0b_10%,white)]",
  danger:
    "border-[color:color-mix(in_srgb,#f97316_16%,transparent)] bg-[color:color-mix(in_srgb,#f97316_10%,white)]",
  purple:
    "border-[color:color-mix(in_srgb,var(--ripnel-accent)_16%,transparent)] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_72%,white)]",
}

const ICON_STYLES: Record<DashboardKpiTone, string> = {
  neutral: "text-[#4f46e5]",
  success: "text-[#0f9f8a]",
  warning: "text-[#f59e0b]",
  danger: "text-[#f97316]",
  purple: "text-[var(--ripnel-accent)]",
}

function DashboardKpiCardInner({
  label,
  value,
  description,
  icon: Icon,
  tone,
  loading,
}: {
  label: string
  value: string
  description?: string
  icon: LucideIcon
  tone: DashboardKpiTone
  loading?: boolean
}) {
  return (
    <div
      className={cn(
        "grid min-h-[128px] grid-rows-[auto_auto_1fr] rounded-[18px] border px-4 py-4 shadow-[0_8px_24px_rgb(15_23_42/0.03)] transition hover:translate-y-[-1px]",
        TONE_STYLES[tone]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-h-[1.5rem] space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
            {label}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-[14px] border",
            ICON_PANEL_STYLES[tone]
          )}
        >
          <Icon className={cn("h-[18px] w-[18px]", ICON_STYLES[tone])} />
        </span>
      </div>
      <div className="mt-1 min-h-[2.25rem]">
        {loading ? (
          <Skeleton className="h-7 w-28 rounded-md" />
        ) : (
          <p className="text-[1.55rem] font-semibold tracking-[-0.035em] text-[var(--ops-text)]">
            {value}
          </p>
        )}
      </div>
      <p className="mt-2 min-h-[1rem] truncate text-[11px] leading-4 text-[var(--ops-text-muted)]">
        {loading ? <Skeleton className="h-4 w-40 rounded-md" /> : description || "Sin datos"}
      </p>
    </div>
  )
}

export function DashboardKpiCard({
  label,
  value,
  description,
  icon,
  tone,
  href,
  loading = false,
}: {
  label: string
  value: string
  description?: string
  icon: LucideIcon
  tone: DashboardKpiTone
  href?: string
  loading?: boolean
}) {
  const content = (
    <DashboardKpiCardInner
      label={label}
      value={value}
      description={description}
      icon={icon}
      tone={tone}
      loading={loading}
    />
  )

  if (!href) return content

  return (
    <Link className="block outline-none focus-visible:ring-2 focus-visible:ring-[var(--ripnel-accent)] focus-visible:ring-offset-2" href={href}>
      {content}
    </Link>
  )
}
