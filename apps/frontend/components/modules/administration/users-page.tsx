"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Check,
  Copy,
  LoaderCircle,
  MapPin,
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
  type User,
  type Role,
  type Location,
  type UserFormState,
  type UserFormErrors,
  type UserLocationsPayload,
  EMPTY_USER_FORM,
} from "./admin-types"
import { ADMIN } from "./admin-messages"
import {
  validateUserInput,
  buildUserPayload,
  buildUserCreatePayload,
  toUserFormState,
  mapUserSaveError,
} from "./admin-utils"

type ActionState = "idle" | "validating" | "saving"

export default function UsersPage() {
  const { data: usersData, loading: loadingUsers, error: usersError, refetch: refetchUsers } = useApiGet(
    () => apiFetchData<User[]>("/api/users"),
    [],
  )
  const users = usersData || []

  const { data: rolesData, loading: loadingRoles, error: rolesError } = useApiGet(
    () => apiFetchData<Role[]>("/api/roles"),
    [],
  )
  const roles = (rolesData || []).filter((role) => role.active)

  const { data: locationsData, loading: loadingLocations, error: locationsError } = useApiGet(
    () => apiFetchData<Location[]>("/api/locations"),
    [],
  )
  const availableLocations = (locationsData || []).filter((location) => location.active)

  const [userQuery, setUserQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc")

  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [userForm, setUserForm] = useState<UserFormState>(EMPTY_USER_FORM)
  const [userErrors, setUserErrors] = useState<UserFormErrors | null>(null)
  const [userActionState, setUserActionState] = useState<ActionState>("idle")

  const [activeChangeUser, setActiveChangeUser] = useState<User | null>(null)
  const [savingActiveChange, setSavingActiveChange] = useState(false)

  const [locationsOpen, setLocationsOpen] = useState(false)
  const [locationsUser, setLocationsUser] = useState<User | null>(null)
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([])
  const [defaultLocationId, setDefaultLocationId] = useState<string | null>(null)
  const [loadingUserLocations, setLoadingUserLocations] = useState(false)
  const [savingUserLocations, setSavingUserLocations] = useState(false)
  const [userLocationsError, setUserLocationsError] = useState<string | null>(null)

  const [tempPassword, setTempPassword] = useState<{ username: string; password: string } | null>(null)
  const [copiedPassword, setCopiedPassword] = useState(false)

  const isEdit = Boolean(editingUserId)
  const isBusy = userActionState !== "idle"

  useEffect(() => {
    if (showUserForm) {
      void Promise.resolve().then(() => {
        setUserErrors(null)
        setUserActionState("idle")
      })
    }
  }, [showUserForm])

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase()
    let result = users

    if (roleFilter !== "all") {
      result = result.filter((user) => user.role_id === roleFilter)
    }

    if (query) {
      result = result.filter((user) => {
        const roleName =
          user.role_name || roles.find((role) => role.role_id === user.role_id)?.name || ""
        return [user.full_name, user.username, user.email || "", roleName].some((value) =>
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
  }, [userQuery, users, roles, roleFilter, sortOrder])

  const { paginatedItems: paginatedUsers, totalPages, safePage, firstVisible, lastVisible, setPage } =
    usePagination(filteredUsers)

  const clearFilters = () => {
    setUserQuery("")
    setRoleFilter("all")
    setSortOrder("desc")
    setPage(1)
  }

  const hasActiveFilters = userQuery.trim() !== "" || roleFilter !== "all" || sortOrder !== "desc"

  const roleFilterOptions = [
    { value: "all", label: ADMIN.filters.allRoles },
    ...roles.map((r) => ({ value: r.role_id, label: r.name })),
  ]

  function openUserForm(user?: User) {
    if (user) {
      setEditingUserId(user.user_id)
      setUserForm(toUserFormState(user))
    } else {
      setEditingUserId(null)
      setUserForm(EMPTY_USER_FORM)
    }
    setUserErrors(null)
    setUserActionState("idle")
    setShowUserForm(true)
  }

  function closeUserForm() {
    setShowUserForm(false)
    setEditingUserId(null)
    setUserForm(EMPTY_USER_FORM)
    setUserErrors(null)
    setUserActionState("idle")
  }

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

  async function saveUser() {
    const validation = validateUserInput(userForm, isEdit)
    if (validation) {
      setUserErrors(validation)
      return
    }

    setUserActionState("validating")
    setUserErrors(null)

    try {
      if (editingUserId) {
        setUserActionState("saving")
        await apiFetchData<User>(`/api/users/${editingUserId}`, {
          method: "PATCH",
          body: JSON.stringify(buildUserPayload(userForm)),
        })
        showSuccess(ADMIN.toast.userUpdated)
        closeUserForm()
        refetchUsers()
      } else {
        setUserActionState("saving")
        const createdUser = await apiFetchData<User>("/api/users", {
          method: "POST",
          body: JSON.stringify(buildUserCreatePayload(userForm)),
        })

        if (createdUser.temporary_password) {
          setTempPassword({
            username: createdUser.username,
            password: createdUser.temporary_password,
          })
          setCopiedPassword(false)
        }
        showSuccess(ADMIN.toast.userCreated)
        closeUserForm()
        refetchUsers()
      }
    } catch (error) {
      const mapped = mapUserSaveError(error)
      setUserErrors(mapped)
      if (mapped._form) {
        showError(ADMIN.toast.userSaveError, mapped._form)
      }
    } finally {
      setUserActionState("idle")
    }
  }

  async function confirmUserActiveChange() {
    if (!activeChangeUser) return

    const targetState = !activeChangeUser.active
    setSavingActiveChange(true)

    try {
      await apiFetchData<User>(`/api/users/${activeChangeUser.user_id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: targetState }),
      })
      showSuccess(targetState ? ADMIN.toast.userActivated : ADMIN.toast.userDeactivated)
      setActiveChangeUser(null)
      refetchUsers()
    } catch (error) {
      showError(ADMIN.toast.userSaveError, error instanceof Error ? error.message : "")
    } finally {
      setSavingActiveChange(false)
    }
  }

  async function openLocationsModal(user: User) {
    setLocationsOpen(true)
    setLocationsUser(user)
    setSelectedLocationIds([])
    setDefaultLocationId(null)
    setUserLocationsError(null)
    setLoadingUserLocations(true)

    try {
      const payload = await apiFetchData<UserLocationsPayload>(
        `/api/users/${user.user_id}/locations`,
      )
      setSelectedLocationIds(payload.assignments.map((a) => a.location_id))
      setDefaultLocationId(payload.default_location_id)
    } catch (error) {
      setUserLocationsError(error instanceof Error ? error.message : ADMIN.toast.locationsLoadError)
    } finally {
      setLoadingUserLocations(false)
    }
  }

  function closeLocationsModal() {
    setLocationsOpen(false)
    setLocationsUser(null)
    setSelectedLocationIds([])
    setDefaultLocationId(null)
    setUserLocationsError(null)
  }

  function toggleLocation(locationId: string) {
    setSelectedLocationIds((current) => {
      if (current.includes(locationId)) {
        const next = current.filter((value) => value !== locationId)
        if (defaultLocationId === locationId) {
          setDefaultLocationId(next[0] || null)
        }
        return next
      }
      const next = [...current, locationId]
      if (!defaultLocationId) {
        setDefaultLocationId(locationId)
      }
      return next
    })
  }

  async function saveUserLocations() {
    if (!locationsUser) return

    if (selectedLocationIds.length > 0 && !defaultLocationId) {
      setUserLocationsError(ADMIN.dialog.defaultRequired)
      return
    }

    setSavingUserLocations(true)
    setUserLocationsError(null)

    try {
      await apiFetchData<UserLocationsPayload>(
        `/api/users/${locationsUser.user_id}/locations`,
        {
          method: "PUT",
          body: JSON.stringify({
            assignments: selectedLocationIds.map((location_id) => ({
              location_id,
              is_default: defaultLocationId === location_id,
            })),
          }),
        },
      )
      showSuccess(ADMIN.toast.locationsUpdated)
      closeLocationsModal()
    } catch (error) {
      setUserLocationsError(error instanceof Error ? error.message : ADMIN.toast.locationsError)
    } finally {
      setSavingUserLocations(false)
    }
  }

  async function copyTempPassword() {
    if (!tempPassword) return
    try {
      await navigator.clipboard.writeText(tempPassword.password)
      setCopiedPassword(true)
      setTimeout(() => setCopiedPassword(false), 2000)
    } catch {
      // fallback: select text
    }
  }

  const activeUsers = users.filter((u) => u.active).length
  const inactiveUsers = users.length - activeUsers

  return (
    <OpsPageShell width="wide" className="md:px-0">
      <PosHeader
        eyebrow={ADMIN.header.usersEyebrow}
        title={ADMIN.header.usersTitle}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="accent"
              size="sm"
              className="rounded-lg"
              onClick={() => openUserForm()}
            >
              <Plus className="h-3.5 w-3.5" />
              {ADMIN.actions.newUser}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-lg"
                  onClick={refetchUsers}
                  aria-label={ADMIN.actions.refreshUsers}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>
                {ADMIN.actions.refreshUsers}
              </TooltipContent>
            </Tooltip>
          </div>
        }
      />

      <OpsMetricInlineGroup
        items={[
          { label: ADMIN.metrics.total, value: users.length },
          { label: ADMIN.metrics.active, value: activeUsers, tone: "accent" },
          { label: ADMIN.metrics.inactive, value: inactiveUsers },
        ]}
      />

      <OpsSectionDivider>
        <OpsTableBlock>
          <OpsFiltersRow>
            <OpsSearchField
              value={userQuery}
              onChange={(value) => {
                setUserQuery(value)
                setPage(1)
              }}
              placeholder={ADMIN.filters.searchUsers}
              ariaLabel={ADMIN.filters.searchUsersAria}
            />
            <OpsSelect
              label={ADMIN.filters.roleLabel}
              value={roleFilter}
              options={roleFilterOptions}
              onChange={(v) => { setRoleFilter(v); setPage(1) }}
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

          <OpsDataTable
            columns={[
              { key: "usuario", header: ADMIN.table.users.columns.usuario },
              { key: "rol", header: ADMIN.table.users.columns.rol },
              { key: "estado", header: ADMIN.table.users.columns.estado },
              { key: "actualizado", header: ADMIN.table.users.columns.actualizado },
              { key: "acciones", header: ADMIN.table.users.columns.acciones, className: "w-[4.5rem] text-right" },
            ]}
            minWidth="980px"
            loading={loadingUsers}
            loadingMessage={ADMIN.table.users.loadingM}
            error={!loadingUsers ? usersError : null}
            errorTitle={ADMIN.table.users.errorTitle}
            isEmpty={!loadingUsers && !usersError && filteredUsers.length === 0}
            emptyMessage={ADMIN.table.users.empty}
            footer={
              !loadingUsers && !usersError && filteredUsers.length > 0 ? (
                <>
                  <span className="text-sm tabular-nums text-[var(--ops-text-muted)]">
                    {firstVisible}-{lastVisible} de {filteredUsers.length}
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
            {paginatedUsers.map((user) => {
              const roleName =
                user.role_name ||
                roles.find((role) => role.role_id === user.role_id)?.name ||
                ADMIN.status.withoutRole

              return (
                <tr key={user.user_id} className="transition hover:bg-[var(--ops-surface-muted)]">
                  <td className="px-4 py-[var(--ops-row-py)] align-top">
                    <div className="font-semibold text-[var(--ops-text)]">
                      {user.full_name}
                    </div>
                    <div className="text-xs text-[var(--ops-text-muted)]">
                      @{user.username}
                    </div>
                    {user.email && (
                      <div className="text-xs text-[var(--ops-text-muted)]">
                        {user.email}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)] align-top">
                    <span className="inline-flex rounded-full border border-[var(--ops-border-soft)] bg-[var(--ripnel-accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--ripnel-accent-hover)]">
                      {roleName}
                    </span>
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)] align-top">
                    <OpsStatusBadge tone={user.active ? "success" : "neutral"}>
                      {activeBadgeLabel(user.active)}
                    </OpsStatusBadge>
                    {user.must_change_password ? (
                      <span className="mt-1.5 block">
                        <span className="inline-flex rounded-full border border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--ops-tone-warning-text)]">
                          {ADMIN.status.pendingPassword}
                        </span>
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)] align-top text-xs text-[var(--ops-text-muted)]">
                    {new Date(user.updated_at).toLocaleString("es-PE")}
                  </td>
                  <td className="w-[4.5rem] px-4 py-[var(--ops-row-py)] align-top">
                    <AdminRowActionsMenu
                      ariaLabel={ADMIN.actions.actionsFor(user.full_name)}
                      items={[
                        {
                          label: ADMIN.actions.locations,
                          icon: <MapPin className="h-3.5 w-3.5" />,
                          onSelect: () => openLocationsModal(user),
                        },
                        {
                          label: ADMIN.actions.edit,
                          icon: <PencilLine className="h-3.5 w-3.5" />,
                          onSelect: () => openUserForm(user),
                        },
                        {
                          label: user.active ? ADMIN.actions.inactivate : ADMIN.actions.activate,
                          icon: <Power className="h-3.5 w-3.5" />,
                          tone: user.active ? "danger" : "neutral",
                          onSelect: () => setActiveChangeUser(user),
                        },
                      ]}
                    />
                  </td>
                </tr>
              )
            })}
          </OpsDataTable>
        </OpsTableBlock>
      </OpsSectionDivider>

      <OpsDialog
        open={showUserForm}
        onOpenChange={(open) => { if (!open) closeUserForm() }}
        title={isEdit ? ADMIN.dialog.userEditTitle : ADMIN.dialog.userCreateTitle}
        description={isEdit ? ADMIN.dialog.userEditDesc : ADMIN.dialog.userCreateDesc}
        size="lg"
        bodyClassName="max-h-[80vh] overflow-y-auto px-5 py-5 md:px-6"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg px-4"
              onClick={closeUserForm}
              disabled={isBusy}
            >
              {ADMIN.dialog.cancel}
            </Button>
            <Button
              variant="accent"
              size="sm"
              className="rounded-lg px-4"
              onClick={() => void saveUser()}
              disabled={isBusy}
            >
              {userActionState === "validating" ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {ADMIN.dialog.validating}
                </span>
              ) : userActionState === "saving" ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {ADMIN.dialog.saving}
                </span>
              ) : (
                isEdit ? ADMIN.dialog.saveUserEdit : ADMIN.dialog.saveUser
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {userErrors?._form ? (
            <div className={`${INFO_BOX_MUTED} border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] text-[var(--ops-tone-danger-text)]`}>
              {userErrors._form}
            </div>
          ) : null}

          <div className="space-y-4">
            <OpsFormField label={ADMIN.form.fullName} required error={userErrors?.full_name} density="compact">
              <input
                type="text"
                required
                autoComplete="off"
                value={userForm.full_name}
                onChange={(e) => setUserForm((c) => ({ ...c, full_name: e.target.value }))}
                className={opsInputCompact}
              />
            </OpsFormField>

            <OpsFormField label={ADMIN.form.username} required error={userErrors?.username} density="compact">
              <input
                type="text"
                required
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                value={userForm.username}
                onChange={(e) => setUserForm((c) => ({ ...c, username: e.target.value }))}
                className={opsInputCompact}
              />
            </OpsFormField>

            <OpsFormField label={ADMIN.form.emailOptional} error={userErrors?.email} density="compact">
              <input
                type="email"
                autoComplete="off"
                value={userForm.email}
                onChange={(e) => setUserForm((c) => ({ ...c, email: e.target.value }))}
                className={opsInputCompact}
              />
            </OpsFormField>

            <OpsFormField label={ADMIN.form.role} required={!isEdit} error={userErrors?.role_id} hint={rolesError || undefined} density="compact">
              <OpsSelect
                value={userForm.role_id}
                onValueChange={(value) => setUserForm((c) => ({ ...c, role_id: value }))}
                placeholder={ADMIN.form.rolePlaceholder(loadingRoles, rolesError)}
                options={roles.map((role) => ({ value: role.role_id, label: role.name }))}
                disabled={loadingRoles || Boolean(rolesError)}
              />
            </OpsFormField>
          </div>

          {!isEdit ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  {ADMIN.form.sections.sedes}
                </p>
                <span className="rounded-full border border-[var(--ops-border-strong)] px-2.5 py-0.5 text-xs font-medium text-[var(--ops-text-muted)]">
                  {userForm.location_ids.length}
                </span>
              </div>
              <p className="text-xs text-[var(--ops-text-muted)]">
                {ADMIN.form.sections.sedesDesc}
              </p>

              {userErrors?.location_ids ? (
                <p className="text-[11px] font-medium text-[var(--ops-tone-danger-text)]">
                  {userErrors.location_ids}
                </p>
              ) : null}

              {loadingLocations ? (
                <div className={`${INFO_BOX_MUTED} text-sm text-[var(--ops-text-muted)]`}>
                  {ADMIN.form.loadingSedes}
                </div>
              ) : locationsError ? (
                <div className={`${INFO_BOX_MUTED} border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)] text-[var(--ops-tone-warning-text)]`}>
                  {locationsError}
                </div>
              ) : availableLocations.length === 0 ? (
                <div className={`${INFO_BOX_MUTED} text-sm text-[var(--ops-text-muted)]`}>
                  {ADMIN.form.sedesNoneActive}
                </div>
              ) : (
                <div className="max-h-56 divide-y divide-[var(--ops-border-strong)] overflow-y-auto rounded-xl border border-[var(--ops-border-strong)]">
                  {availableLocations.map((location) => {
                    const checked = userForm.location_ids.includes(location.location_id)
                    const isDefault = userForm.default_location_id === location.location_id
                    return (
                      <div
                        key={location.location_id}
                        className="flex flex-col gap-2 px-3 py-3 md:flex-row md:items-center md:justify-between"
                      >
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleUserFormLocation(location.location_id)}
                            className="mt-1 h-4 w-4 rounded border-[var(--ops-border-strong)] accent-[var(--ripnel-accent)]"
                          />
                          <span>
                            <span className="block text-sm font-medium text-[var(--ops-text)]">
                              {location.name}
                            </span>
                            <span className="block text-xs text-[var(--ops-text-muted)]">
                              {location.type}
                              {location.address ? ` - ${location.address}` : ""}
                            </span>
                          </span>
                        </label>
                        <label
                          className={`inline-flex cursor-pointer items-center gap-2 text-sm ${
                            checked ? "text-[var(--ops-text)]" : "text-[var(--ops-text-muted)]"
                          }`}
                        >
                          <input
                            type="radio"
                            name="new-user-default-location"
                            checked={isDefault}
                            disabled={!checked}
                            onChange={() => chooseUserFormDefaultLocation(location.location_id)}
                            className="h-4 w-4 border-[var(--ops-border-strong)] accent-[var(--ripnel-accent)] disabled:cursor-not-allowed"
                          />
                          {ADMIN.form.sedesDefault}
                        </label>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : null}

          <OpsFormField label={ADMIN.form.state} density="compact">
            <label className="inline-flex cursor-pointer select-none items-center gap-2">
              <input
                type="checkbox"
                checked={userForm.active}
                onChange={(e) => setUserForm((c) => ({ ...c, active: e.target.checked }))}
                className="m-0 h-[0.9375rem] w-[0.9375rem] cursor-pointer rounded-[0.25rem] accent-[var(--ripnel-accent)]"
              />
              <span className="text-[0.8125rem] leading-none text-[var(--ops-text-muted)]">
                {ADMIN.form.userActiveLabel}
              </span>
            </label>
          </OpsFormField>
        </div>
      </OpsDialog>

      <OpsDialog
        open={locationsOpen}
        onOpenChange={(open) => { if (!open) closeLocationsModal() }}
        title={ADMIN.dialog.locationsTitle}
        description={
          locationsUser
            ? ADMIN.dialog.locationsDesc(locationsUser.full_name)
            : ADMIN.dialog.locationsDescGeneric
        }
        size="lg"
        bodyClassName="max-h-[80vh] overflow-y-auto px-5 py-5 md:px-6"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg px-4"
              onClick={closeLocationsModal}
              disabled={savingUserLocations}
            >
              {ADMIN.dialog.cancel}
            </Button>
            <Button
              variant="accent"
              size="sm"
              className="rounded-lg px-4"
              onClick={() => void saveUserLocations()}
              disabled={savingUserLocations || loadingUserLocations}
            >
              {savingUserLocations ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {ADMIN.dialog.saving}
                </span>
              ) : (
                ADMIN.dialog.saveLocations
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {userLocationsError ? (
            <div className={`${INFO_BOX_MUTED} border-[var(--ops-tone-danger-border)] bg-[var(--ops-tone-danger-bg)] text-[var(--ops-tone-danger-text)]`}>
              {userLocationsError}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-[var(--ops-border-strong)]">
            {loadingUserLocations || loadingLocations ? (
              <div className="px-4 py-6 text-sm text-[var(--ops-text-muted)]">
                {ADMIN.form.loadingSedes}
              </div>
            ) : availableLocations.length === 0 ? (
              <div className="px-4 py-6 text-sm text-[var(--ops-text-muted)]">
                {ADMIN.form.sedesNoneActive}
              </div>
            ) : (
              <div className="divide-y divide-[var(--ops-border-strong)]">
                {availableLocations.map((location) => {
                  const checked = selectedLocationIds.includes(location.location_id)
                  const isDefault = defaultLocationId === location.location_id
                  return (
                    <div
                      key={location.location_id}
                      className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between"
                    >
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLocation(location.location_id)}
                          className="mt-1 h-4 w-4 rounded border-[var(--ops-border-strong)] accent-[var(--ripnel-accent)]"
                        />
                        <span>
                          <span className="block font-medium text-[var(--ops-text)]">
                            {location.name}
                          </span>
                          <span className="block text-sm text-[var(--ops-text-muted)]">
                            {location.type}
                            {location.address ? ` - ${location.address}` : ""}
                          </span>
                        </span>
                      </label>
                      <label
                        className={`inline-flex items-center gap-2 text-sm ${checked ? "text-[var(--ops-text)]" : "text-[var(--ops-text-muted)]"}`}
                      >
                        <input
                          type="radio"
                          name="default-location"
                          checked={isDefault}
                          disabled={!checked}
                          onChange={() => setDefaultLocationId(location.location_id)}
                          className="h-4 w-4 border-[var(--ops-border-strong)] accent-[var(--ripnel-accent)]"
                        />
                        {ADMIN.form.sedesDefault}
                      </label>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </OpsDialog>

      <OpsDialog
        open={Boolean(tempPassword)}
        onOpenChange={(open) => { if (!open) setTempPassword(null) }}
        title={ADMIN.dialog.temporaryPasswordTitle}
        description={ADMIN.dialog.temporaryPasswordHint}
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="accent"
              size="sm"
              className="rounded-lg px-4"
              onClick={() => setTempPassword(null)}
            >
              {ADMIN.dialog.cancel}
            </Button>
          </div>
        }
      >
        {tempPassword ? (
          <div className="space-y-3">
            <div className={`${INFO_BOX_MUTED} space-y-1`}>
              <p className="text-xs text-[var(--ops-text-muted)]">
                {ADMIN.dialog.temporaryPasswordBody(tempPassword.username)}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                {ADMIN.dialog.temporaryPasswordLabel}
              </p>
              <div className="flex items-center gap-2">
                <code className="rounded-lg bg-[var(--ops-surface)] px-3 py-2 text-lg font-semibold tracking-wider text-[var(--ops-text)]">
                  {tempPassword.password}
                </code>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="rounded-lg"
                  onClick={() => void copyTempPassword()}
                >
                  {copiedPassword ? (
                    <Check className="h-4 w-4 text-[var(--ripnel-accent)]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </OpsDialog>

      <AdminConfirmModal
        open={Boolean(activeChangeUser)}
        title={activeChangeUser?.active ? ADMIN.dialog.userActiveTitle : ADMIN.dialog.userInactiveTitle}
        description={
          activeChangeUser ? (
            <span>
              {ADMIN.dialog.userActiveDesc(activeChangeUser.full_name, activeChangeUser.active)}
            </span>
          ) : null
        }
        confirmLabel={activeChangeUser?.active ? ADMIN.dialog.confirmInactivate : ADMIN.dialog.confirmActivate}
        confirmTone={activeChangeUser?.active ? "danger" : "accent"}
        busy={savingActiveChange}
        onCancel={() => setActiveChangeUser(null)}
        onConfirm={() => void confirmUserActiveChange()}
      />
    </OpsPageShell>
  )
}