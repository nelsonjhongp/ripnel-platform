"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { ProtectedLoadingPage } from "@/components/feedback/status-page";
import { appRoutes } from "@/lib/routes";

export function ProtectedGuard({ children }: { children: React.ReactNode }) {
  const { loading, user, sessionExpired, signedOutIntentional } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const requiresPasswordChange = Boolean(user?.must_change_password);
  const isPasswordChangePage = pathname === appRoutes.accountSecurity;

  React.useEffect(() => {
    if (!loading && !user) {
      if (signedOutIntentional) {
        router.replace(appRoutes.login);
        return;
      }

      const currentSearch = typeof window !== "undefined" ? window.location.search : "";
      const nextPath = `${pathname || "/"}${currentSearch}`;
      const params = new URLSearchParams({
        next: nextPath,
      });

      params.set("reason", sessionExpired ? "session-expired" : "auth-required");
      router.replace(`/?${params.toString()}`);
      return;
    }

    if (!loading && user?.must_change_password && pathname !== appRoutes.accountSecurity) {
      router.replace(appRoutes.accountSecurity);
    }
  }, [loading, user, router, pathname, sessionExpired, signedOutIntentional]);

  if (loading) {
    return <ProtectedLoadingPage title="Validando sesión" description="Estamos confirmando tu acceso antes de abrir el módulo." />;
  }

  if (!user) return null;
  if (requiresPasswordChange && !isPasswordChangePage) return null;
  return <>{children}</>;
}

