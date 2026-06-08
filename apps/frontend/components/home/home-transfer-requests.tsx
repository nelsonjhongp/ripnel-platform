import Link from "next/link"

import { ArrowUpRight, Package2 } from "lucide-react"

import { OpsEmptyState } from "@/components/ui/ops-empty-state"
import type { HomeOverview } from "./home-types"

function flowLabel(flow: string) {
  if (flow === "receipt") return "Por recibir"
  if (flow === "approve") return "Por aprobar"
  if (flow === "dispatch") return "Por despachar"
  return "Solicitud"
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
  infoTooltip,
}: {
  section: NonNullable<HomeOverview["sections"]["transfer_requests"]>
  formatDateTime: (value: string | null | undefined) => string
  infoTooltip?: string
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ripnel-accent-hover)]">
            Transferencias
          </p>
          <h2 className="mt-1 text-base font-semibold text-[var(--ops-text)] md:text-lg">Solicitudes entre tiendas</h2>
        </div>

        {section.primary_action ? (
          <Link
            href={section.primary_action.href}
            className="sales-field sales-field-interactive inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium"
          >
            {section.primary_action.label}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
    <HomeSectionCard
      eyebrow="Transferencias"
      title="Solicitudes entre tiendas"
      action={section.primary_action}
      infoTooltip={infoTooltip}
    >
      <div className="grid gap-2 md:grid-cols-3">
        <div className="sales-panel-muted rounded-xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
            Abiertas por mi tienda
          </p>
          <p className="mt-2 text-2xl font-bold text-[var(--ops-text)]">
            {section.counts.open_for_store_count}
          </p>
        </div>
        <div className="sales-panel-muted rounded-xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
            Por aprobar
          </p>
          <p className="mt-2 text-2xl font-bold text-[var(--ops-text)]">
            {section.counts.pending_approval_count}
          </p>
        </div>
        <div className="sales-panel-muted rounded-xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
            Por despachar
          </p>
          <p className="mt-2 text-2xl font-bold text-[var(--ops-text)]">
            {section.counts.pending_dispatch_count}
          </p>
        </div>
        <div className="sales-panel-muted rounded-xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
            Por recibir
          </p>
          <p className="mt-2 text-2xl font-bold text-[var(--ops-text)]">
            {section.counts.pending_receipts_count}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {section.latest.length > 0 ? (
          section.latest.map((item) => (
            <Link
              key={item.transfer_id}
              href={item.href}
              className="sales-panel-muted block rounded-xl px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--ops-text)]">
                      {item.transfer_number || "Sin correlativo"}
                    </p>
                    <span className={`${flowTone(item.flow)} rounded-full px-2.5 py-1 text-[11px] font-semibold`}>
                      {flowLabel(item.flow)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                    {item.from_location_name} ({item.from_location_code}) {" -> "}
                    {item.to_location_name} ({item.to_location_code})
                  </p>
                  <p className="mt-2 text-sm text-[var(--ops-text-muted)]">
                    {item.flow === "receipt"
                      ? `${item.qty_shipped_total} und enviadas`
                      : `${item.qty_requested_total} und solicitadas`}
                    {" · "}
                    {formatDateTime(item.happened_at)}
                  </p>
                </div>
                <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ops-text-muted)]" />
              </div>
            </Link>
          ))
        ) : (
          <OpsEmptyState
            variant="compact"
            title="Sin movimientos entre tiendas"
            description="Todavía no hay solicitudes activas ni recepciones pendientes visibles para tu sede."
          />
        )}
      </div>

      {!section.primary_action && section.latest.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-[var(--ops-border-soft)] px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-medium text-[var(--ops-text-muted)]">
            <Package2 className="h-4 w-4" />
            Tu sesión puede dar seguimiento, pero no abrir nuevas solicitudes desde aquí.
          </p>
        </div>
      ) : null}
    </section>
  )
}
