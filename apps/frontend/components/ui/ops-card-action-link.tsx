"use client"

import { ArrowRight } from "lucide-react"
import { OpsActionLink } from "@/components/ui/ops-action-link"

export interface OpsCardActionLinkProps {
  href: string
  label: string
}

/**
 * @deprecated Prefer OpsActionLink for new modules.
 * Do not use in new screens; this wrapper is temporary compatibility.
 * This wrapper is kept for card-footers already used in dashboard-style surfaces.
 */
export function OpsCardActionLink({ href, label }: OpsCardActionLinkProps) {
  return (
    <OpsActionLink href={href} tone="accent" size="sm" className="gap-1.5 border-transparent bg-transparent px-0 hover:bg-transparent">
      {label}
      <ArrowRight className="h-3.5 w-3.5" />
    </OpsActionLink>
  )
}
