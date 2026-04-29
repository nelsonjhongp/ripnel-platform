import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import type { HomeOverview } from "./home-types"

function toneClass(tone: HomeOverview["quick_actions"][number]["tone"]) {
  if (tone === "primary") {
    return "border-[color:color-mix(in_srgb,var(--ripnel-accent)_28%,var(--ops-border-strong))] bg-[var(--ripnel-accent-soft)] text-[var(--ripnel-accent-hover)]"
  }

  return "border-[var(--ops-border-soft)] bg-[var(--ops-surface-muted)] text-[var(--ops-text)]"
}

export function HomeQuickActions({ items }: { items: HomeOverview["quick_actions"] }) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)]">
          Accesos rápidos
        </p>
        <h2 className="mt-1 text-base font-semibold text-[var(--ops-text)]">Lo que más vas a usar</h2>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`rounded-xl border px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-sm ${toneClass(item.tone)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="mt-1 line-clamp-1 text-sm text-current/75">{item.description}</p>
              </div>
              <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-current/55" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
