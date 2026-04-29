import Link from "next/link"
import { ArrowUpRight, CircleAlert } from "lucide-react"

import type { HomeOverview } from "./home-types"

function toneClass(tone: HomeOverview["priorities"][number]["tone"]) {
  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-100"
  }

  return "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text)]"
}

export function HomePriorities({ items }: { items: HomeOverview["priorities"] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <CircleAlert className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />
        <h2 className="text-base font-semibold text-[var(--ops-text)]">Pendientes del momento</h2>
      </div>

      <div className="grid gap-2 xl:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`rounded-xl border px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-sm ${toneClass(item.tone)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
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
