"use client"

import { OpsStatusBadge } from "@/components/ui/ops-status-badge"

/**
 * @deprecated Prefer OpsStatusBadge for new modules.
 * Do not use in new screens; this alias is temporary compatibility.
 * This alias remains for compact legacy badge use in dense tables.
 */
export interface OpsInlineBadgeProps {
  label: string
  tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "purple"
}

export function OpsInlineBadge({
  label,
  tone = "neutral",
}: OpsInlineBadgeProps) {
  const resolvedTone = tone === "purple" ? "accent" : tone

  return (
    <OpsStatusBadge tone={resolvedTone} size="xs" className="uppercase tracking-[0.12em]">
      {label}
    </OpsStatusBadge>
  )
}
