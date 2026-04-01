"use client";

import React from "react";
import { apiFetch } from "@/lib/api";

export type AuthUser = {
  user_id: string;
  full_name: string;
  username: string;
  email?: string | null;
  role_id?: string | null;
  role_name?: string | null;
};

type AuthState = {
  user: AuthUser | null;
  permissions: string[];
  loading: boolean;
};

type AuthContextValue = AuthState & {
  refresh: () => Promise<void>;
  login: (input: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  has: (permissionKey: string) => boolean;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    user: null,
    permissions: [],
    loading: true,
  });

  const refresh = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await apiFetch<{ user: AuthUser; permissions: string[] }>("/api/auth/me");
      setState({ user: data.user, permissions: data.permissions || [], loading: false });
    } catch {
      setState({ user: null, permissions: [], loading: false });
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const login = React.useCallback(
    async (input: { username: string; password: string }) => {
      setState((s) => ({ ...s, loading: true }));
      const data = await apiFetch<{ user: AuthUser; permissions: string[] }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setState({ user: data.user, permissions: data.permissions || [], loading: false });
    },
    []
  );

  const logout = React.useCallback(async () => {
    await apiFetch<void>("/api/auth/logout", { method: "POST" });
    setState({ user: null, permissions: [], loading: false });
  }, []);

  const has = React.useCallback(
    (permissionKey: string) => state.permissions.includes(permissionKey) || state.permissions.includes("admin.manage"),
    [state.permissions]
  );

  const value: AuthContextValue = React.useMemo(
    () => ({
      ...state,
      refresh,
      login,
      logout,
      has,
    }),
    [state, refresh, login, logout, has]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

