import type * as React from "react"
import {
  ArrowRightLeft,
  Banknote,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  ReceiptText,
  RotateCcw,
  Settings,
  Settings2,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Users,
  Warehouse,
} from "lucide-react"

import {
  catalogPageDefinitions,
  getCatalogRoute,
  productMasterLinks,
  productMasterSummaryLink,
} from "@/lib/product-master-metadata"
import { appRoutes, buildTransferModuleRoute, transferRouteSlugs } from "@/lib/routes"

export type SidebarItem = {
  title: string
  url: string
  icon?: React.ComponentType<{ className?: string }>
  permission?: string
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
      { title: "Nueva venta", url: appRoutes.purchaseSystem },
      { title: "Historial de ventas", url: appRoutes.transactionHistory },
    ],
  },
  {
    title: "Postventa",
    icon: RotateCcw,
    permission: "sales.postsale.view",
    directLink: true,
    items: [{ title: "Postventa", url: appRoutes.postsales }],
  },
  {
    title: "Caja",
    icon: Banknote,
    onlyForRoles: ["ADMIN", "CAJA"],
    items: [
      { title: "Caja del día", url: appRoutes.cash },
      { title: "Historial de caja", url: `${appRoutes.cash}/historial` },
      { title: "Control de cajas", url: `${appRoutes.cash}/control`, onlyForRoles: ["ADMIN"] },
    ],
  },
  {
    title: "Stock",
    icon: Boxes,
    items: [
      { title: "Stock actual", url: appRoutes.inventory, permission: "inventory.view" },
      { title: "Kardex", url: appRoutes.kardex, permission: "inventory.view" },
      {
        title: "Aperturas y ajustes",
        url: appRoutes.inventoryAdjustments,
        permission: "inventory.view",
        onlyForRoles: ["ADMIN", "ALMACEN"],
      },
    ],
  },
  {
    title: "Transferencias",
    icon: ArrowRightLeft,
    items: [
      {
        title: "Solicitar reposición",
        url: buildTransferModuleRoute(transferRouteSlugs.requestProducts),
        icon: ArrowRightLeft,
      },
      {
        title: "Listado de transferencias",
        url: buildTransferModuleRoute(transferRouteSlugs.list),
        icon: ArrowRightLeft,
      },
      {
        title: "Recepciones pendientes",
        url: buildTransferModuleRoute(transferRouteSlugs.pendingReceipts),
        icon: ArrowRightLeft,
      },
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
      { title: "Usuarios", url: appRoutes.administrationUsers },
      { title: "Roles", url: appRoutes.administrationRoles },
      { title: "Ubicaciones", url: appRoutes.administrationLocations },
    ],
  },
  {
    title: "Clientes",
    icon: Users,
    onlyForRoles: ["ADMIN", "TIENDA", "CAJA", "VENTAS"],
    items: [{ title: "Clientes", url: appRoutes.customers }],
  },
  {
    title: "Precios",
    icon: Tag,
    permission: "prices.manage",
    excludeRoles: SELLER_FOCUSED_ROLES,
    items: [
      { title: "Listado de precios", url: appRoutes.prices, icon: Tag },
      { title: "Reglas", url: `${appRoutes.prices}/reglas`, icon: Settings2 },
    ],
  },

]

export const inventoryIcons = {
  "Stock actual": Warehouse,
  Kardex: ClipboardList,
  "Aperturas y ajustes": ClipboardList,
  "Historial de transacciones": ReceiptText,
  Dashboard: LayoutDashboard,
}
