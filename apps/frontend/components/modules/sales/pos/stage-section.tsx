import type { ReactNode, RefObject } from "react"
import { cn } from "@/lib/utils"

type StageSectionProps = {
  sectionRef?: RefObject<HTMLElement | null>
  stage: "products" | "customer" | "payment" | "summary"
  pulseStage?: "products" | "customer" | "payment" | "summary" | null
  pickerOpen?: boolean
  hasError?: boolean
  isEmpty?: boolean
  className?: string
  children: ReactNode
}

export function StageSection({
  sectionRef,
  stage,
  pulseStage,
  pickerOpen = false,
  hasError = false,
  isEmpty = false,
  className,
  children,
}: StageSectionProps) {
  return (
    <section
      ref={sectionRef}
      tabIndex={-1}
      className={cn(
        "relative space-y-3 rounded-xl bg-[var(--ops-surface)] p-4 shadow-sm transition-all duration-200 sm:p-5",
        isEmpty
          ? "border border-dashed border-[var(--ops-border-soft)]"
          : "border border-[var(--ops-border-strong)]",
        hasError && !isEmpty && "border-[var(--ops-tone-warning-border)]",
        pickerOpen ? "z-30" : "z-0",
        pulseStage === stage && "animate-focus-flash",
        className,
      )}
    >
      {children}
    </section>
  )
}
