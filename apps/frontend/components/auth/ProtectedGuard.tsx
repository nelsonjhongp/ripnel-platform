"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

export function ProtectedGuard({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace(`/?next=${encodeURIComponent(pathname || "/")}`);
    }
  }, [loading, user, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc]">
        <div className="text-sm font-semibold text-slate-600">Cargando sesión…</div>
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}

