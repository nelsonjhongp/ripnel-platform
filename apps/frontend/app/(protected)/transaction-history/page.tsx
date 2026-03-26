"use client"

import { useMemo, useState } from "react"
import { Filter, ReceiptText, Search } from "lucide-react"

type TransactionStatus = "Completada" | "Pendiente" | "Anulada"

type TransactionItem = {
  id: string
  date: string
  customer: string
  paymentMethod: "Efectivo" | "Tarjeta" | "Yape"
  total: number
  items: number
  seller: string
  status: TransactionStatus
}

const TRANSACTIONS: TransactionItem[] = [
  { id: "TRX-10021", date: "2026-03-22 10:15", customer: "Juan Perez", paymentMethod: "Tarjeta", total: 319.8, items: 3, seller: "L. Perez", status: "Completada" },
  { id: "TRX-10022", date: "2026-03-22 11:08", customer: "Maria Salas", paymentMethod: "Efectivo", total: 89.9, items: 1, seller: "L. Perez", status: "Completada" },
  { id: "TRX-10023", date: "2026-03-22 12:47", customer: "Empresa Nova SAC", paymentMethod: "Tarjeta", total: 480, items: 4, seller: "C. Silva", status: "Pendiente" },
  { id: "TRX-10024", date: "2026-03-22 13:19", customer: "Rosa Campos", paymentMethod: "Yape", total: 119.5, items: 1, seller: "C. Silva", status: "Completada" },
  { id: "TRX-10025", date: "2026-03-22 14:35", customer: "Luis Quispe", paymentMethod: "Efectivo", total: 159, items: 1, seller: "L. Perez", status: "Anulada" },
]

const STATUS_OPTIONS: Array<"Todos" | TransactionStatus> = ["Todos", "Completada", "Pendiente", "Anulada"]

export default function TransactionHistoryPage() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"Todos" | TransactionStatus>("Todos")

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return TRANSACTIONS.filter((transaction) => {
      const byStatus = status === "Todos" || transaction.status === status
      const bySearch =
        !normalizedSearch ||
        transaction.id.toLowerCase().includes(normalizedSearch) ||
        transaction.customer.toLowerCase().includes(normalizedSearch) ||
        transaction.seller.toLowerCase().includes(normalizedSearch)

      return byStatus && bySearch
    })
  }, [search, status])

  const totals = useMemo(() => {
    const completed = filteredTransactions.filter((item) => item.status === "Completada")
    const revenue = completed.reduce((acc, item) => acc + item.total, 0)
    const pending = filteredTransactions.filter((item) => item.status === "Pendiente").length
    return { count: filteredTransactions.length, revenue, pending }
  }, [filteredTransactions])

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_35%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
          <p className="text-xs uppercase tracking-wide text-violet-600">Operaciones de venta</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">Historial de transacciones</h1>
          <p className="mt-1 text-sm text-slate-600">Revisa el detalle de ventas realizadas, estado de comprobantes y metodos de pago.</p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Transacciones</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{totals.count}</p>
          </article>
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-emerald-700">Ingreso confirmado</p>
            <p className="mt-2 text-2xl font-bold text-emerald-800">S/. {totals.revenue.toFixed(2)}</p>
          </article>
          <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-amber-700">Pendientes</p>
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
                placeholder="Buscar por ID, cliente o vendedor"
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-600">
                <Filter className="h-4 w-4" />
                Estado:
              </span>
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStatus(option)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    status === option
                      ? "border-violet-400 bg-violet-100 text-violet-700"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">ID</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Metodo</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Items</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Total</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Vendedor</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-slate-700">{transaction.id}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-600">{transaction.date}</td>
                    <td className="px-3 py-3 text-sm font-semibold text-slate-900">{transaction.customer}</td>
                    <td className="px-3 py-3 text-sm text-slate-700">{transaction.paymentMethod}</td>
                    <td className="px-3 py-3 text-right text-sm text-slate-700">{transaction.items}</td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-slate-800">S/. {transaction.total.toFixed(2)}</td>
                    <td className="px-3 py-3 text-sm text-slate-700">{transaction.seller}</td>
                    <td className="px-3 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          transaction.status === "Completada"
                            ? "bg-emerald-100 text-emerald-700"
                            : transaction.status === "Pendiente"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!filteredTransactions.length && (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No hay transacciones para los filtros aplicados.
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ReceiptText className="h-4 w-4" />
            Recomendacion
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Conecta esta vista al backend para filtrar por rango de fechas y descargar reportes por metodo de pago.
          </p>
        </article>
      </div>
    </section>
  )
}
