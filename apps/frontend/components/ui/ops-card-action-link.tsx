"use client"

import { ArrowRight } from "lucide-react"
import Link from "next/link"

export interface OpsCardActionLinkProps {
  href: string
  label: string
}

export function OpsCardActionLink({ href, label }: OpsCardActionLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ripnel-accent-hover)] transition hover:text-[var(--ripnel-accent)]"
    >
      {label}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  )
}
