"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AppSidebar } from "./AppSidebar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/AuthProvider"
import { TopbarNotifications } from "@/components/notifications"
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

function areTopbarActionsEqual(left: TopbarAction[], right: TopbarAction[]) {
  if (left === right) return true
  if (left.length !== right.length) return false

  for (let index = 0; index < left.length; index += 1) {
    const leftAction = left[index]
    const rightAction = right[index]

    if (
      leftAction.key !== rightAction.key ||
      leftAction.label !== rightAction.label ||
      leftAction.href !== rightAction.href ||
      leftAction.variant !== rightAction.variant ||
      leftAction.icon !== rightAction.icon
    ) {
      return false
    }
  }

  return true
}

export function useSidebarTopbarActions(actions: TopbarAction[]) {
  const context = React.useContext(SidebarTopbarActionsContext)

  React.useEffect(() => {
    if (!context) return

    context.setActions((currentActions) => {
      if (areTopbarActionsEqual(currentActions, actions)) {
        return currentActions
      }

      return actions
    })
  }, [actions, context])

  React.useEffect(() => {
    if (!context) return

    return () => {
      context.setActions((currentActions) => {
        if (currentActions.length === 0) {
          return currentActions
        }

        return []
      })
    }
  }, [context])
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
    return resolveSidebarDefaultActions(pathname, has)
  }, [has, pathname])

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

  const topbarActionsContext = React.useMemo(
    () => ({ setActions: setContextualActions }),
    [setContextualActions]
  )

  return (
    <SidebarTopbarActionsContext.Provider value={topbarActionsContext}>
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

          <div className="flex items-center justify-end gap-2">
            <TopbarNotifications />
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
          </div>
        </header>

        <main className="flex-1 overflow-auto w-full min-h-screen">{children}</main>
      </AppSidebar>
    </SidebarTopbarActionsContext.Provider>
  )
}

export default SidebarShell
