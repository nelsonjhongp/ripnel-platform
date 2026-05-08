import { useMemo, useState } from "react"
import { X } from "lucide-react"

import { AdminActionButton, AdminInput, AdminInlineMessage } from "@/components/admin/admin-ui"
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
  catalogs: "Catalogos",
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

function groupPermissions(permissions: RolePermission[], query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  const filtered = permissions.filter((permission) => {
    if (!normalizedQuery) {
      return true
    }

    return [permission.key, permission.description || ""].some((value) =>
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
        getPermissionAction(left.key).localeCompare(getPermissionAction(right.key), "es")
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
  const [activeModule, setActiveModule] = useState("all")

  const selectedKeySet = useMemo(() => new Set(selectedKeys), [selectedKeys])
  const groupedPermissions = useMemo(() => groupPermissions(permissions, query), [permissions, query])
  const visibleGroups = useMemo(
    () =>
      activeModule === "all"
        ? groupedPermissions
        : groupedPermissions.filter((group) => group.key === activeModule),
    [activeModule, groupedPermissions]
  )
  const moduleOptions = useMemo(() => {
    const allGroups = groupPermissions(permissions, "")
    return [
      { key: "all", label: "Todos", count: permissions.length },
      ...allGroups.map((group) => ({
        key: group.key,
        label: group.label,
        count: group.permissions.length,
      })),
    ]
  }, [permissions])
  const selectedPermissions = useMemo(
    () => permissions.filter((permission) => selectedKeySet.has(permission.key)),
    [permissions, selectedKeySet]
  )

  return (
    <div className={cn("grid min-h-[31rem] gap-3 lg:grid-cols-[12rem_minmax(0,1fr)]", className)}>
      <aside className="space-y-2 border-b border-[var(--ops-border-soft)] pb-3 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-3">
        <div className="text-xs font-medium uppercase tracking-wide text-[var(--ops-text-muted)]">
          Modulos
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
          {moduleOptions.map((module) => {
            const isActive = activeModule === module.key

            return (
              <button
                key={module.key}
                type="button"
                onClick={() => setActiveModule(module.key)}
                className={cn(
                  "flex shrink-0 cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-xs font-medium transition lg:w-full",
                  isActive
                    ? "border-[var(--ops-border-soft)] bg-[var(--ripnel-accent-soft)] text-[var(--ripnel-accent-hover)]"
                    : "border-transparent bg-transparent text-[var(--ops-text-muted)] hover:border-[var(--ops-border-soft)] hover:bg-[var(--ops-surface-muted)] hover:text-[var(--ops-text)]"
                )}
              >
                <span>{module.label}</span>
                <span className="tabular-nums opacity-75">{module.count}</span>
              </button>
            )
          })}
        </div>
      </aside>

      <div className="flex min-h-0 flex-col gap-3">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--ops-text-muted)]">
              Buscar permiso
            </span>
            <AdminInput
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por clave o descripcion"
            />
          </label>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--ops-border-soft)] bg-[var(--ops-field)] px-3 py-2">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--ops-text-muted)]">
              Seleccionados
            </span>
            <span className="text-sm font-semibold tabular-nums text-[var(--ops-text)]">
              {selectedKeys.length}
            </span>
          </div>
        </div>

        {selectedPermissions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 border-b border-[var(--ops-border-soft)] pb-3">
            {selectedPermissions.map((permission) => (
              <button
                key={`selected-${permission.permission_id}`}
                type="button"
                onClick={() => onTogglePermission(permission.key)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--ops-border-soft)] bg-[var(--ripnel-accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--ripnel-accent-hover)] transition hover:border-[var(--ripnel-accent)]"
                title={permission.description || permission.key}
              >
                {permission.key}
                <X className="h-3 w-3" />
              </button>
            ))}
            <AdminActionButton type="button" onClick={onClearAll} className="h-7 rounded-full px-2.5 text-xs">
              Limpiar
            </AdminActionButton>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="rounded-lg bg-[var(--ops-field)] px-4 py-3 text-sm text-[var(--ops-text-muted)]">
              Cargando permisos...
            </div>
          ) : error ? (
            <AdminInlineMessage tone="warning">{error}</AdminInlineMessage>
          ) : permissions.length === 0 ? (
            <div className="rounded-lg bg-[var(--ops-field)] px-4 py-3 text-sm text-[var(--ops-text-muted)]">
              No hay permisos registrados todavía.
            </div>
          ) : visibleGroups.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--ops-border-soft)] bg-[var(--ops-field)] px-4 py-6 text-center text-sm text-[var(--ops-text-muted)]">
              No hay permisos que coincidan con el filtro.
            </div>
          ) : (
            <div className="space-y-4">
              {visibleGroups.map((group) => {
                const selectedCount = group.permissions.filter((permission) =>
                  selectedKeySet.has(permission.key)
                ).length

                return (
                  <section key={group.key} className="space-y-2">
                    <div className="flex items-center justify-between border-b border-[var(--ops-border-soft)] pb-2">
                      <h3 className="text-sm font-semibold text-[var(--ops-text)]">{group.label}</h3>
                      <span className="text-xs text-[var(--ops-text-muted)]">
                        {selectedCount}/{group.permissions.length}
                      </span>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {group.permissions.map((permission) => {
                        const checked = selectedKeySet.has(permission.key)

                        return (
                          <label
                            key={permission.permission_id}
                            className={cn(
                              "flex min-h-16 cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition",
                              checked
                                ? "border-[var(--ops-border-soft)] bg-[var(--ripnel-accent-soft)]"
                                : "border-[var(--ops-border-soft)] bg-[var(--ops-surface)] hover:bg-[var(--ops-surface-muted)]"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => onTogglePermission(permission.key)}
                              className="mt-1 h-4 w-4 rounded border-[var(--ops-border-strong)]"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-[var(--ops-text)]">
                                {getPermissionAction(permission.key)}
                              </span>
                              <span className="mt-0.5 block truncate text-[11px] text-[var(--ops-text-muted)]">
                                {permission.key}
                              </span>
                              {permission.description ? (
                                <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[var(--ops-text-muted)]">
                                  {permission.description}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
