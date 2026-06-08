"use client"

import type { ReactNode } from "react"
import { PackageSearch, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type OpsEmptyStateProps = {
  icon?: LucideIcon
  title?: string
  description: string
  className?: string
  variant?: "default" | "dashed" | "compact"
  action?: ReactNode
}

export function OpsEmptyState({
  icon: Icon = PackageSearch,
  title,
  description,
  className,
  variant = "default",
  action,
}: OpsEmptyStateProps) {
  if (variant === "compact") {
    return (
      <div className={cn("px-4 py-10 text-center text-sm text-[var(--ops-text-muted)]", className)}>
        {description}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-5 py-10 text-center",
        variant === "dashed" &&
          "rounded-xl border-2 border-dashed border-[var(--ops-border-strong)]",
        className
      )}
    >
      <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]">
        <Icon className="h-5 w-5" />
      </div>
      {title ? (
        <h3 className="text-sm font-semibold text-[var(--ops-text)]">{title}</h3>
      ) : null}
      <p className="mt-1 max-w-sm text-sm leading-5 text-[var(--ops-text-muted)]">
        {description}
      </p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}
