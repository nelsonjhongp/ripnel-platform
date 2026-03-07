"use client"

import * as React from "react"
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
  title = "Panel del usuario",
  homeLabel = "Inicio",
  homeUrl = "/sidebar",
}: {
  children: React.ReactNode
  title?: string
  homeLabel?: string
  homeUrl?: string
}) {
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
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <main className="flex-1 overflow-auto w-full min-h-screen">{children}</main>
    </AppSidebar>
  )
}

export default SidebarShell
