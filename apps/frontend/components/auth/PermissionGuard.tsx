"use client";

import { ForbiddenPage } from "@/components/feedback/status-page";
import { useAuth } from "./AuthProvider";

export function PermissionGuard({
  permission,
  allowedRoles,
  children,
}: {
  permission?: string;
  allowedRoles?: string[];
  children: React.ReactNode;
}) {
  const { loading, has, user } = useAuth();

  if (loading) {
    return null;
  }

  const permissionAllowed = permission ? has(permission) : true;
  const roleAllowed =
    !allowedRoles ||
    allowedRoles.length === 0 ||
    allowedRoles.includes(String(user?.role_name || ""));

  if (!permissionAllowed || !roleAllowed) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
