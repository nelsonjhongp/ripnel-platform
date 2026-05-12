import type * as React from "react"
import {
  ArrowRightLeft,
  Banknote,
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  ReceiptText,
  RotateCcw,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Users,
  Warehouse,
} from "lucide-react"

import {
  catalogPageDefinitions,
  getCatalogRoute,
  productMasterLinks,
  productMasterSummaryLink,
} from "@/lib/product-master-metadata"

export type SidebarItem = {
  title: string
  url: string
  icon?: React.ComponentType<{ className?: string }>
  onlyForRoles?: string[]
  excludeRoles?: string[]
}

export type SidebarGroup = {
  title: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string
  directLink?: boolean
  onlyForRoles?: string[]
  excludeRoles?: string[]
  items: SidebarItem[]
}

export const SELLER_FOCUSED_ROLES = ["TIENDA", "VENTAS"]

export const sidebarGroups: SidebarGroup[] = [
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

export const inventoryIcons = {
  "Stock actual": Warehouse,
  "Apertura y ajustes": ClipboardList,
  Kardex: ClipboardList,
  "Historial de transacciones": ReceiptText,
  Dashboard: LayoutDashboard,
}
