"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Filter, ReceiptText, Search } from "lucide-react"

import { apiFetch } from "@/lib/api"

type SaleStatus = "confirmed" | "draft" | "cancelled"

type SaleItem = {
  sale_id: string
  sale_number: string | null
  status: SaleStatus
  document_type: string
  customer_name_text: string | null
  subtotal_amount: number
  tax_amount: number
  sale_discount_amount: number
  total_amount: number
  currency: string
  confirmed_at: string | null
  created_at: string
  location_name: string
  seller_name: string
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "draft", label: "Borradores" },
  { value: "cancelled", label: "Anuladas" },
]

const STATUS_STYLES: Record<string, string> = {
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  draft: "border-amber-200 bg-amber-50 text-amber-700",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700",
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmada",
  draft: "Borrador",
  cancelled: "Anulada",
}

export default function TransactionHistoryPage() {
  const [sales, setSales] = useState<SaleItem[]>([])
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    async function loadSales() {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        if (status !== "all") params.set("status", status)
        if (search.trim()) params.set("q", search.trim())

        const path = params.toString() ? `/api/sales?${params.toString()}` : "/api/sales"
        const data = await apiFetch<SaleItem[]>(path, {
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
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las ventas")
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadSales()

    return () => {
      active = false
      controller.abort()
    }
  }, [search, status])

  const totals = useMemo(() => {
    const confirmed = sales.filter((item) => item.status === "confirmed")
    const revenue = confirmed.reduce((acc, item) => acc + Number(item.total_amount || 0), 0)
    const pending = sales.filter((item) => item.status === "draft").length
    return { count: sales.length, revenue, pending }
  }, [sales])

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_35%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
          <p className="text-xs uppercase tracking-wide text-violet-600">Operaciones de venta</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">Historial de ventas</h1>
          <p className="mt-1 text-sm text-slate-600">
            Consulta las ventas confirmadas de la sede operativa actual.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Ventas</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{totals.count}</p>
          </article>
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-emerald-700">Ingreso confirmado</p>
            <p className="mt-2 text-2xl font-bold text-emerald-800">S/. {totals.revenue.toFixed(2)}</p>
          </article>
          <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-amber-700">Borradores</p>
            <p className="mt-2 text-2xl font-bold text-amber-800">{totals.pending}</p>
          </article>
        </div>

        <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nro. venta o cliente"
                className="w-full rounded-2xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="bg-transparent text-sm text-slate-700 outline-none"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <div className="hidden grid-cols-[1.1fr_1fr_0.8fr_0.8fr_0.9fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
              <span>Venta</span>
              <span>Cliente</span>
              <span>Vendedor</span>
              <span>Total</span>
              <span>Estado</span>
            </div>

            <div className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">Cargando ventas...</div>
              ) : error ? (
                <div className="px-4 py-10 text-center text-sm text-red-600">{error}</div>
              ) : sales.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">
                  No se encontraron ventas con los filtros aplicados.
                </div>
              ) : (
                sales.map((sale) => (
                  <Link
                    key={sale.sale_id}
                    href={`/purchase-system/${sale.sale_id}`}
                    className="grid gap-3 px-4 py-4 transition hover:bg-slate-50 md:grid-cols-[1.1fr_1fr_0.8fr_0.8fr_0.9fr] md:items-center"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{sale.sale_number || "Sin correlativo"}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(sale.confirmed_at || sale.created_at).toLocaleString("es-PE")}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-violet-600">
                        {sale.document_type}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {sale.customer_name_text || "Cliente general"}
                      </p>
                      <p className="text-xs text-slate-500">{sale.location_name}</p>
                    </div>
                    <div className="text-sm text-slate-700">{sale.seller_name}</div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        S/. {Number(sale.total_amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500">{sale.currency}</p>
                    </div>
                    <div>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          STATUS_STYLES[sale.status] || "border-slate-200 bg-slate-100 text-slate-700"
                        }`}
                      >
                        {STATUS_LABELS[sale.status] || sale.status}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </article>

        <div className="rounded-3xl border border-violet-200 bg-violet-50/80 p-4 text-sm text-violet-800 shadow-sm">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4" />
            <p>Selecciona una venta para ver su detalle dentro de la misma sede operativa.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
