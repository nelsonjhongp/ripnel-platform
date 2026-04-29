function hasPermission(permissions: string[], permissionKey: string) {
  return permissions.includes("admin.manage") || permissions.includes(permissionKey)
}

function normalizeRoleName(roleName?: string | null) {
  return String(roleName || "").trim().toUpperCase()
}

export function resolveTransferCapabilities({
  permissions,
  roleName,
}: {
  permissions: string[]
  roleName?: string | null
}) {
  const normalizedRoleName = normalizeRoleName(roleName)
  const manage = hasPermission(permissions, "transfers.manage")

  const requestCreate =
    manage ||
    hasPermission(permissions, "transfers.request.create") ||
    ["TIENDA", "VENTAS"].includes(normalizedRoleName)

  const requestViewOwn =
    manage ||
    hasPermission(permissions, "transfers.request.view_own") ||
    requestCreate

  const ship =
    manage ||
    hasPermission(permissions, "transfers.ship") ||
    ["ALMACEN", "TIENDA"].includes(normalizedRoleName)

  const receive =
    manage ||
    hasPermission(permissions, "transfers.receive") ||
    ["ALMACEN", "TIENDA"].includes(normalizedRoleName)

  return {
    manage,
    requestCreate,
    requestViewOwn,
    ship,
    receive,
    visible: manage || requestCreate || requestViewOwn || ship || receive,
  }
}
