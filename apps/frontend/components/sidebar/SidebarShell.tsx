"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
import {
  resolveSidebarDefaultActions,
  resolveSidebarRouteTitle,
  type TopbarAction,
} from "./sidebar-route-metadata"

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
    return resolveSidebarRouteTitle(pathname, title)
  }, [pathname, title])

  const defaultActions = React.useMemo(() => {
    return resolveSidebarDefaultActions(has)
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
