"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { PencilLine, Plus, Power, RefreshCw, RotateCcw } from "lucide-react";
import { apiFetchData } from "@/lib/api";
import { useApiGet } from "@/hooks/use-api-get";
import { EMPTY_ROLE_FORM, type RoleFormState } from "@/types/admin";
import { activeBadgeLabel } from "@/lib/badge-utils";
import { OpsStatusBadge } from "@/components/ui/ops-status-badge";
import { usePagination } from "@/hooks/use-pagination";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import {
  AdminActionButton,
  AdminCheckboxField,
  AdminConfirmModal,
  AdminField,
  AdminInlineMessage,
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
import { OpsSelect } from "@/components/ui/ops-selection";
import { OpsEmptyState } from "@/components/ui/ops-empty-state";
import { OpsMetricInlineGroup } from "@/components/ui/ops-metric-inline-group";
import {
  OpsFiltersRow,
  OpsPageShell,
  OpsSearchField,
  OpsSectionDivider,
  OpsTableBlock,
} from "@/components/ui/ops-page-shell";
import { OpsDataTable } from "@/components/ui/ops-data-table";
import { Pagination } from "@/components/ui/pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Role = {
  role_id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  permissions: RolePermission[];
};




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
  const { data: rolesData, loading: loadingRoles, error: rolesError, refetch: refetchRoles } = useApiGet(
    () => apiFetchData<Role[]>("/api/roles"),
    []
  );
  const roles = (rolesData || []).map((role) => ({ ...role, permissions: role.permissions || [] }));

  const { data: permissionsData, loading: loadingPermissions, error: permissionsError } = useApiGet(
    () => apiFetchData<RolePermission[]>("/api/roles/permissions"),
    []
  );
  const availablePermissions = permissionsData || [];

  const [roleQuery, setRoleQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState<RoleFormState>(EMPTY_ROLE_FORM);
  const [savingRole, setSavingRole] = useState(false);
  const [activeChangeRole, setActiveChangeRole] = useState<Role | null>(null);
  const [savingActiveChange, setSavingActiveChange] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const { paginatedItems: paginatedRoles, totalPages, safePage, firstVisible, lastVisible, setPage } = usePagination(filteredRoles)

  const clearFilters = () => {
    setRoleQuery("");
    setSortOrder("desc");
    setPage(1);
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
      setRoleForm(EMPTY_ROLE_FORM);
    }

    setSaveError(null);
    setShowRoleForm(true);
  }

  function closeRoleForm() {
    setShowRoleForm(false);
    setEditingRoleId(null);
    setRoleForm(EMPTY_ROLE_FORM);
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
        await apiFetchData<Role>(`/api/roles/${editingRoleId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetchData<Role>("/api/roles", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      closeRoleForm();
      refetchRoles();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar el rol");
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
      await apiFetchData<Role>(`/api/roles/${activeChangeRole.role_id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: targetState }),
      });
      setActiveChangeRole(null);
      refetchRoles();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo actualizar el rol");
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
                    onClick={refetchRoles}
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

        <OpsMetricInlineGroup
          items={[
            { label: "Total roles", value: roles.length },
            { label: "Activos", value: activeRoles, tone: "accent" },
            { label: "Inactivos", value: inactiveRoles },
            { label: "Permisos", value: availablePermissions.length },
          ]}
        />

        <OpsSectionDivider>
          <OpsTableBlock>
          <OpsFiltersRow className="lg:grid-cols-[minmax(0,1.55fr)_0.92fr_auto]">
              <OpsSearchField
                value={roleQuery}
                onChange={(value) => {
                  setRoleQuery(value);
                  setPage(1);
                }}
                placeholder="Buscar por nombre o descripción"
                ariaLabel="Buscar roles"
              />
            <OpsSelect label="Orden" value={sortOrder} options={[{ value: "desc", label: "Más reciente" }, { value: "asc", label: "Más antiguo" }]} onChange={(v) => { setSortOrder(v as "desc" | "asc"); setPage(1); }} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={clearFilters} disabled={!hasActiveFilters} variant="outline" size="icon-sm" className="mt-auto h-10 w-10 rounded-lg" aria-label="Limpiar filtros">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>Limpiar filtros</TooltipContent>
            </Tooltip>
          </OpsFiltersRow>

          {permissionsError && (
            <div role="alert" aria-live="polite" className="rounded-xl border border-[color:color-mix(in_srgb,#f59e0b_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] px-4 py-2.5 text-sm text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]">
              {permissionsError}
            </div>
          )}

          {!loadingRoles && !rolesError && roles.length === 0 ? (
            <OpsEmptyState variant="compact" description="No hay roles registrados todavía." />
          ) : (
            <OpsDataTable
              columns={[
                { key: "rol", header: "Rol" },
                { key: "descripcion", header: "Descripción" },
                { key: "permisos", header: "Permisos" },
                { key: "estado", header: "Estado" },
                { key: "actualizado", header: "Actualizado" },
                { key: "acciones", header: "", className: "w-[4.5rem] text-right" },
              ]}
              minWidth="1100px"
              loading={loadingRoles}
              loadingMessage="Cargando roles..."
              error={!loadingRoles ? rolesError : null}
              errorTitle="Error al cargar roles"
              isEmpty={!loadingRoles && !rolesError && filteredRoles.length === 0 && roles.length > 0}
              emptyMessage="No hay roles para este filtro."
              footer={
                !loadingRoles && !rolesError && filteredRoles.length > 0 ? (
                  <>
                    <span className="text-sm tabular-nums text-[var(--ops-text-muted)]">
                      {firstVisible}-{lastVisible} de {filteredRoles.length}
                    </span>
                    <Pagination
                      page={safePage}
                      totalPages={totalPages}
                      onPageChange={setPage}
                      className="self-end md:self-auto"
                    />
                  </>
                ) : undefined
              }
            >
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
                    <OpsStatusBadge tone={role.active ? "success" : "neutral"}>
                      {activeBadgeLabel(role.active)}
                    </OpsStatusBadge>
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
                          onSelect: () => {
                            setSaveError(null);
                            setActiveChangeRole(role);
                          },
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </OpsDataTable>
          )}
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
              {saveError && (
                <AdminInlineMessage tone="danger">{saveError}</AdminInlineMessage>
              )}
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
                {saveError && (
                  <AdminInlineMessage tone="danger">{saveError}</AdminInlineMessage>
                )}
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
