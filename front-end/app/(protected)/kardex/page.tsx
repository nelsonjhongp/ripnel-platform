"use client"

import { useMemo, useState } from "react"
import { ArrowDownCircle, ArrowUpCircle, ClipboardList, Search, SlidersHorizontal } from "lucide-react"

type MovementType = "Entrada" | "Salida" | "Ajuste"

type KardexMovement = {
  id: number
  date: string
  sku: string
  product: string
  type: MovementType
  reference: string
  quantity: number
  balance: number
  user: string
}

const KARDEX_DATA: KardexMovement[] = [
  {
    id: 1,
    date: "2026-03-20 09:12",
    sku: "RIP-001",
    product: "Polo Essentials",
    type: "Entrada",
    reference: "OC-1042",
    quantity: 20,
    balance: 42,
    user: "M. Valdez",
  },
  {
    id: 2,
    date: "2026-03-20 15:08",
    sku: "RIP-222",
    product: "Zapatilla Runner Pro",
    type: "Salida",
    reference: "NV-8821",
    quantity: 5,
    balance: 8,
    user: "L. Perez",
  },
  {
    id: 3,
    date: "2026-03-21 11:24",
    sku: "RIP-013",
    product: "Jean Urban Flex",
    type: "Salida",
    reference: "NV-8830",
    quantity: 3,
    balance: 14,
    user: "L. Perez",
  },
  {
    id: 4,
    date: "2026-03-21 16:50",
    sku: "RIP-501",
    product: "Gorra Street Cap",
    type: "Ajuste",
    reference: "AJ-149",
    quantity: 2,
    balance: 4,
    user: "R. Rojas",
  },
  {
    id: 5,
    date: "2026-03-22 09:10",
    sku: "RIP-411",
    product: "Mochila City Light",
    type: "Entrada",
    reference: "OC-1048",
    quantity: 12,
    balance: 16,
    user: "M. Valdez",
  },
  {
    id: 6,
    date: "2026-03-22 18:01",
    sku: "RIP-330",
    product: "Casaca Softshell",
    type: "Salida",
    reference: "NV-8860",
    quantity: 2,
    balance: 6,
    user: "L. Perez",
  },
]

const TYPE_OPTIONS: Array<"Todos" | MovementType> = ["Todos", "Entrada", "Salida", "Ajuste"]

export default function KardexPage() {
  const [query, setQuery] = useState("")
  const [movementType, setMovementType] = useState<"Todos" | MovementType>("Todos")

  const filteredMovements = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return KARDEX_DATA.filter((movement) => {
      const byType = movementType === "Todos" || movement.type === movementType
      const byQuery =
        !normalizedQuery ||
        movement.product.toLowerCase().includes(normalizedQuery) ||
        movement.sku.toLowerCase().includes(normalizedQuery) ||
        movement.reference.toLowerCase().includes(normalizedQuery)

      return byType && byQuery
    })
  }, [query, movementType])

  const totals = useMemo(() => {
    const entradas = filteredMovements
      .filter((item) => item.type === "Entrada")
      .reduce((acc, item) => acc + item.quantity, 0)

    const salidas = filteredMovements
      .filter((item) => item.type === "Salida")
      .reduce((acc, item) => acc + item.quantity, 0)

    const ajustes = filteredMovements.filter((item) => item.type === "Ajuste").length

    return { entradas, salidas, ajustes }
  }, [filteredMovements])

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_35%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
          <p className="text-xs uppercase tracking-wide text-violet-600">Trazabilidad de stock</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">Kardex</h1>
          <p className="mt-1 text-sm text-slate-600">
            Consulta entradas, salidas y ajustes por producto para auditoria y control operativo.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-emerald-700">Entradas</p>
            <p className="mt-2 text-2xl font-bold text-emerald-800">{totals.entradas}</p>
          </article>
          <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-rose-700">Salidas</p>
            <p className="mt-2 text-2xl font-bold text-rose-800">{totals.salidas}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Ajustes registrados</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{totals.ajustes}</p>
          </article>
        </div>

        <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-md backdrop-blur md:p-6">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por producto, SKU o referencia"
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-600">
                <SlidersHorizontal className="h-4 w-4" />
                Tipo:
              </span>
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMovementType(option)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    movementType === option
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
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">SKU</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Producto</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Referencia</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Cantidad</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Saldo</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Usuario</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredMovements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">{movement.date}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-slate-700">{movement.sku}</td>
                    <td className="px-3 py-3 text-sm font-semibold text-slate-900">{movement.product}</td>
                    <td className="px-3 py-3 text-sm">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          movement.type === "Entrada"
                            ? "bg-emerald-100 text-emerald-700"
                            : movement.type === "Salida"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {movement.type === "Entrada" ? <ArrowUpCircle className="h-3.5 w-3.5" /> : null}
                        {movement.type === "Salida" ? <ArrowDownCircle className="h-3.5 w-3.5" /> : null}
                        {movement.type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-600">{movement.reference}</td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-slate-800">{movement.quantity}</td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-slate-800">{movement.balance}</td>
                    <td className="px-3 py-3 text-sm text-slate-600">{movement.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!filteredMovements.length && (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No existen movimientos para los filtros seleccionados.
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ClipboardList className="h-4 w-4" />
            Nota operativa
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Esta vista usa datos de ejemplo. Al conectarla al backend, recomiendo filtrar tambien por rango de fechas
            y exportar resultados para auditorias.
          </p>
        </article>
      </div>
    </section>
  )
}
