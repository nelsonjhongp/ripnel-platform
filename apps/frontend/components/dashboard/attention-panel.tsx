import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight } from "lucide-react"

import { DashboardChartCard } from "@/components/dashboard/dashboard-chart-card"
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state"
import { cn } from "@/lib/utils"

type AttentionTone = "neutral" | "success" | "warning" | "danger" | "purple"

const ROW_STYLES: Record<AttentionTone, string> = {
  neutral:
    "border-[color:color-mix(in_srgb,var(--ops-border-soft)_86%,transparent)] bg-white",
  success:
    "border-[color:color-mix(in_srgb,var(--ops-border-soft)_86%,transparent)] bg-white",
  warning:
    "border-[color:color-mix(in_srgb,var(--ops-border-soft)_86%,transparent)] bg-white",
  danger:
    "border-[color:color-mix(in_srgb,var(--ops-border-soft)_86%,transparent)] bg-white",
  purple:
    "border-[color:color-mix(in_srgb,var(--ops-border-soft)_86%,transparent)] bg-white",
}

const BADGE_STYLES: Record<AttentionTone, string> = {
  neutral:
    "border-[var(--ops-border-strong)] bg-[var(--ops-surface)] text-[var(--ops-text-muted)]",
  success:
    "border-[color:color-mix(in_srgb,#10b981_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-emerald-700",
  warning:
    "border-[color:color-mix(in_srgb,#f59e0b_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_16%,var(--ops-surface))] text-amber-700",
  danger:
    "border-[color:color-mix(in_srgb,#f43f5e_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f43f5e_16%,var(--ops-surface))] text-rose-700",
  purple:
    "border-[color:color-mix(in_srgb,var(--ripnel-accent)_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_84%,var(--ops-surface))] text-[var(--ripnel-accent-hover)]",
}

const ICON_PANEL_STYLES: Record<AttentionTone, string> = {
  neutral:
    "border-[color:color-mix(in_srgb,#4f46e5_10%,transparent)] bg-[color:color-mix(in_srgb,#4f46e5_8%,white)]",
  success:
    "border-[color:color-mix(in_srgb,#10b981_14%,transparent)] bg-[color:color-mix(in_srgb,#10b981_8%,white)]",
  warning:
    "border-[color:color-mix(in_srgb,#f59e0b_14%,transparent)] bg-[color:color-mix(in_srgb,#f59e0b_8%,white)]",
  danger:
    "border-[color:color-mix(in_srgb,#f43f5e_14%,transparent)] bg-[color:color-mix(in_srgb,#f43f5e_8%,white)]",
  purple:
    "border-[color:color-mix(in_srgb,var(--ripnel-accent)_14%,transparent)] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_74%,white)]",
}

const ICON_STYLES: Record<AttentionTone, string> = {
  neutral: "text-[#4f46e5]",
  success: "text-[#10b981]",
  warning: "text-[#f59e0b]",
  danger: "text-[#f43f5e]",
  purple: "text-[var(--ripnel-accent)]",
}

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
    <DashboardChartCard
      title="Requiere atención"
      subtitle="Señales operativas para decidir qué atender primero."
      height="auto"
      separatedHeader={false}
      headerClassName="px-4 py-3 pb-1.5"
      contentClassName="px-4 pt-0 pb-3"
    >
      {items.length === 0 ? (
        <DashboardEmptyState compact dashed={false} description="No hay alertas visibles para tu perfil en este momento." />
      ) : (
        <div className="max-h-[428px] overflow-y-auto pr-0.5 [scrollbar-width:thin] xl:max-h-[444px]">
          <div className="space-y-1.5">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.key}
                className={cn(
                  "relative overflow-hidden rounded-[15px] border px-3 py-1.5 shadow-[0_1px_3px_rgb(15_23_42/0.018)]",
                  ROW_STYLES[item.tone]
                )}
              >
                <span
                  className={cn(
                    "absolute inset-y-2 left-0 w-[2px] rounded-full",
                    item.tone === "danger" && "bg-rose-500/85",
                    item.tone === "warning" && "bg-amber-500/85",
                    item.tone === "success" && "bg-emerald-500/80",
                    item.tone === "purple" && "bg-[var(--ripnel-accent)]/80",
                    item.tone === "neutral" && "bg-[var(--ops-border-soft)]"
                  )}
                />
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2">
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border",
                      ICON_PANEL_STYLES[item.tone]
                    )}
                  >
                    <Icon className={cn("h-[14px] w-[14px]", ICON_STYLES[item.tone])} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold leading-tight text-[var(--ops-text)]">{item.label}</p>
                    <p className="mt-0.5 text-[10px] leading-[1.3] text-[var(--ops-text-muted)]">{item.value}</p>
                    <Link
                      href={item.href}
                      className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--ripnel-accent-hover)] transition hover:text-[var(--ripnel-accent)]"
                    >
                      {item.cta}
                      <ArrowRight className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                  <div className="flex min-w-[76px] flex-col items-end gap-1 pt-0.5">
                    <p
                      className={cn(
                        "text-right text-[0.98rem] font-semibold tracking-[-0.02em]",
                        item.tone === "danger" && "text-rose-600",
                        item.tone === "warning" && "text-amber-600",
                        item.tone === "success" && "text-emerald-600",
                        item.tone === "purple" && "text-[var(--ripnel-accent)]",
                        item.tone === "neutral" && "text-[var(--ops-text)]"
                      )}
                    >
                      {item.highlightValue}
                    </p>
                    <span
                      className={cn(
                        "inline-flex shrink-0 rounded-full border px-2 py-[1px] text-[8px] font-semibold uppercase tracking-[0.08em]",
                        BADGE_STYLES[item.tone]
                      )}
                    >
                      {item.badge}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
          </div>
        </div>
      )}
    </DashboardChartCard>
  )
}
