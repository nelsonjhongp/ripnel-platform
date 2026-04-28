"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingCart } from "lucide-react"
import { AppSidebar } from "./AppSidebar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/AuthProvider"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

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

  const resolvedTitle = React.useMemo(() => {
    if (title) return title

    const routeTitles: Record<string, string> = {
      "/sidebar": "Panel del usuario",
      "/account": "Perfil",
      "/account/operacion": "Sede operativa",
      "/account/apariencia": "Apariencia",
      "/inicio": "Inicio",
      "/dashboard": "Dashboard operativo",
      "/bi": "BI y analitica",
      "/account-mockup": "Cuenta mockup",
      "/admin-crud": "Gestion de usuarios",
      "/inventory": "Inventario",
      "/kardex": "Kardex",
      "/purchase-system": "Nueva venta",
      "/transaction-history": "Historial de ventas",
      "/postventa": "Postventa",
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

  return (
    <AppSidebar>
      <header className="ops-topbar flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 md:px-5">
        <div className="flex items-center gap-2">
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

        {has("sales.pos") && (
          <Button asChild variant="accent" size="sm" className="rounded-full px-3.5">
            <Link href="/purchase-system">
              <ShoppingCart className="h-4 w-4" />
              Venta rapida
            </Link>
          </Button>
        )}
      </header>

      <main className="flex-1 overflow-auto w-full min-h-screen">{children}</main>
    </AppSidebar>
  )
}

export default SidebarShell
