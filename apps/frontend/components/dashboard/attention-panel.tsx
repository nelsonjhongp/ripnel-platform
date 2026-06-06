import type { LucideIcon } from "lucide-react"
import { ClipboardList } from "lucide-react"

import { OpsEmptyState } from "@/components/ui/ops-empty-state"
import { OpsAttentionRow } from "@/components/ui/ops-attention-row"
import { OpsSectionHeader } from "@/components/ui/ops-section-header"

type AttentionTone = "neutral" | "success" | "warning" | "danger" | "purple"

export type AttentionPanelItem = {
  key: string
  label: string
  value: string
  numericValue: number
  highlightValue: string
  badge: string | null
  cta: string
  href: string
  icon: LucideIcon
  tone: AttentionTone
}

export function AttentionPanel({
  items,
}: {
  items: AttentionPanelItem[]
}) {
  return (
    <section className="space-y-3">
      <OpsSectionHeader
        icon={<ClipboardList className="h-4 w-4" />}
        title="Requiere atención"
      />
      {items.length === 0 ? (
        <OpsEmptyState variant="compact" description="No hay alertas visibles para tu perfil en este momento." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_30%,var(--ops-surface))]">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.key}
                className="border-b border-[var(--ops-border-soft)] last:border-b-0"
              >
                <OpsAttentionRow
                  icon={<Icon className="h-[14px] w-[14px]" />}
                  title={item.label}
                  description={item.value}
                  ctaLabel={item.cta}
                  href={item.href}
                  highlightValue={item.highlightValue}
                  badge={item.badge}
                  tone={item.tone === "purple" ? "accent" : item.tone}
                  embedded
                />
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
