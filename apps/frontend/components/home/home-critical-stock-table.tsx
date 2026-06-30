"use client"

import { PackageCheck } from "lucide-react"

import { OpsActionLink } from "@/components/ui/ops-action-link"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { HOME } from "@/components/modules/home/home-messages"

export interface CriticalStockRow {
  variant_id: string
  style_name: string
  size_code: string
  color_code: string
  qty: number
}

export interface HomeCriticalStockTableProps {
  items: CriticalStockRow[]
  emptyMessage?: string
  lowStockThreshold?: number
}

const DEFAULT_LOW_STOCK_THRESHOLD = 5

export function HomeCriticalStockTable({
  items,
  emptyMessage,
  lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD,
}: HomeCriticalStockTableProps) {
  if (items.length === 0) {
    return (
      <div className="overflow-x-auto">
        <div className="rounded-xl border border-dashed border-[var(--ops-border-soft)] px-4 py-5">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-[var(--ops-text-muted)]" />
            <p className="text-sm font-semibold text-[var(--ops-text)]">
              {HOME.inventory.noNovelties}
            </p>
          </div>
          <p className="mt-1 text-[13px] text-[var(--ops-text-muted)]">
            {emptyMessage ?? HOME.inventory.noCritical}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[var(--ops-surface-muted)]">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
              {HOME.inventory.productCol}
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
              {HOME.inventory.variantCol}
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
              {HOME.inventory.stockCol}
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
              {HOME.inventory.actionCol}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.variant_id}
              className="border-y border-[var(--ops-border-strong)] transition hover:bg-[var(--ops-surface-muted)]"
            >
              <td className="px-4 py-2.5 text-sm font-semibold leading-5 text-[var(--ops-text)]">
                {item.style_name}
              </td>
              <td className="px-4 py-2.5 text-[13px] leading-5 text-[var(--ops-text-muted)]">
                {item.size_code} / {item.color_code}
              </td>
              <td className="px-4 py-2.5">
                <OpsStatusBadge
                  tone={
                    item.qty === 0
                      ? "danger"
                      : item.qty <= lowStockThreshold
                        ? "warning"
                        : "neutral"
                  }
                  size="xs"
                >
                  {item.qty}
                </OpsStatusBadge>
              </td>
              <td className="px-4 py-2.5">
                <OpsActionLink
                  href={`/inventario?focus_variant_id=${encodeURIComponent(item.variant_id)}`}
                  tone="warning"
                  size="sm"
                >
                  {HOME.inventory.replenish}
                </OpsActionLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
