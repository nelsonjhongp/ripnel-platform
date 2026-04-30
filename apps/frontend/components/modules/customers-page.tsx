"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, PencilLine, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { apiFetch, buildApiUrl, unwrapApiData } from "@/lib/api";

type Customer = {
  customer_id: string;
  internal_code: string | null;
  document_type: string;
  document_number: string | null;
  full_name: string | null;
  business_name: string | null;
  commercial_name: string | null;
  email: string | null;
  phone: string | null;
  customer_type: string;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type CustomerFormState = {
  document_type: string;
  document_number: string;
  full_name: string;
  business_name: string;
  commercial_name: string;
  email: string;
  phone: string;
  customer_type: string;
  active: boolean;
  notes: string;
};

const DOC_TYPE_LABELS: Record<string, string> = {
  none: "—",
  dni: "DNI",
  ruc: "RUC",
  ce: "CE",
  passport: "Pasaporte",
};

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  retail: "Retail",
  wholesale: "Mayorista",
};

const DOC_RULES: Record<string, { label: string; regex: RegExp }> = {
  dni: { label: "DNI", regex: /^\d{8}$/ },
  ruc: { label: "RUC", regex: /^\d{11}$/ },
  ce: { label: "CE", regex: /^[A-Za-z0-9]{9,12}$/ },
  passport: { label: "Pasaporte", regex: /^[A-Za-z0-9]{6,15}$/ },
};

const EMPTY_FORM: CustomerFormState = {
  document_type: "none",
  document_number: "",
  full_name: "",
  business_name: "",
  commercial_name: "",
  email: "",
  phone: "",
  customer_type: "retail",
  active: true,
  notes: "",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function buildDisplayName(c: Customer) {
  return c.full_name || c.business_name || c.commercial_name || "—";
}

function trimOrNull(value: string) {
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

function validateCustomerInput(
  input: Pick<
    CustomerFormState,
    "document_type" | "document_number" | "full_name" | "business_name" | "commercial_name"
  >
) {
  const nameIsMissing =
    !input.full_name.trim() && !input.business_name.trim() && !input.commercial_name.trim();

  if (nameIsMissing) {
    return "Ingresa al menos un nombre.";
  }

  if (input.document_type === "none") {
    if (input.document_number.trim()) {
      return "Si el tipo es sin documento, el número debe ir vacío.";
    }
    return null;
  }

  const rule = DOC_RULES[input.document_type];
  if (!rule) {
    return "Tipo de documento inválido.";
  }

  const normalizedNumber =
    input.document_type === "passport"
      ? input.document_number.trim().toUpperCase()
      : input.document_number.trim();

  if (!normalizedNumber) {
    return "Número de documento obligatorio.";
  }

  if (!rule.regex.test(normalizedNumber)) {
    return `Formato inválido para ${rule.label}.`;
  }

  return null;
}

function buildCustomerPayload(input: CustomerFormState) {
  const normalizedDocumentNumber =
    input.document_type === "none"
      ? null
      : input.document_type === "passport"
      ? input.document_number.trim().toUpperCase()
      : input.document_number.trim();

  return {
    document_type: input.document_type,
    document_number: normalizedDocumentNumber,
    full_name: trimOrNull(input.full_name),
    business_name: trimOrNull(input.business_name),
    commercial_name: trimOrNull(input.commercial_name),
    email: trimOrNull(input.email),
    phone: trimOrNull(input.phone),
    customer_type: input.customer_type,
    active: input.active,
    notes: trimOrNull(input.notes),
  };
}

function toFormState(c: Customer): CustomerFormState {
  return {
    document_type: c.document_type,
    document_number: c.document_number || "",
    full_name: c.full_name || "",
    business_name: c.business_name || "",
    commercial_name: c.commercial_name || "",
    email: c.email || "",
    phone: c.phone || "",
    customer_type: c.customer_type,
    active: c.active,
    notes: c.notes || "",
  };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docFilter, setDocFilter] = useState<string>("all");
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");

  const [createState, setCreateState] = useState<CustomerFormState>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editState, setEditState] = useState<CustomerFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function fetchCustomers(docType: string, sortOrder: string) {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (docType !== "all") params.set("document_type", docType);
      params.set("sort", sortOrder);

      const payload = await apiFetch<{ ok: boolean; data: Customer[] } | Customer[]>(
        `/api/customers?${params.toString()}`,
        {
          signal: ctrl.signal,
          cache: "no-store",
        }
      );

      const nextCustomers = unwrapApiData<Customer[]>(payload);
      setCustomers(Array.isArray(nextCustomers) ? nextCustomers : []);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCustomers(docFilter, sort);
  }, [docFilter, sort]);

  function openEditModal(customer: Customer) {
    setEditingCustomer(customer);
    setEditState(toFormState(customer));
    setSaveError(null);
  }

  function closeEditModal() {
    setEditingCustomer(null);
    setEditState(EMPTY_FORM);
    setSaveError(null);
  }

  async function createCustomer() {
    setCreateError(null);
    const validationError = validateCustomerInput(createState);
    if (validationError) {
      setCreateError(validationError);
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(buildApiUrl("/api/customers"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCustomerPayload(createState)),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Error al crear cliente");

      setCustomers((prev) => (sort === "desc" ? [payload.data, ...prev] : [...prev, payload.data]));
      setCreateState(EMPTY_FORM);
      setActiveTab("list");
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Error al crear cliente");
    } finally {
      setCreating(false);
    }
  }

  async function saveEdit() {
    if (!editingCustomer) return;

    const validationError = validateCustomerInput(editState);
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch(buildApiUrl(`/api/customers/${editingCustomer.customer_id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCustomerPayload(editState)),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Error al guardar");

      setCustomers((prev) =>
        prev.map((c) => (c.customer_id === editingCustomer.customer_id ? payload.data : c))
      );
      closeEditModal();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(customerId: string) {
    const customer = customers.find((c) => c.customer_id === customerId);
    const customerLabel = customer ? buildDisplayName(customer) : "este cliente";

    if (!window.confirm(`¿Eliminar ${customerLabel}? Esta acción no se puede deshacer.`)) {
      return;
    }

    setDeletingId(customerId);
    setSaveError(null);

    try {
      const res = await fetch(buildApiUrl(`/api/customers/${customerId}`), { method: "DELETE" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Error al eliminar cliente");

      setCustomers((prev) => prev.filter((c) => c.customer_id !== customerId));
      if (editingCustomer?.customer_id === customerId) closeEditModal();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Error al eliminar cliente");
    } finally {
      setDeletingId(null);
    }
  }

  const docFilterOptions = [
    { value: "all", label: "Todos" },
    { value: "dni", label: "DNI" },
    { value: "ruc", label: "RUC" },
    { value: "ce", label: "CE" },
    { value: "passport", label: "Pasaporte" },
    { value: "none", label: "Sin doc." },
  ];

  const isEmpty = !loading && !error && customers.length === 0;

  return (
    <section className="ops-page min-h-screen p-4 md:p-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <header className="space-y-1">
          <h1 className="ops-title text-2xl font-semibold">Clientes</h1>
          <p className="ops-text-muted text-sm">Gestión operativa de clientes.</p>
        </header>

        <div className="ops-surface rounded-2xl border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-[var(--ops-border-strong)] p-1">
              <button
                type="button"
                onClick={() => setActiveTab("list")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "list"
                    ? "bg-[var(--ripnel-accent)] text-white"
                    : "text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)]"
                }`}
              >
                Listado
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("create")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "create"
                    ? "bg-[var(--ripnel-accent)] text-white"
                    : "text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)]"
                }`}
              >
                Nuevo cliente
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/clientes/dashboards"
                className="sales-chip sales-chip-interactive rounded-md px-3 py-1.5 text-xs font-semibold"
              >
                Dashboards BI
              </Link>
              <button
                type="button"
                onClick={() => fetchCustomers(docFilter, sort)}
                disabled={loading}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 py-1.5 text-xs font-semibold text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                Actualizar
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-md border border-red-300 bg-red-100/70 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        {saveError ? (
          <div className="rounded-md border border-red-300 bg-red-100/70 px-3 py-2 text-sm text-red-700">{saveError}</div>
        ) : null}

        {activeTab === "list" ? (
          <div className="ops-surface rounded-2xl border">
            <div className="border-b border-[var(--ops-border-strong)] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-1 rounded-md border border-[var(--ops-border-strong)] bg-[var(--ops-field)] p-1">
                  {docFilterOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDocFilter(opt.value)}
                      className={`cursor-pointer rounded px-2.5 py-1 text-xs font-semibold transition ${
                        docFilter === opt.value
                          ? "bg-[var(--ripnel-accent)] text-white"
                          : "text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setSort((s) => (s === "desc" ? "asc" : "desc"))}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 py-1.5 text-xs font-semibold text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
                >
                  {sort === "desc" ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                  Fecha {sort === "desc" ? "más reciente" : "más antigua"}
                </button>

                <span className="ml-auto text-xs text-[var(--ops-text-muted)]">
                  {loading ? "Cargando..." : `${customers.length} cliente${customers.length !== 1 ? "s" : ""}`}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)]">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--ops-text-muted)]">Código</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--ops-text-muted)]">Tipo doc.</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--ops-text-muted)]">N° documento</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--ops-text-muted)]">Cliente</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--ops-text-muted)]">Email</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--ops-text-muted)]">Teléfono</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--ops-text-muted)]">Tipo</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--ops-text-muted)]">Estado</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--ops-text-muted)]">Ingreso</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--ops-text-muted)]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ops-border-soft)]">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-6 text-center text-sm text-[var(--ops-text-muted)]">
                        Cargando clientes...
                      </td>
                    </tr>
                  ) : null}

                  {isEmpty ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-6 text-center text-sm text-[var(--ops-text-muted)]">
                        No hay clientes registrados con este filtro.
                      </td>
                    </tr>
                  ) : null}

                  {!loading &&
                    customers.map((c) => (
                      <tr key={c.customer_id} className="hover:bg-[var(--ops-surface-muted)]/60">
                        <td className="px-3 py-2 font-mono text-xs text-[var(--ops-text-muted)]">{c.internal_code || "—"}</td>
                        <td className="px-3 py-2">
                          <span className="sales-chip rounded px-1.5 py-0.5 text-[11px] font-semibold">
                            {DOC_TYPE_LABELS[c.document_type] ?? c.document_type}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-[var(--ops-text)]">{c.document_number || "—"}</td>
                        <td className="px-3 py-2 text-[var(--ops-text)]">{buildDisplayName(c)}</td>
                        <td className="px-3 py-2 text-[var(--ops-text-muted)]">{c.email || "—"}</td>
                        <td className="px-3 py-2 text-[var(--ops-text-muted)]">{c.phone || "—"}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`sales-chip rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                              c.customer_type === "wholesale" ? "sales-chip-accent" : "sales-chip-neutral"
                            }`}
                          >
                            {CUSTOMER_TYPE_LABELS[c.customer_type] ?? c.customer_type}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`sales-chip rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                              c.active ? "sales-chip-success" : "sales-chip-neutral"
                            }`}
                          >
                            {c.active ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-[var(--ops-text-muted)]">{formatDate(c.created_at)}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(c)}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-2.5 py-1 text-xs font-semibold text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
                            >
                              <PencilLine size={12} />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteCustomer(c.customer_id)}
                              disabled={deletingId === c.customer_id}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--ops-border-soft)] bg-transparent px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 size={12} />
                              {deletingId === c.customer_id ? "Eliminando..." : "Eliminar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="ops-surface rounded-2xl border p-4">
            {createError ? (
              <div className="mb-3 rounded-md border border-red-300 bg-red-100/70 px-3 py-2 text-sm text-red-700">
                {createError}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <select
                className="sales-field h-9 rounded-md px-2.5 text-sm outline-none"
                value={createState.document_type}
                onChange={(e) =>
                  setCreateState((s) => ({
                    ...s,
                    document_type: e.target.value,
                    document_number: e.target.value === "none" ? "" : s.document_number,
                  }))
                }
              >
                <option value="none">Sin documento</option>
                <option value="dni">DNI</option>
                <option value="ruc">RUC</option>
                <option value="ce">CE</option>
                <option value="passport">Pasaporte</option>
              </select>
              <input
                className="sales-field h-9 rounded-md px-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="Número de documento"
                value={createState.document_number}
                disabled={createState.document_type === "none"}
                onChange={(e) => setCreateState((s) => ({ ...s, document_number: e.target.value }))}
              />
              <select
                className="sales-field h-9 rounded-md px-2.5 text-sm outline-none"
                value={createState.customer_type}
                onChange={(e) => setCreateState((s) => ({ ...s, customer_type: e.target.value }))}
              >
                <option value="retail">Retail</option>
                <option value="wholesale">Mayorista</option>
              </select>
              <input
                className="sales-field h-9 rounded-md px-2.5 text-sm outline-none"
                placeholder="Nombre completo"
                value={createState.full_name}
                onChange={(e) => setCreateState((s) => ({ ...s, full_name: e.target.value }))}
              />
              <input
                className="sales-field h-9 rounded-md px-2.5 text-sm outline-none"
                placeholder="Razón social"
                value={createState.business_name}
                onChange={(e) => setCreateState((s) => ({ ...s, business_name: e.target.value }))}
              />
              <input
                className="sales-field h-9 rounded-md px-2.5 text-sm outline-none"
                placeholder="Nombre comercial"
                value={createState.commercial_name}
                onChange={(e) => setCreateState((s) => ({ ...s, commercial_name: e.target.value }))}
              />
              <input
                type="email"
                className="sales-field h-9 rounded-md px-2.5 text-sm outline-none"
                placeholder="email@ejemplo.com"
                value={createState.email}
                onChange={(e) => setCreateState((s) => ({ ...s, email: e.target.value }))}
              />
              <input
                className="sales-field h-9 rounded-md px-2.5 text-sm outline-none"
                placeholder="999 000 000"
                value={createState.phone}
                onChange={(e) => setCreateState((s) => ({ ...s, phone: e.target.value }))}
              />
              <input
                className="sales-field h-9 rounded-md px-2.5 text-sm outline-none"
                placeholder="Notas"
                value={createState.notes}
                onChange={(e) => setCreateState((s) => ({ ...s, notes: e.target.value }))}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCreateState((s) => ({ ...s, active: !s.active }))}
                className={`sales-chip rounded-md px-2.5 py-1 text-xs font-semibold ${
                  createState.active ? "sales-chip-success" : "sales-chip-neutral"
                }`}
              >
                {createState.active ? "Activo" : "Inactivo"}
              </button>
              <button
                type="button"
                onClick={() => setCreateState(EMPTY_FORM)}
                disabled={creating}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 py-1.5 text-xs font-semibold text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X size={12} />
                Limpiar
              </button>
              <button
                type="button"
                onClick={createCustomer}
                disabled={creating}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-[var(--ripnel-accent)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--ripnel-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={12} />
                {creating ? "Creando..." : "Crear cliente"}
              </button>
            </div>
          </div>
        )}
      </div>

      {editingCustomer ? (
        <div className="ops-overlay-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="ops-overlay-panel w-full max-w-2xl rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--ops-text)]">Editar cliente</h3>
              <button
                type="button"
                onClick={closeEditModal}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-2.5 py-1 text-xs font-semibold text-[var(--ops-text)]"
              >
                Cerrar
              </button>
            </div>

            {saveError ? (
              <div className="mb-3 rounded-md border border-red-300 bg-red-100/70 px-3 py-2 text-sm text-red-700">
                {saveError}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <select
                className="sales-field h-9 rounded-md px-2.5 text-sm outline-none"
                value={editState.document_type}
                onChange={(e) =>
                  setEditState((s) => ({
                    ...s,
                    document_type: e.target.value,
                    document_number: e.target.value === "none" ? "" : s.document_number,
                  }))
                }
              >
                <option value="none">Sin documento</option>
                <option value="dni">DNI</option>
                <option value="ruc">RUC</option>
                <option value="ce">CE</option>
                <option value="passport">Pasaporte</option>
              </select>
              <input
                className="sales-field h-9 rounded-md px-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="Número"
                value={editState.document_number}
                disabled={editState.document_type === "none"}
                onChange={(e) => setEditState((s) => ({ ...s, document_number: e.target.value }))}
              />
              <input
                className="sales-field h-9 rounded-md px-2.5 text-sm outline-none"
                placeholder="Nombre completo"
                value={editState.full_name}
                onChange={(e) => setEditState((s) => ({ ...s, full_name: e.target.value }))}
              />
              <input
                className="sales-field h-9 rounded-md px-2.5 text-sm outline-none"
                placeholder="Razón social"
                value={editState.business_name}
                onChange={(e) => setEditState((s) => ({ ...s, business_name: e.target.value }))}
              />
              <input
                className="sales-field h-9 rounded-md px-2.5 text-sm outline-none"
                placeholder="Nombre comercial"
                value={editState.commercial_name}
                onChange={(e) => setEditState((s) => ({ ...s, commercial_name: e.target.value }))}
              />
              <select
                className="sales-field h-9 rounded-md px-2.5 text-sm outline-none"
                value={editState.customer_type}
                onChange={(e) => setEditState((s) => ({ ...s, customer_type: e.target.value }))}
              >
                <option value="retail">Retail</option>
                <option value="wholesale">Mayorista</option>
              </select>
              <input
                type="email"
                className="sales-field h-9 rounded-md px-2.5 text-sm outline-none"
                placeholder="Email"
                value={editState.email}
                onChange={(e) => setEditState((s) => ({ ...s, email: e.target.value }))}
              />
              <input
                className="sales-field h-9 rounded-md px-2.5 text-sm outline-none"
                placeholder="Teléfono"
                value={editState.phone}
                onChange={(e) => setEditState((s) => ({ ...s, phone: e.target.value }))}
              />
              <input
                className="sales-field h-9 rounded-md px-2.5 text-sm outline-none md:col-span-2"
                placeholder="Notas"
                value={editState.notes}
                onChange={(e) => setEditState((s) => ({ ...s, notes: e.target.value }))}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setEditState((s) => ({ ...s, active: !s.active }))}
                className={`sales-chip rounded-md px-2.5 py-1 text-xs font-semibold ${
                  editState.active ? "sales-chip-success" : "sales-chip-neutral"
                }`}
              >
                {editState.active ? "Activo" : "Inactivo"}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={saving}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 py-1.5 text-xs font-semibold text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={saving}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-[var(--ripnel-accent)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--ripnel-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
