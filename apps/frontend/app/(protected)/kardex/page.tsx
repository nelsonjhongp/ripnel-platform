"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ClipboardList,
  LoaderCircle,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { buildApiUrl } from "@/lib/api";

type MovementType = "IN" | "OUT" | "ADJUST";

type KardexMovement = {
  movement_id: string;
  location_id: string;
  location_code: string;
  location_name: string;
  variant_id: string;
  sku: string;
  style_code: string;
  style_name: string;
  movement_type: MovementType;
  quantity: number;
  quantity_effect: number;
  balance_qty: number;
  reason: string | null;
  reference_type: string | null;
  reference_id: string | null;
  reference_line_id: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
};

const TYPE_OPTIONS: Array<"ALL" | MovementType> = ["ALL", "IN", "OUT", "ADJUST"];

function formatMovementTypeLabel(type: MovementType) {
  if (type === "IN") {
    return "Entrada";
  }

  if (type === "OUT") {
    return "Salida";
  }

  return "Ajuste";
}

function formatReference(movement: KardexMovement) {
  if (movement.reference_type && movement.reference_id) {
    return `${movement.reference_type}:${movement.reference_id.slice(0, 8)}`;
  }

  if (movement.reference_type) {
    return movement.reference_type;
  }

  return movement.reason || "Sin referencia";
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default function KardexPage() {
  const [movements, setMovements] = useState<KardexMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [movementType, setMovementType] = useState<"ALL" | MovementType>("ALL");

  async function loadKardex() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl("/api/inventory/kardex"), {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "No se pudo cargar kardex");
      }

      setMovements(payload.data || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar kardex"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // defer loadKardex to avoid synchronous setState inside effect
    void Promise.resolve().then(() => loadKardex());
  }, []);

  const filteredMovements = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return movements.filter((movement) => {
      const matchesType =
        movementType === "ALL" || movement.movement_type === movementType;
      const reference = formatReference(movement).toLowerCase();
      const matchesQuery =
        !normalizedQuery ||
        movement.sku.toLowerCase().includes(normalizedQuery) ||
        movement.style_name.toLowerCase().includes(normalizedQuery) ||
        movement.style_code.toLowerCase().includes(normalizedQuery) ||
        movement.location_name.toLowerCase().includes(normalizedQuery) ||
        reference.includes(normalizedQuery);

      return matchesType && matchesQuery;
    });
  }, [movements, query, movementType]);

  const totals = useMemo(() => {
    return filteredMovements.reduce(
      (acc, movement) => {
        if (movement.quantity_effect > 0) {
          acc.entries += movement.quantity_effect;
        }

        if (movement.quantity_effect < 0) {
          acc.exits += Math.abs(movement.quantity_effect);
        }

        if (movement.movement_type === "ADJUST") {
          acc.adjustments += 1;
        }

        return acc;
      },
      { entries: 0, exits: 0, adjustments: 0 }
    );
  }, [filteredMovements]);

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_35%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
          <p className="text-xs uppercase tracking-wide text-violet-600">
            Trazabilidad de stock
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
            Kardex
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Consulta entradas, salidas y ajustes registrados en{" "}
            <code>stock_movements</code> para auditoria y control operativo.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-emerald-700">
              Entradas
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-800">
              {totals.entries}
            </p>
          </article>
          <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-rose-700">
              Salidas
            </p>
            <p className="mt-2 text-2xl font-bold text-rose-800">
              {totals.exits}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Ajustes registrados
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {totals.adjustments}
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
                placeholder="Buscar por SKU, style, producto, ubicacion o referencia"
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
                  {option === "ALL" ? "Todos" : formatMovementTypeLabel(option)}
                </button>
              ))}
            </div>
          </div>

{error ? (
            <div role="alert" aria-live="polite" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-sm text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Cargando kardex...
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Fecha
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      SKU
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Producto
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Ubicacion
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Tipo
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Referencia
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Movimiento
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Saldo
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Usuario
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredMovements.map((movement) => (
                    <tr
                      key={movement.movement_id}
                      className="hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">
                        {formatDateTime(movement.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-slate-700">
                        {movement.sku}
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <p className="font-semibold text-slate-900">
                          {movement.style_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {movement.style_code}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {movement.location_name}
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            movement.movement_type === "IN"
                              ? "bg-emerald-100 text-emerald-700"
                              : movement.movement_type === "OUT"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {movement.movement_type === "IN" ? (
                            <ArrowUpCircle className="h-3.5 w-3.5" />
                          ) : null}
                          {movement.movement_type === "OUT" ? (
                            <ArrowDownCircle className="h-3.5 w-3.5" />
                          ) : null}
                          {formatMovementTypeLabel(movement.movement_type)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {formatReference(movement)}
                      </td>
                      <td
                        className={`px-3 py-3 text-right text-sm font-semibold ${
                          movement.quantity_effect >= 0
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }`}
                      >
                        {movement.quantity_effect >= 0 ? "+" : ""}
                        {movement.quantity_effect}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold text-slate-800">
                        {movement.balance_qty}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {movement.created_by_name || "Sistema"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !filteredMovements.length ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No existen movimientos para los filtros seleccionados.
            </div>
          ) : null}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ClipboardList className="h-4 w-4" />
            Nota operativa
          </p>
          <p className="mt-2 text-sm text-slate-600">
            El saldo se calcula desde backend sobre la secuencia real de{" "}
            <code>stock_movements</code>. Los ajustes deben confirmarse para
            impactar inventario y quedar trazados aqui.
          </p>
        </article>
      </div>
    </section>
  );
}
