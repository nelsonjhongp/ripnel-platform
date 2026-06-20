import type { ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

export function OpsHint({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-[var(--ops-border-soft)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] px-4 py-4 text-center text-sm text-[var(--ops-text-muted)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
