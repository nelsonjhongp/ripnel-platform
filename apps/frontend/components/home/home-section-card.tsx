import Link from "next/link"
import { ArrowUpRight, Info } from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function HomeSectionCard({
  eyebrow,
  title,
  action,
  infoTooltip,
  children,
}: {
  eyebrow: string
  title: string
  action?: {
    label: string
    href: string
  } | null
  infoTooltip?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ripnel-accent-hover)]">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-base font-semibold text-[var(--ops-text)] md:text-lg">{title}</h2>
          </div>
          {infoTooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="mt-5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--ops-text-muted)] transition hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)]"
                  aria-label="Más información"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8} className="max-w-[280px] text-xs leading-relaxed">
                {infoTooltip}
              </TooltipContent>
            </Tooltip>
          ) : null}
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
