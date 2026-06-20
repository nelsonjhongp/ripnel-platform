import { useMemo, useState } from "react"
import { Search } from "lucide-react"

import { AdminActionButton, AdminCheckboxOption, AdminInlineMessage } from "@/components/admin/admin-ui"
import { OpsSelect } from "@/components/ui/ops-selection"
import { OpsSelectionChip } from "@/components/ui/ops-selection"
import { cn } from "@/lib/utils"

export type RolePermission = {
  permission_id: string
  key: string
  description: string | null
}

const preferredModuleOrder = [
  "users",
  "roles",
  "locations",
  "catalogs",
  "styles",
  "variants",
  "products",
  "prices",
  "pricing",
  "inventory",
  "transfers",
  "customers",
  "sales",
  "postsales",
  "cash",
  "dashboard",
  "home",
]

const moduleLabels: Record<string, string> = {
  users: "Usuarios",
  roles: "Roles",
  locations: "Sedes",
  catalogs: "Catálogos",
  styles: "Styles",
  variants: "Variantes",
  products: "Productos",
  prices: "Precios",
  pricing: "Reglas de precio",
  inventory: "Inventario",
  transfers: "Transferencias",
  customers: "Clientes",
  sales: "Ventas",
  postsales: "Postventa",
  cash: "Caja",
  dashboard: "Dashboard",
  home: "Inicio",
}

function getPermissionModule(permissionKey: string) {
  const [moduleKey] = permissionKey.split(".")
  return moduleKey || "general"
}

function getPermissionAction(permissionKey: string) {
  const [, ...rest] = permissionKey.split(".")
  return rest.length > 0 ? rest.join(".") : permissionKey
}

function humanizePermissionAction(permissionKey: string) {
  const action = getPermissionAction(permissionKey)

  return action
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatModuleLabel(moduleKey: string) {
  return (
    moduleLabels[moduleKey] ||
    moduleKey
      .split(/[_-]/g)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  )
}

function compareModules(left: string, right: string) {
  const leftIndex = preferredModuleOrder.indexOf(left)
  const rightIndex = preferredModuleOrder.indexOf(right)

  if (leftIndex !== -1 || rightIndex !== -1) {
    if (leftIndex === -1) return 1
    if (rightIndex === -1) return -1
    return leftIndex - rightIndex
  }

  return formatModuleLabel(left).localeCompare(formatModuleLabel(right), "es")
}

function getPermissionDisplayLabel(permission: RolePermission) {
  return permission.description?.trim() || humanizePermissionAction(permission.key)
}

function groupPermissions(permissions: RolePermission[], query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  const filtered = permissions.filter((permission) => {
    if (!normalizedQuery) {
      return true
    }

    return [permission.key, permission.description || "", humanizePermissionAction(permission.key)].some((value) =>
      value.toLowerCase().includes(normalizedQuery)
    )
  })

  const groups = new Map<string, RolePermission[]>()

  for (const permission of filtered) {
    const moduleKey = getPermissionModule(permission.key)
    groups.set(moduleKey, [...(groups.get(moduleKey) || []), permission])
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => compareModules(left, right))
    .map(([key, values]) => ({
      key,
      label: formatModuleLabel(key),
      permissions: [...values].sort((left, right) =>
        getPermissionDisplayLabel(left).localeCompare(getPermissionDisplayLabel(right), "es")
      ),
    }))
}

export function RolePermissionPicker({
  permissions,
  selectedKeys,
  loading,
  error,
  onTogglePermission,
  onClearAll,
  className,
}: {
  permissions: RolePermission[]
  selectedKeys: string[]
  loading: boolean
  error: string | null
  onTogglePermission: (permissionKey: string) => void
  onClearAll: () => void
  className?: string
}) {
  const [query, setQuery] = useState("")
  const [moduleFilter, setModuleFilter] = useState("all")

  const selectedKeySet = useMemo(() => new Set(selectedKeys), [selectedKeys])
  const groupedPermissions = useMemo(() => groupPermissions(permissions, query), [permissions, query])
  const allGroupedPermissions = useMemo(() => groupPermissions(permissions, ""), [permissions])
  const selectedPermissions = useMemo(
    () => permissions.filter((permission) => selectedKeySet.has(permission.key)),
    [permissions, selectedKeySet]
  )
  const moduleOptions = useMemo(
    () => [
      { value: "all", label: "Todos" },
      ...allGroupedPermissions.map((group) => ({ value: group.key, label: group.label })),
    ],
    [allGroupedPermissions]
  )
  const visibleGroups = useMemo(() => {
    if (moduleFilter === "all") {
      return groupedPermissions
    }

    return groupedPermissions.filter((group) => group.key === moduleFilter)
  }, [groupedPermissions, moduleFilter])
  const showModulePrompt = moduleFilter === "all" && !query.trim()

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_0.78fr_auto] lg:items-end">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
            Buscar permiso
          </label>
          <div className="sales-field flex h-10 items-center gap-2 rounded-lg px-3 transition hover:bg-[var(--ops-surface-muted)]">
            <Search className="h-4 w-4 shrink-0 text-[var(--ops-text-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por clave o descripción"
              className="h-full w-full bg-transparent text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]"
            />
          </div>
        </div>

        <OpsSelect
          label="Módulo"
          value={moduleFilter}
          options={moduleOptions}
          onChange={setModuleFilter}
        />

        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 py-2 text-sm text-[var(--ops-text-muted)]">
            {selectedKeys.length} seleccionado{selectedKeys.length === 1 ? "" : "s"}
          </div>
          {selectedKeys.length ? (
            <AdminActionButton type="button" onClick={onClearAll}>
              Limpiar
            </AdminActionButton>
          ) : null}
        </div>
      </div>

      {selectedPermissions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-b border-[var(--ops-border-soft)] pb-4">
          {selectedPermissions.map((permission) => (
            <OpsSelectionChip
              key={`selected-${permission.permission_id}`}
              label={getPermissionDisplayLabel(permission)}
              onRemove={() => onTogglePermission(permission.key)}
              title={permission.key}
            />
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-4 py-3 text-sm text-[var(--ops-text-muted)]">
          Cargando permisos...
        </div>
      ) : error ? (
        <AdminInlineMessage tone="warning">{error}</AdminInlineMessage>
      ) : permissions.length === 0 ? (
        <div className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-4 py-3 text-sm text-[var(--ops-text-muted)]">
          No hay permisos registrados todavía.
        </div>
      ) : showModulePrompt ? (
        <div className="rounded-lg border border-dashed border-[var(--ops-border-soft)] bg-[var(--ops-field)] px-4 py-6 text-center text-sm text-[var(--ops-text-muted)]">
          Selecciona un m&oacute;dulo o usa la b&uacute;squeda para cargar permisos.
        </div>
      ) : visibleGroups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--ops-border-soft)] bg-[var(--ops-field)] px-4 py-6 text-center text-sm text-[var(--ops-text-muted)]">
          No hay permisos que coincidan con el filtro.
        </div>
      ) : (
        <div className="space-y-2">
          {visibleGroups.map((group) => {
            const selectedCount = group.permissions.filter((permission) => selectedKeySet.has(permission.key)).length

            return (
              <div key={group.key} className="rounded-xl border border-[var(--ops-border-soft)] bg-[var(--ops-surface)]">
                <div className="border-b border-[var(--ops-border-soft)] px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--ops-text)]">{group.label}</p>
                  <p className="mt-0.5 text-xs text-[var(--ops-text-muted)]">
                    {selectedCount} de {group.permissions.length} seleccionados
                  </p>
                </div>
                <div className="space-y-2 px-4 py-3">
                  {group.permissions.map((permission) => {
                    const checked = selectedKeySet.has(permission.key)

                    return (
                      <AdminCheckboxOption
                        key={permission.permission_id}
                        label={getPermissionDisplayLabel(permission)}
                        helper={humanizePermissionAction(permission.key)}
                        checked={checked}
                        onChange={() => onTogglePermission(permission.key)}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
