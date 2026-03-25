"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Lock,
  LockOpen,
  LoaderCircle,
  MapPin,
  Plus,
  RefreshCw,
  Store,
  Warehouse,
} from "lucide-react";
import { buildApiUrl } from "@/lib/api";

type LocationItem = {
  location_id: string;
  name: string;
  code: string | null;
  type: "store" | "warehouse" | "workshop" | "third_party";
  address: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type FormState = {
  name: string;
  code: string;
  type: LocationItem["type"];
  address: string;
  active: boolean;
};

const locationTypePrefixes: Record<LocationItem["type"], string> = {
  store: "TD",
  warehouse: "ALM",
  workshop: "TLL",
  third_party: "TER",
};

const initialFormState: FormState = {
  name: "",
  code: "",
  type: "store",
  address: "",
  active: true,
};

const locationTypeOptions = [
  { value: "store", label: "Tienda" },
  { value: "warehouse", label: "Almacen" },
  { value: "workshop", label: "Taller" },
  { value: "third_party", label: "Tercero" },
] as const;

const locationTypeLabels: Record<LocationItem["type"], string> = {
  store: "Tienda",
  warehouse: "Almacen",
  workshop: "Taller",
  third_party: "Tercero",
};

function typeIcon(type: LocationItem["type"]) {
  if (type === "store") return Store;
  if (type === "warehouse") return Warehouse;
  return Building2;
}

function buildLocationCodePreview(name: string, type: LocationItem["type"]) {
  const prefix = locationTypePrefixes[type] || "LOC";

  const cleanedName = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .trim()
    .toUpperCase();

  const tokens = cleanedName
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (token) =>
        !["TIENDA", "ALMACEN", "ALMACEN", "TALLER", "TERCERO", "TERCEROS"].includes(
          token
        )
    );

  const sourceTokens = tokens.length ? tokens : cleanedName.split(/\s+/).filter(Boolean);

  const suffix = sourceTokens
    .slice(0, 2)
    .map((token, index) => token.slice(0, index === 0 ? 4 : 3))
    .join("")
    .slice(0, 6);

  return suffix ? `${prefix}-${suffix}` : prefix;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [manualCodeEnabled, setManualCodeEnabled] = useState(false);

  const generatedCode = useMemo(
    () => buildLocationCodePreview(formState.name, formState.type),
    [formState.name, formState.type]
  );

  async function loadLocations() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl("/api/locations"), {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "No se pudo cargar ubicaciones");
      }

      setLocations(payload.data || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar ubicaciones"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    if (!manualCodeEnabled) {
      setFormState((current) =>
        current.code === generatedCode ? current : { ...current, code: generatedCode }
      );
    }
  }, [generatedCode, manualCodeEnabled]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(buildApiUrl("/api/locations"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formState,
          code: manualCodeEnabled ? formState.code.trim() || null : null,
          address: formState.address.trim() || null,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "No se pudo crear la ubicacion");
      }

      setLocations((current) => [payload.data, ...current]);
      setFormState(initialFormState);
      setManualCodeEnabled(false);
      setSuccessMessage(
        `Ubicacion creada correctamente con codigo ${payload.data.code}.`
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo crear la ubicacion"
      );
    } finally {
      setSubmitting(false);
    }
  }

  const activeCount = locations.filter((location) => location.active).length;
  const storeCount = locations.filter((location) => location.type === "store").length;
  const warehouseCount = locations.filter(
    (location) => location.type === "warehouse"
  ).length;

  return (
    <section className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_45%,#eef2ff_100%)] p-4 md:p-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-500">
                Administracion
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-950">
                Ubicaciones
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Primer modulo operativo conectado al backend. Desde aqui puedes
                listar sedes y crear tiendas, almacenes, talleres o ubicaciones
                de terceros siguiendo el esquema real de la base.
              </p>
            </div>

            <button
              type="button"
              onClick={loadLocations}
              className="inline-flex items-center gap-2 self-start rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <RefreshCw className="h-4 w-4" />
              Recargar
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Ubicaciones activas
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {activeCount}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tiendas
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {storeCount}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Almacenes
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {warehouseCount}
              </p>
            </article>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.9fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Tabla base
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  Lista de ubicaciones
                </h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {locations.length} registros
              </span>
            </div>

            {loading ? (
              <div className="flex min-h-56 items-center justify-center text-slate-500">
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                Cargando ubicaciones...
              </div>
            ) : locations.length ? (
              <div className="mt-4 space-y-3">
                {locations.map((location) => {
                  const Icon = typeIcon(location.type);

                  return (
                    <div
                      key={location.location_id}
                      className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="rounded-2xl bg-violet-50 p-3 text-violet-700">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold text-slate-900">
                                {location.name}
                              </h3>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                {locationTypeLabels[location.type]}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  location.active
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                {location.active ? "Activa" : "Inactiva"}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                              {location.code || "Sin codigo"}{" "}
                              {location.address ? `• ${location.address}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <MapPin className="h-4 w-4" />
                          {new Date(location.created_at).toLocaleDateString("es-PE")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <h3 className="text-lg font-semibold text-slate-900">
                  Aun no hay ubicaciones
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Puedes comenzar creando la primera tienda o almacen desde el
                  formulario lateral. Este modulo ya habla con `locations` en
                  PostgreSQL.
                </p>
              </div>
            )}
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] md:p-6">
            <div className="border-b border-slate-200 pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Nuevo registro
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                Crear ubicacion
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Base minima para administrar sedes sin salir del estilo actual
                del panel.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Nombre
                </label>
                <input
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Tienda Centro"
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-slate-700">
                      Codigo
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setManualCodeEnabled((current) => {
                          const next = !current;

                          if (!next) {
                            setFormState((state) => ({
                              ...state,
                              code: generatedCode,
                            }));
                          }

                          return next;
                        });
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 transition hover:text-indigo-700"
                    >
                      {manualCodeEnabled ? (
                        <>
                          <LockOpen className="h-3.5 w-3.5" />
                          Manual
                        </>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5" />
                          Automatico
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    value={formState.code}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        code: event.target.value,
                      }))
                    }
                    placeholder="TD-CEN"
                    disabled={!manualCodeEnabled}
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  <p className="text-xs leading-5 text-slate-500">
                    {manualCodeEnabled
                      ? "Puedes editar el codigo manualmente. Si repites uno existente, el backend lo rechazara."
                      : `Vista previa autogenerada: ${generatedCode}. Si ya existe, el backend creara una variante unica.`}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Tipo
                  </label>
                  <select
                    value={formState.type}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        type: event.target.value as LocationItem["type"],
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
                  >
                    {locationTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Direccion
                </label>
                <input
                  value={formState.address}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                  placeholder="Av. Ejemplo 123, Lima"
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400"
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
                Crear como ubicacion activa
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
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Crear ubicacion
                  </>
                )}
              </button>
            </form>
          </article>
        </div>
      </div>
    </section>
  );
}
