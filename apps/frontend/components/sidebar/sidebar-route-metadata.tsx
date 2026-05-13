import type { ReactNode } from "react"
import { ShoppingCart } from "lucide-react"
import { resolveProductMasterRouteTitle } from "@/lib/product-master-metadata"
import { appRoutes, buildTransferModuleRoute, transferRouteSlugs } from "@/lib/routes"

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
  [appRoutes.dashboard]: "Dashboard operativo",
  [appRoutes.businessIntelligence]: "BI y analitica",
  [appRoutes.administrationUsers]: "Usuarios",
  [appRoutes.administrationRoles]: "Roles",
  [appRoutes.administrationLocations]: "Ubicaciones",
  [appRoutes.inventory]: "Inventario",
  [appRoutes.kardex]: "Movimientos de stock",
  [appRoutes.purchaseSystem]: "Nueva venta",
  [appRoutes.transactionHistory]: "Historial de ventas",
  [appRoutes.postsales]: "Postventa",
  [buildTransferModuleRoute(transferRouteSlugs.list)]: "Transferencias",
  [buildTransferModuleRoute(transferRouteSlugs.requestProducts)]: "Solicitar productos",
  [buildTransferModuleRoute(transferRouteSlugs.pendingReceipts)]: "Recepciones pendientes",
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

export function resolveSidebarDefaultActions(hasPermission: (permission: string) => boolean): TopbarAction[] {
  const actions: TopbarAction[] = []

  if (hasPermission("sales.pos")) {
    actions.push({
      key: "quick-sale",
      label: "Venta rapida",
      href: appRoutes.purchaseSystem,
      icon: <ShoppingCart className="h-4 w-4" />,
      variant: "accent",
    })
  }

  return actions
}
