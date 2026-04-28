"use client"

import { Check, ChevronLeft, ChevronRight } from "lucide-react"

import { Stepper } from "@/components/ui/stepper"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const DEFAULT_STEPS = [
  { id: "customer", label: "Cliente" },
  { id: "products", label: "Productos" },
  { id: "payment", label: "Cobro" },
]

export function PosHeader({
  eyebrow = "Operacion comercial",
  title = "Nueva venta",
  subtitle,
  meta,
  actions,
  steps,
  currentStep,
  progress,
  className,
}) {
  const showStepper = Array.isArray(steps) && typeof currentStep === "number"
  const progressItems = Array.isArray(progress?.items) ? progress.items : []
  const showProgress = progressItems.length > 0

  return (
    <section className={cn("sales-panel rounded-lg px-5 py-5 shadow-sm md:px-6", className)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ripnel-accent-hover)]">
            {eyebrow}
          </p>
          <h1 className="text-2xl leading-8 font-semibold tracking-[-0.025em] text-[var(--ops-text)] md:text-[1.75rem]">
            {title}
          </h1>
          {subtitle ? (
            <p className="max-w-3xl text-sm leading-5 text-[var(--ops-text-muted)]">{subtitle}</p>
          ) : null}
        </div>

        {meta || actions ? (
          <div className="flex flex-col gap-3 xl:min-w-[280px] xl:items-end">
            {meta ? <div className="flex flex-wrap gap-2 xl:justify-end">{meta}</div> : null}
            {actions ? <div className="flex flex-wrap gap-2 xl:justify-end">{actions}</div> : null}
          </div>
        ) : null}
      </div>

      {showStepper ? (
        <div className="mt-4">
          <Stepper
            steps={steps?.length ? steps : DEFAULT_STEPS}
            currentStep={currentStep}
          />
        </div>
      ) : null}

      {showProgress ? (
        <div className="ops-progress-rail mt-4 flex flex-col gap-3 pt-3">
          <div className="flex flex-wrap gap-2">
            {progressItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  data-active={item.active ? "true" : "false"}
                  onClick={() => progress?.onSelect?.(item.id)}
                  className="ops-progress-button inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_86%,var(--ops-surface))]">
                    {item.complete ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : Icon ? (
                      <Icon className="h-3.5 w-3.5" />
                    ) : null}
                  </span>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>

          {(progress?.onPrevious || progress?.onNext) ? (
            <div className="flex items-center justify-end gap-2 md:hidden">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={progress?.onPrevious}
                disabled={!progress?.canGoPrevious}
                className="rounded-full"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={progress?.onNext}
                disabled={!progress?.canGoNext}
                className="rounded-full"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export default PosHeader
