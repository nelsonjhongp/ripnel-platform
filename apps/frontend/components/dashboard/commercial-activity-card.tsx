"use client"

import { useMemo } from "react"
import Link from "next/link"
import { BarChart3 } from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"

import { DashboardChartCard } from "@/components/dashboard/dashboard-chart-card"
import { OpsEmptyState } from "@/components/ui/ops-empty-state"
import { formatCurrencyPEN, formatNumber } from "@/components/dashboard/dashboard-formatters"
import type {
  CommercialActivityCell,
  CommercialActivityResponse,
} from "@/lib/dashboard-types"
import { appRoutes } from "@/lib/routes"
const EMPTY_ROWS: CommercialActivityResponse["rows"] = []
const EMPTY_COLUMNS: CommercialActivityResponse["columns"] = []

const chartTooltipStyle = {
  background: "var(--ops-surface)",
  border: "1px solid var(--ops-border-strong)",
  borderRadius: 14,
  boxShadow: "0 12px 28px rgb(15 23 42 / 0.12)",
  fontSize: 12,
  color: "var(--ops-text)",
}

function getAmountValue(cell: CommercialActivityCell | null | undefined) {
  if (!cell) return 0
  return Number(cell.total_amount || 0)
}

function formatTickValue(value: number) {
  if (value <= 0) return "0"
  return formatCurrencyPEN(value).replace("PEN", "").trim()
}

export function CommercialActivityCard({
  data,
}: {
  data: CommercialActivityResponse | null
}) {
  const rows = data?.rows ?? EMPTY_ROWS
  const columns = data?.columns ?? EMPTY_COLUMNS
  const isEmpty = !data?.visible || rows.length === 0 || (data?.cells?.length || 0) === 0

  const cellMap = useMemo(() => {
    const map = new Map<string, CommercialActivityCell>()
    for (const cell of data?.cells || []) {
      map.set(`${cell.location_id}:${cell.column_key}`, cell)
    }
    return map
  }, [data])

  const chartData = useMemo(() => {
    return columns.map((column) => {
      const point: Record<string, string | number> = {
        label: column.short_label,
        fullLabel: column.label,
        columnKey: column.key,
      }

      const row = rows[0] || null
      const cell = row ? cellMap.get(`${row.location_id}:${column.key}`) || null : null
      point.totalAmount = getAmountValue(cell)
      point.saleCount = Number(cell?.sale_count || 0)
      point.avgTicket = Number(cell?.avg_ticket || 0)

      return point
    })
  }, [cellMap, columns, rows])

  return (
    <DashboardChartCard
      title="Actividad comercial"
      icon={<BarChart3 className="h-4 w-4" />}
      height={356}
      contentClassName="p-3"
    >
      {!data?.visible ? (
        <OpsEmptyState variant="compact" description="No hay visibilidad comercial para este perfil." />
      ) : isEmpty ? (
        <OpsEmptyState
          variant="compact"
          description="Sin ventas registradas en este periodo."
          action={
            <Link
              href={appRoutes.purchaseSystem}
              className="inline-flex h-8 items-center rounded-full border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface)_84%,var(--ops-surface-muted))] px-4 text-[13px] font-medium text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
            >
              Registrar venta
            </Link>
          }
        />
      ) : (
        <div className="min-h-0 h-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 10, left: 6, bottom: 4 }}>
              <CartesianGrid stroke="var(--ops-border-soft)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--ops-text-muted)" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--ops-text-muted)" }}
                tickLine={false}
                axisLine={false}
                width={54}
                tickFormatter={(value) => formatTickValue(Number(value))}
              />
              <RechartsTooltip
                contentStyle={chartTooltipStyle}
                labelFormatter={(_, payload) => {
                  const point = payload?.[0]?.payload as { fullLabel?: string } | undefined
                  return point?.fullLabel || ""
                }}
                formatter={(_, __, item) => {
                  const point = item.payload as Record<string, string | number>
                  const amount = Number(point.totalAmount || 0)
                  const sales = Number(point.saleCount || 0)

                  return [
                    <div key={String(point.columnKey || "point")} className="space-y-1">
                      <p className="font-semibold text-[var(--ops-text)]">{formatCurrencyPEN(amount)}</p>
                      <div className="space-y-0.5 text-[11px] text-[var(--ops-text-muted)]">
                        <p>{formatNumber(sales)} ventas</p>
                      </div>
                    </div>,
                    "Ventas generales",
                  ]
                }}
              />
              <Line
                type="monotone"
                dataKey="totalAmount"
                name="totalAmount"
                stroke="var(--ripnel-accent)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: "var(--ripnel-accent)" }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </DashboardChartCard>
  )
}
