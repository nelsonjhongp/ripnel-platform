"use client"

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts"
import { Card, CardContent } from "@/components/ui/card"

type Props = {
  data: Array<{ key: string; label: string; value: number }>
}

const FILL_MAP: Record<string, string> = {
  receipts: "color-mix(in srgb, var(--ripnel-accent) 72%, transparent)",
  inventory: "color-mix(in srgb, #f59e0b 72%, transparent)",
  transfers: "color-mix(in srgb, #3b82f6 72%, transparent)",
  postsales: "color-mix(in srgb, #10b981 72%, transparent)",
}

export default function DashboardPressureChart({ data }: Props) {
  const allZero = data.length === 0 || data.every((d) => d.value === 0)

  return (
    <Card
      size="sm"
      className="border-[var(--ops-border-strong)] bg-[var(--ops-surface)]"
    >
      <CardContent className="p-0">
        {allZero ? (
          <div className="flex items-center justify-center py-6 text-sm" style={{ color: "var(--ops-text-muted)" }}>
            Sin presion operativa critica.
          </div>
        ) : (
          <div style={{ minHeight: 80 }}>
            <ResponsiveContainer width="100%" height="80">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 4, right: 8, bottom: 4, left: 4 }}
              >
                <XAxis dataKey="value" type="number" hide />
                <YAxis
                  dataKey="label"
                  type="category"
                  tickLine
                  axisLine={false}
                  tick={{
                    fill: "var(--ops-text)",
                    fontSize: 12,
                  }}
                  width={100}
                />
                <Tooltip
                  formatter={(value: number) => [value, ""]}
                  labelFormatter={() => ""}
                  contentStyle={{
                    background: "var(--ops-surface)",
                    border: "1px solid var(--ops-border-strong)",
                    borderRadius: 6,
                    color: "var(--ops-text)",
                    fontSize: 12,
                    padding: "4px 8px",
                  }}
                  cursor={{ fill: "var(--ops-border-soft)" }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
                  {data.map((entry) => (
                    <Cell key={entry.key} fill={FILL_MAP[entry.key] ?? FILL_MAP.receipts} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
