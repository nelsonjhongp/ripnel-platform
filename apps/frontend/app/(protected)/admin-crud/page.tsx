"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { buildApiUrl } from "@/lib/api";

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

type User = {
  user_id: string;
  full_name: string;
  username: string;
  email: string | null;
  role_id: string | null;
  role_name?: string | null;
  active: boolean;
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

const emptyUserForm: UserFormState = {
  full_name: "",
  username: "",
  email: "",
  role_id: "",
  active: true,
};

const emptyRoleForm: RoleFormState = {
  name: "",
  description: "",
  active: true,
  permission_keys: [],
};

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
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-slate-50/50">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm font-medium text-slate-700">Permisos del rol</div>
            <div className="mt-1 text-xs text-slate-500">
              Busca, filtra por modulo y marca solo lo necesario.
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Seleccionados
            </div>
            <div className="text-base font-semibold text-slate-900">
              {selectedKeys.length}
            </div>
          </div>
        </div>

        {selectedPermissions.length > 0 ? (
          <div className="mt-3 rounded-2xl border border-violet-200 bg-violet-50/70 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-xs font-medium uppercase tracking-wide text-violet-700">
                Seleccionados: {selectedPermissions.length}
              </div>
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs font-medium text-violet-700 transition hover:text-violet-900"
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-violet-300 bg-white px-2.5 py-1 text-xs font-medium text-violet-800 transition hover:border-violet-400 hover:bg-violet-100"
                  title={permission.description || permission.key}
                >
                  <span className="max-w-[14rem] truncate">{permission.key}</span>
                  <span className="text-sm leading-none text-violet-500">x</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-500">
            Todavia no has seleccionado permisos para este rol.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3">
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Buscar permiso
          </span>
          <input
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar por clave o descripcion"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-violet-500"
          />
        </label>

        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Modulo
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
                      ? "border-violet-300 bg-violet-100 text-violet-800"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
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
          <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">
            Cargando permisos...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : totalPermissions === 0 ? (
          <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">
            No hay permisos registrados todavia.
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
            No hay permisos que coincidan con la busqueda o el modulo seleccionado.
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const selectedCount = group.permissions.filter((permission) =>
                selectedKeys.includes(permission.key)
              ).length;

              return (
                <div key={group.group} className="space-y-2">
                  <div className="sticky top-0 z-10 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-100/95 px-3 py-2 backdrop-blur">
                    <div className="text-sm font-semibold text-slate-900">
                      {formatPermissionGroupLabel(group.group)}
                    </div>
                    <div className="text-xs text-slate-500">
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
                              ? "border-violet-300 bg-violet-50"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => onTogglePermission(permission.key)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium text-slate-900">
                                {permission.key}
                              </span>
                              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                                {group.group}
                              </span>
                            </span>
                            <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                              {permission.description || "Sin descripcion"}
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

export default function AdminCrudPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  const [userQuery, setUserQuery] = useState("");
  const [roleQuery, setRoleQuery] = useState("");

  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm);
  const [savingUser, setSavingUser] = useState(false);

  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState<RoleFormState>(emptyRoleForm);
  const [rolePermissionQuery, setRolePermissionQuery] = useState("");
  const [rolePermissionModule, setRolePermissionModule] = useState("all");
  const [savingRole, setSavingRole] = useState(false);

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
    void loadUsers();
    void loadRoles();
    void loadPermissions();
    void loadLocations();
  }, [loadUsers, loadRoles, loadPermissions, loadLocations]);

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const roleName = user.role_name || roles.find((role) => role.role_id === user.role_id)?.name || "";

      return [user.full_name, user.username, user.email || "", roleName].some((value) =>
        value.toLowerCase().includes(query),
      );
    });
  }, [userQuery, users, roles]);

  const filteredRoles = useMemo(() => {
    const query = roleQuery.trim().toLowerCase();

    if (!query) {
      return roles;
    }

    return roles.filter((role) => {
      const permissionSummary = role.permissions
        .flatMap((permission) => [permission.key, permission.description || ""])
        .join(" ");

      return [role.name, role.description || "", permissionSummary].some((value) =>
        value.toLowerCase().includes(query)
      );
    });
  }, [roleQuery, roles]);

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

  function openUserForm(user?: User) {
    if (user) {
      setEditingUserId(user.user_id);
      setUserForm({
        full_name: user.full_name,
        username: user.username,
        email: user.email || "",
        role_id: user.role_id || "",
        active: user.active,
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
        const createdUser = await requestJson<User>("/api/users", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (createdUser.temporary_password) {
          window.alert(
            `Usuario creado. Clave temporal para ${createdUser.username}: ${createdUser.temporary_password}`
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
      await loadUsers();
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
      await loadUsers();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo actualizar el rol");
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
      const payload = await requestJson<UserLocationsPayload>(`/api/users/${user.user_id}/locations`);
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
      await requestJson<UserLocationsPayload>(`/api/users/${locationsUser.user_id}/locations`, {
        method: "PUT",
        body: JSON.stringify({
          assignments: selectedLocationIds.map((location_id) => ({
            location_id,
            is_default: defaultLocationId === location_id,
          })),
        }),
      });
      closeLocationsModal();
    } catch (error) {
      setUserLocationsError(error instanceof Error ? error.message : "No se pudo guardar sedes");
    } finally {
      setSavingUserLocations(false);
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

  function roleBadgeClass(active: boolean) {
    return active ? "bg-indigo-100 text-indigo-800" : "bg-slate-200 text-slate-700";
  }

  function statusBadgeClass(active: boolean) {
    return active ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800";
  }

  return (
    <div className="space-y-8 p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Roles y usuarios</h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Esta pantalla ya trabaja contra backend. Los usuarios se inactivan, no se eliminan
          fisicamente. La asignacion de sedes vive aqui para dejar lista la base operativa del
          equipo.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Usuarios</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{users.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Usuarios activos</div>
          <div className="mt-2 text-3xl font-semibold text-emerald-700">
            {users.filter((user) => user.active).length}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Roles</div>
          <div className="mt-2 text-3xl font-semibold text-indigo-700">{roles.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Sedes activas</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {availableLocations.length}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Permisos base</div>
          <div className="mt-2 text-3xl font-semibold text-violet-700">
            {availablePermissions.length}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Usuarios</h2>
            <p className="text-sm text-slate-500">CRUD por backend con rol, estado y sedes.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={userQuery}
              onChange={(event) => setUserQuery(event.target.value)}
              placeholder="Buscar por nombre, usuario, email o rol"
              className="min-w-72 rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => openUserForm()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Nuevo usuario
            </button>
          </div>
        </div>

        {usersError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {usersError}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          {loadingUsers ? (
            <div className="px-4 py-6 text-sm text-slate-500">Cargando usuarios...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">
              No hay usuarios para los filtros actuales.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Usuario</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Rol</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Estado</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Actualizado</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredUsers.map((user) => {
                    const roleName =
                      user.role_name ||
                      roles.find((role) => role.role_id === user.role_id)?.name ||
                      "Sin rol";

                    return (
                      <tr key={user.user_id}>
                        <td className="px-4 py-3 align-top">
                          <div className="font-medium text-slate-900">{user.full_name}</div>
                          <div className="text-slate-500">@{user.username}</div>
                          {user.email && <div className="text-slate-400">{user.email}</div>}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className="inline-flex rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-800">
                            {roleName}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(user.active)}`}
                          >
                            {user.active ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top text-slate-500">
                          {new Date(user.updated_at).toLocaleString("es-PE")}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openLocationsModal(user)}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              Sedes
                            </button>
                            <button
                              type="button"
                              onClick={() => openUserForm(user)}
                              className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-50"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleUserActive(user)}
                              className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-50"
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
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Roles</h2>
            <p className="text-sm text-slate-500">
              Los permisos se administran por rol y luego se heredan al usuario durante la sesion.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={roleQuery}
              onChange={(event) => setRoleQuery(event.target.value)}
              placeholder="Buscar por nombre o descripcion"
              className="min-w-72 rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => openRoleForm()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              Nuevo rol
            </button>
          </div>
        </div>

        {rolesError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {rolesError}
          </div>
        )}

        {permissionsError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {permissionsError}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          {loadingRoles ? (
            <div className="px-4 py-6 text-sm text-slate-500">Cargando roles...</div>
          ) : filteredRoles.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">
              No hay roles para los filtros actuales.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Rol</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Descripcion</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Permisos</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Estado</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Actualizado</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredRoles.map((role) => (
                    <tr key={role.role_id}>
                      <td className="px-4 py-3 align-top">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${roleBadgeClass(role.active)}`}>
                          {role.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-600">{role.description || "-"}</td>
                      <td className="px-4 py-3 align-top">
                        {role.permissions.length === 0 ? (
                          <span className="text-slate-400">Sin permisos</span>
                        ) : (
                          <div className="flex max-w-xl flex-wrap gap-2">
                            {role.permissions.map((permission) => (
                              <span
                                key={`${role.role_id}-${permission.permission_id}`}
                                className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700"
                                title={permission.description || permission.key}
                              >
                                {permission.key}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(role.active)}`}
                        >
                          {role.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-500">
                        {new Date(role.updated_at).toLocaleString("es-PE")}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openRoleForm(role)}
                            className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleRoleActive(role)}
                            className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-50"
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
      </section>

      {locationsError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {locationsError}
        </div>
      )}

      {showUserForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-900">
              {editingUserId ? "Editar usuario" : "Nuevo usuario"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {editingUserId
                ? "Actualiza nombre, usuario, correo opcional y rol del usuario."
                : "La clave temporal se genera como usuario + 123 mientras se define el flujo de cambio de contraseña."}
            </p>

            <form className="mt-6 space-y-4" onSubmit={submitUserForm}>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Nombre completo</span>
                <input
                  required
                  value={userForm.full_name}
                  onChange={(event) =>
                    setUserForm((current) => ({ ...current, full_name: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Usuario</span>
                <input
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={userForm.username}
                  onChange={(event) =>
                    setUserForm((current) => ({ ...current, username: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Email opcional</span>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(event) =>
                    setUserForm((current) => ({ ...current, email: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Rol</span>
                <select
                  value={userForm.role_id}
                  onChange={(event) =>
                    setUserForm((current) => ({ ...current, role_id: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500"
                >
                  <option value="">Sin rol</option>
                  {roles.map((role) => (
                    <option key={role.role_id} value={role.role_id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <input
                  type="checkbox"
                  checked={userForm.active}
                  onChange={(event) =>
                    setUserForm((current) => ({ ...current, active: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Usuario activo</span>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeUserForm}
                  disabled={savingUser}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingUser ? "Guardando..." : "Guardar usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRoleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
            <h3 className="text-xl font-semibold text-slate-900">
              {editingRoleId ? "Editar rol" : "Nuevo rol"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Los permisos se asignan al rol, no al usuario individual.
            </p>
            </div>

            <form className="flex min-h-0 flex-1 flex-col" onSubmit={submitRoleForm}>
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                <div className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
                  <div className="space-y-4">
                    <label className="block space-y-1">
                      <span className="text-sm font-medium text-slate-700">Nombre</span>
                      <input
                        required
                        value={roleForm.name}
                        onChange={(event) =>
                          setRoleForm((current) => ({ ...current, name: event.target.value }))
                        }
                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-sm font-medium text-slate-700">Descripcion</span>
                      <textarea
                        value={roleForm.description}
                        onChange={(event) =>
                          setRoleForm((current) => ({ ...current, description: event.target.value }))
                        }
                        rows={6}
                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500"
                      />
                    </label>

                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={roleForm.active}
                        onChange={(event) =>
                          setRoleForm((current) => ({ ...current, active: event.target.checked }))
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <span className="text-sm text-slate-700">Rol activo</span>
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

              <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  type="button"
                  onClick={closeRoleForm}
                  disabled={savingRole}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingRole}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingRole ? "Guardando..." : "Guardar rol"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {locationsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Sedes por usuario</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {locationsUser
                    ? `Asignaciones operativas para ${locationsUser.full_name}.`
                    : "Configura las sedes del usuario."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeLocationsModal}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            {userLocationsError && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {userLocationsError}
              </div>
            )}

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              {loadingUserLocations || loadingLocations ? (
                <div className="px-4 py-6 text-sm text-slate-500">Cargando sedes...</div>
              ) : availableLocations.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-500">
                  No hay sedes activas disponibles.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
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
                            className="mt-1 h-4 w-4 rounded border-slate-300"
                          />
                          <span>
                            <span className="block font-medium text-slate-900">
                              {location.name} ({location.code})
                            </span>
                            <span className="block text-sm text-slate-500">
                              {location.type}
                              {location.address ? ` - ${location.address}` : ""}
                            </span>
                          </span>
                        </label>

                        <label
                          className={`inline-flex items-center gap-2 text-sm ${checked ? "text-slate-700" : "text-slate-400"}`}
                        >
                          <input
                            type="radio"
                            name="default-location"
                            checked={isDefault}
                            disabled={!checked}
                            onChange={() => setDefaultLocationId(location.location_id)}
                            className="h-4 w-4 border-slate-300"
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
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void saveUserLocations()}
                disabled={savingUserLocations || loadingUserLocations}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingUserLocations ? "Guardando..." : "Guardar sedes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
