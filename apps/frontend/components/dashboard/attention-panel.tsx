import type { LucideIcon } from "lucide-react"
import { ClipboardList } from "lucide-react"

import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state"
import { OpsAttentionRow } from "@/components/ui/ops-attention-row"
import { OpsSectionHeader } from "@/components/ui/ops-section-header"

type AttentionTone = "neutral" | "success" | "warning" | "danger" | "purple"

export type AttentionPanelItem = {
  key: string
  label: string
  value: string
  numericValue: number
  highlightValue: string
  badge: string
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
        <DashboardEmptyState compact dashed={false} description="No hay alertas visibles para tu perfil en este momento." />
      ) : (
        <div className="min-h-[356px] space-y-2 pr-0.5">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <OpsAttentionRow
                key={item.key}
                icon={<Icon className="h-[14px] w-[14px]" />}
                title={item.label}
                description={item.value}
                ctaLabel={item.cta}
                href={item.href}
                highlightValue={item.highlightValue}
                badge={item.badge}
                tone={item.tone === "purple" ? "accent" : item.tone}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}
