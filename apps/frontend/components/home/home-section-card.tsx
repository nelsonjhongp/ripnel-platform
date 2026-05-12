import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

export function HomeSectionCard({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow: string
  title: string
  action?: {
    label: string
    href: string
  } | null
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ripnel-accent-hover)]">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-base font-semibold text-[var(--ops-text)] md:text-lg">{title}</h2>
        </div>

        {action ? (
          <Link
            href={action.href}
            className="sales-field sales-field-interactive inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium"
          >
            {action.label}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      <div>{children}</div>
    </section>
  )
}
