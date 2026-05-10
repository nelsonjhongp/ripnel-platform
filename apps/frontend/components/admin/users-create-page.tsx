"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { buildApiUrl } from "@/lib/api"
import { AdminFormPageShell } from "@/components/admin/admin-form-page-shell"
import {
  AdminActionButton,
  AdminCheckboxField,
  AdminField,
  AdminFormActionsBar,
  AdminInput,
  AdminInlineMessage,
  AdminMultiSelectMenu,
  AdminSelectionChip,
  AdminSection,
  AdminSelectMenu,
} from "@/components/admin/admin-ui"

type Role = {
  role_id: string
  name: string
  active: boolean
}

type Location = {
  location_id: string
  code: string
  name: string
  type: string
  address: string | null
  active: boolean
}

type UserFormState = {
  full_name: string
  username: string
  email: string
  role_id: string
  active: boolean
  location_ids: string[]
  default_location_id: string
}

type ApiResponse<T> = {
  ok: boolean
  data: T
  message?: string
}

const emptyUserForm: UserFormState = {
  full_name: "",
  username: "",
  email: "",
  role_id: "",
  active: true,
  location_ids: [],
  default_location_id: "",
}

async function requestJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(buildApiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
    credentials: "include",
    ...init,
  })

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.message || "Request failed")
  }

  return payload.data
}

export default function UsersCreatePage() {
  const router = useRouter()
  const [roles, setRoles] = useState<Role[]>([])
  const [availableLocations, setAvailableLocations] = useState<Location[]>([])
  const [loadingRoles, setLoadingRoles] = useState(true)
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [locationsError, setLocationsError] = useState<string | null>(null)
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm)
  const [savingUser, setSavingUser] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roleOptions = useMemo(
    () =>
      roles.map((role) => ({
        value: role.role_id,
        label: role.name,
      })),
    [roles]
  )

  const locationOptions = useMemo(
    () =>
      availableLocations.map((location) => ({
        value: location.location_id,
        label: location.name,
        helper: [location.type, location.address].filter(Boolean).join(" · "),
      })),
    [availableLocations]
  )

  const selectedLocationOptions = useMemo(
    () => locationOptions.filter((location) => userForm.location_ids.includes(location.value)),
    [locationOptions, userForm.location_ids]
  )

  const defaultLocationOptions = selectedLocationOptions.map((location) => ({
    value: location.value,
    label: location.label,
  }))

  useEffect(() => {
    async function loadRoles() {
      setLoadingRoles(true)
      setRolesError(null)

      try {
        const data = await requestJson<Role[]>("/api/roles")
        setRoles(data.filter((role) => role.active))
      } catch (loadError) {
        setRolesError(loadError instanceof Error ? loadError.message : "No se pudo cargar roles")
      } finally {
        setLoadingRoles(false)
      }
    }

    async function loadLocations() {
      setLoadingLocations(true)
      setLocationsError(null)

      try {
        const data = await requestJson<Location[]>("/api/locations")
        setAvailableLocations(data.filter((location) => location.active))
      } catch (loadError) {
        setLocationsError(loadError instanceof Error ? loadError.message : "No se pudo cargar sedes")
      } finally {
        setLoadingLocations(false)
      }
    }

    void Promise.all([loadRoles(), loadLocations()])
  }, [])

  function toggleUserFormLocation(locationId: string) {
    setUserForm((current) => {
      const isSelected = current.location_ids.includes(locationId)
      const nextLocationIds = isSelected
        ? current.location_ids.filter((value) => value !== locationId)
        : [...current.location_ids, locationId]
      const nextDefaultLocationId = isSelected
        ? current.default_location_id === locationId
          ? nextLocationIds[0] || ""
          : current.default_location_id
        : current.default_location_id || locationId

      return {
        ...current,
        location_ids: nextLocationIds,
        default_location_id: nextDefaultLocationId,
      }
    })
  }

  function chooseUserFormDefaultLocation(locationId: string) {
    setUserForm((current) => ({
      ...current,
      location_ids: current.location_ids.includes(locationId)
        ? current.location_ids
        : [...current.location_ids, locationId],
      default_location_id: locationId,
    }))
  }

  async function submitUserForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingUser(true)
    setError(null)

    try {
      if (!userForm.role_id) {
        throw new Error("Elige un rol para crear el usuario.")
      }

      if (userForm.location_ids.length === 0) {
        throw new Error("Asigna al menos una sede al usuario.")
      }

      if (!userForm.default_location_id) {
        throw new Error("Elige una sede por defecto para el usuario.")
      }

      const createdUser = await requestJson<{ username: string; temporary_password?: string }>("/api/users", {
        method: "POST",
        body: JSON.stringify({
          full_name: userForm.full_name,
          username: userForm.username,
          email: userForm.email.trim() || null,
          role_id: userForm.role_id,
          active: userForm.active,
          assignments: userForm.location_ids.map((location_id) => ({
            location_id,
            is_default: userForm.default_location_id === location_id,
          })),
        }),
      })

      if (createdUser.temporary_password) {
        window.alert(
          `Usuario creado.\nUsuario: ${createdUser.username}\nClave temporal: ${createdUser.temporary_password}\n\nEntrega esta clave al usuario para su primer ingreso.`
        )
      }

      router.push("/administracion/usuarios")
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar el usuario")
    } finally {
      setSavingUser(false)
    }
  }

  return (
    <AdminFormPageShell
      eyebrow="Administración"
      title="Nuevo usuario"
      backHref="/administracion/usuarios"
      maxWidth="max-w-[1100px]"
    >
      <form className="space-y-6" onSubmit={submitUserForm}>
        {error ? (
          <AdminInlineMessage tone="danger">{error}</AdminInlineMessage>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-6">
            <AdminSection title="Identidad y acceso">
              <div className="space-y-4">
                <AdminField label="Nombre completo">
                  <AdminInput
                    type="text"
                    required
                    autoComplete="off"
                    value={userForm.full_name}
                    onChange={(event) => setUserForm((current) => ({ ...current, full_name: event.target.value }))}
                  />
                </AdminField>

                <AdminField label="Usuario">
                  <AdminInput
                    type="text"
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="off"
                    value={userForm.username}
                    onChange={(event) => setUserForm((current) => ({ ...current, username: event.target.value }))}
                  />
                </AdminField>

                <AdminField label="Email opcional">
                  <AdminInput
                    type="email"
                    autoComplete="off"
                    value={userForm.email}
                    onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </AdminField>

                <AdminField label="Rol" hint={rolesError || undefined}>
                  <AdminSelectMenu
                    value={userForm.role_id}
                    onValueChange={(value) => setUserForm((current) => ({ ...current, role_id: value }))}
                    placeholder={
                      loadingRoles ? "Cargando roles..." : rolesError ? "Error al cargar roles" : "Selecciona un rol"
                    }
                    options={roleOptions}
                    disabled={loadingRoles || Boolean(rolesError)}
                  />
                </AdminField>

                <AdminField label="Estado">
                  <AdminCheckboxField
                    label="Usuario activo"
                    checked={userForm.active}
                    onChange={(checked) => setUserForm((current) => ({ ...current, active: checked }))}
                  />
                </AdminField>
              </div>
            </AdminSection>
          </div>

          <div className="space-y-6">
            <AdminSection title="Sedes operativas">
              {loadingLocations ? (
                <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3.5 py-3 text-sm text-[var(--ops-text-muted)]">
                  Cargando sedes...
                </div>
              ) : locationsError ? (
                <AdminInlineMessage tone="warning">{locationsError}</AdminInlineMessage>
              ) : availableLocations.length === 0 ? (
                <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3.5 py-3 text-sm text-[var(--ops-text-muted)]">
                  No hay sedes activas disponibles.
                </div>
              ) : (
                <div className="space-y-4">
                  <AdminField label="Sedes asignadas">
                    <div className="space-y-3">
                      <AdminMultiSelectMenu
                        selectedValues={userForm.location_ids}
                        onToggle={toggleUserFormLocation}
                        placeholder="Seleccionar sedes"
                        options={locationOptions}
                      />

                      {selectedLocationOptions.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedLocationOptions.map((location) => (
                            <AdminSelectionChip
                              key={location.value}
                              label={location.label}
                              onRemove={() => toggleUserFormLocation(location.value)}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--ops-text-muted)]">
                          Selecciona al menos una sede para continuar.
                        </p>
                      )}
                    </div>
                  </AdminField>

                  <AdminField label="Sede por defecto">
                    <div className="space-y-3">
                      <AdminSelectMenu
                        value={userForm.default_location_id}
                        onValueChange={chooseUserFormDefaultLocation}
                        placeholder={
                          selectedLocationOptions.length ? "Seleccionar sede por defecto" : "Selecciona una sede primero"
                        }
                        options={defaultLocationOptions}
                        disabled={!selectedLocationOptions.length}
                      />

                      {userForm.default_location_id ? (
                        <div className="flex flex-wrap gap-1.5">
                          {defaultLocationOptions
                            .filter((location) => location.value === userForm.default_location_id)
                            .map((location) => (
                              <AdminSelectionChip key={location.value} label={location.label} selected />
                            ))}
                        </div>
                      ) : null}
                    </div>
                  </AdminField>
                </div>
              )}
            </AdminSection>
          </div>
        </div>

        <AdminFormActionsBar>
          <AdminActionButton
            type="button"
            onClick={() => router.push("/administracion/usuarios")}
            disabled={savingUser}
          >
            Cancelar
          </AdminActionButton>
          <AdminActionButton type="submit" tone="accent" disabled={savingUser}>
            {savingUser ? "Guardando..." : "Guardar usuario"}
          </AdminActionButton>
        </AdminFormActionsBar>
      </form>
    </AdminFormPageShell>
  )
}
