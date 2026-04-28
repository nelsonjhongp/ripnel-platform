"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

type StepItem = {
  id: string
  label: string
}

type StepperProps = {
  steps: StepItem[]
  currentStep: number
  className?: string
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  if (!steps.length) return null

  return (
    <div
      className={cn(
        "sales-panel-muted w-full rounded-lg px-3 py-3 shadow-none md:px-4",
        className
      )}
    >
      <div className="flex items-start">
        {steps.map((step, index) => {
          const isDone = index < currentStep
          const isCurrent = index === currentStep

          return (
            <div key={step.id} className="contents">
              <div className="flex min-w-0 flex-col items-center text-center">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                    isDone &&
                      "border-[var(--ripnel-accent)] bg-[var(--ripnel-accent)] text-white",
                    isCurrent &&
                      "border-[var(--ripnel-accent)] bg-[var(--ops-surface)] text-[var(--ripnel-accent-hover)]",
                    !isDone &&
                      !isCurrent &&
                      "border-[var(--ops-border-soft)] bg-[var(--ops-surface)] text-[var(--ops-text-muted)]"
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : <span>{index + 1}</span>}
                </div>
                <p
                  className={cn(
                    "mt-2 text-xs leading-tight",
                    isDone || isCurrent
                      ? "text-[var(--ops-text)]"
                      : "text-[var(--ops-text-muted)]"
                  )}
                >
                  {step.label}
                </p>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-3 mt-3 h-px flex-1",
                    index < currentStep
                      ? "bg-[var(--ripnel-accent)]"
                      : "bg-[var(--ops-border-soft)]"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
