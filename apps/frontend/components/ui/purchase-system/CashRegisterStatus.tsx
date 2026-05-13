"use client"

import type { MouseEventHandler } from "react"

import { ReceiptText } from "lucide-react"

import { cn } from "@/lib/utils"

type CashRegisterStatusProps = {
  totalItems?: number
  subtotal?: number
  totalLabel?: string
  summaryLabel?: string
  onClear?: MouseEventHandler<HTMLButtonElement>
  className?: string
}

export function CashRegisterStatus({
  totalItems = 0,
  subtotal = 0,
  totalLabel = "Items",
  summaryLabel = "Subtotal",
  onClear,
  className,
}: CashRegisterStatusProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <ReceiptText className="h-4 w-4 text-[var(--ripnel-accent)]" />
        <h2 className="text-base font-semibold text-[var(--ops-text)]">Estado de venta</h2>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sales-panel-muted rounded-lg p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
            {totalLabel}
          </p>
          <p className="mt-1 text-2xl font-semibold text-[var(--ops-text)]">{totalItems}</p>
        </div>

        <div className="rounded-lg border border-[color:color-mix(in_srgb,var(--ripnel-accent)_24%,var(--ops-border-strong))] bg-[var(--ripnel-accent-soft)] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
            {summaryLabel}
          </p>
          <p className="mt-1 text-2xl font-semibold text-[var(--ops-text)]">S/. {subtotal.toFixed(2)}</p>
        </div>
      </div>

      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-3 w-full rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-4 py-2 text-sm font-semibold text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
        >
          Limpiar venta
        </button>
      ) : null}
    </section>
  )
}

export default CashRegisterStatus
