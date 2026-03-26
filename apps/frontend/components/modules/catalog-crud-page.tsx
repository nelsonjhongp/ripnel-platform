"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { LoaderCircle, PencilLine, Plus, RefreshCw, Search } from "lucide-react";
import { buildApiUrl } from "@/lib/api";

type FieldConfig = {
  key: string;
  label: string;
  type: "text" | "number" | "textarea" | "color";
  placeholder?: string;
  helper?: string;
  editableOnUpdate?: boolean;
};

type ListFieldConfig = {
  key: string;
  label: string;
};

type CatalogCrudPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  endpoint: string;
  emptyTitle: string;
  emptyDescription: string;
  fields: FieldConfig[];
  listFields: ListFieldConfig[];
  idKey: string;
};

type CatalogItem = {
  [key: string]: unknown;
  active?: boolean;
  name?: string;
  code?: string | null;
  created_at?: string;
};

function formatValue(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "Si" : "No";
  }

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function buildInitialState(fields: FieldConfig[]) {
  const state: Record<string, string | boolean> = { active: true };

  for (const field of fields) {
    state[field.key] = "";
  }

  return state;
}

function buildStateFromItem(fields: FieldConfig[], item: CatalogItem) {
  const state = buildInitialState(fields);

  for (const field of fields) {
    state[field.key] =
      item[field.key] === null || item[field.key] === undefined ? "" : String(item[field.key]);
  }

  state.active = Boolean(item.active);

  return state;
}

function getItemId(item: CatalogItem, idKey: string) {
  return String(item[idKey] || "");
}

async function requestCatalogItems(endpoint: string) {
  const response = await fetch(buildApiUrl(endpoint), {
    cache: "no-store",
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "No se pudo cargar el catalogo");
  }

  return payload.data || [];
}

export function CatalogCrudPage({
  eyebrow,
  title,
  description,
  endpoint,
  emptyTitle,
  emptyDescription,
  fields,
  listFields,
  idKey,
}: CatalogCrudPageProps) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Record<string, string | boolean>>(
    buildInitialState(fields)
  );

  async function loadItems() {
    setLoading(true);
    setError(null);

    try {
      setItems(await requestCatalogItems(endpoint));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar el catalogo"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    setError(null);

    requestCatalogItems(endpoint)
      .then((data) => {
        setItems(data);
      })
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo cargar el catalogo"
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [endpoint]);

  const activeCount = items.filter((item) => item.active).length;
  const inactiveCount = items.length - activeCount;

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.active) ||
        (statusFilter === "inactive" && !item.active);

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [item.name, item.code, ...listFields.map((field) => item[field.key])]
        .filter((value) => value !== null && value !== undefined)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [items, listFields, search, statusFilter]);

  function resetForm() {
    setEditingItemId(null);
    setFormState(buildInitialState(fields));
  }

  function updateItemInList(nextItem: CatalogItem) {
    setItems((current) =>
      current.map((item) => (getItemId(item, idKey) === getItemId(nextItem, idKey) ? nextItem : item))
    );
  }

  async function handleToggleActive(item: CatalogItem) {
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(buildApiUrl(`${endpoint}/${getItemId(item, idKey)}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          active: !item.active,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "No se pudo actualizar el estado");
      }

      updateItemInList(payload.data);

      if (editingItemId === getItemId(item, idKey)) {
        setFormState((current) => ({
          ...current,
          active: payload.data.active,
        }));
      }

      setSuccessMessage(
        payload.data.active ? "Registro activado correctamente." : "Registro inactivado correctamente."
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo actualizar el estado"
      );
    }
  }

  function handleEdit(item: CatalogItem) {
    setEditingItemId(getItemId(item, idKey));
    setFormState(buildStateFromItem(fields, item));
    setError(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const isEditing = Boolean(editingItemId);
      const editableFields = fields.filter((field) => field.editableOnUpdate !== false);
      const requestBody = isEditing
        ? editableFields.reduce<Record<string, string | boolean>>((accumulator, field) => {
            accumulator[field.key] = formState[field.key];
            return accumulator;
          }, { active: Boolean(formState.active) })
        : formState;

      const response = await fetch(
        buildApiUrl(isEditing ? `${endpoint}/${editingItemId}` : endpoint),
        {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.message || (isEditing ? "No se pudo actualizar el registro" : "No se pudo crear el registro")
        );
      }

      if (isEditing) {
        updateItemInList(payload.data);
        setSuccessMessage("Registro actualizado correctamente.");
      } else {
        setItems((current) => [payload.data, ...current]);
        setSuccessMessage("Registro creado correctamente.");
      }

      resetForm();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : editingItemId
          ? "No se pudo actualizar el registro"
          : "No se pudo crear el registro"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_45%,#eef2ff_100%)] p-4 md:p-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-500">
                {eyebrow}
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-950">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                {description}
              </p>
            </div>

            <button
              type="button"
              onClick={loadItems}
              className="inline-flex items-center gap-2 self-start rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <RefreshCw className="h-4 w-4" />
              Recargar
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Registros activos
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{activeCount}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total de registros
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{items.length}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por nombre, codigo o detalle"
                    className="w-full rounded-2xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-violet-400"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      statusFilter === "all"
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Todos ({items.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("active")}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      statusFilter === "active"
                        ? "bg-emerald-600 text-white"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Activos ({activeCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("inactive")}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      statusFilter === "inactive"
                        ? "bg-slate-600 text-white"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Inactivos ({inactiveCount})
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Tabla base
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  Lista del catalogo
                </h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {filteredItems.length} visibles
              </span>
            </div>

            {loading ? (
              <div className="flex min-h-56 items-center justify-center text-slate-500">
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                Cargando registros...
              </div>
            ) : filteredItems.length ? (
              <div className="mt-4 space-y-3">
                {filteredItems.map((item, index) => (
                  <div
                    key={String(item.code || item.name || index)}
                    className={`rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 ${
                      item.active ? "" : "bg-slate-50/80 opacity-80"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900">
                            {formatValue(item.name)}
                          </h3>
                          {"code" in item && item.code ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              {String(item.code)}
                            </span>
                          ) : null}
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              item.active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {item.active ? "Activo" : "Inactivo"}
                          </span>
                        </div>

                        <div className="mt-2 grid gap-2 text-sm text-slate-500 md:grid-cols-2">
                          {listFields.map((field) => (
                            <p key={field.key}>
                              <span className="font-medium text-slate-700">{field.label}:</span>{" "}
                              {formatValue(item[field.key])}
                            </p>
                          ))}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(item)}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                              item.active
                                ? "bg-slate-900 text-white hover:bg-slate-800"
                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                            }`}
                          >
                            {item.active ? "Inactivar" : "Activar"}
                          </button>
                        </div>
                      </div>

                      {item.created_at ? (
                        <div className="text-sm text-slate-400">
                          {new Date(String(item.created_at)).toLocaleDateString("es-PE")}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <h3 className="text-lg font-semibold text-slate-900">
                  {items.length ? "No hay resultados para este filtro" : emptyTitle}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {items.length
                    ? "Prueba con otro texto de busqueda o cambia el filtro de estado."
                    : emptyDescription}
                </p>
              </div>
            )}
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
            <div className="border-b border-slate-200 pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                {editingItemId ? "Edicion segura" : "Nuevo registro"}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                {editingItemId ? "Editar registro" : "Crear registro"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {editingItemId
                  ? "Solo se habilitan campos seguros. Los codigos quedan bloqueados para mantener estabilidad operativa."
                  : "El backend genera el codigo por defecto si lo dejas vacio."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">{field.label}</label>
                  {field.type === "textarea" ? (
                    <textarea
                      value={String(formState[field.key] || "")}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                      placeholder={field.placeholder}
                      disabled={Boolean(editingItemId && field.editableOnUpdate === false)}
                      className="min-h-24 w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={String(formState[field.key] || "")}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                      placeholder={field.placeholder}
                      disabled={Boolean(editingItemId && field.editableOnUpdate === false)}
                      className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  )}
                  {field.helper ? (
                    <p className="text-xs leading-5 text-slate-500">{field.helper}</p>
                  ) : null}
                  {editingItemId && field.editableOnUpdate === false ? (
                    <p className="text-xs leading-5 text-slate-500">
                      Este campo queda bloqueado en edicion para no afectar otras partes del sistema.
                    </p>
                  ) : null}
                </div>
              ))}

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(formState.active)}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      active: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                Crear como registro activo
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {successMessage}
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : editingItemId ? (
                    <>
                      <PencilLine className="h-4 w-4" />
                      Guardar cambios
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Crear registro
                    </>
                  )}
                </button>

                {editingItemId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Cancelar edicion
                  </button>
                ) : null}
              </div>
            </form>
          </article>
        </div>
      </div>
    </section>
  );
}
