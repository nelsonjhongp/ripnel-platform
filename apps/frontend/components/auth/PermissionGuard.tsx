"use client";

import { ForbiddenPage } from "@/components/feedback/status-page";
import { useAuth } from "./AuthProvider";

export function PermissionGuard({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const { loading, has } = useAuth();

  if (loading) {
    return null;
  }

  if (!has(permission)) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}