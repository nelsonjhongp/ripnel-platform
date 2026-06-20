"use client"

import { OpsAttentionRow } from "@/components/ui/ops-attention-row"

export interface OpsPendingRowProps {
  icon: React.ReactNode
  title: string
  description: string
  ctaLabel: string
  ctaHref: string
  tone?: "critical" | "danger" | "warning" | "info"
}

const toneMap: Record<
  NonNullable<OpsPendingRowProps["tone"]>,
  "danger" | "warning" | "accent"
> = {
  critical: "danger",
  danger: "danger",
  warning: "warning",
  info: "accent",
}

/**
 * @deprecated Prefer OpsAttentionRow for new inline operational alerts.
 * Do not use in new screens; this wrapper is temporary compatibility.
 * This wrapper preserves the compact pending-row API used by existing screens.
 */
export function OpsPendingRow({
  icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  tone = "info",
}: OpsPendingRowProps) {
  return (
    <OpsAttentionRow
      icon={icon}
      title={title}
      description={description}
      ctaLabel={ctaLabel}
      href={ctaHref}
      tone={toneMap[tone]}
      embedded
    />
  )
}
