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
    <section className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_45%,#eef2ff_100%)] p-4 md:p-6">
      <div className="mx-auto max-w-5xl rounded-[30px] border border-slate-200 bg-white/95 p-6 shadow-[0_24px_90px_-56px_rgba(15,23,42,0.4)] md:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-violet-600">
            <Sparkles className="h-3.5 w-3.5" />
            {eyebrow}
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950">{title}</h1>
          <p className="mt-3 text-base leading-7 text-slate-600">{description}</p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {bullets.map((bullet) => (
            <div key={bullet} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {bullet}
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href={appRoutes.home}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Volver al inicio
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={appRoutes.purchaseSystem}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Ir a venta rapida
          </Link>
        </div>
      </div>
    </section>
  )
}
