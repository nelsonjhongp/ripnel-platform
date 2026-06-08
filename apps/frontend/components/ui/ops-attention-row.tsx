"use client"

import Link from "next/link"

import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { cn } from "@/lib/utils"

export interface OpsAttentionRowProps {
  icon: React.ReactNode
  title: string
  description: string
  ctaLabel: string
  href: string
  highlightValue: string
  badge?: string | null
  tone?: "neutral" | "success" | "warning" | "danger" | "accent"
  embedded?: boolean
}

const iconToneClasses: Record<NonNullable<OpsAttentionRowProps["tone"]>, string> = {
  neutral:
    "bg-[color:color-mix(in_srgb,#4f46e5_8%,var(--ops-surface))] text-[#4f46e5]",
  success:
    "bg-[var(--ops-tone-success-bg)] text-emerald-600",
  warning:
    "bg-[var(--ops-tone-warning-bg)] text-amber-600",
  danger:
    "bg-[var(--ops-tone-danger-bg)] text-rose-600",
  accent:
    "bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_84%,var(--ops-surface))] text-[var(--ripnel-accent-hover)]",
}

const borderToneClasses: Record<NonNullable<OpsAttentionRowProps["tone"]>, string> = {
  neutral: "border-l-[var(--ops-border-soft)]",
  success: "border-l-emerald-500/80",
  warning: "border-l-amber-500/85",
  danger: "border-l-rose-500/85",
  accent: "border-l-[var(--ripnel-accent)]/80",
}

const badgeToneMap: Record<
  NonNullable<OpsAttentionRowProps["tone"]>,
  "neutral" | "success" | "warning" | "danger" | "accent"
> = {
  neutral: "neutral",
  success: "success",
  warning: "warning",
  danger: "danger",
  accent: "accent",
}

const highlightToneClasses: Record<NonNullable<OpsAttentionRowProps["tone"]>, string> = {
  neutral: "text-[var(--ops-text)]",
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-rose-600",
  accent: "text-[var(--ripnel-accent)]",
}

export function OpsAttentionRow({
  icon,
  title,
  description,
  ctaLabel,
  href,
  highlightValue,
  badge,
  tone = "neutral",
  embedded = false,
}: OpsAttentionRowProps) {
  return (
    <div
      className={cn(
        embedded
          ? "bg-transparent px-4 py-2.5"
          : "rounded-xl border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_18%,var(--ops-surface))] px-3 py-2",
        "border-l-2",
        borderToneClasses[tone]
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2.5">
        <div
          className={cn(
            "mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg",
            iconToneClasses[tone]
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-tight text-[var(--ops-text)]">{title}</p>
          </div>
          <p className="mt-0.5 text-[11px] leading-[1.3] text-[var(--ops-text-muted)]">
            {description}
          </p>
          <Link
            href={href}
            className={cn(
              "mt-1 inline-flex items-center gap-1 font-semibold transition",
              embedded
                ? "text-[12px] text-[var(--ripnel-accent-hover)] hover:text-[var(--ripnel-accent)]"
                : "text-[11px] text-[var(--ripnel-accent-hover)] hover:text-[var(--ripnel-accent)]"
            )}
          >
            {ctaLabel}
          </Link>
        </div>
        <div className="flex min-w-[72px] flex-col items-end justify-start gap-1">
          <p className={cn("text-right text-[15px] font-semibold tracking-[-0.02em]", highlightToneClasses[tone])}>
            {highlightValue}
          </p>
          {badge ? (
            <OpsStatusBadge tone={badgeToneMap[tone]} size="xs">
              {badge}
            </OpsStatusBadge>
          ) : null}
        </div>
      </div>
    </div>
  )
}
