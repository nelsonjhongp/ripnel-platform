"use client"

import { Check, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function SalesWizardRail({
  items = [],
  currentStep = 0,
  onSelect,
  onPrevious,
  onNext,
  canGoPrevious = false,
  canGoNext = false,
  canAdvance = false,
  nextLabel = "Siguiente",
  className,
}) {
  void currentStep

  return (
    <section className={cn("sales-wizard-shell", className)}>
      <div className="sales-wizard-rail-wrap">
        <div className="sales-wizard-rail-scroll">
          <ol className="sales-wizard-rail" aria-label="Progreso de venta">
            {items.map((item, index) => {
              const Icon = item.icon
              const state = item.active ? "active" : item.complete ? "complete" : "pending"

              return (
                <li key={item.id} className="sales-wizard-item">
                  <button
                    type="button"
                    onClick={() => onSelect?.(item.id)}
                    className="sales-wizard-step"
                    data-state={state}
                    aria-current={item.active ? "step" : undefined}
                  >
                    <span className="sales-wizard-node" data-state={state}>
                      {item.complete ? (
                        <Check className="h-4 w-4" />
                      ) : Icon ? (
                        <Icon className="h-4 w-4" />
                      ) : null}
                    </span>
                    <span className="sales-wizard-copy">
                      <span className="sales-wizard-label">{item.label}</span>
                      <span className="sales-wizard-meta">
                        {item.active
                          ? "Actual"
                          : item.complete
                            ? "Listo"
                            : `Paso ${index + 1}`}
                      </span>
                    </span>
                  </button>
                  {index < items.length - 1 ? (
                    <span
                      className="sales-wizard-connector"
                      data-complete={item.complete ? "true" : "false"}
                      aria-hidden="true"
                    />
                  ) : null}
                </li>
              )
            })}
          </ol>
        </div>
      </div>

      <div className="sales-wizard-nav">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="sales-wizard-nav-button rounded-full"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>

        <div className="sales-wizard-nav-end">
          {canGoNext ? (
            <Button
              type="button"
              variant="accent"
              size="sm"
              onClick={onNext}
              disabled={!canAdvance}
              className="sales-wizard-nav-button rounded-full"
            >
              {nextLabel}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <span className="sales-chip sales-chip-success rounded-full px-3 py-1 text-xs font-semibold">
              Etapa final
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

export default SalesWizardRail
