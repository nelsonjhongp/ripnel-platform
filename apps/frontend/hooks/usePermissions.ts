/**
 * Hook personalizado para verificar permisos de usuario.
 */

import { useAuth } from "@/components/auth/AuthProvider"
import { resolveTransferCapabilities } from "@/lib/capabilities"

export function usePermissions() {
  const { user, permissions } = useAuth()

  const hasPermission = (permission: string): boolean => {
    if (permissions.includes("admin.manage")) return true
    return permissions.includes(permission)
  }

  const hasAnyPermission = (perms: string[]): boolean => {
    if (!perms || perms.length === 0) return true
    if (permissions.includes("admin.manage")) return true
    return perms.some((perm) => permissions.includes(perm))
  }

  const hasAllPermissions = (perms: string[]): boolean => {
    if (!perms || perms.length === 0) return true
    if (permissions.includes("admin.manage")) return true
    return perms.every((perm) => permissions.includes(perm))
  }

  const hasRole = (role: string): boolean => {
    return user?.role_name === role
  }

  const hasAnyRole = (roles: string[]): boolean => {
    if (!roles || roles.length === 0) return true
    return roles.includes(user?.role_name || "")
  }

  const getUserPermissions = (): string[] => {
    return permissions
  }

  const getUserRole = (): string | undefined => {
    return user?.role_name || undefined
  }

  const canAccessQuickSale = (): boolean => {
    return hasPermission("sales.pos")
  }

  const canAccessAdministration = (): boolean => {
    return hasRole("ADMIN")
  }

  const canAccessCatalogs = (): boolean => {
    return hasAnyRole(["ADMIN", "TIENDA", "VENTAS"])
  }

  const canAccessTransfers = (): boolean => {
    return resolveTransferCapabilities({ permissions, roleName: user?.role_name }).visible
  }

  const canAccessInventory = (): boolean => {
    return hasAnyRole(["ALMACEN", "TIENDA", "ADMIN"])
  }

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    getUserPermissions,
    getUserRole,
    canAccessQuickSale,
    canAccessAdministration,
    canAccessCatalogs,
    canAccessTransfers,
    canAccessInventory,
  }
}

export default usePermissions
