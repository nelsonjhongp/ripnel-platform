"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Building2,
  LoaderCircle,
  MapPin,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
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
  type: LocationItem["type"];
  address: string;
  active: boolean;
};

const initialFormState: FormState = {
  name: "",
  type: "store",
  address: "",
  active: true,
};

const locationTypeOptions = [
  { value: "store", label: "Tienda" },
  { value: "warehouse", label: "Almacén" },
  { value: "workshop", label: "Taller" },
  { value: "third_party", label: "Tercero" },
] as const;

const locationTypeLabels: Record<LocationItem["type"], string> = {
  store: "Tienda",
  warehouse: "Almacén",
  workshop: "Taller",
  third_party: "Tercero",
};

function typeIcon(type: LocationItem["type"]) {
  if (type === "store") return Store;
  if (type === "warehouse") return Warehouse;
  return Building2;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | LocationItem["type"]>("all");
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(initialFormState);

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
        requestError instanceof Error ? requestError.message : "No se pudo cargar ubicaciones"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // defer loading to avoid synchronous setState inside effect
    void Promise.resolve().then(() => loadLocations());
  }, []);

  useEffect(() => {
    if (!manualCodeEnabled && !editingLocationId) {
      // defer setState to avoid triggering react-hooks/set-state-in-effect
      void Promise.resolve().then(() =>
        setFormState((current) =>
          current.code === generatedCode ? current : { ...current, code: generatedCode }
        )
      );
    }
  }, [generatedCode, manualCodeEnabled, editingLocationId]);

  const activeCount = locations.filter((location) => location.active).length;
  const inactiveCount = locations.length - activeCount;
  const storeCount = locations.filter((location) => location.type === "store").length;
  const warehouseCount = locations.filter((location) => location.type === "warehouse").length;

  const filteredLocations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return locations.filter((location) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && location.active) ||
        (statusFilter === "inactive" && !location.active);
      const matchesType = typeFilter === "all" || location.type === typeFilter;

      if (!matchesStatus || !matchesType) return false;

      if (!normalizedSearch) return true;

      return [location.name, location.code, location.address, locationTypeLabels[location.type]]
        .filter((value) => value !== null && value !== undefined)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [locations, search, statusFilter, typeFilter]);

  function resetForm() {
    setEditingLocationId(null);
    setFormState(initialFormState);
  }

  function updateLocationInList(nextLocation: LocationItem) {
    setLocations((current) =>
      current.map((location) =>
        location.location_id === nextLocation.location_id ? nextLocation : location
      )
    );
  }

  function handleEdit(location: LocationItem) {
    setEditingLocationId(location.location_id);
    setFormState({
      name: location.name,
      type: location.type,
      address: location.address || "",
      active: location.active,
    });
    setError(null);
    setSuccessMessage(null);
  }

  async function handleToggleActive(location: LocationItem) {
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(buildApiUrl(`/api/locations/${location.location_id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active: !location.active }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "No se pudo actualizar la ubicación");
      }

      updateLocationInList(payload.data);

      if (editingLocationId === location.location_id) {
        setFormState((current) => ({ ...current, active: payload.data.active }));
      }

      setSuccessMessage(payload.data.active ? "Ubicación activada." : "Ubicación inactivada.");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "No se pudo actualizar la ubicación"
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const isEditing = Boolean(editingLocationId);
      const response = await fetch(
        buildApiUrl(isEditing ? `/api/locations/${editingLocationId}` : "/api/locations"),
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEditing
              ? {
                  name: formState.name,
                  address: formState.address.trim() || null,
                  active: formState.active,
                }
              : {
                  name: formState.name,
                  type: formState.type,
                  code: null,
                  address: formState.address.trim() || null,
                  active: formState.active,
                }
          ),
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.message ||
            (isEditing ? "No se pudo actualizar la ubicación" : "No se pudo crear la ubicación")
        );
      }

      if (isEditing) {
        updateLocationInList(payload.data);
        setSuccessMessage("Ubicación actualizada.");
      } else {
        setLocations((current) => [payload.data, ...current]);
        setSuccessMessage("Ubicación creada.");
      }

      resetForm();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : editingLocationId
          ? "No se pudo actualizar la ubicación"
          : "No se pudo crear la ubicación"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="ops-page min-h-screen p-4 md:p-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="ops-title text-2xl font-semibold">Ubicaciones</h1>
            <p className="ops-text-muted text-sm">Gestión de sedes operativas.</p>
          </div>

          <button
            type="button"
            onClick={loadLocations}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3.5 py-2 text-sm font-semibold text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
          >
            <RefreshCw className="h-4 w-4" />
            Recargar
          </button>
        </header>

        <div className="ops-surface rounded-2xl border p-4">
          <div className="grid gap-2 md:grid-cols-3">
            <article className="ops-surface-muted rounded-xl border border-[var(--ops-border-strong)] px-3 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">Activas</p>
              <p className="mt-1 text-xl font-semibold text-[var(--ops-text)]">{activeCount}</p>
            </article>
            <article className="ops-surface-muted rounded-xl border border-[var(--ops-border-strong)] px-3 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">Tiendas</p>
              <p className="mt-1 text-xl font-semibold text-[var(--ops-text)]">{storeCount}</p>
            </article>
            <article className="ops-surface-muted rounded-xl border border-[var(--ops-border-strong)] px-3 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">Almacenes</p>
              <p className="mt-1 text-xl font-semibold text-[var(--ops-text)]">{warehouseCount}</p>
            </article>
          </div>

          <div className="mt-3 rounded-xl border border-[var(--ops-border-strong)] p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ops-text-muted)]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nombre, código, dirección o tipo"
                  className="w-full rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-field)] py-2 pl-9 pr-3 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--ripnel-accent)]"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    statusFilter === "all"
                      ? "bg-[var(--ripnel-accent)] text-white"
                      : "border border-[var(--ops-border-strong)] bg-[var(--ops-field)] text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)]"
                  }`}
                >
                  Todos ({locations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("active")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    statusFilter === "active"
                      ? "bg-emerald-600 text-white"
                      : "border border-[var(--ops-border-strong)] bg-[var(--ops-field)] text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)]"
                  }`}
                >
                  Activas ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("inactive")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    statusFilter === "inactive"
                      ? "bg-slate-700 text-white"
                      : "border border-[var(--ops-border-strong)] bg-[var(--ops-field)] text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)]"
                  }`}
                >
                  Inactivas ({inactiveCount})
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  typeFilter === "all"
                    ? "bg-[var(--ripnel-accent)] text-white"
                    : "border border-[var(--ops-border-strong)] bg-[var(--ops-field)] text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)]"
                }`}
              >
                Todos los tipos
              </button>
              {locationTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTypeFilter(option.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    typeFilter === option.value
                      ? "bg-[var(--ripnel-accent)] text-white"
                      : "border border-[var(--ops-border-strong)] bg-[var(--ops-field)] text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.9fr]">
          <article className="ops-surface rounded-2xl border p-5">
            <div className="flex items-center justify-between border-b border-[var(--ops-border-strong)] pb-3">
              <h2 className="text-xl font-semibold text-[var(--ops-text)]">Lista de ubicaciones</h2>
              <span className="ops-metric-pill rounded-full px-3 py-1 text-xs font-semibold">
                {filteredLocations.length} visibles
              </span>
            </div>

            {loading ? (
              <div className="flex min-h-56 items-center justify-center text-[var(--ops-text-muted)]">
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                Cargando ubicaciones...
              </div>
            ) : filteredLocations.length ? (
              <div className="mt-4 space-y-3">
                {filteredLocations.map((location) => {
                  const Icon = typeIcon(location.type);

                  return (
                    <div
                      key={location.location_id}
                      className={`rounded-xl border border-[var(--ops-border-strong)] p-4 transition hover:bg-[var(--ops-surface-muted)] ${
                        location.active ? "" : "opacity-80"
                      }`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl bg-[var(--ripnel-accent-soft)] p-2.5 text-[var(--ripnel-accent-hover)]">
                            <Icon className="h-4.5 w-4.5" />
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold text-[var(--ops-text)]">{location.name}</h3>
                              <span className="sales-chip sales-chip-neutral rounded-full px-2.5 py-1 text-xs font-semibold">
                                {locationTypeLabels[location.type]}
                              </span>
                              <span
                                className={`sales-chip rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  location.active ? "sales-chip-success" : "sales-chip-neutral"
                                }`}
                              >
                                {location.active ? "Activa" : "Inactiva"}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                              {location.code || "Sin código"}
                              {location.address ? ` · ${location.address}` : ""}
                            </p>

                            <div className="mt-2.5 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(location)}
                                className="inline-flex items-center gap-1 rounded-full border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 py-1 text-xs font-semibold text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
                              >
                                <PencilLine className="h-3.5 w-3.5" />
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleActive(location)}
                                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                  location.active
                                    ? "border border-[var(--ops-border-strong)] bg-[var(--ops-field)] text-[var(--ops-text)] hover:bg-[var(--ops-surface-muted)]"
                                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                                }`}
                              >
                                {location.active ? "Inactivar" : "Activar"}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-[var(--ops-text-muted)]">
                          <MapPin className="h-4 w-4" />
                          {new Date(location.created_at).toLocaleDateString("es-PE")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="ops-empty-state-compact mt-4 rounded-xl p-8 text-center text-sm">
                {locations.length
                  ? "No hay resultados para este filtro."
                  : "Aún no hay ubicaciones registradas."}
              </div>
            )}
          </article>

          <article className="ops-surface rounded-2xl border p-5">
            <div className="border-b border-[var(--ops-border-strong)] pb-3">
              <h2 className="text-xl font-semibold text-[var(--ops-text)]">
                {editingLocationId ? "Editar ubicación" : "Crear ubicación"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--ops-text)]">Nombre</label>
                <input
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Tienda Centro"
                  className="w-full rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 py-2.5 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--ripnel-accent)]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--ops-text)]">Tipo</label>
                <select
                  value={formState.type}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      type: event.target.value as LocationItem["type"],
                    }))
                  }
                  disabled={editingLocationId !== null}
                  className="w-full rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 py-2.5 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--ripnel-accent)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {locationTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--ops-text)]">Dirección</label>
                <input
                  value={formState.address}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                  placeholder="Av. Ejemplo 123, Lima"
                  className="w-full rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 py-2.5 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--ripnel-accent)]"
                />
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-3 py-2.5 text-sm text-[var(--ops-text)]">
                <input
                  type="checkbox"
                  checked={formState.active}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      active: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-[var(--ops-border-strong)]"
                />
                {editingLocationId ? "Ubicación activa" : "Crear como ubicación activa"}
              </label>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              ) : null}

              {successMessage ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {successMessage}
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ripnel-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--ripnel-accent-hover)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : editingLocationId ? (
                    <>
                      <PencilLine className="h-4 w-4" />
                      Guardar cambios
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Crear ubicación
                    </>
                  )}
                </button>

                {editingLocationId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-4 py-2.5 text-sm font-semibold text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
                  >
                    Cancelar
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
