"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { CheckCircle2, ChevronRight, KeyRound, Palette, Store } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  AccountPageFrame,
  PanelSection,
  ValueRow,
} from "@/components/account/account-preferences-ui";

function PreferenceLink({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-t border-[var(--ops-border-strong)] px-4 py-3 text-[var(--ops-text)] transition hover:bg-[var(--ops-field)]"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--ops-border-strong)] bg-[var(--ops-field)] text-[var(--ops-text-muted)]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-0.5 text-xs text-[var(--ops-text-muted)]">{description}</div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--ops-text-muted)]" />
    </Link>
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
      // defer state updates to avoid synchronous setState inside effect
      void Promise.resolve().then(() => {
        setAvailableLocations([]);
        setLoadingAvailableLocations(false);
      });
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
    // defer selection to avoid synchronous setState inside effect
    void Promise.resolve().then(() => setSelectedLocationId(nextSelected));
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
      backHref="/inicio"
      backLabel="Volver al inicio"
      title="Perfil"
      description="Cuenta y preferencias."
    >
      <PanelSection title="Informacion del usuario">
        <ValueRow label="Nombre" value={user.full_name} />
        <ValueRow label="Usuario" value={`@${user.username}`} detail="Nombre visible en el ERP" />
        <ValueRow label="Correo principal" value={user.email || "Sin correo registrado"} />
        <ValueRow label="Rol" value={user.role_name || "Sin rol"} />
        <ValueRow
          label="Estado"
          value={
            <span className="inline-flex items-center gap-2 text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
              Sesion activa
            </span>
          }
        />
      </PanelSection>

      <PanelSection title="Preferencias">
        <PreferenceLink
          href="/account/operacion"
          title="Sede operativa"
          description={defaultLocation?.name || "Elegir sede default"}
          icon={Store}
        />
        <PreferenceLink
          href="/account/seguridad"
          title="Seguridad"
          description="Cambiar contrasena"
          icon={KeyRound}
        />
        <PreferenceLink
          href="/account/apariencia"
          title="Apariencia"
          description="Tema claro, gris operativo u oscuro grafito"
          icon={Palette}
        />
      </PanelSection>
    </AccountPageFrame>
  );
}
