"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, RotateCcw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildApiUrl } from "@/lib/api";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Button } from "@/components/ui/button";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { Pagination } from "@/components/ui/pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  message?: string;
};

type Permission = {
  permission_id: string;
  key: string;
  description: string | null;
};

type Role = {
  role_id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  permissions: Permission[];
};

type RoleFormState = {
  name: string;
  description: string;
  active: boolean;
  permission_keys: string[];
};

type PermissionGroup = {
  group: string;
  permissions: Permission[];
};

type PermissionModuleOption = {
  key: string;
  label: string;
  count: number;
};

async function requestJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(buildApiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
    credentials: "include",
    ...init,
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.message || "Request failed");
  }

  return payload.data;
}

const emptyRoleForm: RoleFormState = {
  name: "",
  description: "",
  active: true,
  permission_keys: [],
};

const PAGE_SIZE = 10;

function formatPermissionGroupLabel(group: string) {
  return group
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function PermissionSelector({
  selectedPermissions,
  selectedKeys,
  permissionModules,
  activeModule,
  query,
  onQueryChange,
  onModuleChange,
  onTogglePermission,
  onClearAll,
  groups,
  loading,
  error,
  totalPermissions,
}: {
  selectedPermissions: Permission[];
  selectedKeys: string[];
  permissionModules: PermissionModuleOption[];
  activeModule: string;
  query: string;
  onQueryChange: (value: string) => void;
  onModuleChange: (value: string) => void;
  onTogglePermission: (permissionKey: string) => void;
  onClearAll: () => void;
  groups: PermissionGroup[];
  loading: boolean;
  error: string | null;
  totalPermissions: number;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)]">
      <div className="border-b border-[var(--ops-border-strong)] px-4 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm font-medium text-[var(--ops-text)]">Permisos del rol</div>
            <div className="mt-1 text-xs text-[var(--ops-text-muted)]">
              Busca, filtra por módulo y marca solo lo necesario.
            </div>
          </div>
          <div className="rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 py-2 text-right">
            <div className="text-[11px] uppercase tracking-wide text-[var(--ops-text-muted)]">
              Seleccionados
            </div>
            <div className="text-base font-semibold text-[var(--ops-text)]">
              {selectedKeys.length}
            </div>
          </div>
        </div>

        {selectedPermissions.length > 0 ? (
          <div className="mt-3 rounded-2xl border border-[var(--ops-border-soft)] bg-[var(--ripnel-accent-soft)]/70 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-xs font-medium uppercase tracking-wide text-[var(--ripnel-accent-hover)]">
                Seleccionados: {selectedPermissions.length}
              </div>
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs font-medium text-[var(--ripnel-accent-hover)] transition hover:opacity-80"
              >
                Limpiar todo
              </button>
            </div>
            <div className="flex max-h-20 flex-wrap gap-2 overflow-y-auto pr-1">
              {selectedPermissions.map((permission) => (
                <button
                  key={`selected-${permission.permission_id}`}
                  type="button"
                  onClick={() => onTogglePermission(permission.key)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ops-border-soft)] bg-[var(--ops-field)] px-2.5 py-1 text-xs font-medium text-[var(--ripnel-accent-hover)] transition hover:bg-[var(--ripnel-accent-soft)]"
                  title={permission.description || permission.key}
                >
                  <span className="max-w-[14rem] truncate">{permission.key}</span>
                  <span className="text-sm leading-none text-[var(--ripnel-accent-hover)]">x</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 py-2.5 text-sm text-[var(--ops-text-muted)]">
            Todavía no has seleccionado permisos para este rol.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-b border-[var(--ops-border-strong)] px-4 py-3">
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--ops-text-muted)]">
            Buscar permiso
          </span>
          <input
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar por clave o descripción"
            className="w-full rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 py-2 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--ripnel-accent)] focus:ring-2 focus:ring-[var(--ripnel-accent-soft)]"
          />
        </label>

        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--ops-text-muted)]">
            Módulo
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {permissionModules.map((module) => {
              const isActive = activeModule === module.key;

              return (
                <button
                  key={module.key}
                  type="button"
                  onClick={() => onModuleChange(module.key)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    isActive
                      ? "border-[var(--ops-border-soft)] bg-[var(--ripnel-accent-soft)] text-[var(--ripnel-accent-hover)]"
                      : "border-[var(--ops-border-strong)] bg-[var(--ops-field)] text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)]"
                  }`}
                >
                  {module.label} ({module.count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="rounded-2xl bg-[var(--ops-field)] px-4 py-3 text-sm text-[var(--ops-text-muted)]">
            Cargando permisos…
          </div>
        ) : error ? (
          <div role="alert" aria-live="polite" className="rounded-2xl border border-[color:color-mix(in_srgb,#f59e0b_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] px-4 py-3 text-sm text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]">
            {error}
          </div>
        ) : totalPermissions === 0 ? (
          <div className="rounded-2xl bg-[var(--ops-field)] px-4 py-3 text-sm text-[var(--ops-text-muted)]">
            No hay permisos registrados todavía.
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-4 py-6 text-center text-sm text-[var(--ops-text-muted)]">
            No hay permisos que coincidan con la búsqueda o el módulo seleccionado.
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const selectedCount = group.permissions.filter((permission) =>
                selectedKeys.includes(permission.key)
              ).length;

              return (
                <div key={group.group} className="space-y-2">
                  <div className="sticky top-0 z-10 flex items-center justify-between rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-3 py-2 backdrop-blur">
                    <div className="text-sm font-semibold text-[var(--ops-text)]">
                      {formatPermissionGroupLabel(group.group)}
                    </div>
                    <div className="text-xs text-[var(--ops-text-muted)]">
                      {selectedCount}/{group.permissions.length}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {group.permissions.map((permission) => {
                      const checked = selectedKeys.includes(permission.key);

                      return (
                        <label
                          key={permission.permission_id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 transition ${
                            checked
                              ? "border-[var(--ops-border-soft)] bg-[var(--ripnel-accent-soft)]"
                              : "border-[var(--ops-border-strong)] bg-[var(--ops-field)] hover:bg-[var(--ops-surface-muted)]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => onTogglePermission(permission.key)}
                            className="mt-0.5 h-4 w-4 rounded border-[var(--ops-border-strong)]"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium text-[var(--ops-text)]">
                                {permission.key}
                              </span>
                              <span className="shrink-0 rounded-full bg-[var(--ops-surface-muted)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--ops-text-muted)]">
                                {group.group}
                              </span>
                            </span>
                            <span className="mt-0.5 block text-xs leading-5 text-[var(--ops-text-muted)]">
                              {permission.description || "Sin descripción"}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function statusBadgeClass(active: boolean) {
  return active
    ? "border-[color:color-mix(in_srgb,#10b981_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_74%,var(--ops-text))]"
    : "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]";
}

function roleBadgeClass(active: boolean) {
  return active
    ? "border border-[var(--ops-border-soft)] bg-[var(--ripnel-accent-soft)] text-[var(--ripnel-accent-hover)]"
    : "border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]";
}

function MetricPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "accent" | "warning";
}) {
  const toneClass =
    tone === "accent"
      ? "border-[color:color-mix(in_srgb,var(--ripnel-accent)_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,var(--ripnel-accent-soft)_88%,var(--ops-surface))] text-[var(--ops-text)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--ripnel-accent)_14%,transparent)]"
      : tone === "warning"
        ? "border-[color:color-mix(in_srgb,#f59e0b_38%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#f59e0b_78%,var(--ops-text))]"
        : "border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_66%,var(--ops-surface))] text-[var(--ops-text)]";
  const labelClass =
    tone === "accent"
      ? "text-[color:color-mix(in_srgb,var(--ripnel-accent)_72%,var(--ops-text))]"
      : tone === "warning"
        ? "text-[color:color-mix(in_srgb,#f59e0b_82%,var(--ops-text))]"
        : "text-[var(--ops-text-muted)]";
  const valueClass =
    tone === "accent"
      ? "text-[var(--ops-text)]"
      : tone === "warning"
        ? "text-[color:color-mix(in_srgb,#f59e0b_78%,var(--ops-text))]"
        : "text-[var(--ops-text)]";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full border px-3 py-2",
        toneClass
      )}
    >
      <span className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", labelClass)}>
        {label}
      </span>
      <span className={cn("text-base font-semibold leading-none", valueClass)}>{value}</span>
    </div>
  );
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  const [roleQuery, setRoleQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [rolePage, setRolePage] = useState(1);

  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState<RoleFormState>(emptyRoleForm);
  const [rolePermissionQuery, setRolePermissionQuery] = useState("");
  const [rolePermissionModule, setRolePermissionModule] = useState("all");
  const [savingRole, setSavingRole] = useState(false);

  const loadRoles = useCallback(async () => {
    setLoadingRoles(true);
    setRolesError(null);

    try {
      const data = await requestJson<Role[]>("/api/roles");
      setRoles(data.map((role) => ({ ...role, permissions: role.permissions || [] })));
    } catch (error) {
      setRolesError(error instanceof Error ? error.message : "No se pudo cargar roles");
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  const loadPermissions = useCallback(async () => {
    setLoadingPermissions(true);
    setPermissionsError(null);

    try {
      const data = await requestJson<Permission[]>("/api/roles/permissions");
      setAvailablePermissions(data);
    } catch (error) {
      setPermissionsError(
        error instanceof Error ? error.message : "No se pudo cargar permisos"
      );
    } finally {
      setLoadingPermissions(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadRoles();
      void loadPermissions();
    });
  }, [loadRoles, loadPermissions]);

  const filteredRoles = useMemo(() => {
    const query = roleQuery.trim().toLowerCase();

    let result = roles;

    if (query) {
      result = result.filter((role) => {
        const permissionSummary = role.permissions
          .flatMap((permission) => [permission.key, permission.description || ""])
          .join(" ");

        return [role.name, role.description || "", permissionSummary].some((value) =>
          value.toLowerCase().includes(query)
        );
      });
    }

    result = [...result].sort((a, b) =>
      sortOrder === "desc"
        ? new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        : new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
    );

    return result;
  }, [roleQuery, roles, sortOrder]);

  const totalRolePages = Math.max(1, Math.ceil(filteredRoles.length / PAGE_SIZE));
  const safeRolePage = Math.min(rolePage, totalRolePages);
  const paginatedRoles = filteredRoles.slice(
    (safeRolePage - 1) * PAGE_SIZE,
    safeRolePage * PAGE_SIZE
  );
  const roleRangeStart = filteredRoles.length === 0 ? 0 : (safeRolePage - 1) * PAGE_SIZE + 1;
  const roleRangeEnd = Math.min(filteredRoles.length, safeRolePage * PAGE_SIZE);

  useEffect(() => {
    setRolePage(1);
  }, [roleQuery]);

  const clearFilters = () => {
    setRoleQuery("");
    setSortOrder("desc");
    setRolePage(1);
  };

  const hasActiveFilters = roleQuery.trim() !== "" || sortOrder !== "desc";

  const filteredPermissionGroups = useMemo<PermissionGroup[]>(() => {
    const query = rolePermissionQuery.trim().toLowerCase();
    const filteredPermissions = availablePermissions.filter((permission) => {
      const [groupKey] = permission.key.split(".");
      const group = groupKey || "general";

      if (rolePermissionModule !== "all" && group !== rolePermissionModule) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [permission.key, permission.description || ""].some((value) =>
        value.toLowerCase().includes(query)
      );
    });

    const groups = new Map<string, Permission[]>();

    for (const permission of filteredPermissions) {
      const [groupKey] = permission.key.split(".");
      const group = groupKey || "general";
      const current = groups.get(group) || [];
      current.push(permission);
      groups.set(group, current);
    }

    return Array.from(groups.entries())
      .map(([group, permissions]) => ({
        group,
        permissions: [...permissions].sort((left, right) => left.key.localeCompare(right.key)),
      }))
      .sort((left, right) => left.group.localeCompare(right.group));
  }, [availablePermissions, rolePermissionModule, rolePermissionQuery]);

  const permissionModules = useMemo<PermissionModuleOption[]>(() => {
    const groups = new Map<string, number>();

    for (const permission of availablePermissions) {
      const [groupKey] = permission.key.split(".");
      const group = groupKey || "general";
      groups.set(group, (groups.get(group) || 0) + 1);
    }

    return [
      {
        key: "all",
        label: "Todos",
        count: availablePermissions.length,
      },
      ...Array.from(groups.entries())
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([key, count]) => ({
          key,
          label: formatPermissionGroupLabel(key),
          count,
        })),
    ];
  }, [availablePermissions]);

  const selectedPermissions = useMemo(() => {
    const selectedKeys = new Set(roleForm.permission_keys);

    return availablePermissions
      .filter((permission) => selectedKeys.has(permission.key))
      .sort((left, right) => left.key.localeCompare(right.key));
  }, [availablePermissions, roleForm.permission_keys]);

  function openRoleForm(role?: Role) {
    setRolePermissionQuery("");
    setRolePermissionModule("all");

    if (role) {
      setEditingRoleId(role.role_id);
      setRoleForm({
        name: role.name,
        description: role.description || "",
        active: role.active,
        permission_keys: role.permissions.map((permission) => permission.key),
      });
    } else {
      setEditingRoleId(null);
      setRoleForm(emptyRoleForm);
    }

    setShowRoleForm(true);
  }

  function closeRoleForm() {
    setShowRoleForm(false);
    setEditingRoleId(null);
    setRoleForm(emptyRoleForm);
    setRolePermissionQuery("");
    setRolePermissionModule("all");
  }

  async function submitRoleForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingRole(true);

    try {
      const payload = {
        name: roleForm.name,
        description: roleForm.description,
        active: roleForm.active,
        permission_keys: roleForm.permission_keys,
      };

      if (editingRoleId) {
        await requestJson<Role>(`/api/roles/${editingRoleId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson<Role>("/api/roles", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      closeRoleForm();
      await loadRoles();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo guardar el rol");
    } finally {
      setSavingRole(false);
    }
  }

  async function toggleRoleActive(role: Role) {
    const targetState = !role.active;
    const label = targetState ? "activar" : "inactivar";

    if (!window.confirm(`Confirma que deseas ${label} el rol ${role.name}?`)) {
      return;
    }

    try {
      await requestJson<Role>(`/api/roles/${role.role_id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: targetState }),
      });
      await loadRoles();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo actualizar el rol");
    }
  }

  function toggleRolePermission(permissionKey: string) {
    setRoleForm((current) => {
      const alreadySelected = current.permission_keys.includes(permissionKey);

      return {
        ...current,
        permission_keys: alreadySelected
          ? current.permission_keys.filter((currentKey) => currentKey !== permissionKey)
          : [...current.permission_keys, permissionKey],
      };
    });
  }

  function clearAllRolePermissions() {
    setRoleForm((current) => ({ ...current, permission_keys: [] }));
  }

  const activeRoles = roles.filter((r) => r.active).length;
  const inactiveRoles = roles.length - activeRoles;

  return (
    <TooltipProvider delayDuration={120}>
      <section className="ops-page px-4 py-[var(--ops-page-py)] md:px-6">
        <div className="mx-auto max-w-[1180px] space-y-4">
        <PosHeader
          eyebrow="Administración"
          title="Roles"
          actions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="accent"
                size="sm"
                className="rounded-lg"
                onClick={() => openRoleForm()}
              >
                <Plus className="h-3.5 w-3.5" />
                Nuevo rol
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="rounded-lg"
                    onClick={loadRoles}
                    aria-label="Actualizar roles"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  Actualizar roles
                </TooltipContent>
              </Tooltip>
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <MetricPill label="Total roles" value={roles.length} />
          <MetricPill label="Activos" value={activeRoles} tone="accent" />
          <MetricPill label="Inactivos" value={inactiveRoles} />
          <MetricPill label="Permisos" value={availablePermissions.length} />
        </div>

        <div className="space-y-4 border-t border-[var(--ops-border-strong)] pt-4">
          <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1.55fr)_0.92fr_auto] lg:items-end">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">Buscar</label>
              <div className="sales-field flex h-10 items-center gap-2 rounded-lg px-3 transition hover:bg-[var(--ops-surface-muted)]">
                <Search className="h-4 w-4 text-[var(--ops-text-muted)]" />
                <input
                  type="text"
                  value={roleQuery}
                  onChange={(event) => setRoleQuery(event.target.value)}
                  placeholder="Buscar por nombre o descripción"
                  aria-label="Buscar roles"
                  className="h-full w-full bg-transparent text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]"
                />
              </div>
            </div>
            <FilterDropdown label="Orden" value={sortOrder} options={[{ value: "desc", label: "Más reciente" }, { value: "asc", label: "Más antiguo" }]} onChange={(v) => { setSortOrder(v as "desc" | "asc"); setRolePage(1); }} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={clearFilters} disabled={!hasActiveFilters} variant="outline" size="icon-sm" className="mt-auto h-10 w-10 rounded-lg" aria-label="Limpiar filtros">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>Limpiar filtros</TooltipContent>
            </Tooltip>
          </div>

          {rolesError && (
            <div role="alert" aria-live="polite" className="rounded-xl border border-[color:color-mix(in_srgb,#f43f5e_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f43f5e_14%,var(--ops-surface))] px-4 py-2.5 text-sm text-[color:color-mix(in_srgb,#be123c_74%,var(--ops-text))]">
              {rolesError}
            </div>
          )}

          {permissionsError && (
            <div role="alert" aria-live="polite" className="rounded-xl border border-[color:color-mix(in_srgb,#f59e0b_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] px-4 py-2.5 text-sm text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]">
              {permissionsError}
            </div>
          )}

          <div className="border-y border-[var(--ops-border-strong)]">
            {loadingRoles ? (
              <div className="px-4 py-6 text-sm text-[var(--ops-text-muted)]">Cargando roles…</div>
            ) : filteredRoles.length === 0 ? (
              <div className="px-4 py-6 text-sm text-[var(--ops-text-muted)]">
                No hay roles para este filtro.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--ops-border-strong)] text-sm">
                  <thead className="bg-[var(--ops-surface-muted)]">
                    <tr>
                      <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                        Rol
                      </th>
                      <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                        Descripción
                      </th>
                      <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                        Permisos
                      </th>
                      <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                        Estado
                      </th>
                      <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                        Actualizado
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
                    {paginatedRoles.map((role) => (
                      <tr key={role.role_id} className="transition hover:bg-[var(--ops-surface-muted)]">
                        <td className="px-4 py-[var(--ops-row-py)] align-top">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${roleBadgeClass(role.active)}`}
                          >
                            {role.name}
                          </span>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top text-sm text-[var(--ops-text-muted)]">
                          {role.description || "-"}
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top">
                          {role.permissions.length === 0 ? (
                            <span className="text-xs text-[var(--ops-text-muted)]">Sin permisos</span>
                          ) : (
                            <div className="flex max-w-xl flex-wrap gap-2">
                              {role.permissions.map((permission) => (
                                <span
                                  key={`${role.role_id}-${permission.permission_id}`}
                                  className="inline-flex rounded-full border border-[var(--ops-border-soft)] bg-[var(--ripnel-accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--ripnel-accent-hover)]"
                                  title={permission.description || permission.key}
                                >
                                  {permission.key}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusBadgeClass(role.active)}`}
                          >
                            {role.active ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top text-xs text-[var(--ops-text-muted)]">
                          {new Date(role.updated_at).toLocaleString("es-PE")}
                        </td>
                        <td className="px-4 py-[var(--ops-row-py)] align-top">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openRoleForm(role)}
                              className="rounded-lg border border-[var(--ops-border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleRoleActive(role)}
                              className="rounded-lg border border-[var(--ops-border-soft)] px-3 py-1.5 text-xs font-medium text-[var(--ops-text-muted)] transition hover:bg-[var(--ops-surface-muted)]"
                            >
                              {role.active ? "Inactivar" : "Activar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {!loadingRoles && filteredRoles.length > 0 ? (
            <div className="flex flex-col gap-3 pt-1 md:flex-row md:items-center md:justify-between">
              <div className="text-xs font-medium text-[var(--ops-text-muted)]">
                {roleRangeStart}-{roleRangeEnd} de {filteredRoles.length}
              </div>
              <Pagination
                page={safeRolePage}
                totalPages={totalRolePages}
                onPageChange={setRolePage}
              />
            </div>
          ) : null}
        </div>
        </div>

        {showRoleForm && (
        <div className="ops-overlay-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="ops-overlay-panel flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl">
            <div className="border-b border-[var(--ops-border-strong)] px-6 py-5">
              <h3 className="text-xl font-semibold text-[var(--ops-text)]">
                {editingRoleId ? "Editar rol" : "Nuevo rol"}
              </h3>
              <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                Los permisos se asignan al rol, no al usuario individual.
              </p>
            </div>

            <form className="flex min-h-0 flex-1 flex-col" onSubmit={submitRoleForm}>
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                <div className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
                  <div className="space-y-4">
                    <label className="block space-y-1">
                      <span className="text-sm font-medium text-[var(--ops-text)]">Nombre</span>
                      <input
                        type="text"
                        required
                        autoComplete="off"
                        value={roleForm.name}
                        onChange={(event) =>
                          setRoleForm((current) => ({ ...current, name: event.target.value }))
                        }
                        className="w-full rounded-xl border border-[var(--ops-border-strong)] px-4 py-2.5 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--ripnel-accent)] focus:ring-2 focus:ring-[var(--ripnel-accent-soft)]"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-sm font-medium text-[var(--ops-text)]">
                        Descripción
                      </span>
                      <textarea
                        autoComplete="off"
                        value={roleForm.description}
                        onChange={(event) =>
                          setRoleForm((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        rows={6}
                        className="w-full rounded-xl border border-[var(--ops-border-strong)] px-4 py-2.5 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--ripnel-accent)] focus:ring-2 focus:ring-[var(--ripnel-accent-soft)]"
                      />
                    </label>

                    <label className="flex items-center gap-3 rounded-2xl border border-[var(--ops-border-strong)] px-4 py-3">
                      <input
                        type="checkbox"
                        checked={roleForm.active}
                        onChange={(event) =>
                          setRoleForm((current) => ({
                            ...current,
                            active: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-[var(--ops-border-strong)]"
                      />
                      <span className="text-sm text-[var(--ops-text)]">Rol activo</span>
                    </label>
                  </div>

                  <div className="min-h-0 xl:h-[calc(85vh-16rem)]">
                    <PermissionSelector
                      selectedPermissions={selectedPermissions}
                      selectedKeys={roleForm.permission_keys}
                      permissionModules={permissionModules}
                      activeModule={rolePermissionModule}
                      query={rolePermissionQuery}
                      onQueryChange={setRolePermissionQuery}
                      onModuleChange={setRolePermissionModule}
                      onTogglePermission={toggleRolePermission}
                      onClearAll={clearAllRolePermissions}
                      groups={filteredPermissionGroups}
                      loading={loadingPermissions}
                      error={permissionsError}
                      totalPermissions={availablePermissions.length}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-[var(--ops-border-strong)] px-6 py-4">
                <button
                  type="button"
                  onClick={closeRoleForm}
                  disabled={savingRole}
                  className="rounded-xl border border-[var(--ops-border-strong)] px-4 py-2 text-sm font-medium text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingRole}
                  className="rounded-xl bg-[var(--ripnel-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--ripnel-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingRole ? "Guardando…" : "Guardar rol"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  </TooltipProvider>
  );
}
