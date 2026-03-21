"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { AppSidebar } from "./AppSidebar"
import { SidebarTrigger } from "@/components/ui/sidebar"
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
  homeUrl = "/account",
}: {
  children: React.ReactNode
  title?: string
  homeLabel?: string
  homeUrl?: string
}) {
  const pathname = usePathname()

  const resolvedTitle = React.useMemo(() => {
    if (title) return title

    const routeTitles: Record<string, string> = {
      "/sidebar": "Panel del usuario",
      "/account": "Cuenta",
      "/admin-crud": "Gestion de usuarios",
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
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-indigo-100 bg-white px-4">
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
      </header>

      <main className="flex-1 overflow-auto w-full min-h-screen">{children}</main>
    </AppSidebar>
  )
}

export default SidebarShell