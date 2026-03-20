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
    <div className={cn("w-full rounded-md bg-slate-50 p-4 shadow-sm", className)}>
      <div className="flex items-start">
        {steps.map((step, index) => {
          const isDone = index < currentStep
          const isCurrent = index === currentStep

          return (
            <div key={step.id} className="contents">
              <div className="flex min-w-0 flex-col items-center text-center">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                    isDone && "border-slate-900 bg-slate-900 text-white",
                    isCurrent && "border-slate-900 bg-white text-slate-900",
                    !isDone && !isCurrent && "border-slate-300 bg-white text-slate-400"
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : <span>{index + 1}</span>}
                </div>
                <p
                  className={cn(
                    "mt-2 text-xs leading-tight",
                    isDone || isCurrent ? "text-slate-700" : "text-slate-400"
                  )}
                >
                  {step.label}
                </p>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-3 mt-3 h-px flex-1",
                    index < currentStep ? "bg-slate-900" : "bg-slate-300"
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
