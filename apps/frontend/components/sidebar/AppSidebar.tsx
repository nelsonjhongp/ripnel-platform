"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  ArrowRightLeft,
  ClipboardList,
  ChevronDown,
  ChevronsUpDown,
  CircleUserRound,
  House,
  LogOut,
  Palette,
  ReceiptText,
  Ruler,
  Settings,
  Shirt,
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

const sidebarGroups = [
  {
    title: "Administracion",
    icon: Settings,
    items: [
      { title: "Roles y usuarios", url: "/administracion/roles&usuarios" },
      { title: "Ubicaciones", url: "/administracion/ubicaciones" },
    ],
  },
  {
    title: "Clientes",
    icon: Users,
    items: [
      { title: "Clientes", url: "/clientes" },
      { title: "Dashboards BI", url: "/clientes/dashboards" },
    ],
  },
  {
    title: "Catalogos",
    icon: Warehouse,
    items: [
      { title: "Tallas", url: "/catalogos/tallas" },
      { title: "Colores", url: "/catalogos/colores" },
      { title: "Tipo de prenda", url: "/catalogos/tipo-prenda" },
      { title: "Telas", url: "/catalogos/telas" },
      { title: "Detalle de tela", url: "/catalogos/detalle-de-tela" },
      { title: "Targets", url: "/catalogos/targets" },
    ],
  },
  {
    title: "Productos",
    icon: ShoppingBag,
    items: [
      { title: "Estilos", url: "/productos/estilos" },
      { title: "Variantes", url: "/productos/variantes" },
    ],
  },
  {
    title: "Precios",
    icon: ReceiptText,
    items: [
      { title: "Listado de precios", url: "/precios/listado-de-precios" },
      { title: "Crear y editar precio", url: "/precios/crear-y-editar-precio" },
      { title: "Regla mayorista", url: "/precios/regla-mayorista" },
    ],
  },
  {
    title: "Transferencias",
    icon: ArrowRightLeft,
    items: [
      { title: "Listado de transferencias", url: "/transferencias/listado-de-transferencias" },
      { title: "Crear transferencia", url: "/transferencias/crear-transferencia" },
      { title: "Recepciones pendientes", url: "/transferencias/recepciones-pendientes" },
    ],
  },
  {
    title: "Venta rápida",
    icon: ShoppingCart,
    items: [
      { title: "Nueva venta", url: "/purchase-system" },
      { title: "Historial de ventas", url: "/transaction-history" },
    ],
  },
  {
    title: "Inventario",
    icon: Boxes,
    items: [
      { title: "Stock actual", url: "/inventory" },
      { title: "Apertura y ajustes", url: "/inventory/ajustes" },
      { title: "Kardex", url: "/kardex" },
    ],
  },
]

const catalogIcons = {
  Tallas: Ruler,
  Colores: Palette,
  "Tipo de prenda": Shirt,
  Telas: Shirt,
  "Detalle de tela": Shirt,
}

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
        "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100",
        active && "bg-slate-100 text-slate-950"
      )}
    >
      {Icon ? <Icon className="h-4 w-4 text-slate-500" /> : <span className="h-4 w-4" />}
      <span>{label}</span>
    </Link>
  )
}

function SidebarGroupSection({
  title,
  icon: Icon,
  items,
  pathname,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: { title: string; url: string }[]
  pathname: string
}) {
  const isActive = items.some((item) => pathname === item.url || pathname.startsWith(`${item.url}/`))

  return (
    <Collapsible defaultOpen={isActive} className="group border-t border-slate-200 pt-2.5">
      <div className="rounded-xl px-1">
        <CollapsibleTrigger className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left text-sm font-medium text-slate-900 transition hover:bg-slate-100">
          <Icon className="h-4 w-4 text-slate-500" />
          <span>{title}</span>
          <ChevronDown className="ml-auto h-4 w-4 text-slate-400 transition group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-1">
          <div className="space-y-0.5 pl-2">
            {items.map((item) => {
              const IconComponent =
                title === "Catalogos"
                  ? catalogIcons[item.title as keyof typeof catalogIcons]
                  : title === "Inventario"
                  ? inventoryIcons[item.title as keyof typeof inventoryIcons]
                  : undefined

              return (
                <SidebarLink
                  key={item.url}
                  href={item.url}
                  label={item.title}
                  icon={IconComponent}
                  active={pathname === item.url}
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

  return (
    <div className="min-h-screen flex flex-1 w-full bg-[#f8fafc]">
      <Sidebar
        variant="sidebar"
        className="border-slate-200 bg-white"
        style={
          {
            "--sidebar": "#ffffff",
            "--sidebar-foreground": "#0f172a",
            "--sidebar-primary": "#4f46e5",
            "--sidebar-primary-foreground": "#ffffff",
            "--sidebar-accent": "#f1f5f9",
            "--sidebar-accent-foreground": "#0f172a",
            "--sidebar-border": "#e2e8f0",
            "--sidebar-ring": "#cbd5e1",
          } as React.CSSProperties
        }
        {...props}
      >
        <SidebarHeader className="border-b border-slate-200 px-3 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full ring-1 ring-slate-200">
              <Image
                src="/ripnel-logo.svg"
                alt="Ripnel"
                width={40}
                height={40}
                className="h-10 w-10 object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold leading-5 text-slate-950">Creaciones Ripnel</p>
              <p className="text-xs text-slate-500">Sistema ERP</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-100 px-2.5 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Store className="h-4 w-4 shrink-0 text-slate-500" />
                <p className="truncate text-sm font-semibold text-slate-800">Tienda ripnel</p>
              </div>
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-700"
                aria-label="Cambiar sede"
              >
                <ChevronsUpDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2.5 py-3">
          <nav className="space-y-2">
            <SidebarLink href="/inicio" label="Inicio" icon={House} active={pathname === "/inicio"} />

            {sidebarGroups.map((group) => (
              <SidebarGroupSection
                key={group.title}
                title={group.title}
                icon={group.icon}
                items={group.items}
                pathname={pathname}
              />
            ))}
          </nav>
        </SidebarContent>

        <SidebarFooter className="border-t border-slate-200 bg-white px-2.5 py-3">
          <Link
            href="/account"
            className="flex items-center gap-2.5 rounded-2xl px-2.5 py-2 transition hover:bg-slate-100"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <CircleUserRound className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">Usuario ripnel</p>
              <p className="truncate text-xs text-slate-500">Rol de usuario</p>
            </div>
          </Link>

          <Link
            href="/"
            className="mt-1.5 flex items-center gap-2.5 rounded-2xl px-2.5 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar sesion</span>
          </Link>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>{children}</SidebarInset>
    </div>
  )
}

export default AppSidebar
