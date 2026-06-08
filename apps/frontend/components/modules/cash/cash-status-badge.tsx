"use client"

import type { CashClosing } from "@/lib/cash"
import { getCashStatusLabel } from "@/lib/cash"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"

export function CashStatusBadge({
  status,
  className,
}: {
  status: CashClosing["status"]
  className?: string
}) {
  return (
    <OpsStatusBadge tone={status === "open" ? "warning" : "neutral"} className={className}>
      {getCashStatusLabel(status)}
    </OpsStatusBadge>
  )
}
