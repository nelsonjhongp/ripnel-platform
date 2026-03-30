"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { buildApiUrl } from "@/lib/api";

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
  email: string;
  role_id: string | null;
  role_name?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
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
  email: string;
  role_id: string;
  active: boolean;
};

type RoleFormState = {
  name: string;
  description: string;
  active: boolean;
};

async function requestJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(buildApiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
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
  email: "",
  role_id: "",
  active: true,
};

const emptyRoleForm: RoleFormState = {
  name: "",
  description: "",
  active: true,
};

export default function AdminCrudPage() {
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
  const [roleQuery, setRoleQuery] = useState("");

  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm);
  const [savingUser, setSavingUser] = useState(false);

  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState<RoleFormState>(emptyRoleForm);
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
      setRoles(data);
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
    void loadUsers();
    void loadRoles();
    void loadLocations();
  }, [loadUsers, loadRoles, loadLocations]);

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const roleName = user.role_name || roles.find((role) => role.role_id === user.role_id)?.name || "";

      return [user.full_name, user.email, roleName].some((value) =>
        value.toLowerCase().includes(query),
      );
    });
  }, [userQuery, users, roles]);

  const filteredRoles = useMemo(() => {
    const query = roleQuery.trim().toLowerCase();

    if (!query) {
      return roles;
    }

    return roles.filter((role) =>
      [role.name, role.description || ""].some((value) => value.toLowerCase().includes(query)),
    );
  }, [roleQuery, roles]);

  function openUserForm(user?: User) {
    if (user) {
      setEditingUserId(user.user_id);
      setUserForm({
        full_name: user.full_name,
        email: user.email,
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
        email: userForm.email,
        role_id: userForm.role_id || null,
        active: userForm.active,
      };

      if (editingUserId) {
        await requestJson<User>(`/api/users/${editingUserId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson<User>("/api/users", {
          method: "POST",
          body: JSON.stringify(payload),
        });
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
    if (role) {
      setEditingRoleId(role.role_id);
      setRoleForm({
        name: role.name,
        description: role.description || "",
        active: role.active,
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

      <section className="grid gap-4 md:grid-cols-4">
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
              placeholder="Buscar por nombre, email o rol"
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
                          <div className="text-slate-500">{user.email}</div>
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
              Mantenimiento base para el bloque de auth y administracion.
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
              El password se guarda temporalmente como <code>temp_hash</code> hasta que entre auth.
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
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  required
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
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-900">
              {editingRoleId ? "Editar rol" : "Nuevo rol"}
            </h3>

            <form className="mt-6 space-y-4" onSubmit={submitRoleForm}>
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
                  rows={4}
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

              <div className="flex justify-end gap-3 pt-2">
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
