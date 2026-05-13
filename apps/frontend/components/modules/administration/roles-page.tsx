"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { PencilLine, Plus, Power, RefreshCw, RotateCcw } from "lucide-react";
import { buildApiUrl } from "@/lib/api";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import {
  AdminActionButton,
  AdminCheckboxField,
  AdminConfirmModal,
  AdminField,
  AdminInput,
  AdminModalShell,
  AdminRowActionsMenu,
  AdminSection,
  AdminTextarea,
} from "@/components/admin/admin-ui";
import {
  RolePermissionPicker,
  type RolePermission,
} from "@/components/admin/role-permission-picker";
import { Button } from "@/components/ui/button";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { OpsMetricPill } from "@/components/ui/ops-metric-pill";
import {
  OpsFiltersRow,
  OpsPageShell,
  OpsSearchField,
  OpsSectionDivider,
  OpsTableBlock,
  OpsTableFooter,
  OpsTableWrap,
} from "@/components/ui/ops-page-shell";
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

type Role = {
  role_id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  permissions: RolePermission[];
};

type RoleFormState = {
  name: string;
  description: string;
  active: boolean;
  permission_keys: string[];
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

function formatPermissionChip(permission: RolePermission) {
  if (permission.description?.trim()) {
    return permission.description.trim()
  }

  return permission.key
    .split(".")
    .slice(1)
    .join(" ")
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<RolePermission[]>([]);
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
  const [savingRole, setSavingRole] = useState(false);
  const [activeChangeRole, setActiveChangeRole] = useState<Role | null>(null);
  const [savingActiveChange, setSavingActiveChange] = useState(false);

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
      const data = await requestJson<RolePermission[]>("/api/roles/permissions");
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

  function openRoleForm(role?: Role) {
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

  async function confirmRoleActiveChange() {
    if (!activeChangeRole) {
      return;
    }

    const targetState = !activeChangeRole.active;
    setSavingActiveChange(true);

    try {
      await requestJson<Role>(`/api/roles/${activeChangeRole.role_id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: targetState }),
      });
      setActiveChangeRole(null);
      await loadRoles();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo actualizar el rol");
    } finally {
      setSavingActiveChange(false);
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
      <OpsPageShell width="wide" className="md:px-0">
        <PosHeader
          eyebrow="Administración"
          title="Roles"
          actions={
            <div className="flex items-center gap-2">
              <Button asChild variant="accent" size="sm" className="rounded-lg">
                <Link href="/administracion/roles/nuevo">
                  <Plus className="h-3.5 w-3.5" />
                  Nuevo rol
                </Link>
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
          <OpsMetricPill label="Total roles" value={roles.length} />
          <OpsMetricPill label="Activos" value={activeRoles} tone="accent" />
          <OpsMetricPill label="Inactivos" value={inactiveRoles} />
          <OpsMetricPill label="Permisos" value={availablePermissions.length} />
        </div>

        <OpsSectionDivider>
          <OpsTableBlock>
          <OpsFiltersRow className="lg:grid-cols-[minmax(0,1.55fr)_0.92fr_auto]">
            <OpsSearchField
              value={roleQuery}
              onChange={setRoleQuery}
              placeholder="Buscar por nombre o descripción"
              ariaLabel="Buscar roles"
            />
            <FilterDropdown label="Orden" value={sortOrder} options={[{ value: "desc", label: "Más reciente" }, { value: "asc", label: "Más antiguo" }]} onChange={(v) => { setSortOrder(v as "desc" | "asc"); setRolePage(1); }} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={clearFilters} disabled={!hasActiveFilters} variant="outline" size="icon-sm" className="mt-auto h-10 w-10 rounded-lg" aria-label="Limpiar filtros">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>Limpiar filtros</TooltipContent>
            </Tooltip>
          </OpsFiltersRow>

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

          <OpsTableWrap minWidth="1100px">
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
                      <th className="w-[4.5rem] px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
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
                                  {formatPermissionChip(permission)}
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
                        <td className="w-[4.5rem] px-4 py-[var(--ops-row-py)] align-top">
                          <AdminRowActionsMenu
                            ariaLabel={`Acciones para ${role.name}`}
                            items={[
                              {
                                label: "Editar",
                                icon: <PencilLine className="h-3.5 w-3.5" />,
                                onSelect: () => openRoleForm(role),
                              },
                              {
                                label: role.active ? "Inactivar" : "Activar",
                                icon: <Power className="h-3.5 w-3.5" />,
                                tone: role.active ? "danger" : "neutral",
                                onSelect: () => setActiveChangeRole(role),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </OpsTableWrap>
          {!loadingRoles && filteredRoles.length > 0 ? (
            <OpsTableFooter>
              <div className="text-xs font-medium text-[var(--ops-text-muted)]">
                {roleRangeStart}-{roleRangeEnd} de {filteredRoles.length}
              </div>
              <Pagination
                page={safeRolePage}
                totalPages={totalRolePages}
                onPageChange={setRolePage}
              />
            </OpsTableFooter>
          ) : null}
          </OpsTableBlock>
        </OpsSectionDivider>

        {showRoleForm && (
        <AdminModalShell
          title={editingRoleId ? "Editar rol" : "Nuevo rol"}
          description="Los permisos se asignan al rol, no al usuario individual."
          onClose={closeRoleForm}
          widthClass="max-w-4xl"
          footer={
            <div className="flex justify-end gap-3">
              <AdminActionButton
                type="button"
                onClick={closeRoleForm}
                disabled={savingRole}
              >
                Cancelar
              </AdminActionButton>
              <AdminActionButton
                type="submit"
                form="role-edit-form"
                tone="accent"
                disabled={savingRole}
              >
                {savingRole ? "Guardando..." : "Guardar rol"}
              </AdminActionButton>
            </div>
          }
        >
            <form id="role-edit-form" className="flex min-h-0 flex-1 flex-col" onSubmit={submitRoleForm}>
              <div className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
                <div className="space-y-4">
                  <AdminSection title="Identidad del rol">
                    <div className="space-y-4">
                      <AdminField label="Nombre">
                        <AdminInput
                          type="text"
                          required
                          autoComplete="off"
                          value={roleForm.name}
                          onChange={(event) =>
                            setRoleForm((current) => ({ ...current, name: event.target.value }))
                          }
                        />
                      </AdminField>

                      <AdminField label="Descripción">
                        <AdminTextarea
                          autoComplete="off"
                          value={roleForm.description}
                          onChange={(event) =>
                            setRoleForm((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          rows={6}
                        />
                      </AdminField>

                      <AdminField label="Estado">
                        <AdminCheckboxField
                          label="Rol activo"
                          checked={roleForm.active}
                          onChange={(checked) =>
                            setRoleForm((current) => ({
                              ...current,
                              active: checked,
                            }))
                          }
                        />
                      </AdminField>
                    </div>
                  </AdminSection>
                </div>

                <div className="min-h-0 xl:h-[calc(85vh-16rem)]">
                  <AdminSection title="Permisos" className="h-full">
                    <RolePermissionPicker
                      permissions={availablePermissions}
                      selectedKeys={roleForm.permission_keys}
                      onTogglePermission={toggleRolePermission}
                      onClearAll={clearAllRolePermissions}
                      loading={loadingPermissions}
                      error={permissionsError}
                    />
                  </AdminSection>
                </div>
              </div>
            </form>
        </AdminModalShell>
        )}
        <AdminConfirmModal
          open={Boolean(activeChangeRole)}
          title={activeChangeRole?.active ? "Inactivar rol" : "Activar rol"}
          description={
            activeChangeRole ? (
              <>
                Vas a {activeChangeRole.active ? "inactivar" : "activar"} el rol{" "}
                <span className="font-semibold text-[var(--ops-text)]">
                  {activeChangeRole.name}
                </span>
                .
              </>
            ) : null
          }
          confirmLabel={activeChangeRole?.active ? "Inactivar" : "Activar"}
          confirmTone={activeChangeRole?.active ? "danger" : "accent"}
          busy={savingActiveChange}
          onCancel={() => setActiveChangeRole(null)}
          onConfirm={() => void confirmRoleActiveChange()}
        />
      </OpsPageShell>
  </TooltipProvider>
  );
}
