"use client";

import { ForbiddenPage } from "@/components/feedback/status-page";
import { useAuth } from "./AuthProvider";

export function PermissionGuard({
  permission,
  anyPermissions,
  allowedRoles,
  children,
}: {
  permission?: string;
  anyPermissions?: string[];
  allowedRoles?: string[];
  children: React.ReactNode;
}) {
  const { loading, has, user } = useAuth();

  if (loading) {
    return null;
  }

  const permissionAllowed = permission ? has(permission) : true;
  const anyPermissionAllowed =
    !anyPermissions ||
    anyPermissions.length === 0 ||
    anyPermissions.some((permissionKey) => has(permissionKey));
  const roleAllowed =
    !allowedRoles ||
    allowedRoles.length === 0 ||
    allowedRoles.includes(String(user?.role_name || ""));

  if (!permissionAllowed || !anyPermissionAllowed || !roleAllowed) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
