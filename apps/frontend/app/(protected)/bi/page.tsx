"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { BarChart3, ExternalLink, LayoutPanelTop, Users } from "lucide-react"

type BiView = {
  id: string
  title: string
  description: string
  category: string
  embedUrl: string
}

const LEGACY_POWERBI_URLS = [
  "https://app.powerbi.com/view?r=eyJrIjoiNTAzYzYyMWItYWVhYS00NGU2LTlkZTAtNWEwYmM4YWQ3ZTFjIiwidCI6ImM0YTY2YzM0LTJiYjctNDUxZi04YmUxLWIyYzI2YTQzMDE1OCIsImMiOjR9&pageName=1dcfa977e20667420a1d",
  "https://app.powerbi.com/view?r=eyJrIjoiNTAzYzYyMWItYWVhYS00NGU2LTlkZTAtNWEwYmM4YWQ3ZTFjIiwidCI6ImM0YTY2YzM0LTJiYjctNDUxZi04YmUxLWIyYzI2YTQzMDE1OCIsImMiOjR9&pageName=cb1fc32f622a7fef7b7e",
  "https://app.powerbi.com/view?r=eyJrIjoiNTAzYzYyMWItYWVhYS00NGU2LTlkZTAtNWEwYmM4YWQ3ZTFjIiwidCI6ImM0YTY2YzM0LTJiYjctNDUxZi04YmUxLWIyYzI2YTQzMDE1OCIsImMiOjR9&pageName=9dae452bb92dc0fa9378",
  "https://app.powerbi.com/view?r=eyJrIjoiNTAzYzYyMWItYWVhYS00NGU2LTlkZTAtNWEwYmM4YWQ3ZTFjIiwidCI6ImM0YTY2YzM0LTJiYjctNDUxZi04YmUxLWIyYzI2YTQzMDE1OCIsImMiOjR9&pageName=19c1667e8492e8c19e40",
]

function withEmbedOptions(rawUrl: string) {
  if (!rawUrl) return ""

  const separator = rawUrl.includes("?") ? "&" : "?"
  return `${rawUrl}${separator}navContentPaneEnabled=false&filterPaneEnabled=false`
}

export default function BusinessIntelligencePage() {
  const searchParams = useSearchParams()

  const views = useMemo<BiView[]>(
    () => [
      {
        id: "operacion-1",
        title: "Tablero BI 1",
        description: "Vista Power BI heredada para seguimiento comercial externo.",
        category: "Operacion",
        embedUrl: process.env.NEXT_PUBLIC_POWERBI_DASHBOARD_1_URL || LEGACY_POWERBI_URLS[0],
      },
      {
        id: "operacion-2",
        title: "Tablero BI 2",
        description: "Lectura extendida para analisis fuera de la portada operativa.",
        category: "Operacion",
        embedUrl: process.env.NEXT_PUBLIC_POWERBI_DASHBOARD_2_URL || LEGACY_POWERBI_URLS[1],
      },
      {
        id: "operacion-3",
        title: "Tablero BI 3",
        description: "Vista Power BI adicional para seguimiento comercial por fuera del ERP.",
        category: "Operacion",
        embedUrl: process.env.NEXT_PUBLIC_POWERBI_DASHBOARD_3_URL || LEGACY_POWERBI_URLS[2],
      },
      {
        id: "operacion-4",
        title: "Tablero BI 4",
        description: "Vista Power BI heredada para profundizar en analitica operativa.",
        category: "Operacion",
        embedUrl: process.env.NEXT_PUBLIC_POWERBI_DASHBOARD_4_URL || LEGACY_POWERBI_URLS[3],
      },
      {
        id: "clientes",
        title: "Clientes",
        description: "Adquisicion, fidelizacion y analitica comercial de clientes.",
        category: "Clientes",
        embedUrl: process.env.NEXT_PUBLIC_CUSTOMERS_POWERBI_EMBED_URL || "",
      },
    ],
    []
  )

  const requestedViewId = searchParams.get("view") || views[0]?.id || null
  const [selectedViewId, setSelectedViewId] = useState(requestedViewId)

  const selectedView =
    views.find((view) => view.id === selectedViewId) ||
    views.find((view) => view.embedUrl) ||
    views[0] ||
    null

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe_0%,#f0f9ff_26%,#f8fafc_60%,#eef2ff_100%)] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                BI y analitica
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
                Power BI separado de la operacion
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Esta vista concentra dashboards externos para analisis profundo. El dashboard del
                ERP queda reservado para la operacion diaria de la sede y aqui puedes elegir que
                tablero BI abrir.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <LayoutPanelTop className="h-4 w-4" />
                Volver al dashboard
              </Link>
              {selectedView?.embedUrl ? (
                <a
                  href={selectedView.embedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir en Power BI
                </a>
              ) : null}
            </div>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5">
            <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-sky-600" />
                <h2 className="text-lg font-semibold text-slate-900">Selecciona una vista BI</h2>
              </div>
              <div className="mt-4 space-y-3">
                {views.map((view) => {
                  const isActive = selectedView?.id === view.id
                  const isConfigured = Boolean(view.embedUrl)

                  return (
                    <button
                      key={view.id}
                      type="button"
                      onClick={() => setSelectedViewId(view.id)}
                      className={`block w-full rounded-3xl border px-4 py-4 text-left transition ${
                        isActive
                          ? "border-sky-300 bg-sky-50 shadow-sm"
                          : "border-slate-200 bg-slate-50 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{view.title}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                            {view.category}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            isConfigured
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {isConfigured ? "Disponible" : "Pendiente"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{view.description}</p>
                    </button>
                  )
                })}
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-600" />
                <h2 className="text-lg font-semibold text-slate-900">Uso recomendado</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>
                  Usa <strong>Dashboard</strong> para decidir rapido que atender hoy en la sede
                  activa.
                </p>
                <p>
                  Usa <strong>BI</strong> para comparativos, visualizaciones, clientes o analisis
                  gerencial fuera del flujo operativo.
                </p>
              </div>
            </article>
          </div>

          <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
            {selectedView ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Vista activa
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">{selectedView.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{selectedView.description}</p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    {selectedView.category}
                  </span>
                </div>

                <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                  {selectedView.embedUrl ? (
                    <iframe
                      title={selectedView.title}
                      src={withEmbedOptions(selectedView.embedUrl)}
                      className="h-[72vh] w-full"
                      loading="lazy"
                      allowFullScreen
                    />
                  ) : (
                    <div className="flex h-[72vh] items-center justify-center px-6 text-center">
                      <div className="max-w-lg space-y-3">
                        <p className="text-lg font-semibold text-slate-900">
                          Esta vista aun no tiene URL embebida configurada
                        </p>
                        <p className="text-sm leading-6 text-slate-600">
                          Configura la variable publica correspondiente en `apps/frontend/.env.local`
                          para publicar el dashboard real dentro de esta pantalla.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-[72vh] items-center justify-center text-center">
                <div className="max-w-lg space-y-3">
                  <p className="text-lg font-semibold text-slate-900">No hay vistas BI disponibles</p>
                  <p className="text-sm leading-6 text-slate-600">
                    Agrega al menos una URL de Power BI para usar este modulo de analitica.
                  </p>
                </div>
              </div>
            )}
          </article>
        </div>
      </div>
    </section>
  )
}
