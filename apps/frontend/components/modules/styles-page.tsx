"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { LoaderCircle, PencilLine, Plus, RefreshCw, Search } from "lucide-react";
import { buildApiUrl } from "@/lib/api";

type OptionItem = {
  [key: string]: unknown;
  active?: boolean;
  name?: string;
  code?: string | null;
};

type StyleItem = {
  style_id: string;
  style_code: string | null;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  garment_type_id: string;
  garment_type_name: string;
  fabric_id: string | null;
  fabric_name: string | null;
  fabric_detail_id: string | null;
  fabric_detail_name: string | null;
  target_id: string | null;
  target_name: string | null;
  size_codes: string[];
  color_codes: string[];
};

type FormState = {
  garment_type_id: string;
  fabric_id: string;
  fabric_detail_id: string;
  target_id: string;
  name: string;
  description: string;
  active: boolean;
};

const initialFormState: FormState = {
  garment_type_id: "",
  fabric_id: "",
  fabric_detail_id: "",
  target_id: "",
  name: "",
  description: "",
  active: true,
};

function getOptionId(item: OptionItem) {
  return String(
    item.garment_type_id ||
      item.fabric_id ||
      item.fabric_detail_id ||
      item.target_id ||
      ""
  );
}

function getOptionLabel(item: OptionItem) {
  return item.code ? `${String(item.code)} - ${String(item.name)}` : String(item.name || "");
}

async function requestApiData(path: string) {
  const response = await fetch(buildApiUrl(path), {
    cache: "no-store",
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "No se pudo cargar estilos");
  }

  return payload.data || [];
}

async function requestStylesModuleData() {
  const [
    stylesData,
    garmentTypesData,
    fabricsData,
    fabricDetailsData,
    targetsData,
  ] = await Promise.all([
    requestApiData("/api/styles"),
    requestApiData("/api/garment-types"),
    requestApiData("/api/fabrics"),
    requestApiData("/api/fabric-details"),
    requestApiData("/api/targets"),
  ]);

  return {
    stylesData,
    garmentTypesData,
    fabricsData,
    fabricDetailsData,
    targetsData,
  };
}

export function StylesPage() {
  const [styles, setStyles] = useState<StyleItem[]>([]);
  const [garmentTypes, setGarmentTypes] = useState<OptionItem[]>([]);
  const [fabrics, setFabrics] = useState<OptionItem[]>([]);
  const [fabricDetails, setFabricDetails] = useState<OptionItem[]>([]);
  const [targets, setTargets] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(initialFormState);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const {
        stylesData,
        garmentTypesData,
        fabricsData,
        fabricDetailsData,
        targetsData,
      } = await requestStylesModuleData();

      setStyles(stylesData);
      setGarmentTypes(garmentTypesData);
      setFabrics(fabricsData);
      setFabricDetails(fabricDetailsData);
      setTargets(targetsData);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar estilos"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const activeCount = styles.filter((style) => style.active).length;
  const inactiveCount = styles.length - activeCount;

  const filteredStyles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return styles.filter((style) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && style.active) ||
        (statusFilter === "inactive" && !style.active);

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        style.name,
        style.style_code,
        style.garment_type_name,
        style.fabric_name,
        style.fabric_detail_name,
        style.target_name,
      ]
        .filter((value) => value !== null && value !== undefined)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [search, statusFilter, styles]);

  function resetForm() {
    setEditingStyleId(null);
    setFormState(initialFormState);
  }

  function updateStyleInList(nextStyle: StyleItem) {
    setStyles((current) =>
      current.map((style) => (style.style_id === nextStyle.style_id ? nextStyle : style))
    );
  }

  function handleEdit(style: StyleItem) {
    setEditingStyleId(style.style_id);
    setFormState({
      garment_type_id: style.garment_type_id,
      fabric_id: style.fabric_id || "",
      fabric_detail_id: style.fabric_detail_id || "",
      target_id: style.target_id || "",
      name: style.name,
      description: style.description || "",
      active: style.active,
    });
    setError(null);
    setSuccessMessage(null);
  }

  async function handleToggleActive(style: StyleItem) {
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(buildApiUrl(`/api/styles/${style.style_id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          active: !style.active,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "No se pudo actualizar el style");
      }

      updateStyleInList(payload.data);

      if (editingStyleId === style.style_id) {
        setFormState((current) => ({
          ...current,
          active: payload.data.active,
        }));
      }

      setSuccessMessage(
        payload.data.active
          ? "Style activado correctamente."
          : "Style inactivado correctamente."
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo actualizar el style"
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const isEditing = Boolean(editingStyleId);
      const response = await fetch(
        buildApiUrl(isEditing ? `/api/styles/${editingStyleId}` : "/api/styles"),
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            isEditing
              ? {
                  name: formState.name,
                  description: formState.description.trim() || null,
                  target_id: formState.target_id || null,
                  active: formState.active,
                }
              : {
                  ...formState,
                  fabric_id: formState.fabric_id || null,
                  fabric_detail_id: formState.fabric_detail_id || null,
                  target_id: formState.target_id || null,
                  description: formState.description.trim() || null,
                }
          ),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.message ||
            (isEditing ? "No se pudo actualizar el style" : "No se pudo crear el style")
        );
      }

      if (isEditing) {
        updateStyleInList(payload.data);
        setSuccessMessage("Style actualizado correctamente.");
      } else {
        setStyles((current) => [payload.data, ...current]);
        setSuccessMessage(`Style creado correctamente con codigo ${payload.data.style_code}.`);
      }

      resetForm();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : editingStyleId
          ? "No se pudo actualizar el style"
          : "No se pudo crear el style"
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
                Productos
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-950">
                Estilos de producto
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Este modulo registra solo el style base. La configuracion de tallas,
                colores y variantes operativas se hace despues desde Variantes.
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-2 self-start rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <RefreshCw className="h-4 w-4" />
              Recargar
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Styles activos
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{activeCount}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total de styles
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{styles.length}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por style, codigo o catalogos"
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
                    Todos ({styles.length})
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
                <h2 className="mt-1 text-xl font-semibold text-slate-950">Lista de styles</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {filteredStyles.length} visibles
              </span>
            </div>

            {loading ? (
              <div className="flex min-h-56 items-center justify-center text-slate-500">
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                Cargando styles...
              </div>
            ) : filteredStyles.length ? (
              <div className="mt-4 space-y-3">
                {filteredStyles.map((style) => (
                  <div
                    key={style.style_id}
                    className={`rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 ${
                      style.active ? "" : "bg-slate-50/80 opacity-80"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900">{style.name}</h3>
                          {style.style_code ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              {style.style_code}
                            </span>
                          ) : null}
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              style.active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {style.active ? "Activo" : "Inactivo"}
                          </span>
                        </div>

                        <div className="mt-2 grid gap-2 text-sm text-slate-500 md:grid-cols-2">
                          <p>
                            <span className="font-medium text-slate-700">Tipo:</span>{" "}
                            {style.garment_type_name}
                          </p>
                          <p>
                            <span className="font-medium text-slate-700">Tela:</span>{" "}
                            {style.fabric_name || "-"}
                          </p>
                          <p>
                            <span className="font-medium text-slate-700">Detalle:</span>{" "}
                            {style.fabric_detail_name || "-"}
                          </p>
                          <p>
                            <span className="font-medium text-slate-700">Target:</span>{" "}
                            {style.target_name || "-"}
                          </p>
                          <p>
                            <span className="font-medium text-slate-700">
                              Configurado en variantes:
                            </span>{" "}
                            {style.size_codes.length} tallas
                          </p>
                          <p>
                            <span className="font-medium text-slate-700">Colores:</span>{" "}
                            {style.color_codes.length}
                          </p>
                        </div>

                        {style.description ? (
                          <p className="mt-2 text-sm text-slate-500">{style.description}</p>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(style)}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(style)}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                              style.active
                                ? "bg-slate-900 text-white hover:bg-slate-800"
                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                            }`}
                          >
                            {style.active ? "Inactivar" : "Activar"}
                          </button>
                        </div>
                      </div>

                      <div className="text-sm text-slate-400">
                        {new Date(style.created_at).toLocaleDateString("es-PE")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <h3 className="text-lg font-semibold text-slate-900">
                  {styles.length ? "No hay resultados para este filtro" : "Aun no hay styles"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {styles.length
                    ? "Prueba con otro texto de busqueda o cambia el filtro de estado."
                    : "Primero cierra catalogos y luego registra styles base desde este modulo."}
                </p>
              </div>
            )}
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
            <div className="border-b border-slate-200 pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                {editingStyleId ? "Edicion segura" : "Nuevo registro"}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                {editingStyleId ? "Editar style" : "Crear style"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {editingStyleId
                  ? "Solo se habilitan name, description, target y estado. Los campos identitarios quedan bloqueados."
                  : "Registra el producto base y deja la configuracion operativa para el modulo de Variantes."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Nombre</label>
                <input
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Jogger - French Terry"
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                  required
                />
              </div>

              {editingStyleId ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Codigo</label>
                  <input
                    value={styles.find((style) => style.style_id === editingStyleId)?.style_code || ""}
                    readOnly
                    className="w-full rounded-2xl border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm text-slate-500 outline-none"
                  />
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Tipo de prenda</label>
                  <select
                    value={formState.garment_type_id}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        garment_type_id: event.target.value,
                      }))
                    }
                    disabled={editingStyleId !== null}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    required
                  >
                    <option value="">Selecciona un tipo</option>
                    {garmentTypes.map((item) => (
                      <option key={getOptionId(item)} value={getOptionId(item)}>
                        {getOptionLabel(item)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Tela</label>
                  <select
                    value={formState.fabric_id}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        fabric_id: event.target.value,
                      }))
                    }
                    disabled={editingStyleId !== null}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="">Sin tela</option>
                    {fabrics.map((item) => (
                      <option key={getOptionId(item)} value={getOptionId(item)}>
                        {getOptionLabel(item)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Detalle de tela
                  </label>
                  <select
                    value={formState.fabric_detail_id}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        fabric_detail_id: event.target.value,
                      }))
                    }
                    disabled={editingStyleId !== null}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="">Sin detalle</option>
                    {fabricDetails.map((item) => (
                      <option key={getOptionId(item)} value={getOptionId(item)}>
                        {getOptionLabel(item)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Target</label>
                  <select
                    value={formState.target_id}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        target_id: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                  >
                    <option value="">Sin target</option>
                    {targets.map((item) => (
                      <option key={getOptionId(item)} value={getOptionId(item)}>
                        {getOptionLabel(item)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Descripcion</label>
                <textarea
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Notas internas del style"
                  className="min-h-24 w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                />
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={formState.active}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      active: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                {editingStyleId ? "Mantener style activo" : "Crear como style activo"}
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
                  ) : editingStyleId ? (
                    <>
                      <PencilLine className="h-4 w-4" />
                      Guardar cambios
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Crear style
                    </>
                  )}
                </button>

                {editingStyleId ? (
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
