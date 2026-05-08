import type { ReactNode } from "react"
import { ShoppingCart } from "lucide-react"
import { resolveProductMasterRouteTitle } from "@/lib/product-master-metadata"

export type TopbarAction = {
  key: string
  label: string
  href: string
  icon?: ReactNode
  variant?: "accent" | "outline"
}

const routeTitles: Record<string, string> = {
  "/sidebar": "Panel del usuario",
  "/account": "Perfil",
  "/inicio": "Inicio",
  "/dashboard": "Dashboard operativo",
  "/bi": "BI y analitica",
  "/account-mockup": "Cuenta mockup",
  "/administracion/usuarios": "Usuarios",
  "/administracion/roles": "Roles",
  "/administracion/ubicaciones": "Ubicaciones",
  "/inventory": "Inventario",
  "/kardex": "Kardex",
  "/purchase-system": "Nueva venta",
  "/transaction-history": "Historial de ventas",
  "/postventa": "Postventa",
  "/transferencias/listado-de-transferencias": "Transferencias",
  "/transferencias/solicitar-productos": "Solicitar productos",
  "/transferencias/recepciones-pendientes": "Recepciones pendientes",
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
      href: "/purchase-system",
      icon: <ShoppingCart className="h-4 w-4" />,
      variant: "accent",
    })
  }

  return actions
}
