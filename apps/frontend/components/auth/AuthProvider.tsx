"use client";

import React from "react";
import { AUTH_ERROR_EVENT, ApiError, apiFetch, unwrapApiData } from "@/lib/api";

export type AuthUser = {
  user_id: string;
  full_name: string;
  username: string;
  email?: string | null;
  role_id?: string | null;
  role_name?: string | null;
  must_change_password?: boolean;
};

export type AuthLocation = {
  location_id: string;
  name: string;
  code: string | null;
  type: string;
  address: string | null;
  active: boolean;
};

export type AuthLocationAssignment = {
  location_id: string;
  is_default: boolean;
  location: AuthLocation;
};

type UserLocationsPayload = {
  user: {
    user_id: string;
    full_name: string;
    username?: string;
    email?: string | null;
    role_id?: string | null;
    active: boolean;
  };
  default_location_id: string | null;
  assignments: AuthLocationAssignment[];
};

type UserLocationsResponse = {
  ok: boolean;
  data: UserLocationsPayload;
};

type AuthState = {
  user: AuthUser | null;
  permissions: string[];
  loading: boolean;
  authMessage: string | null;
  sessionExpired: boolean;
  locationsLoading: boolean;
  locationsError: string | null;
  locationAssignments: AuthLocationAssignment[];
  defaultLocation: AuthLocation | null;
};

type AuthContextValue = AuthState & {
  refresh: () => Promise<void>;
  refreshLocations: () => Promise<void>;
  login: (input: { username: string; password: string }) => Promise<void>;
  changePassword: (input: { current_password: string; new_password: string }) => Promise<void>;
  logout: () => Promise<void>;
  setDefaultLocation: (locationId: string) => Promise<void>;
  clearAuthNotice: () => void;
  has: (permissionKey: string) => boolean;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

function buildLocationState(payload: UserLocationsPayload | null) {
  const assignments = payload?.assignments || [];
  const defaultLocation =
    assignments.find((assignment) => assignment.is_default)?.location ||
    assignments.find((assignment) => assignment.location_id === payload?.default_location_id)?.location ||
    null;

  return {
    locationAssignments: assignments,
    defaultLocation,
  };
}

function formatLocationsError(error: unknown) {
  const message = error instanceof Error ? error.message : "No se pudo cargar sedes";

  if (message === "Not authenticated") {
    return "No se pudo validar la sesion para cargar sedes. Reingresa y usa el mismo host en frontend y backend (localhost o 127.0.0.1).";
  }

  return message;
}

function buildSignedOutState(overrides: Partial<AuthState> = {}): AuthState {
  return {
    user: null,
    permissions: [],
    loading: false,
    authMessage: null,
    sessionExpired: false,
    locationsLoading: false,
    locationsError: null,
    locationAssignments: [],
    defaultLocation: null,
    ...overrides,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    user: null,
    permissions: [],
    loading: true,
    authMessage: null,
    sessionExpired: false,
    locationsLoading: false,
    locationsError: null,
    locationAssignments: [],
    defaultLocation: null,
  });

  React.useEffect(() => {
    function handleAuthError() {
      setState((current) =>
        buildSignedOutState({
          authMessage: current.user
            ? "Tu sesión expiró. Vuelve a iniciar sesión para continuar."
            : null,
          sessionExpired: Boolean(current.user),
        })
      );
    }

    window.addEventListener(AUTH_ERROR_EVENT, handleAuthError);
    return () => {
      window.removeEventListener(AUTH_ERROR_EVENT, handleAuthError);
    };
  }, []);

  const fetchLocations = React.useCallback(async (userId: string) => {
    setState((current) => ({ ...current, locationsLoading: true, locationsError: null }));

    try {
      const response = await apiFetch<UserLocationsResponse | UserLocationsPayload>(
        `/api/users/${userId}/locations`
      );
      const payload = unwrapApiData(response);
      const locationState = buildLocationState(payload);

      setState((current) => ({
        ...current,
        ...locationState,
        locationsLoading: false,
        locationsError: null,
      }));
    } catch (error) {
      console.warn("Failed to load user locations", error);
      const isAuthError =
        (error instanceof ApiError && error.status === 401) ||
        (error instanceof Error && error.message.includes("Not authenticated"));

      setState((current) => ({
        ...current,
        locationsLoading: false,
        locationsError: formatLocationsError(error),
        locationAssignments: [],
        defaultLocation: null,
        ...(isAuthError ? { user: null, sessionExpired: true } : {}),
      }));
    }
  }, []);

  const refresh = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await apiFetch<{ user: AuthUser; permissions: string[] }>("/api/auth/me", {
        suppressAuthEvent: true,
      });
      setState((current) => ({
        ...current,
        user: data.user,
        permissions: data.permissions || [],
        loading: false,
        authMessage: null,
        sessionExpired: false,
      }));
      if (data.user.must_change_password) {
        setState((current) => ({
          ...current,
          locationsLoading: false,
          locationsError: null,
          locationAssignments: [],
          defaultLocation: null,
        }));
      } else {
        await fetchLocations(data.user.user_id);
      }
    } catch (error) {
      const isUnauthorized = error instanceof ApiError && error.status === 401;
      setState(
        buildSignedOutState({
          loading: false,
          authMessage: isUnauthorized ? null : "No se pudo validar la sesión actual.",
          sessionExpired: false,
        })
      );
    }
  }, [fetchLocations]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const login = React.useCallback(
    async (input: { username: string; password: string }) => {
      setState((s) => ({ ...s, loading: true }));
      try {
        const data = await apiFetch<{ user: AuthUser; permissions: string[] }>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify(input),
        });
        setState((current) => ({
          ...current,
          user: data.user,
          permissions: data.permissions || [],
          loading: false,
          authMessage: null,
          sessionExpired: false,
        }));
        if (data.user.must_change_password) {
          setState((current) => ({
            ...current,
            locationsLoading: false,
            locationsError: null,
            locationAssignments: [],
            defaultLocation: null,
          }));
        } else {
          await fetchLocations(data.user.user_id);
        }
      } catch (error) {
        setState((current) => ({ ...current, loading: false }));
        throw error;
      }
    },
    [fetchLocations]
  );

  const changePassword = React.useCallback(
    async (input: { current_password: string; new_password: string }) => {
      const data = await apiFetch<{ user: AuthUser; permissions: string[] }>(
        "/api/auth/change-password",
        {
          method: "POST",
          body: JSON.stringify(input),
        }
      );

      setState((current) => ({
        ...current,
        user: data.user,
        permissions: data.permissions || [],
        authMessage: null,
        sessionExpired: false,
      }));
      await fetchLocations(data.user.user_id);
    },
    [fetchLocations]
  );

  const logout = React.useCallback(async () => {
    try {
      await apiFetch<void>("/api/auth/logout", {
        method: "POST",
        suppressAuthEvent: true,
      });
    } finally {
      setState(buildSignedOutState());
    }
  }, []);

  const clearAuthNotice = React.useCallback(() => {
    setState((current) => ({
      ...current,
      authMessage: null,
      sessionExpired: false,
    }));
  }, []);

  const refreshLocations = React.useCallback(async () => {
    if (!state.user?.user_id) {
      setState((current) => ({
        ...current,
        locationsLoading: false,
        locationsError: null,
        locationAssignments: [],
        defaultLocation: null,
      }));
      return;
    }

    await fetchLocations(state.user.user_id);
  }, [fetchLocations, state.user?.user_id]);

  const setDefaultLocation = React.useCallback(
    async (locationId: string) => {
      const userId = state.user?.user_id;
      const assignmentExists = state.locationAssignments.some(
        (assignment) => assignment.location_id === locationId
      );

      if (!userId) {
        throw new Error("No hay sesión activa");
      }

      if (!assignmentExists) {
        throw new Error("La sede seleccionada no pertenece al usuario");
      }

      const response = await apiFetch<UserLocationsResponse | UserLocationsPayload>(
        `/api/users/${userId}/locations`,
        {
          method: "PUT",
          body: JSON.stringify({
            assignments: state.locationAssignments.map((assignment) => ({
              location_id: assignment.location_id,
              is_default: assignment.location_id === locationId,
            })),
          }),
        }
      );

      const payload = unwrapApiData(response);
      const locationState = buildLocationState(payload);
      setState((current) => ({
        ...current,
        ...locationState,
        locationsError: null,
      }));
    },
    [state.locationAssignments, state.user?.user_id]
  );

  const has = React.useCallback(
    (permissionKey: string) => state.permissions.includes(permissionKey) || state.permissions.includes("admin.manage"),
    [state.permissions]
  );

  const value: AuthContextValue = React.useMemo(
    () => ({
      ...state,
      refresh,
      refreshLocations,
      login,
      changePassword,
      logout,
      setDefaultLocation,
      clearAuthNotice,
      has,
    }),
    [
      state,
      refresh,
      refreshLocations,
      login,
      changePassword,
      logout,
      setDefaultLocation,
      clearAuthNotice,
      has,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
