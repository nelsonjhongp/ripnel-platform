"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type OpsInfoCardProps = {
  title: string
  icon: LucideIcon
  children: React.ReactNode
  className?: string
}

export function OpsInfoCard({
  title,
  icon: Icon,
  children,
  className,
}: OpsInfoCardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--ops-text-muted)]" />
        <h2 className="text-sm font-semibold text-[var(--ops-text)]">{title}</h2>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}
