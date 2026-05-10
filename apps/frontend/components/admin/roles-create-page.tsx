"use client"

import { useEffect, useState } from "react"
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
  AdminSection,
  AdminTextarea,
} from "@/components/admin/admin-ui"
import {
  RolePermissionPicker,
  type RolePermission,
} from "@/components/admin/role-permission-picker"

type RoleFormState = {
  name: string
  description: string
  active: boolean
  permission_keys: string[]
}

type ApiResponse<T> = {
  ok: boolean
  data: T
  message?: string
}

const emptyRoleForm: RoleFormState = {
  name: "",
  description: "",
  active: true,
  permission_keys: [],
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

export default function RolesCreatePage() {
  const router = useRouter()
  const [availablePermissions, setAvailablePermissions] = useState<RolePermission[]>([])
  const [loadingPermissions, setLoadingPermissions] = useState(true)
  const [permissionsError, setPermissionsError] = useState<string | null>(null)
  const [roleForm, setRoleForm] = useState<RoleFormState>(emptyRoleForm)
  const [savingRole, setSavingRole] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadPermissions() {
      setLoadingPermissions(true)
      setPermissionsError(null)

      try {
        const data = await requestJson<RolePermission[]>("/api/roles/permissions")
        setAvailablePermissions(data)
      } catch (loadError) {
        setPermissionsError(loadError instanceof Error ? loadError.message : "No se pudo cargar permisos")
      } finally {
        setLoadingPermissions(false)
      }
    }

    void loadPermissions()
  }, [])

  function toggleRolePermission(permissionKey: string) {
    setRoleForm((current) => {
      const alreadySelected = current.permission_keys.includes(permissionKey)

      return {
        ...current,
        permission_keys: alreadySelected
          ? current.permission_keys.filter((currentKey) => currentKey !== permissionKey)
          : [...current.permission_keys, permissionKey],
      }
    })
  }

  function clearAllRolePermissions() {
    setRoleForm((current) => ({ ...current, permission_keys: [] }))
  }

  async function submitRoleForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingRole(true)
    setError(null)

    try {
      await requestJson("/api/roles", {
        method: "POST",
        body: JSON.stringify({
          name: roleForm.name,
          description: roleForm.description,
          active: roleForm.active,
          permission_keys: roleForm.permission_keys,
        }),
      })

      router.push("/administracion/roles")
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar el rol")
    } finally {
      setSavingRole(false)
    }
  }

  return (
    <AdminFormPageShell
      eyebrow="Administración"
      title="Nuevo rol"
      backHref="/administracion/roles"
      maxWidth="max-w-[1100px]"
    >
      <form className="space-y-6" onSubmit={submitRoleForm}>
        {error ? (
          <AdminInlineMessage tone="danger">{error}</AdminInlineMessage>
        ) : null}

        <AdminSection title="Identidad del rol">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <AdminField label="Nombre">
              <AdminInput
                type="text"
                required
                autoComplete="off"
                value={roleForm.name}
                onChange={(event) => setRoleForm((current) => ({ ...current, name: event.target.value }))}
              />
            </AdminField>

            <AdminField label="Estado">
              <AdminCheckboxField
                label="Rol activo"
                checked={roleForm.active}
                onChange={(checked) => setRoleForm((current) => ({ ...current, active: checked }))}
              />
            </AdminField>

            <div className="xl:col-span-2">
              <AdminField label="Descripción">
                <AdminTextarea
                  value={roleForm.description}
                  onChange={(event) => setRoleForm((current) => ({ ...current, description: event.target.value }))}
                  rows={5}
                />
              </AdminField>
            </div>
          </div>
        </AdminSection>

        <AdminSection title="Permisos">
          <RolePermissionPicker
            permissions={availablePermissions}
            selectedKeys={roleForm.permission_keys}
            onTogglePermission={toggleRolePermission}
            onClearAll={clearAllRolePermissions}
            loading={loadingPermissions}
            error={permissionsError}
          />
        </AdminSection>

        <AdminFormActionsBar>
          <AdminActionButton
            type="button"
            onClick={() => router.push("/administracion/roles")}
            disabled={savingRole}
          >
            Cancelar
          </AdminActionButton>
          <AdminActionButton type="submit" tone="accent" disabled={savingRole}>
            {savingRole ? "Guardando..." : "Guardar rol"}
          </AdminActionButton>
        </AdminFormActionsBar>
      </form>
    </AdminFormPageShell>
  )
}
