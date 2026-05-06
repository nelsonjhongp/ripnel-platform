"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  ArrowRightLeft,
  BarChart3,
  Banknote,
  ClipboardList,
  ChevronDown,
  CircleUserRound,
  House,
  LayoutDashboard,
  ReceiptText,
  RotateCcw,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Boxes,
  Warehouse,
  Users,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth/AuthProvider"
import { resolveTransferCapabilities } from "@/lib/capabilities"
import {
  catalogPageDefinitions,
  getCatalogRoute,
  productMasterLinks,
  productMasterSummaryLink,
} from "@/lib/product-master-metadata"

type SidebarItem = {
  title: string
  url: string
  icon?: React.ComponentType<{ className?: string }>
  onlyForRoles?: string[]
  excludeRoles?: string[]
}

type SidebarGroup = {
  title: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string
  directLink?: boolean
  onlyForRoles?: string[]
  excludeRoles?: string[]
  items: SidebarItem[]
}

const SELLER_FOCUSED_ROLES = ["TIENDA", "VENTAS"]

const sidebarGroups: SidebarGroup[] = [
  {
    title: "Venta",
    icon: ShoppingCart,
    permission: "sales.pos",
    excludeRoles: ["CAJA"],
    items: [
      { title: "Nueva venta", url: "/purchase-system" },
      { title: "Historial de ventas", url: "/transaction-history" },
    ],
  },
  {
    title: "Postventa",
    icon: RotateCcw,
    permission: "sales.postsale.view",
    directLink: true,
    items: [{ title: "Postventa", url: "/postventa" }],
  },
  {
    title: "Caja",
    icon: Banknote,
    onlyForRoles: ["ADMIN", "CAJA"],
    items: [
      { title: "Caja del día", url: "/caja" },
      { title: "Historial de caja", url: "/caja/historial" },
      { title: "Control de cajas", url: "/caja/control", onlyForRoles: ["ADMIN"] },
    ],
  },
  {
    title: "Transferencias",
    icon: ArrowRightLeft,
    excludeRoles: SELLER_FOCUSED_ROLES,
    items: [
      { title: "Solicitar productos", url: "/transferencias/solicitar-productos" },
      { title: "Listado de transferencias", url: "/transferencias/listado-de-transferencias" },
      { title: "Recepciones pendientes", url: "/transferencias/recepciones-pendientes" },
    ],
  },
  {
    title: "Inventario",
    icon: Boxes,
    permission: "inventory.view",
    excludeRoles: SELLER_FOCUSED_ROLES,
    items: [
      { title: "Stock actual", url: "/inventory" },
      { title: "Apertura y ajustes", url: "/inventory/ajustes" },
      { title: "Kardex", url: "/kardex" },
    ],
  },
  {
    title: "Catalogos",
    icon: Warehouse,
    permission: "catalogs.manage",
    excludeRoles: SELLER_FOCUSED_ROLES,
    items: [
      {
        title: productMasterSummaryLink.label,
        url: productMasterSummaryLink.href,
        icon: productMasterSummaryLink.icon,
      },
      ...catalogPageDefinitions.map((definition) => ({
        title: definition.label,
        url: getCatalogRoute(definition.slug),
        icon: definition.icon,
      })),
    ],
  },
  {
    title: "Productos",
    icon: ShoppingBag,
    permission: "products.manage",
    excludeRoles: SELLER_FOCUSED_ROLES,
    items: productMasterLinks.map((link) => ({
      title: link.label,
      url: link.href,
      icon: link.icon,
    })),
  },
  {
    title: "Administracion",
    icon: Settings,
    permission: "admin.manage",
    items: [
      { title: "Usuarios", url: "/administracion/usuarios" },
      { title: "Roles", url: "/administracion/roles" },
      { title: "Ubicaciones", url: "/administracion/ubicaciones" },
    ],
  },
  {
    title: "Clientes",
    icon: Users,
    onlyForRoles: ["ADMIN", "TIENDA", "CAJA", "VENTAS"],
    items: [{ title: "Clientes", url: "/clientes" }],
  },
  {
    title: "BI",
    icon: BarChart3,
    directLink: true,
    excludeRoles: SELLER_FOCUSED_ROLES,
    items: [{ title: "BI", url: "/bi" }],
  },
]

const inventoryIcons = {
  "Stock actual": Warehouse,
  "Apertura y ajustes": ClipboardList,
  Kardex: ClipboardList,
  "Historial de transacciones": ReceiptText,
}

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
    <Link
      href={href}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-sidebar-foreground transition hover:bg-sidebar-accent",
        active && "bg-sidebar-accent text-sidebar-foreground ring-1 ring-sidebar-border/70"
      )}
    >
      {Icon ? <Icon className="h-4 w-4 text-sidebar-foreground/65" /> : <span className="h-4 w-4" />}
      <span>{label}</span>
    </Link>
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
      <div className="border-t border-sidebar-border pt-2.5">
        <SidebarLink href={item.url} label={title} icon={Icon} active={isActive} />
      </div>
    )
  }

  const isActive = visibleItems.some(
    (item) => pathname === item.url || pathname.startsWith(`${item.url}/`)
  )

  return (
    <Collapsible defaultOpen={isActive} className="group border-t border-sidebar-border pt-2.5">
      <div className="rounded-xl px-1">
        <CollapsibleTrigger className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left text-sm font-medium text-sidebar-foreground transition hover:bg-sidebar-accent">
          <Icon className="h-4 w-4 text-sidebar-foreground/65" />
          <span>{title}</span>
          <ChevronDown className="ml-auto h-4 w-4 text-sidebar-foreground/55 transition group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-1">
          <div className="space-y-0.5 pl-2">
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
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
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
        <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
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

          <div className="mt-4 rounded-2xl bg-sidebar-accent px-2.5 py-2">
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

        <SidebarContent className="px-2.5 py-3">
          <nav className="space-y-2">
            <SidebarLink href="/inicio" label="Inicio" icon={House} active={pathname === "/inicio"} />

            <div className="border-t border-sidebar-border pt-2.5">
              <SidebarLink
                href="/dashboard"
                label="Dashboard"
                icon={LayoutDashboard}
                active={pathname === "/dashboard"}
              />
            </div>

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

        <SidebarFooter className="border-t border-sidebar-border bg-sidebar px-2.5 py-3">
          <Link
            href="/account"
            className="flex items-center gap-2.5 rounded-2xl px-2.5 py-2 transition hover:bg-sidebar-accent"
          >
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

          <button
            type="button"
            onClick={handleLogout}
            className="mt-1.5 flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <span>Cerrar sesion</span>
          </button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>{children}</SidebarInset>
    </div>
  )
}

export default AppSidebar
