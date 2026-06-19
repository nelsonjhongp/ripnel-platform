import { Fragment, memo, type ReactNode } from "react"

import { OpsMetricInline, type OpsMetricInlineTone } from "@/components/ui/ops-metric-inline"
import { cn } from "@/lib/utils"

export type OpsMetricInlineGroupItem = {
  key?: string
  icon?: ReactNode
  label: string
  value: string | number
  tone?: OpsMetricInlineTone
}

export const OpsMetricInlineGroup = memo(function OpsMetricInlineGroup({
  items,
  className,
}: {
  items: OpsMetricInlineGroupItem[]
  className?: string
}) {
  if (items.length === 0) return null

  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1", className)}>
      {items.map((item, index) => (
        <Fragment key={item.key ?? `${item.label}-${index}`}>
          {index > 0 ? (
            <span className="h-4 w-px shrink-0 bg-[var(--ops-border-strong)]" />
          ) : null}
          <OpsMetricInline
            icon={item.icon}
            label={item.label}
            value={item.value}
            tone={item.tone}
          />
        </Fragment>
      ))}
    </div>
  )
})
