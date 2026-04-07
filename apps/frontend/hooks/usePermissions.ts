/**
 * Hook personalizado para verificar permisos de usuario
 * Facilita la lógica de control de acceso en componentes específicos
 */

import { useAuth } from "@/components/auth/AuthProvider"

interface RolePermissionMap {
  [key: string]: string[]
}

// Mapa de permisos por rol según la matriz de negocio
const ROLE_PERMISSIONS_MAP: RolePermissionMap = {
  ADMIN: [
    "admin.manage",
    "catalogs.manage",
    "products.manage",
    "prices.manage",
    "transfers.manage",
    "sales.pos",
    "inventory.view",
  ],
  TIENDA: [
    "catalogs.manage",
    "products.manage",
    "prices.manage",
    "sales.pos",
    "inventory.view",
  ],
  CAJA: ["sales.pos"],
  VENTAS: ["sales.pos", "products.manage", "prices.manage"],
  ALMACEN: ["transfers.manage", "inventory.view"],
}

export function usePermissions() {
  const { user, permissions } = useAuth()

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  const hasPermission = (permission: string): boolean => {
    // ADMIN siempre tiene todos los permisos
    if (permissions.includes("admin.manage")) return true
    return permissions.includes(permission)
  }

  /**
   * Verifica si el usuario tiene al menos uno de los permisos especificados
   */
  const hasAnyPermission = (perms: string[]): boolean => {
    if (!perms || perms.length === 0) return true
    if (permissions.includes("admin.manage")) return true
    return perms.some((perm) => permissions.includes(perm))
  }

  /**
   * Verifica si el usuario tiene todos los permisos especificados
   */
  const hasAllPermissions = (perms: string[]): boolean => {
    if (!perms || perms.length === 0) return true
    if (permissions.includes("admin.manage")) return true
    return perms.every((perm) => permissions.includes(perm))
  }

  /**
   * Verifica si el usuario pertenece a un rol específico
   */
  const hasRole = (role: string): boolean => {
    return user?.role_name === role
  }

  /**
   * Verifica si el usuario pertenece a alguno de los roles especificados
   */
  const hasAnyRole = (roles: string[]): boolean => {
    if (!roles || roles.length === 0) return true
    return roles.includes(user?.role_name || "")
  }

  /**
   * Obtiene todos los permisos del usuario actual
   */
  const getUserPermissions = (): string[] => {
    return permissions
  }

  /**
   * Obtiene el rol actual del usuario
   */
  const getUserRole = (): string | undefined => {
    return user?.role_name
  }

  /**
   * Verifica si el usuario puede acceder a la venta rápida
   * Solo CAJA y ADMIN pueden acceder
   */
  const canAccessQuickSale = (): boolean => {
    return hasAnyRole(["CAJA", "ADMIN"])
  }

  /**
   * Verifica si el usuario puede acceder a administración
   * Solo ADMIN puede acceder
   */
  const canAccessAdministration = (): boolean => {
    return hasRole("ADMIN")
  }

  /**
   * Verifica si el usuario puede acceder a catálogos
   * ADMIN, TIENDA, VENTAS pueden acceder
   */
  const canAccessCatalogs = (): boolean => {
    return hasAnyRole(["ADMIN", "TIENDA", "VENTAS"])
  }

  /**
   * Verifica si el usuario puede acceder a transferencias
   * Solo ALMACEN y ADMIN pueden acceder
   */
  const canAccessTransfers = (): boolean => {
    return hasAnyRole(["ALMACEN", "ADMIN"])
  }

  /**
   * Verifica si el usuario puede acceder a inventario
   * ALMACEN, TIENDA y ADMIN pueden acceder
   */
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
