"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { LoadingPage } from "@/components/feedback/status-page";

export function ProtectedGuard({ children }: { children: React.ReactNode }) {
  const { loading, user, sessionExpired } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!loading && !user) {
      const params = new URLSearchParams({
        next: pathname || "/",
      });

      params.set("reason", sessionExpired ? "session-expired" : "auth-required");
      router.replace(`/?${params.toString()}`);
    }
  }, [loading, user, router, pathname, sessionExpired]);

  if (loading) {
    return <LoadingPage title="Validando sesión" description="Estamos confirmando tu acceso antes de abrir el módulo." />;
  }

  if (!user) return null;
  return <>{children}</>;
}

