"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  CalendarRange,
  CircleAlert,
  Filter,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldX,
} from "lucide-react"

import { useAuth } from "@/components/auth/AuthProvider"
import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { InlineStatusCard } from "@/components/feedback/status-page"
import { ApiError, apiFetch } from "@/lib/api"

type PostsaleAvailability = {
  exchange: {
    allowed: boolean
    reasons: string[]
  }
  cancel: {
    allowed: boolean
    reasons: string[]
  }
}

type EligibleSale = {
  sale_id: string
  sale_number: string | null
  status: string
  document_type: string
  customer_name_text: string | null
  total_amount: number
  currency: string
  seller_name: string
  location_name: string
  confirmed_at: string | null
  created_at: string
  business_date: string
  cash_status: "open" | "closed" | "missing"
  confirmed_exchange_count: number
  availability: PostsaleAvailability
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "cancelled", label: "Anuladas" },
  { value: "draft", label: "Borradores" },
]

const STATUS_STYLES: Record<string, string> = {
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700",
  draft: "border-amber-200 bg-amber-50 text-amber-700",
}

const CASH_STYLES: Record<string, string> = {
  open: "border-emerald-200 bg-emerald-50 text-emerald-700",
  closed: "border-rose-200 bg-rose-50 text-rose-700",
  missing: "border-amber-200 bg-amber-50 text-amber-700",
}

const CASH_LABELS: Record<string, string> = {
  open: "Caja abierta",
  closed: "Caja cerrada",
  missing: "Sin caja abierta",
}

function explainPostsaleError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "No se pudo cargar la cola operativa de postventa."
  }

  if (error.status === 403) {
    return "Tu rol no tiene acceso a este módulo de postventa."
  }

  if (error.status === 409) {
    return "Necesitas una sede default activa para operar postventa."
  }

  return error.message || "No se pudo cargar la cola operativa de postventa."
}

function formatDateLabel(value: string | null, fallback: string) {
  return new Date(value || fallback).toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

export default function PostsalePage() {
  const { has } = useAuth()
  const [sales, setSales] = useState<EligibleSale[]>([])
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("confirmed")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    const timeoutId = window.setTimeout(async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        if (search.trim()) params.set("q", search.trim())
        if (status !== "all") params.set("status", status)
        if (dateFrom) params.set("date_from", dateFrom)
        if (dateTo) params.set("date_to", dateTo)

        const path = params.toString()
          ? `/api/postsales/eligible?${params.toString()}`
          : "/api/postsales/eligible"

        const data = await apiFetch<EligibleSale[]>(path, {
          signal: controller.signal,
          cache: "no-store",
        })

        if (active) {
          setSales(Array.isArray(data) ? data : [])
        }
      } catch (loadError) {
        if (!active || controller.signal.aborted) {
          return
        }

        setSales([])
        setError(explainPostsaleError(loadError))
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }, 250)

    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [dateFrom, dateTo, search, status])

  const stats = useMemo(() => {
    const exchangeReady = sales.filter((sale) => sale.availability.exchange.allowed).length
    const cancelReady = sales.filter((sale) => sale.availability.cancel.allowed).length
    return {
      count: sales.length,
      exchangeReady,
      cancelReady,
    }
  }, [sales])

  const hasActiveFilters =
    Boolean(search.trim()) || status !== "confirmed" || Boolean(dateFrom) || Boolean(dateTo)

  function clearFilters() {
    setSearch("")
    setStatus("confirmed")
    setDateFrom("")
    setDateTo("")
  }

  return (
    <PermissionGuard permission="sales.postsale.view">
      <section className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7_0%,#fff7ed_30%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <header className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-amber-700">Circuito postventa</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
                  Postventa controlada
                </h1>
                <p className="mt-1 max-w-3xl text-sm text-slate-600">
                  Busca ventas de la sede operativa actual, revisa elegibilidad y entra al flujo
                  de cambio simple o anulación con trazabilidad.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/transaction-history"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Historial de ventas
                </Link>
                {has("sales.pos") ? (
                  <Link
                    href="/purchase-system"
                    className="inline-flex items-center justify-center rounded-2xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
                  >
                    Nueva venta
                  </Link>
                ) : null}
              </div>
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Ventas evaluadas</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{stats.count}</p>
            </article>
            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-emerald-700">Cambio habilitado</p>
              <p className="mt-2 text-2xl font-bold text-emerald-800">{stats.exchangeReady}</p>
            </article>
            <article className="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-sky-700">Anulación habilitada</p>
              <p className="mt-2 text-2xl font-bold text-sky-800">{stats.cancelReady}</p>
            </article>
          </div>

          <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
            <div className="grid gap-3 lg:grid-cols-[1.5fr_0.8fr_0.95fr_0.95fr_auto] lg:items-end">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nro. venta o cliente"
                  className="w-full rounded-2xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Estado
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="w-full bg-transparent text-sm text-slate-700 outline-none"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Fecha desde
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <CalendarRange className="h-4 w-4 text-slate-500" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                    className="w-full bg-transparent text-sm text-slate-700 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Fecha hasta
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <CalendarRange className="h-4 w-4 text-slate-500" />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    className="w-full bg-transparent text-sm text-slate-700 outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Limpiar
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  Cargando ventas elegibles...
                </div>
              ) : error ? (
                <InlineStatusCard
                  title="No pudimos cargar la cola de postventa"
                  description={error}
                  tone="danger"
                />
              ) : sales.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  No se encontraron ventas para los filtros aplicados.
                </div>
              ) : (
                sales.map((sale) => (
                  <article
                    key={sale.sale_id}
                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold text-slate-900">
                            {sale.sale_number || "Sin correlativo"}
                          </h2>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              STATUS_STYLES[sale.status] ||
                              "border-slate-200 bg-slate-100 text-slate-700"
                            }`}
                          >
                            {sale.status}
                          </span>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              CASH_STYLES[sale.cash_status] || CASH_STYLES.missing
                            }`}
                          >
                            {CASH_LABELS[sale.cash_status] || CASH_LABELS.missing}
                          </span>
                        </div>

                        <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                          <p>
                            <span className="font-medium text-slate-800">Cliente:</span>{" "}
                            {sale.customer_name_text || "Cliente general"}
                          </p>
                          <p>
                            <span className="font-medium text-slate-800">Sede:</span>{" "}
                            {sale.location_name}
                          </p>
                          <p>
                            <span className="font-medium text-slate-800">Vendedor:</span>{" "}
                            {sale.seller_name}
                          </p>
                          <p>
                            <span className="font-medium text-slate-800">Fecha:</span>{" "}
                            {formatDateLabel(sale.confirmed_at, sale.created_at)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {sale.document_type}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                            Total S/. {Number(sale.total_amount || 0).toFixed(2)}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                            Cambios previos: {Number(sale.confirmed_exchange_count || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {has("sales.pos") ? (
                          <Link
                            href={`/purchase-system/${sale.sale_id}`}
                            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Ver venta
                          </Link>
                        ) : null}
                        <Link
                          href={`/postventa/${sale.sale_id}`}
                          className="inline-flex items-center justify-center rounded-2xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                        >
                          Abrir postventa
                        </Link>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 xl:grid-cols-2">
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                          {sale.availability.exchange.allowed ? (
                            <ShieldCheck className="h-4 w-4" />
                          ) : (
                            <ShieldX className="h-4 w-4" />
                          )}
                          Cambio simple
                        </div>
                        <p className="mt-1 text-sm text-emerald-900/80">
                          {sale.availability.exchange.allowed
                            ? "La venta puede registrar un cambio simple sin alterar el cobro original."
                            : sale.availability.exchange.reasons.join(" ")}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-sky-800">
                          {sale.availability.cancel.allowed ? (
                            <ShieldCheck className="h-4 w-4" />
                          ) : (
                            <ShieldX className="h-4 w-4" />
                          )}
                          Anulación total
                        </div>
                        <p className="mt-1 text-sm text-sky-900/80">
                          {sale.availability.cancel.allowed
                            ? "La venta puede anularse manteniendo consistencia entre stock, pagos y caja."
                            : sale.availability.cancel.reasons.join(" ")}
                        </p>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </article>

          <div className="rounded-3xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-900 shadow-sm">
            <div className="flex items-start gap-2">
              <CircleAlert className="mt-0.5 h-4 w-4" />
              <p>
                Este MVP de postventa no usa SUNAT como criterio. La elegibilidad se resuelve solo
                con estado de venta, caja abierta, stock disponible y trazabilidad interna.
              </p>
            </div>
          </div>
        </div>
      </section>
    </PermissionGuard>
  )
}
