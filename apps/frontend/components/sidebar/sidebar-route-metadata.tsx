import type { ReactNode } from "react"
import { ShoppingCart } from "lucide-react"
import { resolveProductMasterRouteTitle } from "@/lib/product-master-metadata"
import { appRoutes } from "@/lib/routes"

export type TopbarAction = {
  key: string
  label: string
  href: string
  icon?: ReactNode
  variant?: "accent" | "outline"
}

const routeTitles: Record<string, string> = {
  "/sidebar": "Panel del usuario",
  [appRoutes.account]: "Perfil",
  [appRoutes.home]: "Inicio",
  [appRoutes.dashboard]: "Dashboard general",
  [appRoutes.administrationUsers]: "Usuarios",
  [appRoutes.administrationRoles]: "Roles",
  [appRoutes.administrationLocations]: "Ubicaciones",
  [appRoutes.inventory]: "Stock actual",
  [appRoutes.inventoryMovements]: "Movimientos de stock",
  [appRoutes.purchaseSystem]: "Nueva venta",
  [appRoutes.transactionHistory]: "Historial de ventas",
  [appRoutes.postsales]: "Postventa",
  [appRoutes.transfers]: "Transferencias",
  [appRoutes.transferRequest]: "Solicitar transferencia",
  [appRoutes.transferPendingReceipts]: "Recepciones pendientes",
  [appRoutes.transferHistory]: "Historial de transferencias",
  [appRoutes.prices]: "Listado de precios",
  [`${appRoutes.prices}/crear`]: "Gestion de precios",
  [`${appRoutes.prices}/reglas`]: "Reglas de precio",
}

export function resolveSidebarRouteTitle(pathname: string, explicitTitle?: string) {
  if (explicitTitle) return explicitTitle

  const masterProductTitle = resolveProductMasterRouteTitle(pathname)
  if (masterProductTitle) {
    return masterProductTitle
  }

  if (routeTitles[pathname]) {
    return routeTitles[pathname]
  }

  const lastSegment = pathname.split("/").filter(Boolean).pop()
  if (!lastSegment) return "Panel del usuario"

  return lastSegment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function resolveSidebarDefaultActions(
  pathname: string,
  hasPermission: (permission: string) => boolean
): TopbarAction[] {
  const actions: TopbarAction[] = []

  if (pathname !== appRoutes.home && hasPermission("sales.pos")) {
    actions.push({
      key: "quick-sale",
      label: "Venta rápida",
      href: appRoutes.purchaseSystem,
      icon: <ShoppingCart className="h-4 w-4" />,
      variant: "accent",
    })
  }

  return actions
}
