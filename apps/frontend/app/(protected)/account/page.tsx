"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, MapPin, Store, Warehouse } from "lucide-react";
import { type AuthLocation, useAuth } from "@/components/auth/AuthProvider";
import { apiFetch, type ApiEnvelope, unwrapApiData } from "@/lib/api";

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join("");
}

function locationTypeLabel(type: string) {
  if (type === "store") return "Tienda";
  if (type === "warehouse") return "Almacen";
  if (type === "workshop") return "Taller";
  if (type === "third_party") return "Tercero";
  return "Ubicacion";
}

function LocationIcon({ type }: { type: string }) {
  if (type === "store") return <Store className="h-4 w-4 text-indigo-600" />;
  if (type === "warehouse") return <Warehouse className="h-4 w-4 text-indigo-600" />;
  return <Building2 className="h-4 w-4 text-indigo-600" />;
}

function ReadonlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
        {value}
      </div>
    </div>
  );
}

export default function AccountPage() {
  const {
    user,
    loading,
    locationAssignments,
    defaultLocation,
    locationsLoading,
    locationsError,
    refreshLocations,
    setDefaultLocation,
  } = useAuth();
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [availableLocations, setAvailableLocations] = useState<AuthLocation[]>([]);
  const [loadingAvailableLocations, setLoadingAvailableLocations] = useState(false);

  useEffect(() => {
    if (!user?.user_id || locationAssignments.length > 0) {
      setAvailableLocations([]);
      setLoadingAvailableLocations(false);
      return;
    }

    let active = true;

    async function loadAvailableLocations() {
      setLoadingAvailableLocations(true);

      try {
        const response = await apiFetch<ApiEnvelope<AuthLocation[]> | AuthLocation[]>("/api/locations");
        const locations = unwrapApiData(response);
        if (active) {
          setAvailableLocations(locations.filter((location) => location.active));
        }
      } catch {
        if (active) {
          setAvailableLocations([]);
        }
      } finally {
        if (active) {
          setLoadingAvailableLocations(false);
        }
      }
    }

    void loadAvailableLocations();

    return () => {
      active = false;
    };
  }, [locationAssignments.length, user?.user_id]);

  useEffect(() => {
    const nextSelected =
      defaultLocation?.location_id ||
      locationAssignments[0]?.location_id ||
      availableLocations[0]?.location_id ||
      "";
    setSelectedLocationId(nextSelected);
  }, [availableLocations, defaultLocation?.location_id, locationAssignments]);

  const assignedLocationsCount = locationAssignments.length;
  const currentLocationLabel = defaultLocation?.name || "Sin sede default";
  const initials = useMemo(
    () => getInitials(user?.full_name || "Usuario Ripnel"),
    [user?.full_name]
  );

  async function handleSaveDefaultLocation() {
    if (!selectedLocationId) {
      setSaveError("Elige una sede para guardarla como default.");
      return;
    }

    setSavingLocation(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      if (locationAssignments.length > 0) {
        await setDefaultLocation(selectedLocationId);
        setSaveMessage("La sede default del usuario se actualizo correctamente.");
      } else {
        await apiFetch(`/api/users/${user.user_id}/locations`, {
          method: "PUT",
          body: JSON.stringify({
            assignments: [{ location_id: selectedLocationId, is_default: true }],
          }),
        });
        await refreshLocations();
        setSaveMessage("La sede inicial del usuario se configuro correctamente.");
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo actualizar la sede.");
    } finally {
      setSavingLocation(false);
    }
  }

  if (loading) {
    return (
      <section className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Cargando cuenta...</div>
        </div>
      </section>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <section className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white">
                {initials}
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-slate-900">{user.full_name}</h1>
                <div className="text-sm text-slate-500">
                  @{user.username} · {user.role_name || "Sin rol"}
                </div>
                <div className="text-sm text-slate-500">
                  {user.email || "Sin correo registrado"}
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Sesion activa
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Rol actual
            </div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {user.role_name || "Sin rol"}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sede default
            </div>
            <div className="mt-2 text-xl font-semibold text-slate-900">{currentLocationLabel}</div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sedes asignadas
            </div>
            <div className="mt-2 text-xl font-semibold text-slate-900">
              {assignedLocationsCount}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">Datos del usuario</h2>
              <p className="mt-1 text-sm text-slate-500">
                Informacion actual de la cuenta autenticada.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ReadonlyField label="Nombre completo" value={user.full_name} />
              <ReadonlyField label="Usuario" value={user.username} />
              <ReadonlyField
                label="Correo"
                value={user.email || "Sin correo registrado"}
              />
              <ReadonlyField label="Rol" value={user.role_name || "Sin rol"} />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">Sede operativa</h2>
              <p className="mt-1 text-sm text-slate-500">
                Esta sede default puede reutilizarse luego en ventas, inventario y otros flujos.
              </p>
            </div>

            {locationsLoading || loadingAvailableLocations ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Cargando sedes asignadas...
              </div>
            ) : locationsError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {locationsError}
              </div>
            ) : locationAssignments.length === 0 ? (
              availableLocations.length === 0 ? (
                <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                  <div className="font-medium">Este usuario todavia no tiene sedes configuradas.</div>
                  <div>
                    No se encontraron ubicaciones activas para elegir una sede default inicial.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-4 text-sm text-indigo-700">
                    Aun no tienes asignaciones en <code>user_locations</code>. Puedes elegir una sede
                    activa para dejarla como configuracion inicial desde tu cuenta.
                  </div>

                  {availableLocations.map((location) => {
                    const isSelected = selectedLocationId === location.location_id;

                    return (
                      <label
                        key={location.location_id}
                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 transition ${
                          isSelected
                            ? "border-indigo-300 bg-indigo-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="default-location"
                          value={location.location_id}
                          checked={isSelected}
                          onChange={() => setSelectedLocationId(location.location_id)}
                          className="mt-1 h-4 w-4 border-slate-300 text-indigo-600"
                        />

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <LocationIcon type={location.type} />
                            <span className="font-medium text-slate-900">{location.name}</span>
                          </div>

                          <div className="text-sm text-slate-500">
                            {locationTypeLabel(location.type)}
                            {location.code ? ` · ${location.code}` : ""}
                          </div>

                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <MapPin className="h-4 w-4" />
                            <span>{location.address || "Sin direccion registrada"}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}

                  {saveError && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {saveError}
                    </div>
                  )}

                  {saveMessage && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {saveMessage}
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleSaveDefaultLocation}
                      disabled={savingLocation || !selectedLocationId}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingLocation ? "Guardando..." : "Guardar sede inicial"}
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-3">
                {locationAssignments.map((assignment) => {
                  const isSelected = selectedLocationId === assignment.location_id;

                  return (
                    <label
                      key={assignment.location_id}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 transition ${
                        isSelected
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="default-location"
                        value={assignment.location_id}
                        checked={isSelected}
                        onChange={() => setSelectedLocationId(assignment.location_id)}
                        className="mt-1 h-4 w-4 border-slate-300 text-indigo-600"
                      />

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <LocationIcon type={assignment.location.type} />
                          <span className="font-medium text-slate-900">
                            {assignment.location.name}
                          </span>
                          {assignment.is_default && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              Actual
                            </span>
                          )}
                        </div>

                        <div className="text-sm text-slate-500">
                          {locationTypeLabel(assignment.location.type)}
                          {assignment.location.code ? ` · ${assignment.location.code}` : ""}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <MapPin className="h-4 w-4" />
                          <span>{assignment.location.address || "Sin direccion registrada"}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}

                {saveError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {saveError}
                  </div>
                )}

                {saveMessage && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {saveMessage}
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSaveDefaultLocation}
                    disabled={savingLocation || !selectedLocationId}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingLocation ? "Guardando..." : "Guardar sede default"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
