import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { appRoutes } from "@/lib/routes"

export function ModulePlaceholder({
  eyebrow,
  title,
  description,
  bullets,
}: {
  eyebrow: string
  title: string
  description: string
  bullets: string[]
}) {
  return (
    <section className="min-h-screen bg-[var(--ops-surface)] p-4 md:p-6">
      <div className="mx-auto max-w-5xl rounded-[30px] border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-6 shadow-sm md:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[color:color-mix(in_srgb,var(--ripnel-accent)_14%,var(--ops-surface))] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ripnel-accent)]">
            <Sparkles className="h-3.5 w-3.5" />
            {eyebrow}
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-[var(--ops-text)]">{title}</h1>
          <p className="mt-3 text-base leading-7 text-[var(--ops-text-muted)]">{description}</p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {bullets.map((bullet) => (
            <div key={bullet} className="rounded-2xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] p-4 text-sm text-[var(--ops-text-muted)]">
              {bullet}
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href={appRoutes.home}
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--ripnel-accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--ripnel-accent-hover)]"
          >
            Volver al inicio
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={appRoutes.purchaseSystem}
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--ops-border-strong)] px-4 py-3 text-sm font-semibold text-[var(--ops-text-muted)] transition hover:text-[var(--ops-text)]"
          >
            Ir a venta rapida
          </Link>
        </div>
      </div>
    </section>
  )
}