import Link from "next/link"

import { Inbox } from "lucide-react"

import { OpsMetricInlineGroup } from "@/components/ui/ops-metric-inline-group"
import { HOME } from "@/components/modules/home/home-messages"
import type { HomeOverview } from "./home-types"

function flowLabel(flow: string) {
  if (flow === "receipt") return HOME.transfer.byReceive
  if (flow === "approve") return HOME.transfer.byApprove
  if (flow === "dispatch") return HOME.transfer.byDispatch
  return HOME.transfer.request
}

function flowTone(flow: string) {
  if (flow === "receipt") return "sales-chip sales-chip-warning"
  if (flow === "approve") return "sales-chip sales-chip-accent"
  if (flow === "dispatch") return "sales-chip"
  return "sales-chip sales-chip-accent"
}

export function HomeTransferRequests({
  section,
  formatDateTime,
}: {
  section: NonNullable<HomeOverview["sections"]["transfer_requests"]>
  formatDateTime: (value: string | null | undefined) => string
}) {
  const hasItems = section.latest.length > 0
  const allZero =
    section.counts.open_for_store_count === 0 &&
    section.counts.pending_approval_count === 0 &&
    section.counts.pending_dispatch_count === 0 &&
    section.counts.pending_receipts_count === 0

  return (
    <div>
      <OpsMetricInlineGroup
        items={[
          {
            label: HOME.transfer.openLabel,
            value: section.counts.open_for_store_count,
            tone: "accent",
          },
          {
            label: HOME.transfer.byApprove,
            value: section.counts.pending_approval_count,
            tone: section.counts.pending_approval_count === 0 ? "default" : "accent",
          },
          {
            label: HOME.transfer.byDispatch,
            value: section.counts.pending_dispatch_count,
            tone: "warning",
          },
          {
            label: HOME.transfer.byReceive,
            value: section.counts.pending_receipts_count,
            tone: section.counts.pending_receipts_count === 0 ? "default" : "accent",
          },
        ]}
      />

      {hasItems ? (
        <div className="mt-3 space-y-1">
          {section.latest.map((item) => (
            <Link
              key={item.transfer_id}
              href={item.href}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ops-border-soft)] px-3 py-2 transition hover:bg-[var(--ops-surface-muted)]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`${flowTone(item.flow)} rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0`}
                >
                  {flowLabel(item.flow)}
                </span>
                <span className="text-[13px] text-[var(--ops-text)] truncate">
                  {item.from_location_name} ({item.from_location_code}) →{" "}
                  {item.to_location_name} ({item.to_location_code})
                </span>
              </div>
              <span className="text-[12px] text-[var(--ops-text-muted)] shrink-0">
                {formatDateTime(item.happened_at)}
              </span>
            </Link>
          ))}
        </div>
      ) : allZero ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-[var(--ops-border-soft)] px-3 py-3">
          <Inbox className="h-4 w-4 text-[var(--ops-text-muted)] shrink-0" />
          <p className="text-[13px] text-[var(--ops-text-muted)]">
            {HOME.transfer.noTransfers}
          </p>
        </div>
      ) : null}
    </div>
  )
}
