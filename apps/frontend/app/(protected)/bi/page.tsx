"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { BarChart3, ExternalLink, LayoutPanelTop, RefreshCw, Users } from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"

import { InlineStatusCard } from "@/components/feedback/status-page"
import { ApiError, apiFetch } from "@/lib/api"

type BiView = {
  id: string
  title: string
  description: string
  category: string
  embedUrl: string
}

type CustomerAnalyticsResponse = {
  top_customers: Array<{
    customer_name: string
    sale_count: number
    total_amount: number
  }>
  top_products: Array<{
    product_name: string
    style_code: string
    qty_sold: number
    total_amount: number
  }>
  by_document_type: Array<{
    document_type: string
    sale_count: number
    total_amount: number
  }>
  by_weekday: Array<{
    weekday_number: number
    sale_count: number
    total_amount: number
  }>
}

const LEGACY_POWERBI_URLS = [
  "https://app.powerbi.com/view?r=eyJrIjoiNTAzYzYyMWItYWVhYS00NGU2LTlkZTAtNWEwYmM4YWQ3ZTFjIiwidCI6ImM0YTY2YzM0LTJiYjctNDUxZi04YmUxLWIyYzI2YTQzMDE1OCIsImMiOjR9&pageName=1dcfa977e20667420a1d",
  "https://app.powerbi.com/view?r=eyJrIjoiNTAzYzYyMWItYWVhYS00NGU2LTlkZTAtNWEwYmM4YWQ3ZTFjIiwidCI6ImM0YTY2YzM0LTJiYjctNDUxZi04YmUxLWIyYzI2YTQzMDE1OCIsImMiOjR9&pageName=cb1fc32f622a7fef7b7e",
  "https://app.powerbi.com/view?r=eyJrIjoiNTAzYzYyMWItYWVhYS00NGU2LTlkZTAtNWEwYmM4YWQ3ZTFjIiwidCI6ImM0YTY2YzM0LTJiYjctNDUxZi04YmUxLWIyYzI2YTQzMDE1OCIsImMiOjR9&pageName=9dae452bb92dc0fa9378",
  "https://app.powerbi.com/view?r=eyJrIjoiNTAzYzYyMWItYWVhYS00NGU2LTlkZTAtNWEwYmM4YWQ3ZTFjIiwidCI6ImM0YTY2YzM0LTJiYjctNDUxZi04YmUxLWIyYzI2YTQzMDE1OCIsImMiOjR9&pageName=19c1667e8492e8c19e40",
]

const WEEKDAY_LABELS: Record<number, string> = {
  1: "Lun",
  2: "Mar",
  3: "Mie",
  4: "Jue",
  5: "Vie",
  6: "Sab",
  7: "Dom",
}

function withEmbedOptions(rawUrl: string) {
  if (!rawUrl) return ""

  const nextUrl = new URL(rawUrl)
  nextUrl.searchParams.set("navContentPaneEnabled", "false")
  nextUrl.searchParams.set("filterPaneEnabled", "false")
  nextUrl.searchParams.set("actionBarEnabled", "false")
  nextUrl.searchParams.set("chromeless", "1")
  nextUrl.searchParams.set("pageView", "fitToWidth")
  nextUrl.searchParams.set("zoom", "125")
  return nextUrl.toString()
}

function formatMoney(value: number) {
  return `S/. ${Number(value || 0).toFixed(2)}`
}

function mapDocumentTypeLabel(value: string) {
  if (value === "boleta") return "Boleta"
  if (value === "factura") return "Factura"
  if (value === "proforma") return "Proforma"
  if (value === "none") return "Sin comprobante"
  return value || "Sin tipo"
}

function todayDateInput() {
  return new Date().toISOString().slice(0, 10)
}

function defaultFromDateInput() {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return date.toISOString().slice(0, 10)
}

function explainAnalyticsError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "No se pudo cargar la analitica de clientes"
  }

  if (error.status === 403) {
    return "Tu rol no tiene acceso a la analitica de ventas."
  }

  return error.message || "No se pudo cargar la analitica de clientes"
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
  const [dateFrom, setDateFrom] = useState(defaultFromDateInput)
  const [dateTo, setDateTo] = useState(todayDateInput)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<CustomerAnalyticsResponse | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  const selectedView =
    views.find((view) => view.id === selectedViewId) ||
    views.find((view) => view.embedUrl) ||
    views[0] ||
    null

  useEffect(() => {
    if (!selectedView || selectedView.id !== "clientes") {
      return
    }

    let active = true
    const controller = new AbortController()

    async function loadAnalytics() {
      setAnalyticsLoading(true)
      setAnalyticsError(null)

      try {
        const params = new URLSearchParams({
          date_from: dateFrom,
          date_to: dateTo,
          limit: "8",
        })

        const data = await apiFetch<CustomerAnalyticsResponse>(
          `/api/sales/analytics/customers?${params.toString()}`,
          {
            signal: controller.signal,
            cache: "no-store",
          }
        )

        if (active) {
          setAnalytics(data)
        }
      } catch (error) {
        if (!active || controller.signal.aborted) {
          return
        }

        setAnalytics(null)
        setAnalyticsError(explainAnalyticsError(error))
      } finally {
        if (active) {
          setAnalyticsLoading(false)
        }
      }
    }

    // defer loadAnalytics to avoid synchronous setState inside effect
    void Promise.resolve().then(() => loadAnalytics())

    return () => {
      active = false
      controller.abort()
    }
  }, [selectedView, dateFrom, dateTo, reloadTick])

  const topCustomersChart = useMemo(() => {
    return (analytics?.top_customers || []).map((item) => ({
      name: item.customer_name,
      total_amount: Number(item.total_amount || 0),
      sale_count: Number(item.sale_count || 0),
    }))
  }, [analytics])

  const topProductsChart = useMemo(() => {
    return (analytics?.top_products || []).map((item) => ({
      name: item.product_name,
      qty_sold: Number(item.qty_sold || 0),
      total_amount: Number(item.total_amount || 0),
      short_name: item.product_name.length > 16 ? `${item.product_name.slice(0, 16)}...` : item.product_name,
    }))
  }, [analytics])

  const byDocumentChart = useMemo(() => {
    return (analytics?.by_document_type || []).map((item) => ({
      document_type: mapDocumentTypeLabel(item.document_type),
      sale_count: Number(item.sale_count || 0),
      total_amount: Number(item.total_amount || 0),
    }))
  }, [analytics])

  const byWeekdayChart = useMemo(() => {
    return (analytics?.by_weekday || []).map((item) => ({
      weekday: WEEKDAY_LABELS[Number(item.weekday_number)] || `Dia ${item.weekday_number}`,
      sale_count: Number(item.sale_count || 0),
      total_amount: Number(item.total_amount || 0),
    }))
  }, [analytics])

  const isCustomersView = selectedView?.id === "clientes"

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
              {selectedView?.embedUrl && !isCustomersView ? (
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

        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="h-full">
            <article className="h-full rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-sky-600" />
                <h2 className="text-lg font-semibold text-slate-900">Selecciona una vista BI</h2>
              </div>
              <div className="mt-4 space-y-3">
                {views.map((view) => {
                  const isActive = selectedView?.id === view.id
                  const isConfigured = view.id === "clientes" ? true : Boolean(view.embedUrl)

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
          </div>

          <div>
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

                  {isCustomersView ? (
                    <div className="mt-5 space-y-4">
                      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-end md:justify-between">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Fecha desde
                            </label>
                            <input
                              type="date"
                              value={dateFrom}
                              onChange={(event) => setDateFrom(event.target.value)}
                              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Fecha hasta
                            </label>
                            <input
                              type="date"
                              value={dateTo}
                              onChange={(event) => setDateTo(event.target.value)}
                              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setReloadTick((value) => value + 1)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Actualizar
                        </button>
                      </div>

                      {analyticsError ? (
                        <InlineStatusCard
                          title="No pudimos cargar analitica de clientes"
                          description={analyticsError}
                          tone="danger"
                        />
                      ) : null}

                      {analyticsLoading ? (
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                          Cargando graficas de clientes...
                        </div>
                      ) : (
                        <div className="grid gap-4 xl:grid-cols-2">
                          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <h3 className="text-sm font-semibold text-slate-900">Clientes que más compran</h3>
                            <div className="mt-3 h-64">
                              {topCustomersChart.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={topCustomersChart} layout="vertical" margin={{ left: 24 }}>
                                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 12, fill: "#64748b" }} />
                                    <YAxis
                                      type="category"
                                      dataKey="name"
                                      width={120}
                                      tick={{ fontSize: 12, fill: "#64748b" }}
                                    />
                                    <RechartsTooltip
                                      formatter={(value: number, name: string) => [
                                        name === 'total_amount' ? formatMoney(value) : `${value} venta(s)`,
                                        name === 'total_amount' ? 'Total comprado' : 'Ventas',
                                      ]}
                                      labelFormatter={(label) => String(label)}
                                    />
                                    <Bar dataKey="total_amount" fill="#0284c7" radius={[0, 8, 8, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              ) : (
                                <InlineStatusCard
                                  title="Sin datos de clientes"
                                  description="No hay ventas confirmadas en el rango seleccionado."
                                  tone="neutral"
                                />
                              )}
                            </div>
                          </article>

                          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <h3 className="text-sm font-semibold text-slate-900">Productos que más compran</h3>
                            <div className="mt-3 h-64">
                              {topProductsChart.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={topProductsChart}>
                                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                                    <XAxis dataKey="short_name" tick={{ fontSize: 12, fill: "#64748b" }} />
                                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                                    <RechartsTooltip
                                      formatter={(value: number, name: string) => [
                                        name === 'qty_sold' ? `${value} unidades` : formatMoney(value),
                                        name === 'qty_sold' ? 'Cantidad vendida' : 'Total',
                                      ]}
                                      labelFormatter={(label) => String(label)}
                                    />
                                    <Bar dataKey="qty_sold" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              ) : (
                                <InlineStatusCard
                                  title="Sin datos de productos"
                                  description="No hay lineas de venta para construir esta grafica."
                                  tone="neutral"
                                />
                              )}
                            </div>
                          </article>

                          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <h3 className="text-sm font-semibold text-slate-900">Ventas por tipo de comprobante</h3>
                            <div className="mt-3 h-64">
                              {byDocumentChart.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={byDocumentChart}>
                                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                                    <XAxis dataKey="document_type" tick={{ fontSize: 12, fill: "#64748b" }} />
                                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                                    <RechartsTooltip
                                      formatter={(value: number, name: string) => [
                                        name === 'sale_count' ? `${value} venta(s)` : formatMoney(value),
                                        name === 'sale_count' ? 'Cantidad de ventas' : 'Total',
                                      ]}
                                    />
                                    <Bar dataKey="sale_count" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              ) : (
                                <InlineStatusCard
                                  title="Sin tipos de comprobante"
                                  description="No hay ventas en el periodo para comparar documentos."
                                  tone="neutral"
                                />
                              )}
                            </div>
                          </article>

                          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <h3 className="text-sm font-semibold text-slate-900">Comportamiento por día de semana</h3>
                            <div className="mt-3 h-64">
                              {byWeekdayChart.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={byWeekdayChart}>
                                    <defs>
                                      <linearGradient id="biCustomersWeek" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.35} />
                                        <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.02} />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                                    <XAxis dataKey="weekday" tick={{ fontSize: 12, fill: "#64748b" }} />
                                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                                    <RechartsTooltip
                                      formatter={(value: number, name: string) => [
                                        name === 'sale_count' ? `${value} venta(s)` : formatMoney(value),
                                        name === 'sale_count' ? 'Cantidad de ventas' : 'Total acumulado',
                                      ]}
                                    />
                                    <Area
                                      type="monotone"
                                      dataKey="total_amount"
                                      stroke="#14b8a6"
                                      strokeWidth={2}
                                      fill="url(#biCustomersWeek)"
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              ) : (
                                <InlineStatusCard
                                  title="Sin tendencia semanal"
                                  description="Todavia no hay informacion suficiente para esta vista."
                                  tone="neutral"
                                />
                              )}
                            </div>
                          </article>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative mt-5 overflow-hidden rounded-[24px] bg-white">
                      <div
                        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 bg-white"
                        aria-hidden="true"
                      />
                      <div
                        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-40 bg-white"
                        aria-hidden="true"
                      />
                      {selectedView.embedUrl ? (
                        <iframe
                          title={selectedView.title}
                          src={withEmbedOptions(selectedView.embedUrl)}
                          className="pointer-events-none h-[58vh] w-full -translate-y-8"
                          loading="lazy"
                          allowFullScreen
                        />
                      ) : (
                        <div className="flex h-[58vh] items-center justify-center px-6 text-center">
                          <div className="max-w-lg space-y-3">
                            <p className="text-lg font-semibold text-slate-900">
                              Esta vista aun no tiene URL embebida configurada
                            </p>
                            <p className="text-sm leading-6 text-slate-600">
                              Configura la variable publica correspondiente en apps/frontend/.env.local
                              para publicar el dashboard real dentro de esta pantalla.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-[58vh] items-center justify-center text-center">
                  <div className="max-w-lg space-y-3">
                    <p className="text-lg font-semibold text-slate-900">No hay vistas BI disponibles</p>
                    <p className="text-sm leading-6 text-slate-600">
                      Agrega al menos una URL de Power BI para usar este modulo de analitica.
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-6 border-t border-slate-200 pt-5">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Uso recomendado</h2>
                </div>
                <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  <p>
                    Usa <strong>Dashboard</strong> para decidir rapido que atender hoy en la sede activa.
                  </p>
                  <p>
                    Usa <strong>BI</strong> para comparativos, visualizaciones, clientes o analisis
                    gerencial fuera del flujo operativo.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  )
}
