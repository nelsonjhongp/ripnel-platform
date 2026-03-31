"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownUp,
  ArrowUp,
  ArrowDown,
  PencilLine,
  Plus,
  RefreshCw,
  Check,
  X,
  Trash2,
} from "lucide-react";
import { buildApiUrl } from "@/lib/api";

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

type EditState = {
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

type CreateState = {
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

const EMPTY_FORM: CreateState = {
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

function validateCustomerInput(input: Pick<CreateState, "document_type" | "document_number" | "full_name" | "business_name" | "commercial_name">) {
  const nameIsMissing =
    !input.full_name.trim() &&
    !input.business_name.trim() &&
    !input.commercial_name.trim();

  if (nameIsMissing) {
    return "Ingresa al menos un nombre: nombre completo, razón social o nombre comercial.";
  }

  if (input.document_type === "none") {
    if (input.document_number.trim()) {
      return "Si el tipo de documento es sin documento, el número debe ir vacío.";
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
    return "Número de documento obligatorio para el tipo seleccionado.";
  }

  if (!rule.regex.test(normalizedNumber)) {
    return `Formato inválido para ${rule.label}.`;
  }

  return null;
}

function buildCustomerPayload(input: CreateState) {
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

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docFilter, setDocFilter] = useState<string>("all");
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [createState, setCreateState] = useState<CreateState>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
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

      const res = await fetch(
        buildApiUrl(`/api/customers?${params.toString()}`),
        { signal: ctrl.signal, cache: "no-store" }
      );

      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.message || "Error al cargar clientes");
      }

      setCustomers(payload.data || []);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCustomers(docFilter, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docFilter, sort]);

  function startEdit(c: Customer) {
    setEditingId(c.customer_id);
    setSaveError(null);
    setEditState({
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
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
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

      if (!res.ok) {
        throw new Error(payload.message || "Error al crear cliente");
      }

      setCustomers((prev) =>
        sort === "desc" ? [payload.data, ...prev] : [...prev, payload.data]
      );
      setCreateState(EMPTY_FORM);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Error al crear cliente");
    } finally {
      setCreating(false);
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
    setCreateError(null);

    try {
      const res = await fetch(buildApiUrl(`/api/customers/${customerId}`), {
        method: "DELETE",
      });

      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.message || "Error al eliminar cliente");
      }

      setCustomers((prev) => prev.filter((c) => c.customer_id !== customerId));

      if (editingId === customerId) {
        cancelEdit();
      }
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Error al eliminar cliente");
    } finally {
      setDeletingId(null);
    }
  }

  async function saveEdit(customerId: string) {
    if (!editState) return;

    const validationError = validateCustomerInput(editState);
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch(
        buildApiUrl(`/api/customers/${customerId}`),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildCustomerPayload(editState)),
        }
      );

      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.message || "Error al guardar");
      }

      setCustomers((prev) =>
        prev.map((c) => (c.customer_id === customerId ? payload.data : c))
      );
      setEditingId(null);
      setEditState(null);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
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
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Listado de clientes registrados
          </p>
        </div>
        <button
          onClick={() => fetchCustomers(docFilter, sort)}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white p-1">
          {docFilterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDocFilter(opt.value)}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                docFilter === opt.value
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setSort((s) => (s === "desc" ? "asc" : "desc"))}
          className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {sort === "desc" ? (
            <ArrowDown size={14} />
          ) : (
            <ArrowUp size={14} />
          )}
          Fecha {sort === "desc" ? "más reciente" : "más antigua"}
        </button>

        <span className="ml-auto text-xs text-gray-400">
          {loading ? "Cargando..." : `${customers.length} cliente${customers.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Save error */}
      {saveError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      {/* Create error */}
      {createError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {createError}
        </div>
      )}

      {/* Create form */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Nuevo cliente</h2>
        <p className="mt-1 text-xs text-gray-500">Alta directa en ERP, sin vincular a ventas por ahora.</p>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <select
            className="rounded border border-gray-300 px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none"
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
            className="rounded border border-gray-300 px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
            placeholder="Número de documento"
            value={createState.document_number}
            disabled={createState.document_type === "none"}
            onChange={(e) =>
              setCreateState((s) => ({ ...s, document_number: e.target.value }))
            }
          />

          <select
            className="rounded border border-gray-300 px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none"
            value={createState.customer_type}
            onChange={(e) =>
              setCreateState((s) => ({ ...s, customer_type: e.target.value }))
            }
          >
            <option value="retail">Retail</option>
            <option value="wholesale">Mayorista</option>
          </select>

          <input
            className="rounded border border-gray-300 px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Nombre completo"
            value={createState.full_name}
            onChange={(e) =>
              setCreateState((s) => ({ ...s, full_name: e.target.value }))
            }
          />

          <input
            className="rounded border border-gray-300 px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Razón social"
            value={createState.business_name}
            onChange={(e) =>
              setCreateState((s) => ({ ...s, business_name: e.target.value }))
            }
          />

          <input
            className="rounded border border-gray-300 px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Nombre comercial"
            value={createState.commercial_name}
            onChange={(e) =>
              setCreateState((s) => ({ ...s, commercial_name: e.target.value }))
            }
          />

          <input
            type="email"
            className="rounded border border-gray-300 px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="email@ejemplo.com"
            value={createState.email}
            onChange={(e) =>
              setCreateState((s) => ({ ...s, email: e.target.value }))
            }
          />

          <input
            className="rounded border border-gray-300 px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="999 000 000"
            value={createState.phone}
            onChange={(e) =>
              setCreateState((s) => ({ ...s, phone: e.target.value }))
            }
          />

          <input
            className="rounded border border-gray-300 px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Notas internas"
            value={createState.notes}
            onChange={(e) =>
              setCreateState((s) => ({ ...s, notes: e.target.value }))
            }
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              setCreateState((s) => ({ ...s, active: !s.active }))
            }
            className={`inline-flex items-center rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              createState.active
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {createState.active ? "Activo" : "Inactivo"}
          </button>

          <button
            onClick={() => setCreateState(EMPTY_FORM)}
            disabled={creating}
            className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <X size={12} />
            Limpiar
          </button>

          <button
            onClick={createCustomer}
            disabled={creating}
            className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus size={12} />
            {creating ? "Creando..." : "Crear cliente"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium text-gray-600 whitespace-nowrap">Código</th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-600 whitespace-nowrap">Tipo doc.</th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-600 whitespace-nowrap">N° documento</th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-600 whitespace-nowrap">Nombre / Razón social</th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-600 whitespace-nowrap">Email</th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-600 whitespace-nowrap">Teléfono</th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-600 whitespace-nowrap">Tipo</th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-600 whitespace-nowrap">Estado</th>
              <th className="px-3 py-2.5 text-left font-medium text-gray-600 whitespace-nowrap">
                <span className="flex items-center gap-1">
                  <ArrowDownUp size={12} /> Ingreso
                </span>
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-gray-600 whitespace-nowrap">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-gray-400">
                  Cargando clientes...
                </td>
              </tr>
            )}
            {isEmpty && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-gray-400">
                  No hay clientes registrados con este filtro.
                </td>
              </tr>
            )}
            {!loading &&
              customers.map((c) => {
                const isEditing = editingId === c.customer_id;

                return (
                  <tr
                    key={c.customer_id}
                    className={`transition-colors ${isEditing ? "bg-blue-50" : "hover:bg-gray-50"}`}
                  >
                    {/* Código */}
                    <td className="px-3 py-2 text-gray-500 font-mono text-xs whitespace-nowrap">
                      {c.internal_code || "—"}
                    </td>

                    {/* Tipo doc */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700">
                        {DOC_TYPE_LABELS[c.document_type] ?? c.document_type}
                      </span>
                    </td>

                    {/* N° documento */}
                    <td className="px-3 py-2 text-gray-700 font-mono text-xs whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <select
                            className="rounded border border-gray-300 px-1.5 py-1 text-xs focus:border-blue-500 focus:outline-none"
                            value={editState!.document_type}
                            onChange={(e) =>
                              setEditState((s) =>
                                s
                                  ? {
                                      ...s,
                                      document_type: e.target.value,
                                      document_number: e.target.value === "none" ? "" : s.document_number,
                                    }
                                  : s
                              )
                            }
                          >
                            <option value="none">Sin doc.</option>
                            <option value="dni">DNI</option>
                            <option value="ruc">RUC</option>
                            <option value="ce">CE</option>
                            <option value="passport">Pasaporte</option>
                          </select>

                          <input
                            className="w-28 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                            placeholder="N°"
                            disabled={editState!.document_type === "none"}
                            value={editState!.document_number}
                            onChange={(e) =>
                              setEditState((s) => s && { ...s, document_number: e.target.value })
                            }
                          />
                        </div>
                      ) : (
                        c.document_number || "—"
                      )}
                    </td>

                    {/* Nombre */}
                    <td className="px-3 py-2 min-w-40">
                      {isEditing ? (
                        <div className="flex flex-col gap-1">
                          <input
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                            placeholder="Nombre completo"
                            value={editState!.full_name}
                            onChange={(e) =>
                              setEditState((s) => s && { ...s, full_name: e.target.value })
                            }
                          />
                          <input
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                            placeholder="Razón social"
                            value={editState!.business_name}
                            onChange={(e) =>
                              setEditState((s) => s && { ...s, business_name: e.target.value })
                            }
                          />
                        </div>
                      ) : (
                        <span className="text-gray-900">{buildDisplayName(c)}</span>
                      )}
                    </td>

                    {/* Email */}
                    <td className="px-3 py-2 min-w-35">
                      {isEditing ? (
                        <input
                          type="email"
                          className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                          placeholder="email@ejemplo.com"
                          value={editState!.email}
                          onChange={(e) =>
                            setEditState((s) => s && { ...s, email: e.target.value })
                          }
                        />
                      ) : (
                        <span className="text-gray-600">{c.email || "—"}</span>
                      )}
                    </td>

                    {/* Teléfono */}
                    <td className="px-3 py-2 min-w-28">
                      {isEditing ? (
                        <input
                          className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                          placeholder="999 000 000"
                          value={editState!.phone}
                          onChange={(e) =>
                            setEditState((s) => s && { ...s, phone: e.target.value })
                          }
                        />
                      ) : (
                        <span className="text-gray-600">{c.phone || "—"}</span>
                      )}
                    </td>

                    {/* Tipo cliente */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {isEditing ? (
                        <select
                          className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                          value={editState!.customer_type}
                          onChange={(e) =>
                            setEditState((s) => s && { ...s, customer_type: e.target.value })
                          }
                        >
                          <option value="retail">Retail</option>
                          <option value="wholesale">Mayorista</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
                            c.customer_type === "wholesale"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-sky-100 text-sky-700"
                          }`}
                        >
                          {CUSTOMER_TYPE_LABELS[c.customer_type] ?? c.customer_type}
                        </span>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {isEditing ? (
                        <button
                          onClick={() =>
                            setEditState((s) => s && { ...s, active: !s.active })
                          }
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                            editState!.active
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {editState!.active ? "Activo" : "Inactivo"}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
                            c.active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {c.active ? "Activo" : "Inactivo"}
                        </span>
                      )}
                    </td>

                    {/* Fecha ingreso */}
                    <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(c.created_at)}
                    </td>

                    {/* Acciones */}
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => saveEdit(c.customer_id)}
                            disabled={saving}
                            className="inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            <Check size={12} />
                            {saving ? "Guardando..." : "Guardar"}
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={saving}
                            className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                          >
                            <X size={12} />
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(c)}
                          className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          <PencilLine size={12} />
                          Editar
                        </button>
                      )}

                      {!isEditing && (
                        <button
                          onClick={() => deleteCustomer(c.customer_id)}
                          disabled={deletingId === c.customer_id}
                          className="ml-1 inline-flex items-center gap-1 rounded border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          <Trash2 size={12} />
                          {deletingId === c.customer_id ? "Eliminando..." : "Eliminar"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
