import { memo, type ReactNode } from "react"

import { cn } from "@/lib/utils"

export type OpsMetricInlineTone = "default" | "accent" | "warning" | "success" | "danger"

export type OpsMetricInlineProps = {
  icon?: ReactNode
  label: string
  value: string | number
  tone?: OpsMetricInlineTone
  className?: string
}

const iconColor: Record<OpsMetricInlineTone, string> = {
  default: "text-[var(--ops-text-muted)]",
  accent: "text-[var(--ripnel-accent-hover)]",
  warning: "text-[var(--ops-tone-warning-text)]",
  success: "text-[var(--ops-tone-success-text)]",
  danger: "text-[var(--ops-tone-danger-text)]",
}

export const OpsMetricInline = memo(function OpsMetricInline({
  icon,
  label,
  value,
  tone = "default",
  className,
}: OpsMetricInlineProps) {
  return (
    <div className={cn("flex items-center gap-1.5 text-sm", className)}>
      {icon ? (
        <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center", iconColor[tone])}>
          {icon}
        </span>
      ) : null}
      <span className="text-[var(--ops-text-muted)]">{label}:</span>
      <span className="font-semibold tabular-nums text-[var(--ops-text)]">{value}</span>
    </div>
  )
})
