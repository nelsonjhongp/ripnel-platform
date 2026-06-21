"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { MapPin, PencilLine, Plus, Power, RefreshCw, RotateCcw } from "lucide-react";
import { apiFetchData } from "@/lib/api";
import { showSuccess } from "@/lib/toast";
import { useApiGet } from "@/hooks/use-api-get";
import { activeBadgeLabel } from "@/lib/badge-utils";
import { OpsStatusBadge } from "@/components/ui/ops-status-badge";
import { usePagination } from "@/hooks/use-pagination";
import { EMPTY_USER_FORM, type UserFormState } from "@/types/admin";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";
import { Button } from "@/components/ui/button";
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
} from "@/components/admin/admin-ui";
import { OpsMultiSelectMenu, OpsSelectionChip, OpsSelectMenu } from "@/components/ui/ops-selection";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
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
};

type User = {
  user_id: string;
  full_name: string;
  username: string;
  email: string | null;
  role_id: string | null;
  role_name?: string | null;
  active: boolean;
  must_change_password?: boolean;
  created_at: string;
  updated_at: string;
  temporary_password?: string;
};

type Location = {
  location_id: string;
  code: string;
  name: string;
  type: string;
  address: string | null;
  active: boolean;
};

type UserLocationAssignment = {
  location_id: string;
  is_default: boolean;
  location: Location;
};

type UserLocationsPayload = {
  user: Pick<User, "user_id" | "full_name" | "email" | "role_id" | "active">;
  default_location_id: string | null;
  assignments: UserLocationAssignment[];
};




export default function UsuariosPage() {
  const { data: usersData, loading: loadingUsers, error: usersError, refetch: refetchUsers } = useApiGet(
    () => apiFetchData<User[]>("/api/users"),
    []
  );
  const users = usersData || [];

  const { data: rolesData, loading: loadingRoles, error: rolesError, refetch: refetchRoles } = useApiGet(
    () => apiFetchData<Role[]>("/api/roles"),
    []
  );
  const roles = (rolesData || []).filter((role) => role.active);

  const { data: locationsData, loading: loadingLocations, error: locationsError, refetch: refetchLocations } = useApiGet(
    () => apiFetchData<Location[]>("/api/locations"),
    []
  );
  const availableLocations = (locationsData || []).filter((location) => location.active);

  const locationOptions = useMemo(
    () =>
      availableLocations.map((location) => ({
        value: location.location_id,
        label: location.name,
        helper: [location.type, location.address].filter(Boolean).join(" · "),
      })),
    [availableLocations]
  );

  const [userQuery, setUserQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>(EMPTY_USER_FORM);
  const [savingUser, setSavingUser] = useState(false);
  const [activeChangeUser, setActiveChangeUser] = useState<User | null>(null);
  const [savingActiveChange, setSavingActiveChange] = useState(false);

  const [locationsOpen, setLocationsOpen] = useState(false);
  const [locationsUser, setLocationsUser] = useState<User | null>(null);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [defaultLocationId, setDefaultLocationId] = useState<string | null>(null);
  const [loadingUserLocations, setLoadingUserLocations] = useState(false);
  const [savingUserLocations, setSavingUserLocations] = useState(false);

  const selectedUserFormLocationOptions = useMemo(
    () => locationOptions.filter((loc) => userForm.location_ids.includes(loc.value)),
    [locationOptions, userForm.location_ids]
  );

  const defaultUserFormLocationOptions = useMemo(
    () => selectedUserFormLocationOptions.map((loc) => ({ value: loc.value, label: loc.label })),
    [selectedUserFormLocationOptions]
  );

  const selectedModalLocationOptions = useMemo(
    () => locationOptions.filter((loc) => selectedLocationIds.includes(loc.value)),
    [locationOptions, selectedLocationIds]
  );

  const defaultModalLocationOptions = useMemo(
    () => selectedModalLocationOptions.map((loc) => ({ value: loc.value, label: loc.label })),
    [selectedModalLocationOptions]
  );
  const [userLocationsError, setUserLocationsError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();

    let result = users;

    if (roleFilter !== "all") {
      result = result.filter((user) => user.role_id === roleFilter);
    }

    if (query) {
      result = result.filter((user) => {
        const roleName =
          user.role_name || roles.find((role) => role.role_id === user.role_id)?.name || "";

        return [user.full_name, user.username, user.email || "", roleName].some((value) =>
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
  }, [userQuery, users, roles, roleFilter, sortOrder]);

  const { paginatedItems: paginatedUsers, totalPages, safePage, firstVisible, lastVisible, setPage } = usePagination(filteredUsers)

  const clearFilters = () => {
    setUserQuery("");
    setRoleFilter("all");
    setSortOrder("desc");
    setPage(1);
  };

  const hasActiveFilters = userQuery.trim() !== "" || roleFilter !== "all" || sortOrder !== "desc";

  const roleFilterOptions = [
    { value: "all", label: "Todos los roles" },
    ...roles.filter((r) => r.active).map((r) => ({ value: r.role_id, label: r.name })),
  ];

  function openUserForm(user?: User) {
    if (user) {
      setEditingUserId(user.user_id);
      setUserForm({
        full_name: user.full_name,
        username: user.username,
        email: user.email || "",
        role_id: user.role_id || "",
        active: user.active,
        location_ids: [],
        default_location_id: "",
      });
    } else {
      setEditingUserId(null);
      setUserForm(EMPTY_USER_FORM);
    }

    setSaveError(null);
    setShowUserForm(true);
  }

  function closeUserForm() {
    setShowUserForm(false);
    setEditingUserId(null);
    setUserForm(EMPTY_USER_FORM);
  }

  async function submitUserForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingUser(true);

    try {
      const payload = {
        full_name: userForm.full_name,
        username: userForm.username,
        email: userForm.email.trim() || null,
        role_id: userForm.role_id || null,
        active: userForm.active,
      };

      if (editingUserId) {
        await apiFetchData<User>(`/api/users/${editingUserId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        if (!userForm.role_id) {
          throw new Error("Elige un rol para crear el usuario.");
        }

        if (userForm.location_ids.length === 0) {
          throw new Error("Asigna al menos una sede al usuario.");
        }

        if (!userForm.default_location_id) {
          throw new Error("Elige una sede default para el usuario.");
        }

        const createdUser = await apiFetchData<User>("/api/users", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            role_id: userForm.role_id,
            assignments: userForm.location_ids.map((location_id) => ({
              location_id,
              is_default: userForm.default_location_id === location_id,
            })),
          }),
        });

        if (createdUser.temporary_password) {
          showSuccess(
            "Usuario creado",
            `Usuario: ${createdUser.username} — Clave temporal: ${createdUser.temporary_password}`
          );
        }
      }

      closeUserForm();
      refetchUsers();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar el usuario");
    } finally {
      setSavingUser(false);
    }
  }

  function toggleUserFormLocation(locationId: string) {
    setUserForm((current) => {
      const isSelected = current.location_ids.includes(locationId);
      const nextLocationIds = isSelected
        ? current.location_ids.filter((value) => value !== locationId)
        : [...current.location_ids, locationId];
      const nextDefaultLocationId = isSelected
        ? current.default_location_id === locationId
          ? nextLocationIds[0] || ""
          : current.default_location_id
        : current.default_location_id || locationId;

      return {
        ...current,
        location_ids: nextLocationIds,
        default_location_id: nextDefaultLocationId,
      };
    });
  }

  function chooseUserFormDefaultLocation(locationId: string) {
    setUserForm((current) => ({
      ...current,
      location_ids: current.location_ids.includes(locationId)
        ? current.location_ids
        : [...current.location_ids, locationId],
      default_location_id: locationId,
    }));
  }

  async function confirmUserActiveChange() {
    if (!activeChangeUser) {
      return;
    }

    const targetState = !activeChangeUser.active;
    setSavingActiveChange(true);

    try {
      await apiFetchData<User>(`/api/users/${activeChangeUser.user_id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: targetState }),
      });
      setActiveChangeUser(null);
      refetchUsers();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo actualizar el usuario");
    } finally {
      setSavingActiveChange(false);
    }
  }

  async function openLocationsModal(user: User) {
    setLocationsOpen(true);
    setLocationsUser(user);
    setSelectedLocationIds([]);
    setDefaultLocationId(null);
    setUserLocationsError(null);
    setLoadingUserLocations(true);

    try {
      const payload = await apiFetchData<UserLocationsPayload>(
        `/api/users/${user.user_id}/locations`
      );
      setSelectedLocationIds(payload.assignments.map((assignment) => assignment.location_id));
      setDefaultLocationId(payload.default_location_id);
    } catch (error) {
      setUserLocationsError(error instanceof Error ? error.message : "No se pudo cargar sedes");
    } finally {
      setLoadingUserLocations(false);
    }
  }

  function closeLocationsModal() {
    setLocationsOpen(false);
    setLocationsUser(null);
    setSelectedLocationIds([]);
    setDefaultLocationId(null);
    setUserLocationsError(null);
  }

  function toggleLocation(locationId: string) {
    setSelectedLocationIds((current) => {
      if (current.includes(locationId)) {
        const next = current.filter((value) => value !== locationId);
        if (defaultLocationId === locationId) {
          setDefaultLocationId(next[0] || null);
        }
        return next;
      }

      const next = [...current, locationId];
      if (!defaultLocationId) {
        setDefaultLocationId(locationId);
      }
      return next;
    });
  }

  async function saveUserLocations() {
    if (!locationsUser) {
      return;
    }

    if (selectedLocationIds.length > 0 && !defaultLocationId) {
      setUserLocationsError("Debes elegir una sede default");
      return;
    }

    setSavingUserLocations(true);
    setUserLocationsError(null);

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
        }
      );
      closeLocationsModal();
    } catch (error) {
      setUserLocationsError(error instanceof Error ? error.message : "No se pudo guardar sedes");
    } finally {
      setSavingUserLocations(false);
    }
  }

  const activeUsers = users.filter((u) => u.active).length;
  const inactiveUsers = users.length - activeUsers;

  return (
    <TooltipProvider delayDuration={120}>
      <OpsPageShell width="wide" className="md:px-0">
          <PosHeader
            eyebrow="Administración"
            title="Usuarios"
            actions={
              <div className="flex items-center gap-2">
                <Button asChild variant="accent" size="sm" className="rounded-lg">
                  <Link href="/administracion/usuarios/nuevo">
                    <Plus className="h-3.5 w-3.5" />
                    Nuevo usuario
                  </Link>
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="rounded-lg"
                      onClick={refetchUsers}
                      aria-label="Actualizar usuarios"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8}>
                    Actualizar usuarios
                  </TooltipContent>
                </Tooltip>
              </div>
            }
          />

          <OpsMetricInlineGroup
            items={[
              { label: "Total usuarios", value: users.length },
              { label: "Activos", value: activeUsers, tone: "accent" },
              { label: "Inactivos", value: inactiveUsers },
            ]}
          />

          <OpsSectionDivider>
            <OpsTableBlock>
            <OpsFiltersRow>
              <OpsSearchField
                value={userQuery}
                onChange={(value) => {
                  setUserQuery(value);
                  setPage(1);
                }}
                placeholder="Buscar por nombre, usuario, email o rol"
                ariaLabel="Buscar usuarios"
              />
              <OpsSelect label="Rol" value={roleFilter} options={roleFilterOptions} onChange={(v) => { setRoleFilter(v); setPage(1); }} />
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

            <OpsDataTable
              columns={[
                { key: "usuario", header: "Usuario" },
                { key: "rol", header: "Rol" },
                { key: "estado", header: "Estado" },
                { key: "actualizado", header: "Actualizado" },
                { key: "acciones", header: "", className: "w-[4.5rem] text-right" },
              ]}
              minWidth="980px"
              loading={loadingUsers}
              loadingMessage="Cargando usuarios..."
              error={!loadingUsers ? usersError : null}
              errorTitle="Error al cargar usuarios"
              isEmpty={!loadingUsers && !usersError && filteredUsers.length === 0}
              emptyMessage="No hay usuarios para este filtro."
              footer={
                !loadingUsers && !usersError && filteredUsers.length > 0 ? (
                  <>
                    <span className="text-sm tabular-nums text-[var(--ops-text-muted)]">
                      {firstVisible}-{lastVisible} de {filteredUsers.length}
                    </span>
                    <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} className="self-end md:self-auto" />
                  </>
                ) : undefined
              }
            >
              {paginatedUsers.map((user) => {
                const roleName =
                  user.role_name ||
                  roles.find((role) => role.role_id === user.role_id)?.name ||
                  "Sin rol";

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
                          <span className="inline-flex rounded-full border border-[color:color-mix(in_srgb,var(--warning)_18%,transparent)] bg-[color:color-mix(in_srgb,var(--warning)_10%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[color:color-mix(in_srgb,var(--warning)_70%,currentColor)]">
                            Clave pendiente
                          </span>
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-[var(--ops-row-py)] align-top text-xs text-[var(--ops-text-muted)]">
                      {new Date(user.updated_at).toLocaleString("es-PE")}
                    </td>
                    <td className="w-[4.5rem] px-4 py-[var(--ops-row-py)] align-top">
                      <AdminRowActionsMenu
                        ariaLabel={`Acciones para ${user.full_name}`}
                        items={[
                          {
                            label: "Sedes",
                            icon: <MapPin className="h-3.5 w-3.5" />,
                            onSelect: () => openLocationsModal(user),
                          },
                          {
                            label: "Editar",
                            icon: <PencilLine className="h-3.5 w-3.5" />,
                            onSelect: () => openUserForm(user),
                          },
                          {
                            label: user.active ? "Inactivar" : "Activar",
                            icon: <Power className="h-3.5 w-3.5" />,
                            tone: user.active ? "danger" : "neutral",
                            onSelect: () => {
                              setSaveError(null);
                              setActiveChangeUser(user);
                            },
                          },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </OpsDataTable>
            </OpsTableBlock>
          </OpsSectionDivider>

          {locationsError && (
            <div className="rounded-2xl border border-[color:color-mix(in_srgb,#f59e0b_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] px-4 py-3 text-sm text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]">
              {locationsError}
            </div>
          )}

          {showUserForm && (
            <AdminModalShell
              title={editingUserId ? "Editar usuario" : "Nuevo usuario"}
              description={editingUserId ? "Actualiza la información del usuario." : "Registro de usuario."}
              onClose={closeUserForm}
              widthClass="max-w-2xl"
              footer={
                <div className="flex justify-end gap-3">
                  <AdminActionButton
                    type="button"
                    onClick={closeUserForm}
                    disabled={savingUser}
                  >
                    Cancelar
                  </AdminActionButton>
                  <AdminActionButton
                    type="submit"
                    form="user-edit-form"
                    tone="accent"
                    disabled={savingUser}
                  >
                    {savingUser ? "Guardando..." : "Guardar usuario"}
                  </AdminActionButton>
                </div>
              }
            >
                <form id="user-edit-form" className="space-y-4" onSubmit={submitUserForm}>
                  {saveError && (
                    <AdminInlineMessage tone="danger">{saveError}</AdminInlineMessage>
                  )}
                  <AdminSection title="Identidad y acceso">
                    <div className="space-y-4">
                      <AdminField label="Nombre completo">
                        <AdminInput
                          type="text"
                          required
                          autoComplete="off"
                          value={userForm.full_name}
                          onChange={(event) =>
                            setUserForm((current) => ({ ...current, full_name: event.target.value }))
                          }
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
                          onChange={(event) =>
                            setUserForm((current) => ({ ...current, username: event.target.value }))
                          }
                        />
                      </AdminField>

                      <AdminField label="Email opcional">
                        <AdminInput
                          type="email"
                          autoComplete="off"
                          value={userForm.email}
                          onChange={(event) =>
                            setUserForm((current) => ({ ...current, email: event.target.value }))
                          }
                        />
                      </AdminField>

                      <AdminField label="Rol" hint={rolesError || undefined}>
                        <OpsSelect
                          value={userForm.role_id}
                          onValueChange={(value) =>
                            setUserForm((current) => ({ ...current, role_id: value }))
                          }
                          placeholder={
                            loadingRoles ? "Cargando roles..." : rolesError ? "Error al cargar roles" : "Selecciona un rol"
                          }
                          options={roles.map((role) => ({ value: role.role_id, label: role.name }))}
                          disabled={loadingRoles || Boolean(rolesError)}
                        />
                      </AdminField>
                    </div>
                  </AdminSection>

                  {!editingUserId ? (
                    <AdminSection
                      title="Sedes"
                      description="Elige acceso y sede default."
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
                        <div className="space-y-4">
                          <AdminField label="Sedes asignadas">
                            <div className="space-y-3">
                              <OpsMultiSelectMenu
                                selectedValues={userForm.location_ids}
                                onToggle={toggleUserFormLocation}
                                placeholder="Seleccionar sedes"
                                options={locationOptions}
                              />

                              {selectedUserFormLocationOptions.length ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {selectedUserFormLocationOptions.map((loc) => (
                                    <OpsSelectionChip
                                      key={loc.value}
                                      label={loc.label}
                                      onRemove={() => toggleUserFormLocation(loc.value)}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-[var(--ops-text-muted)]">
                                  Selecciona al menos una sede para continuar.
                                </p>
                              )}
                            </div>
                          </AdminField>

                          <AdminField label="Sede por defecto">
                            <div className="space-y-3">
                              <OpsSelectMenu
                                value={userForm.default_location_id}
                                onValueChange={chooseUserFormDefaultLocation}
                                placeholder={
                                  selectedUserFormLocationOptions.length
                                    ? "Seleccionar sede por defecto"
                                    : "Selecciona una sede primero"
                                }
                                options={defaultUserFormLocationOptions}
                                disabled={!selectedUserFormLocationOptions.length}
                              />

                              {userForm.default_location_id ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {defaultUserFormLocationOptions
                                    .filter((loc) => loc.value === userForm.default_location_id)
                                    .map((loc) => (
                                      <OpsSelectionChip key={loc.value} label={loc.label} selected />
                                    ))}
                                </div>
                              ) : null}
                            </div>
                          </AdminField>
                        </div>
                      )}
                    </AdminSection>
                  ) : null}

                  <AdminField label="Estado">
                    <AdminCheckboxField
                      label="Usuario activo"
                      checked={userForm.active}
                      onChange={(checked) =>
                        setUserForm((current) => ({ ...current, active: checked }))
                      }
                    />
                  </AdminField>
                </form>
            </AdminModalShell>
          )}

          {locationsOpen && (
            <AdminModalShell
              title="Sedes por usuario"
              description={
                locationsUser
                  ? `Asignaciones operativas para ${locationsUser.full_name}.`
                  : "Configura las sedes del usuario."
              }
              onClose={closeLocationsModal}
              widthClass="max-w-2xl"
              footer={
                <div className="flex justify-end gap-3">
                  <AdminActionButton
                    type="button"
                    onClick={closeLocationsModal}
                    disabled={savingUserLocations}
                  >
                    Cancelar
                  </AdminActionButton>
                  <AdminActionButton
                    type="button"
                    tone="accent"
                    onClick={() => void saveUserLocations()}
                    disabled={savingUserLocations || loadingUserLocations}
                  >
                    {savingUserLocations ? "Guardando..." : "Guardar sedes"}
                  </AdminActionButton>
                </div>
              }
            >
                {userLocationsError && (
                  <div className="mt-4">
                    <AdminInlineMessage tone="danger">{userLocationsError}</AdminInlineMessage>
                  </div>
                )}

                <div className="mt-6 space-y-4">
                  {loadingUserLocations || loadingLocations ? (
                    <div className="px-4 py-6 text-sm text-[var(--ops-text-muted)]">Cargando sedes...</div>
                  ) : availableLocations.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-[var(--ops-text-muted)]">
                      No hay sedes activas disponibles.
                    </div>
                  ) : (
                    <>
                      <AdminField label="Sedes asignadas">
                        <div className="space-y-3">
                          <OpsMultiSelectMenu
                            selectedValues={selectedLocationIds}
                            onToggle={toggleLocation}
                            placeholder="Seleccionar sedes"
                            options={locationOptions}
                          />

                          {selectedModalLocationOptions.length ? (
                            <div className="flex flex-wrap gap-1.5">
                              {selectedModalLocationOptions.map((loc) => (
                                <OpsSelectionChip
                                  key={loc.value}
                                  label={loc.label}
                                  onRemove={() => toggleLocation(loc.value)}
                                />
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-[var(--ops-text-muted)]">
                              Selecciona al menos una sede para continuar.
                            </p>
                          )}
                        </div>
                      </AdminField>

                      <AdminField label="Sede por defecto">
                        <div className="space-y-3">
                          <OpsSelectMenu
                            value={defaultLocationId ?? ""}
                            onValueChange={(value) => setDefaultLocationId(value || null)}
                            placeholder={
                              selectedModalLocationOptions.length
                                ? "Seleccionar sede por defecto"
                                : "Selecciona una sede primero"
                            }
                            options={defaultModalLocationOptions}
                            disabled={!selectedModalLocationOptions.length}
                          />

                          {defaultLocationId ? (
                            <div className="flex flex-wrap gap-1.5">
                              {defaultModalLocationOptions
                                .filter((loc) => loc.value === defaultLocationId)
                                .map((loc) => (
                                  <OpsSelectionChip key={loc.value} label={loc.label} selected />
                                ))}
                            </div>
                          ) : null}
                        </div>
                      </AdminField>
                    </>
                  )}
                </div>
            </AdminModalShell>
          )}
          <AdminConfirmModal
            open={Boolean(activeChangeUser)}
            title={activeChangeUser?.active ? "Inactivar usuario" : "Activar usuario"}
            description={
              activeChangeUser ? (
                <>
                  {saveError && (
                    <AdminInlineMessage tone="danger">{saveError}</AdminInlineMessage>
                  )}
                  Vas a {activeChangeUser.active ? "inactivar" : "activar"} a{" "}
                  <span className="font-semibold text-[var(--ops-text)]">
                    {activeChangeUser.full_name}
                  </span>
                  .
                </>
              ) : null
            }
            confirmLabel={activeChangeUser?.active ? "Inactivar" : "Activar"}
            confirmTone={activeChangeUser?.active ? "danger" : "accent"}
            busy={savingActiveChange}
            onCancel={() => setActiveChangeUser(null)}
            onConfirm={() => void confirmUserActiveChange()}
          />
      </OpsPageShell>
    </TooltipProvider>
  );
}
