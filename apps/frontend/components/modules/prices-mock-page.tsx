"use client";

import { useMemo, useState } from "react";
import { CalendarRange, PencilLine, ReceiptText, Search, Tags } from "lucide-react";

type PriceMode = "list" | "editor" | "rules";

type PriceRow = {
  styleCode: string;
  styleName: string;
  garmentType: string;
  status: "Vigente" | "Programado" | "Vencido";
  validity: string;
  prices: { sizeCode: string; amount: number }[];
};

const mockPriceRows: PriceRow[] = [
  {
    styleCode: "CAF-RIP",
    styleName: "Cafarena - Rip",
    garmentType: "Cafarena",
    status: "Vigente",
    validity: "Desde 26/03/2026",
    prices: [
      { sizeCode: "ST", amount: 15 },
      { sizeCode: "L", amount: 17 },
      { sizeCode: "XL", amount: 18 },
    ],
  },
  {
    styleCode: "JOG-FTER",
    styleName: "Jogger - French Terry",
    garmentType: "Jogger",
    status: "Vigente",
    validity: "Desde 26/03/2026",
    prices: [
      { sizeCode: "S", amount: 21 },
      { sizeCode: "M", amount: 21 },
      { sizeCode: "L", amount: 22 },
      { sizeCode: "XL", amount: 24 },
    ],
  },
  {
    styleCode: "LEG-SUP",
    styleName: "Legging - Suplex",
    garmentType: "Legging",
    status: "Programado",
    validity: "Desde 01/04/2026",
    prices: [
      { sizeCode: "S", amount: 15 },
      { sizeCode: "M", amount: 15 },
      { sizeCode: "L", amount: 16 },
      { sizeCode: "XL", amount: 18 },
    ],
  },
  {
    styleCode: "POL-FLIC",
    styleName: "Polo Manga Corta - Full Licra",
    garmentType: "Polo",
    status: "Vigente",
    validity: "Desde 26/03/2026",
    prices: [
      { sizeCode: "ST", amount: 13 },
      { sizeCode: "L", amount: 15 },
      { sizeCode: "XL", amount: 17 },
    ],
  },
  {
    styleCode: "SHO-CHA",
    styleName: "Short - Chaliz",
    garmentType: "Short",
    status: "Vigente",
    validity: "Desde 26/03/2026",
    prices: [{ sizeCode: "ST", amount: 13 }],
  },
];

const mockRules = [
  {
    name: "Mayorista 6+ prendas",
    minQty: 6,
    state: "Activa",
    validity: "Marzo 2026 - abierto",
    note: "Aplica descuento comercial sobre el total de la venta.",
  },
  {
    name: "Mayorista 12+ prendas",
    minQty: 12,
    state: "Programada",
    validity: "Desde abril 2026",
    note: "Pensada para pedidos de reposicion y campañas.",
  },
  {
    name: "Promocion por lanzamiento",
    minQty: 4,
    state: "Vencida",
    validity: "Febrero 2026",
    note: "Se mantuvo separada para no alterar el historial general.",
  },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(amount);
}

function StatusBadge({ status }: { status: PriceRow["status"] | string }) {
  const styles =
    status === "Vigente" || status === "Activa"
      ? "bg-emerald-100 text-emerald-700"
      : status === "Programado"
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-200 text-slate-600";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>
      {status}
    </span>
  );
}

function PriceListView() {
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return mockPriceRows;
    }

    return mockPriceRows.filter(
      (row) =>
        row.styleCode.toLowerCase().includes(normalizedSearch) ||
        row.styleName.toLowerCase().includes(normalizedSearch) ||
        row.garmentType.toLowerCase().includes(normalizedSearch)
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
            <p className="mt-2 text-2xl font-semibold text-slate-900">{mockPriceRows.length}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Vigentes
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {mockPriceRows.filter((row) => row.status === "Vigente").length}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Programados
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {mockPriceRows.filter((row) => row.status === "Programado").length}
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
              key={row.styleCode}
              className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">{row.styleName}</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {row.styleCode}
                    </span>
                    <StatusBadge status={row.status} />
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {row.prices.map((price) => (
                      <span
                        key={`${row.styleCode}-${price.sizeCode}`}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                      >
                        {price.sizeCode}: {formatCurrency(price.amount)}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-sm text-slate-500 md:text-right">
                  <p>{row.garmentType}</p>
                  <p className="mt-1">{row.validity}</p>
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
  const [selectedCode, setSelectedCode] = useState(mockPriceRows[1].styleCode);
  const selectedRow = mockPriceRows.find((row) => row.styleCode === selectedCode) || mockPriceRows[0];

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
                {mockPriceRows.map((row) => (
                  <option key={row.styleCode} value={row.styleCode}>
                    {row.styleCode} - {row.styleName}
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
              <h2 className="mt-1 text-xl font-semibold text-slate-950">{selectedRow.styleName}</h2>
            </div>
            <StatusBadge status={selectedRow.status} />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Codigo
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{selectedRow.styleCode}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Vigencia
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{selectedRow.validity}</p>
            </article>
          </div>

          <div className="mt-4 space-y-3">
            {selectedRow.prices.map((price) => (
              <div
                key={`${selectedRow.styleCode}-${price.sizeCode}`}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">Talla {price.sizeCode}</p>
                  <p className="text-xs text-slate-500">Precio retail vigente</p>
                </div>
                <input
                  type="text"
                  defaultValue={price.amount.toFixed(2)}
                  className="w-28 rounded-xl border border-slate-300 bg-white px-3 py-2 text-right text-sm outline-none transition focus:border-violet-400"
                />
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

function WholesaleRulesView() {
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
              {mockRules.length} reglas
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {mockRules.map((rule) => (
              <div
                key={rule.name}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">{rule.name}</h3>
                      <StatusBadge status={rule.state} />
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{rule.note}</p>
                  </div>
                  <div className="text-sm text-slate-500 md:text-right">
                    <p>{rule.minQty} prendas min.</p>
                    <p className="mt-1">{rule.validity}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

export function PricesMockPage({ mode }: { mode: PriceMode }) {
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
