"use client"

import Link from "next/link"

import { cn } from "@/lib/utils"

export interface OpsMetricCardProps {
  icon: React.ReactNode
  label: React.ReactNode
  value: string | number
  detail?: string
  state?: string
  footer?: React.ReactNode
  tone?: "default" | "accent" | "info" | "success" | "warning" | "danger" | "neutral"
  href?: string
  className?: string
  valueClassName?: string
}

const toneClasses: Record<
  NonNullable<OpsMetricCardProps["tone"]>,
  { bg: string; text: string; badge: string; badgeText: string }
> = {
  accent: {
    bg: "bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_88%,var(--ops-surface))]",
    text: "text-[var(--ripnel-accent-hover)]",
    badge:
      "border-[color:color-mix(in_srgb,var(--ripnel-accent)_26%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_72%,var(--ops-surface))]",
    badgeText: "text-[var(--ripnel-accent-hover)]",
  },
  success: {
    bg: "bg-[var(--ops-tone-success-bg)]",
    text: "text-[var(--ops-tone-success-text)]",
    badge:
      "border-[var(--ops-tone-success-border)] bg-[var(--ops-tone-success-bg)]",
    badgeText: "text-[var(--ops-tone-success-text)]",
  },
  warning: {
    bg: "bg-[var(--ops-tone-warning-bg)]",
    text: "text-amber-700 dark:text-amber-400",
    badge:
      "border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)]",
    badgeText: "text-amber-700 dark:text-amber-400",
  },
  danger: {
    bg: "bg-[var(--ops-tone-danger-bg)]",
    text: "text-rose-700 dark:text-rose-400",
    badge:
      "border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)]",
    badgeText: "text-rose-700 dark:text-rose-400",
  },
  info: {
    bg: "bg-[var(--ops-tone-info-bg)]",
    text: "text-[var(--ops-tone-info-text)]",
    badge:
      "border-[var(--ops-tone-info-border)] bg-[var(--ops-tone-info-bg)]",
    badgeText: "text-[var(--ops-tone-info-text)]",
  },
  neutral: {
    bg: "bg-[var(--ops-tone-neutral-bg)]",
    text: "text-[var(--ops-tone-neutral-text)]",
    badge:
      "border-[var(--ops-tone-neutral-border)] bg-[var(--ops-tone-neutral-bg)]",
    badgeText: "text-[var(--ops-tone-neutral-text)]",
  },
  default: {
    bg: "bg-[var(--ops-surface-muted)]",
    text: "text-[var(--ops-text-muted)]",
    badge: "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)]",
    badgeText: "text-[var(--ops-text-muted)]",
  },
}

export function OpsMetricCard({
  icon,
  label,
  value,
  detail,
  state,
  footer,
  tone = "default",
  href,
  className,
  valueClassName,
}: OpsMetricCardProps) {
  const toneStyle = toneClasses[tone]

  const content = (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          toneStyle.bg,
          toneStyle.text
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
          {label}
        </div>
        <p className={cn("mt-1 text-2xl font-bold leading-none text-[var(--ops-text)]", valueClassName)}>
          {value}
        </p>

        {(footer || detail || state) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {footer ? (
              footer
            ) : detail ? (
              <p className="text-[12px] leading-5 text-[var(--ops-text-muted)]">{detail}</p>
            ) : null}
            {!footer && state && (
              <span
                className={cn(
                  "inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]",
                  toneStyle.badge,
                  toneStyle.badgeText
                )}
              >
                {state}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )

  const sharedClasses = cn(
    "block rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-4 py-3.5",
    href &&
      "transition hover:border-[var(--ops-border-soft)] hover:bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_56%,var(--ops-surface))]",
    className
  )

  if (href) {
    return (
      <Link href={href} className={sharedClasses}>
        {content}
      </Link>
    )
  }

  return <div className={sharedClasses}>{content}</div>
}
