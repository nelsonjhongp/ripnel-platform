"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, Store } from "lucide-react";
import { type AuthLocation, useAuth } from "@/components/auth/AuthProvider";
import { apiFetch, type ApiEnvelope, unwrapApiData } from "@/lib/api";
import {
  AccountPageFrame,
  PanelSection,
  SelectRow,
  ValueRow,
  locationTypeLabel,
} from "@/components/account/account-preferences-ui";

export default function AccountOperationPage() {
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

  const locationOptions = useMemo(() => {
    if (locationAssignments.length > 0) {
      return locationAssignments.map((assignment) => assignment.location);
    }
    return availableLocations;
  }, [availableLocations, locationAssignments]);

  const selectedLocation = useMemo(
    () => locationOptions.find((location) => location.location_id === selectedLocationId) || null,
    [locationOptions, selectedLocationId]
  );

  async function handleSaveDefaultLocation() {
    if (!selectedLocationId) {
      setSaveError("Elige una sede para guardarla como default.");
      return;
    }

    if (!user?.user_id) {
      setSaveError("No hay una sesion activa para actualizar la sede.");
      return;
    }

    setSavingLocation(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      if (locationAssignments.length > 0) {
        await setDefaultLocation(selectedLocationId);
        setSaveMessage("Sede default actualizada.");
      } else {
        await apiFetch(`/api/users/${user.user_id}/locations`, {
          method: "PUT",
          body: JSON.stringify({
            assignments: [{ location_id: selectedLocationId, is_default: true }],
          }),
        });
        await refreshLocations();
        setSaveMessage("Sede inicial configurada.");
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo actualizar la sede.");
    } finally {
      setSavingLocation(false);
    }
  }

  if (loading) {
    return (
      <section className="ops-page min-h-screen px-4 py-6">
        <div className="mx-auto max-w-3xl rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-6 shadow-sm">
          <div className="text-sm font-medium text-[var(--ops-text-muted)]">Cargando cuenta...</div>
        </div>
      </section>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AccountPageFrame
      backHref="/account"
      backLabel="Volver a perfil"
      title="Sede operativa"
    >
      <PanelSection title="Sede operativa" icon={Store}>
        {locationsLoading || loadingAvailableLocations ? (
          <div className="px-4 py-4 text-sm text-[var(--ops-text-muted)]">Cargando sedes...</div>
        ) : locationsError ? (
          <div className="px-4 py-4 text-sm text-rose-500">{locationsError}</div>
        ) : locationOptions.length === 0 ? (
          <div className="px-4 py-4 text-sm text-amber-500">No hay sedes activas disponibles.</div>
        ) : (
          <>
            <SelectRow
              label="Sede default"
              value={selectedLocationId}
              onChange={setSelectedLocationId}
            >
              {locationOptions.map((location) => (
                <option key={location.location_id} value={location.location_id}>
                  {location.name} · {locationTypeLabel(location.type)}
                  {location.code ? ` · ${location.code}` : ""}
                </option>
              ))}
            </SelectRow>

            {selectedLocation ? (
              <ValueRow
                label="Seleccion actual"
                value={
                  <div>
                    <div>{selectedLocation.name}</div>
                    <div className="mt-0.5 text-xs font-normal text-[var(--ops-text-muted)]">
                      {locationTypeLabel(selectedLocation.type)}
                      {selectedLocation.code ? ` · ${selectedLocation.code}` : ""}
                    </div>
                    {selectedLocation.address ? (
                      <div className="mt-1 flex items-center gap-1.5 text-xs font-normal text-[var(--ops-text-muted)]">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{selectedLocation.address}</span>
                      </div>
                    ) : null}
                  </div>
                }
              />
            ) : null}

            {saveError ? (
              <div className="border-t border-[var(--ops-border-strong)] px-4 py-3 text-sm text-rose-500">
                {saveError}
              </div>
            ) : null}
            {saveMessage ? (
              <div className="border-t border-[var(--ops-border-strong)] px-4 py-3 text-sm text-emerald-500">
                {saveMessage}
              </div>
            ) : null}

            <div className="flex justify-end border-t border-[var(--ops-border-strong)] px-4 py-3">
              <button
                type="button"
                onClick={handleSaveDefaultLocation}
                disabled={savingLocation || !selectedLocationId}
                className="rounded-md bg-[var(--ripnel-accent)] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--ripnel-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingLocation ? "Guardando..." : "Guardar sede"}
              </button>
            </div>
          </>
        )}
      </PanelSection>
    </AccountPageFrame>
  );
}
