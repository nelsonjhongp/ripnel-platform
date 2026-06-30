"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AppSidebar } from "./AppSidebar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { openCommandPalette } from "@/components/ui/command-palette"
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

export type SidebarBreadcrumbItem = {
  label: string
  href?: string
}

const SidebarTopbarActionsContext = React.createContext<{
  setActions: React.Dispatch<React.SetStateAction<TopbarAction[]>>
} | null>(null)

const SidebarTopbarBreadcrumbsContext = React.createContext<{
  setBreadcrumbs: React.Dispatch<React.SetStateAction<SidebarBreadcrumbItem[]>>
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
    return () => {
      if (!context) return

      context.setActions((currentActions) => {
        if (currentActions.length === 0) {
          return currentActions
        }

        return []
      })
    }
  }, [context])
}

function areBreadcrumbsEqual(left: SidebarBreadcrumbItem[], right: SidebarBreadcrumbItem[]) {
  if (left === right) return true
  if (left.length !== right.length) return false

  for (let index = 0; index < left.length; index += 1) {
    const leftItem = left[index]
    const rightItem = right[index]

    if (leftItem.label !== rightItem.label || leftItem.href !== rightItem.href) {
      return false
    }
  }

  return true
}

export function useSidebarTopbarBreadcrumbs(items: SidebarBreadcrumbItem[]) {
  const context = React.useContext(SidebarTopbarBreadcrumbsContext)

  React.useEffect(() => {
    if (!context) return

    context.setBreadcrumbs((currentItems) => {
      if (areBreadcrumbsEqual(currentItems, items)) {
        return currentItems
      }

      return items
    })
  }, [context, items])

  React.useEffect(() => {
    return () => {
      if (!context) return

      context.setBreadcrumbs((currentItems) => {
        if (currentItems.length === 0) {
          return currentItems
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
  const [contextualBreadcrumbs, setContextualBreadcrumbs] = React.useState<SidebarBreadcrumbItem[]>([])

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

  const topbarActionsContext = React.useMemo(() => ({ setActions: setContextualActions }), [])
  const topbarBreadcrumbsContext = React.useMemo(
    () => ({ setBreadcrumbs: setContextualBreadcrumbs }),
    []
  )
  const breadcrumbs = React.useMemo(() => {
    if (contextualBreadcrumbs.length > 0) {
      return contextualBreadcrumbs
    }

    return [
      { label: homeLabel, href: homeUrl },
      { label: resolvedTitle },
    ] satisfies SidebarBreadcrumbItem[]
  }, [contextualBreadcrumbs, homeLabel, homeUrl, resolvedTitle])

  return (
    <SidebarTopbarActionsContext.Provider value={topbarActionsContext}>
      <SidebarTopbarBreadcrumbsContext.Provider value={topbarBreadcrumbsContext}>
        <AppSidebar>
          <header className="ops-topbar flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 md:px-5">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((item, index) => {
                    const isLast = index === breadcrumbs.length - 1

                    return (
                      <React.Fragment key={`${item.label}-${item.href || index}`}>
                        <BreadcrumbItem>
                          {isLast || !item.href ? (
                            <BreadcrumbPage>{item.label}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                        {!isLast ? <BreadcrumbSeparator /> : null}
                      </React.Fragment>
                    )
                  })}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={openCommandPalette}
                className="h-8 gap-2 rounded-lg px-2.5 text-[var(--ops-text-muted)] hover:text-[var(--ops-text)]"
                aria-label="Buscar pagina"
              >
                <Search className="h-4 w-4" />
                <kbd className="hidden items-center gap-0.5 rounded border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-1 text-[10px] font-semibold text-[var(--ops-text-muted)] sm:inline-flex">
                  Ctrl K
                </kbd>
              </Button>
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

          <main className="flex-1 overflow-auto w-full min-h-dvh">{children}</main>
        </AppSidebar>
      </SidebarTopbarBreadcrumbsContext.Provider>
    </SidebarTopbarActionsContext.Provider>
  )
}

export default SidebarShell
