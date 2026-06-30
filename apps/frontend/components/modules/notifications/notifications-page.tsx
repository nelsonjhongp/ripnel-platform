"use client"

import { useState, useMemo } from "react"
import {
  AlertTriangle, Bell, Info, Package, RefreshCw, SlidersHorizontal,
  Store, Truck, type LucideIcon,
} from "lucide-react"

import { OpsPageShell, OpsSectionDivider, OpsTableBlock, OpsFiltersRow } from "@/components/ui/ops-page-shell"
import { OpsDataTable, type OpsDataTableColumn } from "@/components/ui/ops-data-table"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { OpsInlineBadge } from "@/components/ui/ops-inline-badge"
import { OpsMetricInlineGroup, type OpsMetricInlineGroupItem } from "@/components/ui/ops-metric-inline-group"
import { OpsSectionHeader } from "@/components/ui/ops-section-header"
import { OpsSegmentedControl } from "@/components/ui/ops-segmented-control"
import { OpsSelect, type OpsOption } from "@/components/ui/ops-selection"
import { Button } from "@/components/ui/button"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { formatDateTime } from "@/lib/date-utils"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useApiGet } from "@/hooks/use-api-get"
import { NOTIF } from "./notifications-messages"

import type { TopbarNotificationsResponse, TopbarNotificationItem } from "@/components/notifications/NotificationsProvider"

type ModuleMeta = { label: string; Icon: LucideIcon; tone: "accent" | "warning" | "neutral" }

const MODULE_META: Record<string, ModuleMeta> = {
  cash: { label: NOTIF.modules.cash, Icon: Store, tone: "accent" },
  transfers: { label: NOTIF.modules.transfers, Icon: Truck, tone: "neutral" },
  inventory: { label: NOTIF.modules.inventory, Icon: Package, tone: "neutral" },
}

const SEVERITY_TONES: Record<string, "danger" | "warning" | "neutral"> = {
  danger: "danger",
  warning: "warning",
  default: "neutral",
}

const SEVERITY_LABELS: Record<string, string> = {
  danger: NOTIF.severity.danger,
  warning: NOTIF.severity.warning,
  default: NOTIF.severity.default,
}

const TABLE_COLUMNS: OpsDataTableColumn[] = [
  { key: "alerta", header: NOTIF.table.columns.alert },
  { key: "modulo", header: NOTIF.table.columns.module },
  { key: "severidad", header: NOTIF.table.columns.severity },
  { key: "fecha", header: NOTIF.table.columns.date },
]

const SEVERITY_SEGMENT_OPTIONS = [
  { value: "all" as const, label: NOTIF.filters.allSeverity },
  { value: "danger" as const, label: NOTIF.filters.critical },
  { value: "warning" as const, label: NOTIF.filters.attention },
]

export function NotificationsPage() {
  const [filterModule, setFilterModule] = useState("all")
  const [filterSeverity, setFilterSeverity] = useState<"all" | "danger" | "warning">("all")

  const { data, loading, error, refetch } = useApiGet<TopbarNotificationsResponse>(
    () => apiFetch<TopbarNotificationsResponse>("/api/notifications?limit=50", { cache: "no-store" }),
    []
  )

  const items: TopbarNotificationItem[] = useMemo(
    () => (Array.isArray(data?.items) ? data.items : []),
    [data]
  )
  const summary = data?.summary

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filterModule !== "all" && item.module !== filterModule) return false
      if (filterSeverity !== "all" && item.severity !== filterSeverity) return false
      return true
    })
  }, [items, filterModule, filterSeverity])

  const moduleFilterOptions: OpsOption[] = useMemo(() => {
    const seen = new Set<string>()
    const options: OpsOption[] = [{ value: "all", label: NOTIF.filters.all }]

    for (const item of items) {
      if (seen.has(item.module)) continue
      seen.add(item.module)
      const meta = MODULE_META[item.module]
      options.push({
        value: item.module,
        label: meta?.label ?? item.module,
        tone: meta?.tone ?? "neutral",
      })
    }

    return options
  }, [items])

  const metricItems: OpsMetricInlineGroupItem[] = useMemo(() => {
    if (!summary) return []
    const metrics: OpsMetricInlineGroupItem[] = [
      {
        key: "total",
        label: NOTIF.metrics.total,
        value: summary.total,
        icon: <Bell className="h-3.5 w-3.5" />,
        tone: "accent",
      },
    ]

    if (summary.danger_count > 0) {
      metrics.push({
        key: "danger",
        label: NOTIF.metrics.critical,
        value: summary.danger_count,
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        tone: "warning",
      })
    }

    if (summary.warning_count > 0) {
      metrics.push({
        key: "warning",
        label: NOTIF.metrics.attention,
        value: summary.warning_count,
        icon: <Info className="h-3.5 w-3.5" />,
        tone: "default",
      })
    }

    return metrics
  }, [summary])

  const showContent = !loading && !error && items.length > 0
  const showEmpty = !loading && !error && items.length === 0

  return (
    <OpsPageShell width="wide">
      <PosHeader
        eyebrow="Centro de alertas"
        title="Alertas operativas"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={loading}
            className="rounded-lg px-3"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            {NOTIF.header.refresh}
          </Button>
        }
      />

      {showContent || metricItems.length > 0 ? (
        <OpsMetricInlineGroup items={metricItems} />
      ) : null}

      {showContent ? (
        <OpsSectionDivider>
          <OpsSectionHeader
            icon={<SlidersHorizontal className="h-4 w-4" />}
            title={NOTIF.filters.title}
          />
          <div className="mt-3">
            <OpsTableBlock>
              <OpsFiltersRow>
                <OpsSegmentedControl
                  options={SEVERITY_SEGMENT_OPTIONS}
                  value={filterSeverity}
                  onChange={setFilterSeverity}
                  tone="accent"
                  size="compact"
                  variant="switch"
                />
                <OpsSelect
                  label={NOTIF.filters.module}
                  value={filterModule}
                  options={moduleFilterOptions}
                  onChange={setFilterModule}
                />
              </OpsFiltersRow>
            </OpsTableBlock>
          </div>
        </OpsSectionDivider>
      ) : null}

      <OpsTableBlock>
        <OpsDataTable
          columns={TABLE_COLUMNS}
          loading={loading}
          error={error}
          isEmpty={showEmpty}
          emptyMessage={NOTIF.table.empty}
        >
          {filtered.map((item) => {
            const meta = MODULE_META[item.module]
            const Icon = meta?.Icon ?? Package
            const tone = SEVERITY_TONES[item.severity] ?? "neutral"
            const severityLabel = SEVERITY_LABELS[item.severity] ?? item.severity

            return (
              <tr
                key={item.id}
                className="text-sm text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="h-4 w-4 shrink-0 text-[var(--ops-text-muted)]" />
                    <div className="min-w-0">
                      <p className="font-medium line-clamp-1">{item.title}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--ops-text-muted)] line-clamp-1">{item.action_label}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <OpsInlineBadge
                    label={meta?.label ?? item.module}
                    tone={meta?.tone ?? "neutral"}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <OpsStatusBadge tone={tone} size="xs">{severityLabel}</OpsStatusBadge>
                </td>
                <td className="px-4 py-2.5 text-[var(--ops-text-muted)] whitespace-nowrap">{formatDateTime(item.created_at)}</td>
              </tr>
            )
          })}
        </OpsDataTable>
      </OpsTableBlock>
    </OpsPageShell>
  )
}

export default NotificationsPage
