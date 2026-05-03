"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, PencilLine, Plus, RefreshCw, Search } from "lucide-react";
import { buildApiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

type CreatedStyleSummary = {
  style_id: string;
  style_code: string | null;
  name: string;
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

export function StylesPage({
  initialStyleId = null,
}: {
  initialStyleId?: string | null;
}) {
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
  const [lastCreatedStyle, setLastCreatedStyle] = useState<CreatedStyleSummary | null>(null);
  const hasAppliedInitialSelection = useRef(false);

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

  useEffect(() => {
    if (
      hasAppliedInitialSelection.current ||
      !initialStyleId ||
      editingStyleId === initialStyleId ||
      !styles.length
    ) {
      return;
    }

    const matchedStyle = styles.find((style) => style.style_id === initialStyleId);

    if (matchedStyle) {
      hasAppliedInitialSelection.current = true;
      handleEdit(matchedStyle);
    }
  }, [editingStyleId, initialStyleId, styles]);

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
    setLastCreatedStyle(null);
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
        setLastCreatedStyle(null);
        setSuccessMessage("Style actualizado correctamente.");
      } else {
        setStyles((current) => [payload.data, ...current]);
        setLastCreatedStyle({
          style_id: payload.data.style_id,
          style_code: payload.data.style_code,
          name: payload.data.name,
        });
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
    <section className="ops-page min-h-screen p-4 md:p-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--ripnel-accent-hover)]">
                Productos
              </p>
              <h1 className="ops-title mt-1 text-2xl font-semibold">
                Estilos de producto
              </h1>
          </div>

          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={loadData}>
              <RefreshCw className="h-4 w-4" />
              Actualizar
          </Button>
        </header>

        <div className="flex flex-wrap gap-2 border-t border-[color:var(--ops-border-soft)] pt-4">
          <span className="ops-metric-pill inline-flex rounded-full px-3 py-1 text-xs font-semibold">
            {styles.length} styles
          </span>
          <span className="ops-metric-pill inline-flex rounded-full px-3 py-1 text-xs font-semibold">
            {activeCount} activos
          </span>
          <span className="ops-metric-pill inline-flex rounded-full px-3 py-1 text-xs font-semibold">
            Siguiente paso: Variantes
          </span>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="ops-surface rounded-3xl border p-4 md:p-5">
            <div className="flex items-center justify-between border-b border-[color:var(--ops-border-soft)] pb-3">
              <div>
                <p className="ops-text-muted text-[11px] font-semibold uppercase tracking-[0.18em]">
                  Styles base
                </p>
                <h2 className="ops-title mt-1 text-lg font-semibold">Lista de styles</h2>
              </div>
              <span className="ops-metric-pill inline-flex rounded-full px-3 py-1 text-xs font-semibold">
                {filteredStyles.length} visibles
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3 border-b border-[color:var(--ops-border-soft)] pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ops-text-muted)]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por style, codigo o catalogos"
                  className="ops-surface h-10 rounded-2xl border pl-9"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "all" | "active" | "inactive")
                }
                className="ops-surface h-10 cursor-pointer rounded-2xl border px-3 text-sm outline-none"
              >
                <option value="all">Todos ({styles.length})</option>
                <option value="active">Activos ({activeCount})</option>
                <option value="inactive">Inactivos ({inactiveCount})</option>
              </select>
            </div>

            {loading ? (
              <div className="ops-text-muted flex min-h-56 items-center justify-center">
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                Cargando styles...
              </div>
            ) : filteredStyles.length ? (
              <div className="mt-4 space-y-3">
                {filteredStyles.map((style) => (
                  <div
                    key={style.style_id}
                    className={`ops-surface-muted rounded-2xl border p-4 transition hover:border-[color:var(--ripnel-accent)] ${
                      style.active ? "" : "opacity-80"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="ops-title text-base font-semibold">{style.name}</h3>
                          {style.style_code ? (
                            <span className="ops-metric-pill rounded-full px-2.5 py-1 text-xs font-semibold">
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

                        <div className="ops-text-muted mt-2 grid gap-2 text-sm md:grid-cols-2">
                          <p>
                            <span className="font-medium text-[var(--ops-text)]">Tipo:</span>{" "}
                            {style.garment_type_name}
                          </p>
                          <p>
                            <span className="font-medium text-[var(--ops-text)]">Tela:</span>{" "}
                            {style.fabric_name || "-"}
                          </p>
                          <p>
                            <span className="font-medium text-[var(--ops-text)]">Detalle:</span>{" "}
                            {style.fabric_detail_name || "-"}
                          </p>
                          <p>
                            <span className="font-medium text-[var(--ops-text)]">Target:</span>{" "}
                            {style.target_name || "-"}
                          </p>
                          <p>
                            <span className="font-medium text-[var(--ops-text)]">
                              Configurado en variantes:
                            </span>{" "}
                            {style.size_codes.length} tallas
                          </p>
                          <p>
                            <span className="font-medium text-[var(--ops-text)]">Colores:</span>{" "}
                            {style.color_codes.length}
                          </p>
                        </div>

                        {style.description ? (
                          <p className="ops-text-muted mt-2 text-sm">{style.description}</p>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            onClick={() => handleEdit(style)}
                            variant="outline"
                            size="xs"
                            className="rounded-full"
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                          <Button asChild variant="outline" size="xs" className="rounded-full">
                            <Link href={`/productos/variantes?style_id=${encodeURIComponent(style.style_id)}`}>
                              Variantes
                            </Link>
                          </Button>
                          <Button asChild variant="outline" size="xs" className="rounded-full">
                            <Link href={`/precios/crear-y-editar-precio?style_id=${encodeURIComponent(style.style_id)}`}>
                              Precios
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleToggleActive(style)}
                            variant={style.active ? "outline" : "accent"}
                            size="xs"
                            className="rounded-full"
                          >
                            {style.active ? "Inactivar" : "Activar"}
                          </Button>
                        </div>
                      </div>

                      <div className="ops-text-muted text-sm">
                        {new Date(style.created_at).toLocaleDateString("es-PE")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ops-empty-state-compact mt-4 rounded-3xl p-8 text-center">
                <h3 className="ops-title text-lg font-semibold">
                  {styles.length ? "No hay resultados para este filtro" : "Aun no hay styles"}
                </h3>
                <p className="ops-text-muted mt-2 text-sm leading-6">
                  {styles.length
                    ? "Prueba con otro texto de busqueda o cambia el filtro de estado."
                    : "Primero cierra catalogos y luego registra styles base desde este modulo."}
                </p>
              </div>
            )}
          </article>

          <article className="ops-surface rounded-3xl border p-4 md:p-5">
            <div className="border-b border-[color:var(--ops-border-soft)] pb-3">
              <p className="ops-text-muted text-[11px] font-semibold uppercase tracking-[0.18em]">
                {editingStyleId ? "Edicion segura" : "Nuevo registro"}
              </p>
              <h2 className="ops-title mt-1 text-lg font-semibold">
                {editingStyleId ? "Editar style" : "Crear style"}
              </h2>
              <p className="ops-text-muted mt-2 text-sm leading-6">
                {editingStyleId
                  ? "Solo se habilitan name, description, target y estado. Los campos identitarios quedan bloqueados."
                  : "Registra el producto base y deja la configuracion operativa para Variantes y Precios."}
              </p>
            </div>

            {lastCreatedStyle ? (
              <div className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Siguiente paso
                </p>
                <h3 className="mt-1 text-base font-semibold text-emerald-950">
                  {lastCreatedStyle.name}
                </h3>
                <p className="mt-1 text-sm text-emerald-800">
                  El style ya existe. Ahora conviene definir tallas y colores antes de
                  cargar precios o stock.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/productos/variantes?style_id=${encodeURIComponent(lastCreatedStyle.style_id)}`}
                    className="inline-flex items-center justify-center rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
                  >
                    Configurar variantes
                  </Link>
                  <Link
                    href={`/precios/crear-y-editar-precio?style_id=${encodeURIComponent(lastCreatedStyle.style_id)}`}
                    className="inline-flex items-center justify-center rounded-2xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                  >
                    Ir a precios
                  </Link>
                </div>
              </div>
            ) : null}

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
