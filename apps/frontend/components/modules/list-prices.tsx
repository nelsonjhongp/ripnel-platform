"use client";

import { useEffect, useMemo, useState } from "react";
import { PencilLine, Search } from "lucide-react";
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

type PricingRuleRow = {
  rule_id: string;
  rule_type: string;
  min_qty: number;
  active: boolean;
  valid_from: string | null;
  valid_to: string | null;
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dateStr));
}

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
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(buildApiUrl("/api/prices"), { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        setPriceRows(payload.data || []);
      })
      .catch(console.error);
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
  }, [priceRows, search]);

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-500">
              Precios
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Listado de precios</h1>
          </div>

          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por código o nombre"
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
              key={row.style_size_price_id}
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
                  <p className="capitalize">{row.price_type}</p>
                  <p className="mt-1">{formatDate(row.start_date)}</p>
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
  const [selectedPriceId, setSelectedPriceId] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [activeInput, setActiveInput] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetch(buildApiUrl("/api/prices"), { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        setPriceRows(payload.data || []);
        setSelectedPriceId((payload.data || [])[0]?.style_size_price_id || "");
      })
      .catch(console.error)
      .finally(() => undefined);
  }, []);

  const selectedRow =
    priceRows.find((row) => row.style_size_price_id === selectedPriceId) || priceRows[0];

  useEffect(() => {
    if (!selectedRow) {
      setPriceInput("");
      setStartDateInput("");
      setEndDateInput("");
      setActiveInput(true);
      return;
    }

    setPriceInput(String(selectedRow.price));
    setStartDateInput(selectedRow.start_date?.slice(0, 10) || "");
    setEndDateInput(selectedRow.end_date?.slice(0, 10) || "");
    setActiveInput(selectedRow.active);
    setSaveMessage(null);
    setSaveError(null);
  }, [selectedRow]);

  async function handleSavePrice() {
    if (!selectedRow) {
      return;
    }

    const payload = {
      price: Number(priceInput),
      start_date: startDateInput,
      end_date: endDateInput || null,
      active: activeInput,
    };

    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const response = await fetch(
        buildApiUrl(`/api/prices/${selectedRow.style_size_price_id}`),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "No se pudo actualizar el precio");
      }

      const updated = result?.data;

      if (!updated) {
        throw new Error("La API no devolvio el precio actualizado");
      }

      setPriceRows((currentRows) =>
        currentRows.map((row) =>
          row.style_size_price_id === selectedRow.style_size_price_id
            ? {
                ...row,
                price: Number(updated.price),
                start_date: updated.start_date,
                end_date: updated.end_date,
                active: updated.active,
              }
            : row
        )
      );

      setSaveMessage("Precio actualizado correctamente");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo actualizar el precio");
    } finally {
      setSaving(false);
    }
  }

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
                value={selectedRow?.style_size_price_id || ""}
                onChange={(event) => setSelectedPriceId(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
              >
                {priceRows.map((row) => (
                  <option key={row.style_size_price_id} value={row.style_size_price_id}>
                    {row.style_code} - {row.style_name} - Talla {row.size_code}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Tipo de precio</label>
              <input
                disabled
                value={selectedRow?.price_type || ""}
                className="w-full rounded-2xl border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm capitalize text-slate-600 outline-none"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Inicio de vigencia</label>
                <input
                  type="date"
                  value={startDateInput}
                  onChange={(event) => setStartDateInput(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Fin de vigencia</label>
                <input
                  type="date"
                  value={endDateInput}
                  onChange={(event) => setEndDateInput(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={activeInput}
                onChange={(event) => setActiveInput(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Precio activo
            </label>

            <button
              onClick={handleSavePrice}
              disabled={!selectedRow || saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PencilLine className="h-4 w-4" />
              {saving ? "Guardando..." : "Guardar"}
            </button>

            {saveMessage ? <p className="text-sm text-emerald-700">{saveMessage}</p> : null}
            {saveError ? <p className="text-sm text-rose-700">{saveError}</p> : null}
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
              <p className="mt-2 text-lg font-semibold text-slate-900">{formatDate(selectedRow?.start_date ?? null)}</p>
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
                  value={priceInput}
                  onChange={(event) => setPriceInput(event.target.value)}
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
  const [rules, setRules] = useState<PricingRuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [minQtyInput, setMinQtyInput] = useState("3");
  const [activeInput, setActiveInput] = useState(true);
  const [validFromInput, setValidFromInput] = useState("");
  const [validToInput, setValidToInput] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedRule =
    rules.find((rule) => rule.rule_type === "WHOLESALE_MIN_QTY_TOTAL") || rules[0] || null;

  useEffect(() => {
    fetch(buildApiUrl("/api/pricing-rules"), { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        setRules(payload.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedRule) {
      return;
    }

    setMinQtyInput(String(selectedRule.min_qty));
    setActiveInput(selectedRule.active);
    setValidFromInput(selectedRule.valid_from?.slice(0, 10) || "");
    setValidToInput(selectedRule.valid_to?.slice(0, 10) || "");
    setSaveMessage(null);
    setSaveError(null);
  }, [selectedRule]);

  async function handleSaveRule() {
    const payload = {
      min_qty: Number(minQtyInput),
      active: activeInput,
      valid_from: validFromInput || null,
      valid_to: validToInput || null,
    };

    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      if (selectedRule) {
        const response = await fetch(
          buildApiUrl(`/api/pricing-rules/${selectedRule.rule_id}`),
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message || "No se pudo actualizar la regla");
        }

        setRules((currentRules) =>
          currentRules.map((rule) =>
            rule.rule_id === selectedRule.rule_id ? result.data : rule
          )
        );
      } else {
        const response = await fetch(buildApiUrl("/api/pricing-rules"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rule_type: "WHOLESALE_MIN_QTY_TOTAL",
            ...payload,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message || "No se pudo crear la regla");
        }

        setRules((currentRules) => [...currentRules, result.data]);
      }

      setSaveMessage("Regla mayorista guardada correctamente");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar la regla");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-500">
          Precios
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Regla mayorista</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Configura la regla comercial mayorista por cantidad minima total.
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
                defaultValue="Mayorista 3+ prendas"
                disabled
                className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Cantidad minima</label>
                <input
                  type="number"
                  min={1}
                  value={minQtyInput}
                  onChange={(event) => setMinQtyInput(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Estado</label>
                <label className="inline-flex h-10.5 items-center gap-2 rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={activeInput}
                    onChange={(event) => setActiveInput(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Activa
                </label>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Valida desde</label>
                <input
                  type="date"
                  value={validFromInput}
                  onChange={(event) => setValidFromInput(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Valida hasta</label>
                <input
                  type="date"
                  value={validToInput}
                  onChange={(event) => setValidToInput(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                />
              </div>
            </div>

            <button
              onClick={handleSaveRule}
              disabled={loading || saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PencilLine className="h-4 w-4" />
              {saving ? "Guardando..." : "Guardar regla"}
            </button>

            {saveMessage ? <p className="text-sm text-emerald-700">{saveMessage}</p> : null}
            {saveError ? <p className="text-sm text-rose-700">{saveError}</p> : null}
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Reglas actuales
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">pricing_rules</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{rules.length}</span>
          </div>

          <div className="mt-4 space-y-3">
            {rules.map((rule) => (
              <article key={rule.rule_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{rule.rule_type}</p>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${rule.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                    {rule.active ? "Activa" : "Inactiva"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">Minimo: {rule.min_qty} unidades</p>
                <p className="mt-1 text-xs text-slate-500">
                  Vigencia: {formatDate(rule.valid_from)} - {formatDate(rule.valid_to)}
                </p>
              </article>
            ))}

            {!loading && rules.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                No hay reglas creadas todavia.
              </div>
            ) : null}
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

      </div>
    </section>
  );
}
