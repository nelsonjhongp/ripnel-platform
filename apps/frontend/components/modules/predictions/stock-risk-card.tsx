"use client"

import { AlertTriangle, PackageSearch } from "lucide-react"
import { OpsEmptyState } from "@/components/ui/ops-empty-state"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { useApiGet } from "@/hooks/use-api-get"
import { apiFetchData } from "@/lib/api"

type StockRiskItem = {
  variant_id: string
  sku: string
  style_name: string
  style_code: string
  size_code: string
  color_code: string
  current_stock: number
  daily_consumption: number
  days_remaining: number | null
  risk_level: "out_of_stock" | "at_risk" | "healthy"
}

type StockRiskResponse = {
  rows: StockRiskItem[]
  meta: {
    lookback_days: number
    threshold_days: number
    location_count: number
    available_locations: { location_id: string; name: string; code: string }[]
    selected_location_id: string | null
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-PE").format(value)
}

function riskBadgeTone(riskLevel: StockRiskItem["risk_level"]): "danger" | "warning" | "success" {
  if (riskLevel === "out_of_stock") return "danger"
  if (riskLevel === "at_risk") return "warning"
  return "success"
}

function riskBadgeLabel(riskLevel: StockRiskItem["risk_level"]): string {
  if (riskLevel === "out_of_stock") return "Sin stock"
  if (riskLevel === "at_risk") return "En riesgo"
  return "Saludable"
}

export default function StockRiskCard({
  locationId,
  lookbackDays = 30,
  thresholdDays = 30,
}: {
  locationId?: string
  lookbackDays?: number
  thresholdDays?: number
}) {
  const params = new URLSearchParams()
  if (locationId) params.set("location_id", locationId)
  params.set("lookback_days", String(lookbackDays))
  params.set("threshold_days", String(thresholdDays))
  const qs = params.toString()

  const { data, loading } = useApiGet<StockRiskResponse>(
    () => apiFetchData<StockRiskResponse>(`/api/predictions/stock-risk${qs ? `?${qs}` : ""}`),
    [locationId, lookbackDays, thresholdDays]
  )

  const items = data?.rows ?? []

  return (
    <section className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
      <div className="flex items-center gap-2 border-b border-[var(--ops-border-soft)] px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-[var(--ripnel-accent)]" />
        <h3 className="text-sm font-semibold text-[var(--ops-text)]">Predicción de stock</h3>
        {!loading && items.length > 0 ? (
          <span className="ml-auto text-[11px] text-[var(--ops-text-muted)]">
            {formatNumber(items.length)} variantes en riesgo
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-2 px-4 py-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-[var(--ops-surface-muted)]" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="divide-y divide-[var(--ops-border-soft)]">
          {items.map((item) => (
            <div key={item.variant_id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-[var(--ops-text)]">
                    {item.style_name}
                  </p>
                  <OpsStatusBadge tone={riskBadgeTone(item.risk_level)} size="xs">
                    {riskBadgeLabel(item.risk_level)}
                  </OpsStatusBadge>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-[var(--ops-text-muted)]">
                  {item.sku} · {item.size_code}/{item.color_code}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-[var(--ops-text)]">
                  {formatNumber(item.current_stock)} und
                </p>
                <p className="text-[11px] text-[var(--ops-text-muted)]">
                  {item.days_remaining != null
                    ? `${formatNumber(item.days_remaining)} días rest.`
                    : "Sin stock"}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-4">
          <OpsEmptyState
            variant="compact"
            description="No se detectaron variantes en riesgo de desabastecimiento."
          />
        </div>
      )}
    </section>
  )
}
