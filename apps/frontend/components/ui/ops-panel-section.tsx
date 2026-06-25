"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { INFO_BOX } from "@/components/ui/ops-control-styles"

type OpsPanelSectionProps = {
  title: string
  icon?: ReactNode
  aside?: ReactNode
  children: ReactNode
  tone?: "default" | "danger"
  className?: string
}

export function OpsPanelSection({
  title,
  icon,
  aside,
  children,
  tone = "default",
  className,
}: OpsPanelSectionProps) {
  return (
    <article
      className={cn(
        INFO_BOX,
        "rounded-xl p-[var(--ops-panel-padding)] shadow-sm",
        tone === "danger" &&
          "border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)]",
        className,
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--ops-text)]">
          {icon}
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </article>
  )
}
