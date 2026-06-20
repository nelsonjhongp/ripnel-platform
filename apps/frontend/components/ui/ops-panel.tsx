import type { ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

export function OpsPanel({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "sales-panel rounded-lg p-5 shadow-xs md:p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function OpsPanelMuted({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "sales-panel-muted rounded-lg px-4 py-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
