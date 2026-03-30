"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, LoaderCircle, MapPin, Package, Search } from "lucide-react";
import { buildApiUrl } from "@/lib/api";

type InventoryItem = {
  location_id: string;
  location_code: string;
  location_name: string;
  variant_id: string;
  sku: string;
  style_id: string;
  style_code: string;
  style_name: string;
  garment_type_name: string | null;
  size_id: string;
  size_code: string;
  color_id: string;
  color_name: string;
  qty: number;
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");

  async function loadInventory() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl("/api/inventory"), {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "No se pudo cargar inventario");
      }

      setItems(payload.data || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar inventario"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  const locationOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const item of items) {
      map.set(item.location_code, item.location_name);
    }

    return Array.from(map.entries()).map(([code, name]) => ({
      code,
      name,
    }));
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesLocation =
        locationFilter === "all" || item.location_code === locationFilter;
      const matchesQuery =
        !normalizedQuery ||
        item.sku.toLowerCase().includes(normalizedQuery) ||
        item.style_code.toLowerCase().includes(normalizedQuery) ||
        item.style_name.toLowerCase().includes(normalizedQuery) ||
        item.location_name.toLowerCase().includes(normalizedQuery) ||
        (item.garment_type_name || "").toLowerCase().includes(normalizedQuery);

      return matchesLocation && matchesQuery;
    });
  }, [items, query, locationFilter]);

  const totals = useMemo(() => {
    const uniqueSkus = new Set(filteredItems.map((item) => item.sku)).size;
    const totalUnits = filteredItems.reduce((acc, item) => acc + item.qty, 0);
    const uniqueLocations = new Set(
      filteredItems.map((item) => item.location_id)
    ).size;

    return {
      uniqueSkus,
      totalUnits,
      uniqueLocations,
    };
  }, [filteredItems]);

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_35%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
          <p className="text-xs uppercase tracking-wide text-violet-600">
            Control de stock
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
            Inventario
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Visualiza existencias reales por variante y sede usando el stock
            actual consolidado de la base de datos.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              SKUs con stock
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {totals.uniqueSkus}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Unidades disponibles
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {totals.totalUnits}
            </p>
          </article>
          <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-violet-700">
              Sedes con stock
            </p>
            <p className="mt-2 text-2xl font-bold text-violet-800">
              {totals.uniqueLocations}
            </p>
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
                placeholder="Buscar por SKU, style, producto o ubicacion"
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setLocationFilter("all")}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  locationFilter === "all"
                    ? "border-violet-400 bg-violet-100 text-violet-700"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                Todas
              </button>
              {locationOptions.map((location) => (
                <button
                  key={location.code}
                  type="button"
                  onClick={() => setLocationFilter(location.code)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    locationFilter === location.code
                      ? "border-violet-400 bg-violet-100 text-violet-700"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {location.code}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-sm text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Cargando inventario...
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      SKU
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Producto
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Tipo prenda
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Style
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Variante
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Ubicacion
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Stock
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredItems.map((item) => (
                    <tr
                      key={`${item.location_id}-${item.variant_id}`}
                      className="hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-slate-700">
                        {item.sku}
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold text-slate-900">
                        {item.style_name}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {item.garment_type_name || "Sin tipo"}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {item.style_code}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {item.size_code} / {item.color_name}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-violet-500" />
                          {item.location_name}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold text-slate-800">
                        {item.qty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !filteredItems.length ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No se encontraron registros de inventario con los filtros actuales.
            </div>
          ) : null}
        </article>

        <div className="grid gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
              <Boxes className="h-4 w-4" />
              Lectura real de stock
            </p>
            <p className="mt-2 text-sm text-violet-800">
              Este listado ya sale del backend y refleja el estado actual de la
              tabla <code>inventory</code> por sede y variante.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Package className="h-4 w-4" />
              Regla operativa
            </p>
            <p className="mt-2 text-sm text-slate-600">
              El stock no debe editarse directo. La apertura inicial y los
              ajustes pasan por documentos confirmados; luego el movimiento
              normal sigue por ventas y transferencias.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
