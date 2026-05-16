"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"

import { DashboardChartCard } from "@/components/dashboard/dashboard-chart-card"
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state"
import { formatCurrencyPEN, formatNumber } from "@/components/dashboard/dashboard-formatters"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type {
  CommercialActivityCell,
  CommercialActivityMetric,
  CommercialActivityResponse,
} from "@/lib/dashboard-types"
import { appRoutes } from "@/lib/routes"
import { cn } from "@/lib/utils"

const METRIC_OPTIONS: Array<{ key: CommercialActivityMetric; label: string }> = [
  { key: "amount", label: "Monto (S/)" },
  { key: "sales", label: "Ventas" },
  { key: "avg_ticket", label: "Ticket prom." },
]

const HEATMAP_STEPS = [
  "color-mix(in srgb, var(--ripnel-accent-soft) 20%, white)",
  "color-mix(in srgb, var(--ripnel-accent) 24%, white)",
  "color-mix(in srgb, var(--ripnel-accent) 38%, white)",
  "color-mix(in srgb, var(--ripnel-accent) 52%, white)",
  "color-mix(in srgb, var(--ripnel-accent) 66%, white)",
  "color-mix(in srgb, var(--ripnel-accent) 82%, white)",
]

function getMetricValue(cell: CommercialActivityCell | null | undefined, metric: CommercialActivityMetric) {
  if (!cell) return 0
  if (metric === "sales") return Number(cell.sale_count || 0)
  if (metric === "avg_ticket") return Number(cell.avg_ticket || 0)
  return Number(cell.total_amount || 0)
}

function getModeDescription(mode: CommercialActivityResponse["context"]["group"]) {
  if (mode === "week") return "Ventas agrupadas por tienda y día"
  if (mode === "aggregate") return "Resumen comercial por tienda"
  return "Ventas por tienda y franja horaria"
}

function getCellAlpha(value: number, maxValue: number) {
  if (maxValue <= 0 || value <= 0) return 0
  const ratio = value / maxValue
  return Math.min(0.8, Math.max(0.12, ratio * 0.72 + 0.12))
}

function formatCellValue(metricValue: number, metric: CommercialActivityMetric) {
  if (metricValue <= 0) return "—"
  if (metric === "sales") return formatNumber(metricValue)
  if (metric === "avg_ticket") return formatCurrencyPEN(metricValue).replace("PEN", "").trim()
  return formatCurrencyPEN(metricValue).replace("PEN", "").trim()
}

export function CommercialActivityCard({
  data,
}: {
  data: CommercialActivityResponse | null
}) {
  const metricResetKey = `${data?.context.group || "today"}:${data?.context.date_from || ""}:${data?.context.date_to || ""}`
  const defaultMetric = data?.context.default_metric || "amount"
  const [metricState, setMetricState] = useState<{
    resetKey: string
    metric: CommercialActivityMetric
  }>({
    resetKey: metricResetKey,
    metric: defaultMetric,
  })
  const metric =
    metricState.resetKey === metricResetKey ? metricState.metric : defaultMetric

  const cellMap = useMemo(() => {
    const map = new Map<string, CommercialActivityCell>()
    for (const cell of data?.cells || []) {
      map.set(`${cell.location_id}:${cell.column_key}`, cell)
    }
    return map
  }, [data])

  const maxMetricValue = useMemo(() => {
    return Math.max(
      0,
      ...(data?.cells || []).map((cell) => getMetricValue(cell, metric))
    )
  }, [data, metric])

  const rows = data?.rows || []
  const columns = data?.columns || []
  const isEmpty = !data?.visible || rows.length === 0 || data.cells.length === 0
  const mode = data?.context.group || "today"

  const action = (
    <label className="flex items-center gap-2 text-[11px] font-medium text-[var(--ops-text-muted)]">
      <span>Métrica:</span>
      <div className="relative">
        <select
          value={metric}
          onChange={(event) =>
            setMetricState({
              resetKey: metricResetKey,
              metric: event.target.value as CommercialActivityMetric,
            })
          }
          className="h-9 appearance-none rounded-xl border border-[color:color-mix(in_srgb,var(--ops-border-soft)_82%,transparent)] bg-white pl-3 pr-8 text-[12px] font-semibold text-[var(--ops-text)] shadow-[0_1px_4px_rgb(15_23_42/0.04)] outline-none transition hover:border-[var(--ops-border-strong)] focus:border-[var(--ripnel-accent)]"
          aria-label="Métrica"
        >
          {METRIC_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ops-text-muted)]" />
      </div>
    </label>
  )

  return (
    <TooltipProvider delayDuration={100}>
      <DashboardChartCard
        title="Actividad comercial"
        subtitle={getModeDescription(mode)}
        action={action}
        height={mode === "aggregate" ? 356 : 372}
        headerClassName="px-4.5 py-3.5"
        contentClassName="px-4.5 py-4"
      >
        {!data?.visible ? (
          <DashboardEmptyState compact dashed={false} description="No hay visibilidad comercial para este perfil." />
        ) : isEmpty ? (
          <DashboardEmptyState
            compact
            dashed={false}
            description="Sin ventas registradas en este periodo."
            action={
              <Button asChild variant="outline" size="sm" className="rounded-lg">
                <Link href={appRoutes.purchaseSystem}>Registrar venta</Link>
              </Button>
            }
          />
        ) : mode === "aggregate" ? (
          <div className="space-y-3 overflow-auto">
            <div className="grid min-w-[520px] grid-cols-[minmax(180px,1.2fr)_0.9fr_0.75fr_0.9fr] gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
              <div>Tienda</div>
              <div className="text-right">Monto</div>
              <div className="text-right">Ventas</div>
              <div className="text-right">Ticket prom.</div>
            </div>
            {rows.map((row) => {
              const amountCell = cellMap.get(`${row.location_id}:amount`) || null
              const salesCell = cellMap.get(`${row.location_id}:sales`) || null
              const avgTicketCell = cellMap.get(`${row.location_id}:avg_ticket`) || null
              const metricCell =
                metric === "sales" ? salesCell : metric === "avg_ticket" ? avgTicketCell : amountCell
              const rowMetricValue = getMetricValue(metricCell, metric)
              const alpha = getCellAlpha(rowMetricValue, maxMetricValue)

              return (
                <div
                  key={row.location_id}
                  className="grid min-w-[520px] grid-cols-[minmax(180px,1.2fr)_0.9fr_0.75fr_0.9fr] items-center gap-2 rounded-[16px] border border-[color:color-mix(in_srgb,var(--ops-border-soft)_78%,transparent)] px-3 py-2.5"
                  style={{
                    background: `color-mix(in srgb, var(--ripnel-accent-soft) ${Math.round(alpha * 82)}%, var(--ops-surface))`,
                  }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ops-text)]">{row.name}</p>
                    <p className="truncate text-[10px] text-[var(--ops-text-muted)]">
                      {row.code || "Sin codigo"}{row.is_default ? " · Sede activa" : ""}
                    </p>
                  </div>
                  <div className="text-right text-sm font-semibold text-[var(--ops-text)]">
                    {formatCurrencyPEN(amountCell?.total_amount)}
                  </div>
                  <div className="text-right text-sm font-semibold text-[var(--ops-text)]">
                    {formatNumber(salesCell?.sale_count)}
                  </div>
                  <div className="text-right text-sm font-semibold text-[var(--ops-text)]">
                    {formatCurrencyPEN(avgTicketCell?.avg_ticket)}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="grid min-w-[760px] gap-1.5 overflow-auto"
              style={{ gridTemplateColumns: `minmax(170px, 190px) repeat(${columns.length}, minmax(74px, 1fr))` }}
            >
              <div />
              {columns.map((column) => (
                <div
                  key={column.key}
                  className="flex h-8 items-center justify-center px-2 text-center text-[10px] font-semibold tracking-[0.01em] text-[var(--ops-text-muted)]"
                >
                  {column.short_label}
                </div>
              ))}

              {rows.map((row) => (
                <div key={row.location_id} className="contents">
                  <div className="flex min-h-[48px] flex-col justify-center px-2 pr-4">
                    <p className="truncate text-[13px] font-semibold text-[var(--ops-text)]">{row.name}</p>
                  </div>

                  {columns.map((column) => {
                    const cell = cellMap.get(`${row.location_id}:${column.key}`) || null
                    const metricValue = getMetricValue(cell, metric)
                    const alpha = getCellAlpha(metricValue, maxMetricValue)

                    return (
                      <Tooltip key={`${row.location_id}-${column.key}`}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "flex min-h-[48px] items-center justify-center rounded-[8px] px-2 text-center text-[11px] font-semibold transition hover:brightness-[0.985]"
                            )}
                            style={{
                              background:
                                alpha <= 0
                                  ? "color-mix(in srgb, var(--ops-surface-muted) 42%, white)"
                                  : `color-mix(in srgb, var(--ripnel-accent) ${Math.round(alpha * 88)}%, white)`,
                              color: alpha > 0.52 ? "#ffffff" : "var(--ops-text)",
                            }}
                          >
                            {metricValue > 0 ? (
                              <span className="truncate">
                                {formatCellValue(metricValue, metric)}
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-[var(--ops-text-muted)]">—</span>
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          sideOffset={8}
                          className="max-w-[220px] rounded-xl bg-[var(--ops-text)] px-3 py-2.5 text-[11px] text-white shadow-[0_12px_24px_rgb(15_23_42/0.18)]"
                        >
                          <div className="space-y-1.5">
                            <p className="font-semibold leading-none">{row.name}</p>
                            <p className="text-white/70">{column.label}</p>
                            <div className="space-y-1 text-white/90">
                              <p>Ventas: {formatNumber(cell?.sale_count)}</p>
                              <p>Monto: {formatCurrencyPEN(cell?.total_amount)}</p>
                              <p>Ticket prom.: {formatCurrencyPEN(cell?.avg_ticket)}</p>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-3 text-[11px] text-[var(--ops-text-muted)]">
              <span>Menor actividad</span>
              <div className="flex items-center gap-1">
                {HEATMAP_STEPS.map((color) => (
                  <span
                    key={color}
                    className="h-2.5 w-6 rounded-[4px]"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span>Mayor actividad</span>
            </div>
          </div>
        )}
      </DashboardChartCard>
    </TooltipProvider>
  )
}
