"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingCart } from "lucide-react"
import { AppSidebar } from "./AppSidebar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/AuthProvider"
import { resolveProductMasterRouteTitle } from "@/lib/product-master-metadata"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

type TopbarAction = {
  key: string
  label: string
  href: string
  icon?: React.ReactNode
  variant?: "accent" | "outline"
}

const SidebarTopbarActionsContext = React.createContext<{
  setActions: React.Dispatch<React.SetStateAction<TopbarAction[]>>
} | null>(null)

export function useSidebarTopbarActions(actions: TopbarAction[]) {
  const context = React.useContext(SidebarTopbarActionsContext)

  React.useEffect(() => {
    if (!context) return

    context.setActions(actions)

    return () => {
      context.setActions([])
    }
  }, [actions, context])
}

export function SidebarShell({
  children,
  title,
  homeLabel = "Inicio",
  homeUrl = "/inicio",
}: {
  children: React.ReactNode
  title?: string
  homeLabel?: string
  homeUrl?: string
}) {
  const pathname = usePathname()
  const { has } = useAuth()
  const [contextualActions, setContextualActions] = React.useState<TopbarAction[]>([])

  const resolvedTitle = React.useMemo(() => {
    if (title) return title

    const masterProductTitle = resolveProductMasterRouteTitle(pathname)
    if (masterProductTitle) {
      return masterProductTitle
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

    if (routeTitles[pathname]) {
      return routeTitles[pathname]
    }

    const lastSegment = pathname.split("/").filter(Boolean).pop()
    if (!lastSegment) return "Panel del usuario"

    return lastSegment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }, [pathname, title])

  const defaultActions = React.useMemo(() => {
    const actions: TopbarAction[] = []

    if (has("sales.pos")) {
      actions.push({
        key: "quick-sale",
        label: "Venta rapida",
        href: "/purchase-system",
        icon: <ShoppingCart className="h-4 w-4" />,
        variant: "accent",
      })
    }

    return actions
  }, [has])

  const actions = React.useMemo(() => {
    const merged = [...defaultActions, ...contextualActions]
    const unique = new Map<string, TopbarAction>()

    for (const action of merged) {
      if (!unique.has(action.key)) {
        unique.set(action.key, action)
      }
    }

    return [...unique.values()]
  }, [contextualActions, defaultActions])

  return (
    <SidebarTopbarActionsContext.Provider value={{ setActions: setContextualActions }}>
      <AppSidebar>
        <header className="ops-topbar flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 md:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href={homeUrl}>{homeLabel}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{resolvedTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {actions.length > 0 ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {actions.map((action) => (
                <Button
                  key={action.key}
                  asChild
                  variant={action.variant || "outline"}
                  size="sm"
                  className="rounded-full px-3.5"
                >
                  <Link href={action.href}>
                    {action.icon}
                    {action.label}
                  </Link>
                </Button>
              ))}
            </div>
          ) : null}
        </header>

        <main className="flex-1 overflow-auto w-full min-h-screen">{children}</main>
      </AppSidebar>
    </SidebarTopbarActionsContext.Provider>
  )
}

export default SidebarShell
