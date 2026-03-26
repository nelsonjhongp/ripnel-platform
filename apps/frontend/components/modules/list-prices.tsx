"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarRange, PencilLine, ReceiptText, Search, Tags } from "lucide-react";
import { buildApiUrl } from "@/lib/api";

type PriceMode = "list" | "editor" | "rules";

type PriceRow = {
  style_size_price_id: string;
  style_code: string;
  style_name: string;
  size_code: string;
  size_name: string;
  price_type: "retail" | "wholesale";
  price: number;
  start_date: string;
  end_date: string | null;
  active: boolean;
  validity_status: "active" | "scheduled" | "expired" | "inactive";
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(amount);
}

function StatusBadge({ status }: { status: PriceRow["validity_status"] | string }) {
  const styles =
    status === "active"
      ? "bg-emerald-100 text-emerald-700"
      : status === "scheduled"
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-200 text-slate-600";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>
      {status}
    </span>
  );
}

function PriceListView() {
  const [priceRows, setPriceRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(buildApiUrl("/api/prices"), { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        setPriceRows(payload.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return priceRows;
    }

    return priceRows.filter(
      (row) =>
        row.style_code.toLowerCase().includes(normalizedSearch) ||
        row.style_name.toLowerCase().includes(normalizedSearch)
    );
  }, [search]);

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-500">
              Precios
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Listado de precios</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Mockup operativo para revisar vigencias y precios por style y talla
              antes de conectar el modulo a `style_size_prices`.
            </p>
          </div>

          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por style, codigo o tipo"
              className="w-full rounded-2xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-violet-400"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Styles con precio
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{priceRows.length}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Vigentes
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {priceRows.filter((row) => row.validity_status === "active").length}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Programados
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {priceRows.filter((row) => row.validity_status === "scheduled").length}
            </p>
          </article>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Vista mockup
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Resumen por style</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {filteredRows.length} resultados
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {filteredRows.map((row) => (
            <div
              key={row.style_code}
              className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">{row.style_name}</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {row.style_code}
                    </span>
                    <StatusBadge status={row.validity_status} />
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      {row.size_code}: {formatCurrency(row.price)}
                    </span>
                  </div>
                </div>

                <div className="text-sm text-slate-500 md:text-right">
                  <p>{row.price_type}</p>
                  <p className="mt-1">{row.start_date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PriceEditorView() {
  const [priceRows, setPriceRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState("");

  useEffect(() => {
    fetch(buildApiUrl("/api/prices"), { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        setPriceRows(payload.data || []);
        setSelectedCode((payload.data || [])[0]?.style_code || "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selectedRow = priceRows.find((row) => row.style_code === selectedCode) || priceRows[0];

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-500">
          Precios
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Crear y editar precio</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Mockup de formulario para mantenimiento de precio retail por style y talla.
          La persistencia real se conectara despues a `style_size_prices`.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
          <div className="border-b border-slate-200 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Style
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Seleccionar base</h2>
          </div>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Style</label>
              <select
                value={selectedCode}
                onChange={(event) => setSelectedCode(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
              >
                {priceRows.map((row) => (
                  <option key={row.style_code} value={row.style_code}>
                    {row.style_code} - {row.style_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Tipo de precio</label>
              <select className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400">
                <option>Retail</option>
                <option>Wholesale</option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Inicio de vigencia</label>
                <input
                  type="date"
                  defaultValue="2026-03-26"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Fin de vigencia</label>
                <input
                  type="date"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                />
              </div>
            </div>

            <button className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700">
              <PencilLine className="h-4 w-4" />
              Guardar mockup
            </button>
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Detalle por talla
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">{selectedRow?.style_name}</h2>
            </div>
            {selectedRow && <StatusBadge status={selectedRow.validity_status} />}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Codigo
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{selectedRow?.style_code}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Inicio vigencia
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{selectedRow?.start_date}</p>
            </article>
          </div>

          {selectedRow && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Talla {selectedRow.size_code}</p>
                  <p className="text-xs text-slate-500">Precio {selectedRow.price_type} vigente</p>
                </div>
                <input
                  type="text"
                  defaultValue={selectedRow.price.toFixed(2)}
                  className="w-28 rounded-xl border border-slate-300 bg-white px-3 py-2 text-right text-sm outline-none transition focus:border-violet-400"
                />
              </div>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}

function WholesaleRulesView() {
  const [priceRows, setPriceRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(buildApiUrl("/api/prices"), { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        setPriceRows(payload.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-500">
          Precios
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Regla mayorista</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Mockup de reglas comerciales por cantidad, pensado para aterrizar el flujo
          antes de conectar `pricing_rules`.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
          <div className="border-b border-slate-200 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Regla base
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Nueva condicion</h2>
          </div>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Nombre</label>
              <input
                defaultValue="Mayorista 6+ prendas"
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Cantidad minima</label>
                <input
                  type="number"
                  defaultValue={6}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Estado</label>
                <select className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400">
                  <option>Activa</option>
                  <option>Programada</option>
                  <option>Vencida</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Valida desde</label>
                <input
                  type="date"
                  defaultValue="2026-03-26"
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Valida hasta</label>
                <input
                  type="date"
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Nota comercial</label>
              <textarea
                defaultValue="Aplicar beneficio mayorista sobre el total de la venta cuando se cumpla el umbral."
                className="min-h-24 w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
              />
            </div>
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Mockup actual
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">Reglas simuladas</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Mockup
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
              Reglas comerciales: Conectar backend cuando `pricing_rules` esté disponible.
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

export function ListPrices({ mode }: { mode: PriceMode }) {
  return (
    <section className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_45%,#eef2ff_100%)] p-4 md:p-5">
      <div className="mx-auto max-w-7xl">
        {mode === "list" ? <PriceListView /> : null}
        {mode === "editor" ? <PriceEditorView /> : null}
        {mode === "rules" ? <WholesaleRulesView /> : null}

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)]">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-slate-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Estado
              </p>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Mockup listo para evolucionar a `style_size_prices`.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)]">
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-slate-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Vigencias
              </p>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              El diseño ya contempla periodos activos, programados y vencidos.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)]">
            <div className="flex items-center gap-2">
              <Tags className="h-4 w-4 text-slate-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Siguiente paso
              </p>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Solo falta conectar backend cuando `Variantes` y `Styles` ya esten estables.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
