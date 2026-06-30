"use client"

import { useEffect, useMemo, useState } from "react"
import {
  LoaderCircle,
  PencilLine,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
} from "lucide-react"
import { apiFetchData } from "@/lib/api"
import { useApiGet } from "@/hooks/use-api-get"
import { activeBadgeLabel } from "@/lib/badge-utils"
import { showSuccess, showError } from "@/lib/toast"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { usePagination } from "@/hooks/use-pagination"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { Button } from "@/components/ui/button"
import {
  AdminConfirmModal,
  AdminRowActionsMenu,
} from "@/components/admin/admin-ui"
import { OpsSelect } from "@/components/ui/ops-selection"
import { OpsEmptyState } from "@/components/ui/ops-empty-state"
import { OpsMetricInlineGroup } from "@/components/ui/ops-metric-inline-group"
import {
  OpsFiltersRow,
  OpsPageShell,
  OpsSearchField,
  OpsSectionDivider,
  OpsTableBlock,
} from "@/components/ui/ops-page-shell"
import { OpsDataTable } from "@/components/ui/ops-data-table"
import { Pagination } from "@/components/ui/pagination"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { OpsFormField } from "@/components/ui/ops-form-field"
import { opsInputCompact, INFO_BOX_MUTED } from "@/components/ui/ops-control-styles"
import {
  RolePermissionPicker,
  type RolePermission,
} from "@/components/admin/role-permission-picker"

import {
  type Role,
  type RoleFormState,
  type RoleFormErrors,
  EMPTY_ROLE_FORM,
} from "./admin-types"
import { ADMIN } from "./admin-messages"
import {
  validateRoleInput,
  buildRolePayload,
  toRoleFormState,
  mapRoleSaveError,
  formatPermissionChip,
} from "./admin-utils"

type ActionState = "idle" | "validating" | "saving"

export default function RolesPage() {
  const { data: rolesData, loading: loadingRoles, error: rolesError, refetch: refetchRoles } = useApiGet(
    () => apiFetchData<Role[]>("/api/roles"),
    [],
  )
  const roles = (rolesData || []).map((role) => ({ ...role, permissions: role.permissions || [] }))

  const { data: permissionsData, loading: loadingPermissions, error: permissionsError } = useApiGet(
    () => apiFetchData<RolePermission[]>("/api/roles/permissions"),
    [],
  )
  const availablePermissions = permissionsData || []

  const [roleQuery, setRoleQuery] = useState("")
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc")

  const [showRoleForm, setShowRoleForm] = useState(false)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [roleForm, setRoleForm] = useState<RoleFormState>(EMPTY_ROLE_FORM)
  const [roleErrors, setRoleErrors] = useState<RoleFormErrors | null>(null)
  const [roleActionState, setRoleActionState] = useState<ActionState>("idle")

  const [activeChangeRole, setActiveChangeRole] = useState<Role | null>(null)
  const [savingActiveChange, setSavingActiveChange] = useState(false)

  const isEdit = Boolean(editingRoleId)
  const isBusy = roleActionState !== "idle"

  useEffect(() => {
    if (showRoleForm) {
      void Promise.resolve().then(() => {
        setRoleErrors(null)
        setRoleActionState("idle")
      })
    }
  }, [showRoleForm])

  const filteredRoles = useMemo(() => {
    const query = roleQuery.trim().toLowerCase()
    let result = roles

    if (query) {
      result = result.filter((role) => {
        const permissionSummary = role.permissions
          .flatMap((p) => [p.key, p.description || ""])
          .join(" ")
        return [role.name, role.description || "", permissionSummary].some((value) =>
          value.toLowerCase().includes(query),
        )
      })
    }

    result = [...result].sort((a, b) =>
      sortOrder === "desc"
        ? new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        : new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    )

    return result
  }, [roleQuery, roles, sortOrder])

  const { paginatedItems: paginatedRoles, totalPages, safePage, firstVisible, lastVisible, setPage } =
    usePagination(filteredRoles)

  const clearFilters = () => {
    setRoleQuery("")
    setSortOrder("desc")
    setPage(1)
  }

  const hasActiveFilters = roleQuery.trim() !== "" || sortOrder !== "desc"

  function openRoleForm(role?: Role) {
    if (role) {
      setEditingRoleId(role.role_id)
      setRoleForm(toRoleFormState(role))
    } else {
      setEditingRoleId(null)
      setRoleForm(EMPTY_ROLE_FORM)
    }
    setRoleErrors(null)
    setRoleActionState("idle")
    setShowRoleForm(true)
  }

  function closeRoleForm() {
    setShowRoleForm(false)
    setEditingRoleId(null)
    setRoleForm(EMPTY_ROLE_FORM)
    setRoleErrors(null)
    setRoleActionState("idle")
  }

  function toggleRolePermission(permissionKey: string) {
    setRoleForm((current) => {
      const alreadySelected = current.permission_keys.includes(permissionKey)
      return {
        ...current,
        permission_keys: alreadySelected
          ? current.permission_keys.filter((k) => k !== permissionKey)
          : [...current.permission_keys, permissionKey],
      }
    })
  }

  function clearAllRolePermissions() {
    setRoleForm((current) => ({ ...current, permission_keys: [] }))
  }

  async function saveRole() {
    const validation = validateRoleInput(roleForm)
    if (validation) {
      setRoleErrors(validation)
      return
    }

    setRoleActionState("validating")
    setRoleErrors(null)

    try {
      setRoleActionState("saving")
      if (editingRoleId) {
        await apiFetchData<Role>(`/api/roles/${editingRoleId}`, {
          method: "PATCH",
          body: JSON.stringify(buildRolePayload(roleForm)),
        })
        showSuccess(ADMIN.toast.roleUpdated)
      } else {
        await apiFetchData<Role>("/api/roles", {
          method: "POST",
          body: JSON.stringify(buildRolePayload(roleForm)),
        })
        showSuccess(ADMIN.toast.roleCreated)
      }
      closeRoleForm()
      refetchRoles()
    } catch (error) {
      const mapped = mapRoleSaveError(error)
      setRoleErrors(mapped)
      if (mapped._form) {
        showError(ADMIN.toast.roleSaveError, mapped._form)
      }
    } finally {
      setRoleActionState("idle")
    }
  }

  async function confirmRoleActiveChange() {
    if (!activeChangeRole) return

    const targetState = !activeChangeRole.active
    setSavingActiveChange(true)

    try {
      await apiFetchData<Role>(`/api/roles/${activeChangeRole.role_id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: targetState }),
      })
      showSuccess(targetState ? ADMIN.toast.roleActivated : ADMIN.toast.roleDeactivated)
      setActiveChangeRole(null)
      refetchRoles()
    } catch (error) {
      showError(ADMIN.toast.roleSaveError, error instanceof Error ? error.message : "")
    } finally {
      setSavingActiveChange(false)
    }
  }

  const activeRoles = roles.filter((r) => r.active).length
  const inactiveRoles = roles.length - activeRoles

  return (
    <OpsPageShell width="wide" className="md:px-0">
      <PosHeader
        eyebrow={ADMIN.header.rolesEyebrow}
        title={ADMIN.header.rolesTitle}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="accent"
              size="sm"
              className="rounded-lg"
              onClick={() => openRoleForm()}
            >
              <Plus className="h-3.5 w-3.5" />
              {ADMIN.actions.newRole}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-lg"
                  onClick={refetchRoles}
                  aria-label={ADMIN.actions.refreshRoles}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>
                {ADMIN.actions.refreshRoles}
              </TooltipContent>
            </Tooltip>
          </div>
        }
      />

      <OpsMetricInlineGroup
        items={[
          { label: ADMIN.metrics.total, value: roles.length },
          { label: ADMIN.metrics.active, value: activeRoles, tone: "accent" },
          { label: ADMIN.metrics.inactive, value: inactiveRoles },
          { label: ADMIN.metrics.permissions, value: availablePermissions.length },
        ]}
      />

      <OpsSectionDivider>
        <OpsTableBlock>
          <OpsFiltersRow className="lg:grid-cols-[minmax(0,1.55fr)_0.92fr_auto]">
            <OpsSearchField
              value={roleQuery}
              onChange={(value) => {
                setRoleQuery(value)
                setPage(1)
              }}
              placeholder={ADMIN.filters.searchRoles}
              ariaLabel={ADMIN.filters.searchRolesAria}
            />
            <OpsSelect
              label={ADMIN.filters.orderLabel}
              value={sortOrder}
              options={[
                { value: "desc", label: ADMIN.filters.orderNewest },
                { value: "asc", label: ADMIN.filters.orderOldest },
              ]}
              onChange={(v) => { setSortOrder(v as "desc" | "asc"); setPage(1) }}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  variant="outline"
                  size="icon-sm"
                  className="mt-auto h-10 w-10 rounded-lg"
                  aria-label={ADMIN.filters.clear}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                {ADMIN.filters.clear}
              </TooltipContent>
            </Tooltip>
          </OpsFiltersRow>

          {permissionsError ? (
            <div className={`${INFO_BOX_MUTED} border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)] text-[var(--ops-tone-warning-text)]`}>
              {permissionsError}
            </div>
          ) : null}

          {!loadingRoles && !rolesError && roles.length === 0 ? (
            <OpsEmptyState variant="compact" description={ADMIN.table.roles.empty} />
          ) : (
            <OpsDataTable
              columns={[
                { key: "rol", header: ADMIN.table.roles.columns.rol },
                { key: "descripcion", header: ADMIN.table.roles.columns.descripcion },
                { key: "permisos", header: ADMIN.table.roles.columns.permisos },
                { key: "estado", header: ADMIN.table.roles.columns.estado },
                { key: "actualizado", header: ADMIN.table.roles.columns.actualizado },
                { key: "acciones", header: ADMIN.table.roles.columns.acciones, className: "w-[4.5rem] text-right" },
              ]}
              minWidth="1100px"
              loading={loadingRoles}
              loadingMessage={ADMIN.table.roles.loadingM}
              error={!loadingRoles ? rolesError : null}
              errorTitle={ADMIN.table.roles.errorTitle}
              isEmpty={!loadingRoles && !rolesError && filteredRoles.length === 0 && roles.length > 0}
              emptyMessage={ADMIN.table.roles.empty}
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
                    <span className="inline-flex rounded-full border border-[var(--ops-border-soft)] bg-[var(--ripnel-accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--ripnel-accent-hover)]">
                      {role.name}
                    </span>
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)] align-top text-sm text-[var(--ops-text-muted)]">
                    {role.description || ADMIN.fallback.dash}
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)] align-top">
                    {role.permissions.length === 0 ? (
                      <span className="text-xs text-[var(--ops-text-muted)]">
                        {ADMIN.table.roles.noPermissions}
                      </span>
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
                      ariaLabel={ADMIN.actions.actionsFor(role.name)}
                      items={[
                        {
                          label: ADMIN.actions.edit,
                          icon: <PencilLine className="h-3.5 w-3.5" />,
                          onSelect: () => openRoleForm(role),
                        },
                        {
                          label: role.active ? ADMIN.actions.inactivate : ADMIN.actions.activate,
                          icon: <Power className="h-3.5 w-3.5" />,
                          tone: role.active ? "danger" : "neutral",
                          onSelect: () => setActiveChangeRole(role),
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

      <OpsDialog
        open={showRoleForm}
        onOpenChange={(open) => { if (!open) closeRoleForm() }}
        title={isEdit ? ADMIN.dialog.roleEditTitle : ADMIN.dialog.roleCreateTitle}
        description={isEdit ? ADMIN.dialog.roleEditDesc : ADMIN.dialog.roleCreateDesc}
        size="lg"
        bodyClassName="max-h-[80vh] overflow-y-auto px-5 py-5 md:px-6"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg px-4"
              onClick={closeRoleForm}
              disabled={isBusy}
            >
              {ADMIN.dialog.cancel}
            </Button>
            <Button
              variant="accent"
              size="sm"
              className="rounded-lg px-4"
              onClick={() => void saveRole()}
              disabled={isBusy}
            >
              {roleActionState === "validating" ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {ADMIN.dialog.validating}
                </span>
              ) : roleActionState === "saving" ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {ADMIN.dialog.saving}
                </span>
              ) : (
                isEdit ? ADMIN.dialog.saveRoleEdit : ADMIN.dialog.saveRole
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {roleErrors?._form ? (
            <div className={`${INFO_BOX_MUTED} border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] text-[var(--ops-tone-danger-text)]`}>
              {roleErrors._form}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
            <div className="space-y-4">
              <OpsFormField label={ADMIN.form.name} required error={roleErrors?.name} density="compact">
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm((c) => ({ ...c, name: e.target.value }))}
                  className={opsInputCompact}
                />
              </OpsFormField>

              <OpsFormField label={ADMIN.form.description} density="compact">
                <textarea
                  autoComplete="off"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm((c) => ({ ...c, description: e.target.value }))}
                  rows={6}
                  className={`${opsInputCompact} min-h-[120px] resize-y`}
                />
              </OpsFormField>

              <OpsFormField label={ADMIN.form.state} density="compact">
                <label className="inline-flex cursor-pointer select-none items-center gap-2">
                  <input
                    type="checkbox"
                    checked={roleForm.active}
                    onChange={(e) => setRoleForm((c) => ({ ...c, active: e.target.checked }))}
                    className="m-0 h-[0.9375rem] w-[0.9375rem] cursor-pointer rounded-[0.25rem] accent-[var(--ripnel-accent)]"
                  />
                  <span className="text-[0.8125rem] leading-none text-[var(--ops-text-muted)]">
                    {ADMIN.form.roleActiveLabel}
                  </span>
                </label>
              </OpsFormField>
            </div>

            <div className="min-h-0 xl:h-[calc(80vh-16rem)]">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                {ADMIN.form.permissions}
              </p>
              <RolePermissionPicker
                permissions={availablePermissions}
                selectedKeys={roleForm.permission_keys}
                onTogglePermission={toggleRolePermission}
                onClearAll={clearAllRolePermissions}
                loading={loadingPermissions}
                error={permissionsError}
              />
            </div>
          </div>
        </div>
      </OpsDialog>

      <AdminConfirmModal
        open={Boolean(activeChangeRole)}
        title={activeChangeRole?.active ? ADMIN.dialog.roleActiveTitle : ADMIN.dialog.roleInactiveTitle}
        description={
          activeChangeRole ? (
            <span>
              {ADMIN.dialog.roleActiveDesc(activeChangeRole.name, activeChangeRole.active)}
            </span>
          ) : null
        }
        confirmLabel={activeChangeRole?.active ? ADMIN.dialog.confirmInactivate : ADMIN.dialog.confirmActivate}
        confirmTone={activeChangeRole?.active ? "danger" : "accent"}
        busy={savingActiveChange}
        onCancel={() => setActiveChangeRole(null)}
        onConfirm={() => void confirmRoleActiveChange()}
      />
    </OpsPageShell>
  )
}