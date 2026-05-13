"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import { Card, CardContent } from "@/components/ui/card"

type Props = {
  data: Array<{ key: string; label: string; amount: number }>
}

export function DashboardPaymentChart({ data }: Props) {
  const isEmpty = data.length === 0 || data.every((d) => d.amount === 0)

  const containerHeight = isEmpty
    ? 80
    : Math.min(200, Math.max(80, data.length * 40))

  return (
    <Card
      style={{
        "--chart-bg": "var(--card)",
      } as React.CSSProperties}
    >
      <CardContent className="p-0">
        {isEmpty ? (
          <div
            className="flex items-center justify-center text-sm"
            style={{ color: "var(--ops-text-muted)", height: containerHeight }}
          >
            Sin movimientos de cobro registrados hoy.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={containerHeight}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
            >
              <XAxis dataKey="amount" type="number" hide />
              <YAxis
                dataKey="label"
                type="category"
                tickLine
                axisLine={false}
                tick={{
                  fill: "var(--ops-text)",
                  fontSize: 12,
                }}
              />
              <Tooltip
                cursor={{ fill: "var(--ops-border-strong)", opacity: 0.25 }}
                formatter={(value: number) => [`S/. ${value.toFixed(2)}`, ""]}
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--ops-border-strong)",
                  color: "var(--ops-text)",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--ops-text-muted)" }}
              />
              <Bar
                dataKey="amount"
                fill="var(--ripnel-accent)"
                radius={[0, 4, 4, 0]}
                barSize={14}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
