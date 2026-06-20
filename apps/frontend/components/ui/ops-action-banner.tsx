"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { AdminActionButton } from "@/components/admin/admin-ui"
import { OpsPanel } from "@/components/ui/ops-panel"

export interface OpsActionBannerProps {
  icon: LucideIcon
  title: string
  description?: string
  tone?: "success" | "warning" | "danger" | "accent" | "neutral"
  actionLabel?: string
  actionTone?: "accent" | "neutral" | "danger"
  onAction?: () => void
  loading?: boolean
  className?: string
}

const panelToneClasses: Record<
  NonNullable<OpsActionBannerProps["tone"]>,
  string
> = {
  success:
    "border-[var(--ops-tone-success-border)] bg-[var(--ops-tone-success-bg)]",
  warning:
    "border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)]",
  danger:
    "border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)]",
  accent:
    "border-[color:color-mix(in_srgb,var(--ripnel-accent)_24%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_80%,var(--ops-surface))]",
  neutral:
    "border-[var(--ops-tone-neutral-border)] bg-[var(--ops-tone-neutral-bg)]",
}

const iconToneClasses: Record<
  NonNullable<OpsActionBannerProps["tone"]>,
  string
> = {
  success: "text-[var(--ops-tone-success-text)]",
  warning: "text-[var(--ops-tone-warning-text)]",
  danger: "text-[var(--ops-tone-danger-text)]",
  accent: "text-[var(--ripnel-accent-hover)]",
  neutral: "text-[var(--ops-tone-neutral-text)]",
}

const titleToneClasses: Record<
  NonNullable<OpsActionBannerProps["tone"]>,
  string
> = {
  success: "text-[var(--ops-tone-success-text)]",
  warning: "text-[var(--ops-tone-warning-text)]",
  danger: "text-[var(--ops-tone-danger-text)]",
  accent: "text-[var(--ripnel-accent-hover)]",
  neutral: "text-[var(--ops-text)]",
}

export function OpsActionBanner({
  icon: Icon,
  title,
  description,
  tone = "neutral",
  actionLabel,
  actionTone,
  onAction,
  loading = false,
  className,
}: OpsActionBannerProps) {
  return (
    <OpsPanel className={cn("p-4 sm:p-5 rounded-xl", panelToneClasses[tone], className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Icon className={cn("h-6 w-6 shrink-0", iconToneClasses[tone])} />
          <div className="min-w-0">
            <p className={cn("text-lg font-semibold", titleToneClasses[tone])}>
              {title}
            </p>
            {description ? (
              <p className="text-sm text-[var(--ops-text-muted)]">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {actionLabel && onAction ? (
          <AdminActionButton
            tone={actionTone ?? (tone === "warning" ? "accent" : "neutral")}
            onClick={onAction}
            disabled={loading}
            className="shrink-0 self-start sm:self-center"
          >
            {loading ? `${actionLabel}...` : actionLabel}
          </AdminActionButton>
        ) : null}
      </div>
    </OpsPanel>
  )
}
