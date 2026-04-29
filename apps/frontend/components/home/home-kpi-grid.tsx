import Link from "next/link"

import type { HomeOverview } from "./home-types"

function kpiToneClass(tone: HomeOverview["kpis"][number]["tone"]) {
  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-100"
  }

  if (tone === "primary") {
    return "border-[color:color-mix(in_srgb,var(--ripnel-accent)_26%,var(--ops-border-strong))] bg-[var(--ripnel-accent-soft)] text-[var(--ripnel-accent-hover)]"
  }

  return "border-[var(--ops-border-strong)] bg-[var(--ops-surface)] text-[var(--ops-text)]"
}

function scopeLabel(scope: HomeOverview["kpis"][number]["scope"]) {
  if (scope === "personal") return "Personal"
  if (scope === "assigned_network") return "Red asignada"
  return "Sede"
}

export function HomeKpiGrid({ items }: { items: HomeOverview["kpis"] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${kpiToneClass(item.tone)}`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-current/65">
            {item.label}
          </p>
          <p className="mt-2 text-3xl font-bold leading-none">{item.value}</p>
          <div className="mt-3 flex items-center justify-between gap-3 text-sm">
            <span className="text-current/75">{item.meta}</span>
            <span className="rounded-full border border-current/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-current/70">
              {scopeLabel(item.scope)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
