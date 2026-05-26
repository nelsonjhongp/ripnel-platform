"use client"

import {
  OpsPendingRow,
  type OpsPendingRowProps,
} from "@/components/ui/ops-pending-row"

export interface HomePendingItemProps {
  icon: React.ReactNode
  title: string
  description: string
  cta: string
  href: string
  tone?: "critical" | "warning" | "info"
}

export function HomePendingItem({
  cta,
  href,
  ...props
}: HomePendingItemProps) {
  return (
    <OpsPendingRow
      {...(props satisfies Omit<OpsPendingRowProps, "ctaLabel" | "ctaHref">)}
      ctaLabel={cta}
      ctaHref={href}
    />
  )
}
