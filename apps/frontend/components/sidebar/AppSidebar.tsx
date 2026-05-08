"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  ChevronDown,
  CircleUserRound,
  House,
  LayoutDashboard,
  Settings,
  Store,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useAuth } from "@/components/auth/AuthProvider"
import { resolveTransferCapabilities } from "@/lib/capabilities"
import { inventoryIcons, sidebarGroups, type SidebarItem } from "./sidebar-config"

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  active?: boolean
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        className="h-9 gap-2.5 rounded-xl px-2.5 text-sm font-medium data-[active=true]:ring-1 data-[active=true]:ring-sidebar-border/70"
      >
        <Link href={href}>
          {Icon ? <Icon className="h-4 w-4 text-sidebar-foreground/65" /> : <span className="h-4 w-4" />}
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SidebarGroupSection({
  title,
  icon: Icon,
  items,
  directLink,
  pathname,
  roleName,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: SidebarItem[]
  directLink?: boolean
  pathname: string
  roleName?: string | null
}) {
  const visibleItems = items.filter((item) => {
    if (item.onlyForRoles && roleName && !item.onlyForRoles.includes(roleName)) {
      return false
    }

    if (item.excludeRoles && roleName && item.excludeRoles.includes(roleName)) {
      return false
    }

    return true
  })

  if (visibleItems.length === 0) {
    return null
  }

  if (directLink && visibleItems.length === 1) {
    const item = visibleItems[0]
    const isActive = pathname === item.url || pathname.startsWith(`${item.url}/`)

    return (
      <SidebarGroup className="p-0">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarLink href={item.url} label={title} icon={Icon} active={isActive} />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  const isActive = visibleItems.some(
    (item) => pathname === item.url || pathname.startsWith(`${item.url}/`)
  )

  return (
    <SidebarGroup className="p-0">
      <Collapsible defaultOpen={isActive} className="group">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton className="h-9 gap-2.5 rounded-xl px-2.5 text-sm font-medium">
                  <Icon className="h-4 w-4 text-sidebar-foreground/65" />
                  <span>{title}</span>
                  <ChevronDown className="ml-auto h-4 w-4 text-sidebar-foreground/55 transition group-data-[state=open]:rotate-180" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
            </SidebarMenuItem>
          </SidebarMenu>
          <CollapsibleContent className="pt-1">
            <SidebarMenu className="gap-0.5 pl-5">
              {visibleItems.map((item) => {
                const IconComponent =
                  item.icon ||
                  (title === "Inventario"
                    ? inventoryIcons[item.title as keyof typeof inventoryIcons]
                    : undefined)

                return (
                  <SidebarLink
                    key={item.url}
                    href={item.url}
                    label={item.title}
                    icon={IconComponent}
                    active={pathname === item.url || pathname.startsWith(`${item.url}/`)}
                  />
                )
              })}
            </SidebarMenu>
          </CollapsibleContent>
        </SidebarGroupContent>
      </Collapsible>
    </SidebarGroup>
  )
}

export function AppSidebar({
  children,
  ...props
}: React.PropsWithChildren<React.ComponentProps<typeof Sidebar>>) {
  const pathname = usePathname()
  const router = useRouter()
  const {
    user,
    permissions,
    loading,
    locationsLoading,
    locationsError,
    defaultLocation,
    has,
    logout,
  } = useAuth()

  const transferCapabilities = React.useMemo(
    () => resolveTransferCapabilities({ permissions, roleName: user?.role_name }),
    [permissions, user?.role_name]
  )

  const visibleGroups = React.useMemo(() => {
    if (loading) return []

    return sidebarGroups
      .map((group) => {
        const items = group.items.filter((item) => {
          if (group.title === "Transferencias") {
            if (item.url.endsWith("/crear-transferencia")) {
              return transferCapabilities.requestCreate
            }

            if (item.url.endsWith("/listado-de-transferencias")) {
              return transferCapabilities.visible
            }

            if (item.url.endsWith("/recepciones-pendientes")) {
              return transferCapabilities.receive
            }
          }

          if (item.onlyForRoles && user?.role_name && !item.onlyForRoles.includes(user.role_name)) {
            return false
          }

          if (item.excludeRoles && user?.role_name && item.excludeRoles.includes(user.role_name)) {
            return false
          }

          return true
        })

        return {
          ...group,
          items,
        }
      })
      .filter((group) => {
        if (group.permission && !has(group.permission)) return false

        if (group.onlyForRoles && user?.role_name && !group.onlyForRoles.includes(user.role_name)) {
          return false
        }

        if (group.excludeRoles && user?.role_name && group.excludeRoles.includes(user.role_name)) {
          return false
        }

        return group.items.length > 0
      })
  }, [loading, has, transferCapabilities, user?.role_name])

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      router.push("/")
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-1 bg-background">
      <Sidebar
        variant="sidebar"
        className="border-sidebar-border bg-sidebar text-sidebar-foreground"
        style={
          {
            "--sidebar": "var(--theme-sidebar-bg)",
            "--sidebar-foreground": "var(--theme-sidebar-fg)",
            "--sidebar-primary": "var(--theme-sidebar-primary)",
            "--sidebar-primary-foreground": "var(--theme-sidebar-primary-fg)",
            "--sidebar-accent": "var(--theme-sidebar-accent)",
            "--sidebar-accent-foreground": "var(--theme-sidebar-accent-fg)",
            "--sidebar-border": "var(--theme-sidebar-border)",
            "--sidebar-ring": "var(--theme-sidebar-ring)",
          } as React.CSSProperties
        }
        {...props}
      >
        <SidebarHeader className="border-b border-sidebar-border px-3 pb-3 pt-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full ring-1 ring-sidebar-border">
              <Image
                src="/ripnel-logo.svg"
                alt="Ripnel"
                width={40}
                height={40}
                className="h-10 w-10 object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold leading-5 text-sidebar-foreground">
                Creaciones Ripnel
              </p>
              <p className="text-xs text-sidebar-foreground/65">Sistema ERP</p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl bg-sidebar-accent/70 px-2.5 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Store className="h-4 w-4 shrink-0 text-sidebar-foreground/65" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-sidebar-foreground">
                    {locationsLoading
                      ? "Cargando sede..."
                      : locationsError
                        ? "Sede no disponible"
                        : defaultLocation?.name || "Sin sede asignada"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push("/account")}
                className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-sidebar-foreground/65 transition hover:bg-background/70 hover:text-sidebar-foreground"
                aria-label="Gestionar sede"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 py-3">
          <nav className="space-y-3">
            <SidebarGroup className="p-0">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarLink href="/inicio" label="Inicio" icon={House} active={pathname === "/inicio"} />
                  <SidebarLink
                    href="/dashboard"
                    label="Dashboard"
                    icon={LayoutDashboard}
                    active={pathname === "/dashboard"}
                  />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <div className="mx-2 h-px bg-sidebar-border/80" />

            {visibleGroups.map((group) => (
              <SidebarGroupSection
                key={group.title}
                title={group.title}
                icon={group.icon}
                items={group.items}
                directLink={group.directLink}
                pathname={pathname}
                roleName={user?.role_name}
              />
            ))}
          </nav>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border bg-sidebar px-2 pb-3 pt-2.5">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="h-11 rounded-2xl px-2.5">
                <Link href="/account">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-foreground">
                    <CircleUserRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-sidebar-foreground">
                      {user?.full_name || "Usuario"}
                    </p>
                    <p className="truncate text-xs text-sidebar-foreground/65">{user?.role_name || "Rol"}</p>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleLogout}
                className="h-9 rounded-xl px-2.5 text-sm font-medium text-red-600 hover:bg-red-50/90 hover:text-red-700"
              >
                <span>Cerrar sesion</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>{children}</SidebarInset>
    </div>
  )
}

export default AppSidebar
