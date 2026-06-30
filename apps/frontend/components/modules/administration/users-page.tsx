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
import { formatDate } from "@/lib/date-utils"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { usePagination } from "@/hooks/use-pagination"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { Button } from "@/components/ui/button"
import { AdminRowActionsMenu } from "@/components/admin/admin-ui"
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
import { OpsEmptyState } from "@/components/ui/ops-empty-state"
import { Pagination } from "@/components/ui/pagination"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { OpsDialog } from "@/components/ui/ops-dialog"
import { INFO_BOX_MUTED, CHIP_TONE_ACCENT } from "@/components/ui/ops-control-styles"

import {
  type User,
  type Role,
  type Location,
  type UserFormState,
  type UserFormErrors,
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
import { UserForm } from "./user-form"
import { UserLocationsDialog } from "./user-locations-dialog"

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
  const [locationsDialogKey, setLocationsDialogKey] = useState(0)

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

  async function saveUser() {
    setUserActionState("validating")

    const validation = validateUserInput(userForm, isEdit)
    if (validation) {
      setUserErrors(validation)
      setUserActionState("idle")
      return
    }

    setUserActionState("saving")
    setUserErrors(null)

    try {
      if (editingUserId) {
        await apiFetchData<User>(`/api/users/${editingUserId}`, {
          method: "PATCH",
          body: JSON.stringify(buildUserPayload(userForm)),
        })
        showSuccess(ADMIN.toast.userUpdated)
        closeUserForm()
        refetchUsers()
      } else {
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

  function openLocationsModal(user: User) {
    setLocationsDialogKey((k) => k + 1)
    setLocationsOpen(true)
    setLocationsUser(user)
  }

  function closeLocationsModal() {
    setLocationsOpen(false)
    setLocationsUser(null)
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
    <OpsPageShell width="wide">
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

          {!loadingUsers && !usersError && users.length === 0 ? (
            <OpsEmptyState variant="compact" description={ADMIN.table.users.emptyDb} />
          ) : (
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
            isEmpty={!loadingUsers && !usersError && filteredUsers.length === 0 && users.length > 0}
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
                <tr key={user.user_id} className={`transition hover:bg-[var(--ops-surface-muted)] ${!user.active ? "opacity-60" : ""}`}>
                  <td className="px-4 py-[var(--ops-row-py)] align-top">
                    <div className="text-sm font-semibold text-[var(--ops-text)]">
                      {user.full_name}
                    </div>
                    <div className="mt-1 text-[11px] tracking-[0.16em] text-[var(--ops-text-muted)]">
                      @{user.username}
                    </div>
                    {user.email && (
                      <div className="mt-0.5 text-[11px] tracking-[0.16em] text-[var(--ops-text-muted)]">
                        {user.email}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)] align-top">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${CHIP_TONE_ACCENT}`}>
                      {roleName}
                    </span>
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)] align-top">
                    <OpsStatusBadge tone={user.active ? "success" : "neutral"}>
                      {activeBadgeLabel(user.active)}
                    </OpsStatusBadge>
                    {user.must_change_password ? (
                      <span className="mt-1.5 block">
                        <OpsStatusBadge tone="warning" size="sm">
                          {ADMIN.status.pendingPassword}
                        </OpsStatusBadge>
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-[var(--ops-row-py)] align-top text-xs text-[var(--ops-text-muted)]">
                    {formatDate(user.updated_at)}
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
          )}
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
        <UserForm
          state={userForm}
          errors={userErrors}
          onChange={setUserForm}
          mode={isEdit ? "edit" : "create"}
          roles={roles}
          loadingRoles={loadingRoles}
          rolesError={rolesError}
          availableLocations={availableLocations}
          loadingLocations={loadingLocations}
          locationsError={locationsError}
        />
      </OpsDialog>

      <UserLocationsDialog
        key={locationsDialogKey}
        open={locationsOpen}
        user={locationsUser}
        availableLocations={availableLocations}
        loadingLocations={loadingLocations}
        onClose={closeLocationsModal}
      />

      <OpsDialog
        open={Boolean(tempPassword)}
        onOpenChange={(open) => { if (!open) setTempPassword(null) }}
        title={ADMIN.dialog.temporaryPasswordTitle}
        description={ADMIN.dialog.temporaryPasswordHint}
        size="sm"
        bodyClassName="px-5 py-5"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
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

      <OpsDialog
        open={Boolean(activeChangeUser)}
        onOpenChange={(open) => { if (!open) setActiveChangeUser(null) }}
        title={activeChangeUser?.active ? ADMIN.dialog.userActiveTitle : ADMIN.dialog.userInactiveTitle}
        description={
          activeChangeUser
            ? ADMIN.dialog.userActiveDesc(activeChangeUser.full_name, activeChangeUser.active)
            : undefined
        }
        size="sm"
        bodyClassName="px-5 py-5"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg px-4"
              onClick={() => setActiveChangeUser(null)}
              disabled={savingActiveChange}
            >
              {ADMIN.dialog.cancel}
            </Button>
            <Button
              variant={activeChangeUser?.active ? "destructive" : "accent"}
              size="sm"
              className="rounded-lg px-4"
              onClick={() => void confirmUserActiveChange()}
              disabled={savingActiveChange}
            >
              {savingActiveChange ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {ADMIN.dialog.processing}
                </span>
              ) : activeChangeUser?.active ? (
                ADMIN.dialog.confirmInactivate
              ) : (
                ADMIN.dialog.confirmActivate
              )}
            </Button>
          </div>
        }
      >{null}</OpsDialog>
    </OpsPageShell>
  )
}
