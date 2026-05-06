"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, RotateCcw, Search } from "lucide-react";
import { buildApiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
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

type UserFormState = {
  full_name: string;
  username: string;
  email: string;
  role_id: string;
  active: boolean;
  location_ids: string[];
  default_location_id: string;
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

const emptyUserForm: UserFormState = {
  full_name: "",
  username: "",
  email: "",
  role_id: "",
  active: true,
  location_ids: [],
  default_location_id: "",
};

const PAGE_SIZE = 10;

function statusBadgeClass(active: boolean) {
  return active
    ? "border-[color:color-mix(in_srgb,#10b981_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_74%,var(--ops-text))]"
    : "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]";
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

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  const [userQuery, setUserQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [userPage, setUserPage] = useState(1);

  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm);
  const [savingUser, setSavingUser] = useState(false);

  const [locationsOpen, setLocationsOpen] = useState(false);
  const [locationsUser, setLocationsUser] = useState<User | null>(null);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [defaultLocationId, setDefaultLocationId] = useState<string | null>(null);
  const [loadingUserLocations, setLoadingUserLocations] = useState(false);
  const [savingUserLocations, setSavingUserLocations] = useState(false);
  const [userLocationsError, setUserLocationsError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUsersError(null);

    try {
      const data = await requestJson<User[]>("/api/users");
      setUsers(data);
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : "No se pudo cargar usuarios");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadRoles = useCallback(async () => {
    setLoadingRoles(true);
    setRolesError(null);

    try {
      const data = await requestJson<Role[]>("/api/roles");
      setRoles(data.filter((role) => role.active));
    } catch (error) {
      setRolesError(error instanceof Error ? error.message : "No se pudo cargar roles");
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  const loadLocations = useCallback(async () => {
    setLoadingLocations(true);
    setLocationsError(null);

    try {
      const data = await requestJson<Location[]>("/api/locations");
      setAvailableLocations(data.filter((location) => location.active));
    } catch (error) {
      setLocationsError(error instanceof Error ? error.message : "No se pudo cargar sedes");
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadUsers();
      void loadRoles();
      void loadLocations();
    });
  }, [loadUsers, loadRoles, loadLocations]);

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

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safeUserPage = Math.min(userPage, totalUserPages);
  const paginatedUsers = filteredUsers.slice(
    (safeUserPage - 1) * PAGE_SIZE,
    safeUserPage * PAGE_SIZE
  );
  const userRangeStart = filteredUsers.length === 0 ? 0 : (safeUserPage - 1) * PAGE_SIZE + 1;
  const userRangeEnd = Math.min(filteredUsers.length, safeUserPage * PAGE_SIZE);

  useEffect(() => {
    setUserPage(1);
  }, [userQuery]);

  const clearFilters = () => {
    setUserQuery("");
    setRoleFilter("all");
    setSortOrder("desc");
    setUserPage(1);
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
      setUserForm(emptyUserForm);
    }

    setShowUserForm(true);
  }

  function closeUserForm() {
    setShowUserForm(false);
    setEditingUserId(null);
    setUserForm(emptyUserForm);
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
        await requestJson<User>(`/api/users/${editingUserId}`, {
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

        const createdUser = await requestJson<User>("/api/users", {
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
          window.alert(
            `Usuario creado.\nUsuario: ${createdUser.username}\nClave temporal: ${createdUser.temporary_password}\n\nEntrega esta clave al usuario para su primer ingreso.`
          );
        }
      }

      closeUserForm();
      await loadUsers();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo guardar el usuario");
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

  async function toggleUserActive(user: User) {
    const targetState = !user.active;
    const label = targetState ? "activar" : "inactivar";

    if (!window.confirm(`Confirma que deseas ${label} a ${user.full_name}?`)) {
      return;
    }

    try {
      await requestJson<User>(`/api/users/${user.user_id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: targetState }),
      });
      await loadUsers();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo actualizar el usuario");
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
      const payload = await requestJson<UserLocationsPayload>(
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
      await requestJson<UserLocationsPayload>(
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
      <section className="ops-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-6">
        <div className="mx-auto max-w-[1180px] space-y-4">
          <PosHeader
            eyebrow="Administración"
            title="Usuarios"
            actions={
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="accent"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => openUserForm()}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nuevo usuario
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="rounded-lg"
                      onClick={loadUsers}
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

          <div className="flex flex-wrap gap-2">
            <MetricPill label="Total usuarios" value={users.length} />
            <MetricPill label="Activos" value={activeUsers} tone="accent" />
            <MetricPill label="Inactivos" value={inactiveUsers} />
          </div>

          <div className="space-y-4 border-t border-[var(--ops-border-strong)] pt-4">
            <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1.55fr)_0.92fr_0.92fr_auto] lg:items-end">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">Buscar</label>
                <div className="sales-field flex h-10 items-center gap-2 rounded-lg px-3 transition hover:bg-[var(--ops-surface-muted)]">
                  <Search className="h-4 w-4 shrink-0 text-[var(--ops-text-muted)]" />
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(event) => setUserQuery(event.target.value)}
                    placeholder="Buscar por nombre, usuario, email o rol"
                    aria-label="Buscar usuarios"
                    className="h-full w-full bg-transparent text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]"
                  />
                </div>
              </div>
              <FilterDropdown label="Rol" value={roleFilter} options={roleFilterOptions} onChange={(v) => { setRoleFilter(v); setUserPage(1); }} />
              <FilterDropdown label="Orden" value={sortOrder} options={[{ value: "desc", label: "Más reciente" }, { value: "asc", label: "Más antiguo" }]} onChange={(v) => { setSortOrder(v as "desc" | "asc"); setUserPage(1); }} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={clearFilters} disabled={!hasActiveFilters} variant="outline" size="icon-sm" className="mt-auto h-10 w-10 rounded-lg" aria-label="Limpiar filtros">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>Limpiar filtros</TooltipContent>
              </Tooltip>
            </div>

            {usersError && (
              <div className="rounded-xl border border-[color:color-mix(in_srgb,#f43f5e_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f43f5e_14%,var(--ops-surface))] px-4 py-2.5 text-sm text-[color:color-mix(in_srgb,#be123c_74%,var(--ops-text))]">
                {usersError}
              </div>
            )}

            <div className="overflow-hidden border-y border-[var(--ops-border-strong)]">
              {loadingUsers ? (
                <div className="px-4 py-6 text-sm text-[var(--ops-text-muted)]">Cargando usuarios…</div>
              ) : filteredUsers.length === 0 ? (
                <div className="px-4 py-6 text-sm text-[var(--ops-text-muted)]">
                  No hay usuarios para este filtro.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[var(--ops-border-strong)] text-sm">
                    <thead className="bg-[var(--ops-surface-muted)]">
                      <tr>
                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                          Usuario
                        </th>
                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--ops-text-muted)]">
                          Rol
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
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusBadgeClass(user.active)}`}
                              >
                                {user.active ? "Activo" : "Inactivo"}
                              </span>
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
                            <td className="px-4 py-[var(--ops-row-py)] align-top">
                              <div className="flex flex-wrap justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openLocationsModal(user)}
                                  className="rounded-lg border border-[var(--ops-border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
                                >
                                  Sedes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openUserForm(user)}
                                  className="rounded-lg border border-[var(--ops-border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleUserActive(user)}
                                  className="rounded-lg border border-[var(--ops-border-soft)] px-3 py-1.5 text-xs font-medium text-[var(--ops-text-muted)] transition hover:bg-[var(--ops-surface-muted)]"
                                >
                                  {user.active ? "Inactivar" : "Activar"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {!loadingUsers && filteredUsers.length > 0 ? (
              <div className="flex flex-col gap-3 border-t border-[var(--ops-border-strong)] pt-3 md:flex-row md:items-center md:justify-between">
                <div className="text-xs font-medium text-[var(--ops-text-muted)]">
                  {userRangeStart}-{userRangeEnd} de {filteredUsers.length}
                </div>
                <Pagination page={safeUserPage} totalPages={totalUserPages} onPageChange={setUserPage} />
              </div>
            ) : null}
          </div>

          {locationsError && (
            <div className="rounded-2xl border border-[color:color-mix(in_srgb,#f59e0b_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] px-4 py-3 text-sm text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]">
              {locationsError}
            </div>
          )}

          {showUserForm && (
            <div className="ops-overlay-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="ops-overlay-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-5">
                <h3 className="text-xl font-semibold text-[var(--ops-text)]">
                  {editingUserId ? "Editar usuario" : "Nuevo usuario"}
                </h3>
                <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                  {editingUserId
                    ? "Actualiza la información del usuario."
                    : "Registro de usuario."}
                </p>

                <form className="mt-6 space-y-4" onSubmit={submitUserForm}>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-[var(--ops-text)]">Nombre completo</span>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      value={userForm.full_name}
                      onChange={(event) =>
                        setUserForm((current) => ({ ...current, full_name: event.target.value }))
                      }
                      className="w-full rounded-xl border border-[var(--ops-border-strong)] px-4 py-2.5 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--ripnel-accent)] focus:ring-2 focus:ring-[var(--ripnel-accent-soft)]"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-[var(--ops-text)]">Usuario</span>
                    <input
                      type="text"
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      autoComplete="off"
                      value={userForm.username}
                      onChange={(event) =>
                        setUserForm((current) => ({ ...current, username: event.target.value }))
                      }
                      className="w-full rounded-xl border border-[var(--ops-border-strong)] px-4 py-2.5 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--ripnel-accent)] focus:ring-2 focus:ring-[var(--ripnel-accent-soft)]"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-[var(--ops-text)]">Email opcional</span>
                    <input
                      type="email"
                      autoComplete="off"
                      value={userForm.email}
                      onChange={(event) =>
                        setUserForm((current) => ({ ...current, email: event.target.value }))
                      }
                      className="w-full rounded-xl border border-[var(--ops-border-strong)] px-4 py-2.5 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--ripnel-accent)] focus:ring-2 focus:ring-[var(--ripnel-accent-soft)]"
                    />
                  </label>

                  <label htmlFor="role-select" className="block space-y-1">
                    <span className="text-sm font-medium text-[var(--ops-text)]">Rol</span>
                    <select
                      id="role-select"
                      required={!editingUserId}
                      value={userForm.role_id}
                      onChange={(event) =>
                        setUserForm((current) => ({ ...current, role_id: event.target.value }))
                      }
                      className="w-full cursor-pointer rounded-xl border border-[var(--ops-border-strong)] px-4 py-2.5 text-sm text-[var(--ops-text)] outline-none transition hover:border-[var(--ops-border-soft)] focus:border-[var(--ripnel-accent)] focus:ring-2 focus:ring-[var(--ripnel-accent-soft)] bg-[var(--ops-field)]"
                    >
                      <option value="">Sin rol</option>
                      {loadingRoles ? (
                        <option disabled>Cargando roles...</option>
                      ) : rolesError ? (
                        <option disabled>Error al cargar roles</option>
                      ) : (
                        roles.map((role) => (
                          <option key={role.role_id} value={role.role_id}>
                            {role.name}
                          </option>
                        ))
                      )}
                    </select>
                  </label>

                  {!editingUserId ? (
                    <div className="space-y-2 rounded-2xl border border-[var(--ops-border-strong)] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-[var(--ops-text)]">Sedes</div>
                          <div className="text-xs text-[var(--ops-text-muted)]">
                            Elige acceso y sede default.
                          </div>
                        </div>
                        <div className="rounded-full border border-[var(--ops-border-strong)] px-2.5 py-1 text-xs font-medium text-[var(--ops-text-muted)]">
                          {userForm.location_ids.length}
                        </div>
                      </div>

                      {loadingLocations ? (
                        <div className="rounded-xl bg-[var(--ops-field)] px-3 py-3 text-sm text-[var(--ops-text-muted)]">
                          Cargando sedes...
                        </div>
                      ) : locationsError ? (
                        <div className="rounded-xl border border-[color:color-mix(in_srgb,#f59e0b_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] px-3 py-3 text-sm text-[color:color-mix(in_srgb,#b45309_74%,var(--ops-text))]">
                          {locationsError}
                        </div>
                      ) : availableLocations.length === 0 ? (
                        <div className="rounded-xl bg-[var(--ops-field)] px-3 py-3 text-sm text-[var(--ops-text-muted)]">
                          No hay sedes activas disponibles.
                        </div>
                      ) : (
                        <div className="max-h-56 divide-y divide-[var(--ops-border-strong)] overflow-y-auto rounded-xl border border-[var(--ops-border-strong)]">
                          {availableLocations.map((location) => {
                            const checked = userForm.location_ids.includes(location.location_id);
                            const isDefault = userForm.default_location_id === location.location_id;

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
                                    className="mt-1 h-4 w-4 rounded border-[var(--ops-border-strong)]"
                                  />
                                  <span>
                                    <span className="block text-sm font-medium text-[var(--ops-text)]">
                                      {location.name} ({location.code})
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
                                    onChange={() =>
                                      chooseUserFormDefaultLocation(location.location_id)
                                    }
                                    className="h-4 w-4 border-[var(--ops-border-strong)] disabled:cursor-not-allowed"
                                  />
                                  Default
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}

                  <label className="flex items-center gap-3 rounded-2xl border border-[var(--ops-border-strong)] px-4 py-3">
                    <input
                      type="checkbox"
                      checked={userForm.active}
                      onChange={(event) =>
                        setUserForm((current) => ({ ...current, active: event.target.checked }))
                      }
                      className="h-4 w-4 rounded border-[var(--ops-border-strong)]"
                    />
                    <span className="text-sm text-[var(--ops-text)]">Usuario activo</span>
                  </label>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeUserForm}
                      disabled={savingUser}
                      className="rounded-xl border border-[var(--ops-border-strong)] px-4 py-2 text-sm font-medium text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingUser}
                      className="rounded-xl bg-[var(--ripnel-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--ripnel-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingUser ? "Guardando..." : "Guardar usuario"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {locationsOpen && (
            <div className="ops-overlay-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="ops-overlay-panel w-full max-w-2xl rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-[var(--ops-text)]">Sedes por usuario</h3>
                    <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                      {locationsUser
                        ? `Asignaciones operativas para ${locationsUser.full_name}.`
                        : "Configura las sedes del usuario."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeLocationsModal}
                    className="rounded-xl border border-[var(--ops-border-strong)] px-3 py-2 text-sm text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]"
                  >
                    Cerrar
                  </button>
                </div>

                {userLocationsError && (
                  <div className="mt-4 rounded-2xl border border-[color:color-mix(in_srgb,#f43f5e_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f43f5e_14%,var(--ops-surface))] px-4 py-3 text-sm text-[color:color-mix(in_srgb,#be123c_74%,var(--ops-text))]">
                    {userLocationsError}
                  </div>
                )}

                <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--ops-border-strong)]">
                  {loadingUserLocations || loadingLocations ? (
                    <div className="px-4 py-6 text-sm text-[var(--ops-text-muted)]">Cargando sedes...</div>
                  ) : availableLocations.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-[var(--ops-text-muted)]">
                      No hay sedes activas disponibles.
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--ops-border-strong)]">
                      {availableLocations.map((location) => {
                        const checked = selectedLocationIds.includes(location.location_id);
                        const isDefault = defaultLocationId === location.location_id;

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
                                className="mt-1 h-4 w-4 rounded border-[var(--ops-border-strong)]"
                              />
                              <span>
                                <span className="block font-medium text-[var(--ops-text)]">
                                  {location.name} ({location.code})
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
                                className="h-4 w-4 border-[var(--ops-border-strong)]"
                              />
                              Sede default
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeLocationsModal}
                    disabled={savingUserLocations}
                    className="rounded-xl border border-[var(--ops-border-strong)] px-4 py-2 text-sm font-medium text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveUserLocations()}
                    disabled={savingUserLocations || loadingUserLocations}
                    className="rounded-xl bg-[var(--ripnel-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--ripnel-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingUserLocations ? "Guardando..." : "Guardar sedes"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </TooltipProvider>
  );
}
