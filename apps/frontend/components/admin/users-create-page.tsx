"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { buildApiUrl } from "@/lib/api"
import { AdminFormPageShell } from "@/components/admin/admin-form-page-shell"
import {
  AdminActionButton,
  AdminCheckboxRow,
  AdminField,
  AdminFormActionsBar,
  AdminInput,
  AdminInlineMessage,
  AdminSection,
  AdminSelect,
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
        throw new Error("Elige una sede default para el usuario.")
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
      maxWidth="max-w-[1180px]"
    >
      <form className="space-y-5" onSubmit={submitUserForm}>
        {error ? (
          <AdminInlineMessage tone="danger">{error}</AdminInlineMessage>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-5">
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
                  <AdminSelect
                    required
                    value={userForm.role_id}
                    onChange={(event) => setUserForm((current) => ({ ...current, role_id: event.target.value }))}
                  >
                    <option value="">Selecciona un rol</option>
                    {loadingRoles ? (
                      <option disabled>Cargando roles...</option>
                    ) : rolesError ? (
                      <option disabled>Error al cargar roles</option>
                    ) : (
                      roles.map((role) => (
                        <option key={role.role_id} value={role.role_id}>
                          {role.name}
                        </option>
                      ))
                    )}
                  </AdminSelect>
                </AdminField>

                <AdminCheckboxRow
                  label="Usuario activo"
                  description="Permite el ingreso apenas reciba su clave temporal."
                  checked={userForm.active}
                  onChange={(checked) => setUserForm((current) => ({ ...current, active: checked }))}
                />
              </div>
            </AdminSection>
          </div>

          <div className="space-y-5">
            <AdminSection
              title="Sedes y sede default"
              aside={
                <div className="rounded-full border border-[var(--ops-border-strong)] px-2.5 py-1 text-xs font-medium text-[var(--ops-text-muted)]">
                  {userForm.location_ids.length}
                </div>
              }
            >
              {loadingLocations ? (
                <div className="rounded-xl bg-[var(--ops-field)] px-3 py-3 text-sm text-[var(--ops-text-muted)]">
                  Cargando sedes...
                </div>
              ) : locationsError ? (
                <AdminInlineMessage tone="warning">{locationsError}</AdminInlineMessage>
              ) : availableLocations.length === 0 ? (
                <div className="rounded-xl bg-[var(--ops-field)] px-3 py-3 text-sm text-[var(--ops-text-muted)]">
                  No hay sedes activas disponibles.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-[var(--ops-border-soft)] bg-[var(--ops-surface)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                      Regla operativa
                    </p>
                    <p className="mt-1 text-sm text-[var(--ops-text)]">
                      Debes asignar al menos una sede y marcar una como default antes de guardar.
                    </p>
                  </div>

                  <div className="max-h-[28rem] divide-y divide-[var(--ops-border-strong)] overflow-y-auto rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                    {availableLocations.map((location) => {
                      const checked = userForm.location_ids.includes(location.location_id)
                      const isDefault = userForm.default_location_id === location.location_id

                      return (
                        <div
                          key={location.location_id}
                          className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                        >
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleUserFormLocation(location.location_id)}
                              className="mt-1 h-4 w-4 rounded border-[var(--ops-border-strong)]"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-[var(--ops-text)]">
                                {location.name} ({location.code})
                              </span>
                              <span className="mt-1 block text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                                {location.type}
                              </span>
                              {location.address ? (
                                <span className="mt-1 block text-xs text-[var(--ops-text-muted)]">
                                  {location.address}
                                </span>
                              ) : null}
                            </span>
                          </label>

                          <label
                            className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                              checked
                                ? "border-[var(--ops-border-soft)] bg-[var(--ripnel-accent-soft)] text-[var(--ripnel-accent-hover)]"
                                : "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]"
                            }`}
                          >
                            <input
                              type="radio"
                              name="new-user-default-location"
                              checked={isDefault}
                              disabled={!checked}
                              onChange={() => chooseUserFormDefaultLocation(location.location_id)}
                              className="h-4 w-4 border-[var(--ops-border-strong)] disabled:cursor-not-allowed"
                            />
                            Default
                          </label>
                        </div>
                      )
                    })}
                  </div>
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
