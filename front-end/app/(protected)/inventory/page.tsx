"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, Boxes, Package, Search } from "lucide-react"

type InventoryItem = {
  id: number
  sku: string
  name: string
  category: string
  location: string
  stock: number
  minStock: number
  unitCost: number
}

const INVENTORY_ITEMS: InventoryItem[] = [
  { id: 1, sku: "RIP-001", name: "Polo Essentials", category: "Ropa", location: "Almacen A1", stock: 25, minStock: 10, unitCost: 45 },
  { id: 2, sku: "RIP-013", name: "Jean Urban Flex", category: "Ropa", location: "Almacen A2", stock: 14, minStock: 8, unitCost: 82 },
  { id: 3, sku: "RIP-222", name: "Zapatilla Runner Pro", category: "Calzado", location: "Almacen B1", stock: 8, minStock: 12, unitCost: 130 },
  { id: 4, sku: "RIP-330", name: "Casaca Softshell", category: "Ropa", location: "Almacen A3", stock: 6, minStock: 6, unitCost: 120 },
  { id: 5, sku: "RIP-411", name: "Mochila City Light", category: "Accesorios", location: "Almacen C1", stock: 16, minStock: 7, unitCost: 64 },
  { id: 6, sku: "RIP-501", name: "Gorra Street Cap", category: "Accesorios", location: "Tienda 1", stock: 4, minStock: 6, unitCost: 22 },
]

const CATEGORIES = ["Todos", "Ropa", "Calzado", "Accesorios"]

function stockStatus(stock: number, minStock: number) {
  if (stock <= minStock) {
    return "Critico"
  }
  if (stock <= minStock + 4) {
    return "Bajo"
  }
  return "Normal"
}

export default function InventoryPage() {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("Todos")

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return INVENTORY_ITEMS.filter((item) => {
      const byCategory = category === "Todos" || item.category === category
      const byQuery =
        !normalizedQuery ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.sku.toLowerCase().includes(normalizedQuery) ||
        item.location.toLowerCase().includes(normalizedQuery)

      return byCategory && byQuery
    })
  }, [query, category])

  const totals = useMemo(() => {
    const totalSku = filteredItems.length
    const totalUnits = filteredItems.reduce((acc, item) => acc + item.stock, 0)
    const lowStock = filteredItems.filter((item) => item.stock <= item.minStock).length
    const inventoryValue = filteredItems.reduce((acc, item) => acc + item.stock * item.unitCost, 0)

    return { totalSku, totalUnits, lowStock, inventoryValue }
  }, [filteredItems])

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_35%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
          <p className="text-xs uppercase tracking-wide text-violet-600">Control de stock</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">Inventario</h1>
          <p className="mt-1 text-sm text-slate-600">
            Visualiza existencias por producto, alertas de minimo y valor valorizado del inventario.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">SKUs activos</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{totals.totalSku}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Unidades disponibles</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{totals.totalUnits}</p>
          </article>
          <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-amber-700">Alertas de stock</p>
            <p className="mt-2 text-2xl font-bold text-amber-800">{totals.lowStock}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Valor inventario</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">S/. {totals.inventoryValue.toFixed(2)}</p>
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
                placeholder="Buscar por nombre, SKU o ubicacion"
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((currentCategory) => (
                <button
                  key={currentCategory}
                  type="button"
                  onClick={() => setCategory(currentCategory)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    category === currentCategory
                      ? "border-violet-400 bg-violet-100 text-violet-700"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {currentCategory}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">SKU</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Producto</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Categoria</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ubicacion</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Stock</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Minimo</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Costo unit.</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredItems.map((item) => {
                  const status = stockStatus(item.stock, item.minStock)

                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-slate-700">{item.sku}</td>
                      <td className="px-3 py-3 text-sm font-semibold text-slate-900">{item.name}</td>
                      <td className="px-3 py-3 text-sm text-slate-600">{item.category}</td>
                      <td className="px-3 py-3 text-sm text-slate-600">{item.location}</td>
                      <td className="px-3 py-3 text-right text-sm font-semibold text-slate-800">{item.stock}</td>
                      <td className="px-3 py-3 text-right text-sm text-slate-600">{item.minStock}</td>
                      <td className="px-3 py-3 text-right text-sm text-slate-600">S/. {item.unitCost.toFixed(2)}</td>
                      <td className="px-3 py-3 text-sm">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            status === "Critico"
                              ? "bg-red-100 text-red-700"
                              : status === "Bajo"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {!filteredItems.length && (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No se encontraron productos con los filtros actuales.
            </div>
          )}
        </article>

        <div className="grid gap-4 xl:grid-cols-3">
          <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
              <Boxes className="h-4 w-4" />
              Reabastecimiento sugerido
            </p>
            <p className="mt-2 text-sm text-violet-800">
              Prioriza la reposicion de productos con estado Critico para evitar quiebres de stock en tienda.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Package className="h-4 w-4" />
              Cobertura general
            </p>
            <p className="mt-2 text-sm text-slate-600">
              La cobertura actual es de {totals.totalUnits} unidades distribuidas en {totals.totalSku} productos.
            </p>
          </article>

          <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              Alertas activas
            </p>
            <p className="mt-2 text-sm text-amber-800">
              Hay {totals.lowStock} productos por debajo o en su stock minimo.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}
