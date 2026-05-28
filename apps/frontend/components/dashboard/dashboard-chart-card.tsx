import type { ReactNode } from "react"

import { OpsSectionHeader } from "@/components/ui/ops-section-header"
import { cn } from "@/lib/utils"

export function DashboardChartCard({
  title,
  subtitle,
  icon,
  action,
  children,
  height = 280,
  cardClassName,
  headerClassName,
  contentClassName,
  separatedHeader = true,
}: {
  title: string
  subtitle?: string
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
  height?: number | string
  cardClassName?: string
  headerClassName?: string
  contentClassName?: string
  separatedHeader?: boolean
}) {
  return (
    <section className={cn("space-y-3", cardClassName)}>
      <OpsSectionHeader icon={icon} title={title} action={action} className={headerClassName} />
      <div
        className={cn(
          "rounded-xl border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_20%,var(--ops-surface))] p-3.5",
          contentClassName
        )}
      >
        <div style={{ height: typeof height === "number" ? `${height}px` : height }}>{children}</div>
      </div>
      {subtitle ? <p className="hidden">{subtitle}</p> : null}
      {separatedHeader ? null : null}
    </section>
  )
}
