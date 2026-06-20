import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function OpsStepSectionHeading({
  step,
  title,
  meta,
  className,
}: {
  step: number
  title: string
  meta?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ripnel-accent)] text-xs font-semibold text-white">
          {step}
        </span>
        <h2 className="text-lg font-semibold text-[var(--ops-text)]">{title}</h2>
      </div>
      {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
    </div>
  )
}
