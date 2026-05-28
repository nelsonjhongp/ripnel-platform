"use client"

import { cn } from "@/lib/utils"

export interface OpsSectionHeaderProps {
  icon?: React.ReactNode
  title: string
  action?: React.ReactNode
  className?: string
}

export function OpsSectionHeader({
  icon,
  title,
  action,
  className,
}: OpsSectionHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-2">
        {icon ? (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[var(--ripnel-accent)]">
            {icon}
          </span>
        ) : null}
        <h2 className="text-base font-semibold text-[var(--ops-text)]">{title}</h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
