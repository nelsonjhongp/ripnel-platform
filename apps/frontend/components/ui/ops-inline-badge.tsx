"use client"

import { OpsStatusBadge } from "@/components/ui/ops-status-badge"

export interface OpsInlineBadgeProps {
  label: string
  tone?: "neutral" | "success" | "warning" | "danger" | "purple"
}

export function OpsInlineBadge({
  label,
  tone = "neutral",
}: OpsInlineBadgeProps) {
  return (
    <OpsStatusBadge tone={tone === "purple" ? "accent" : tone} size="xs" className="uppercase tracking-[0.12em]">
      {label}
    </OpsStatusBadge>
  )
}
