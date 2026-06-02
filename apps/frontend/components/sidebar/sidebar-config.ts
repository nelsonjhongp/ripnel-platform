import type * as React from "react";
import {
  ArrowRightLeft,
  Banknote,
  Boxes,
  RotateCcw,
  Settings,
  Settings2,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Users,
  Warehouse,
} from "lucide-react";

import {
  catalogPageDefinitions,
  getCatalogRoute,
  productMasterLinks,
  productMasterSummaryLink,
} from "@/lib/product-master-metadata";
import {
  appRoutes,
} from "@/lib/routes";

export type SidebarItem = {
  title: string;
  url: string;
  icon?: React.ComponentType<{ className?: string }>;
  permission?: string;
  onlyForRoles?: string[];
  excludeRoles?: string[];
};

export type SidebarGroup = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  directLink?: boolean;
  onlyForRoles?: string[];
  excludeRoles?: string[];
  items: SidebarItem[];
};

export type SidebarSection = {
  label: string;
  groups: SidebarGroup[];
};

export const SELLER_FOCUSED_ROLES = ["TIENDA", "VENTAS"];

const ventasGroup: SidebarGroup = {
  title: "Ventas",
  icon: ShoppingCart,
  permission: "sales.pos",
  items: [
    { title: "Nueva venta", url: appRoutes.purchaseSystem },
    { title: "Historial de ventas", url: appRoutes.transactionHistory },
  ],
};

const postventaGroup: SidebarGroup = {
  title: "Postventa",
  icon: RotateCcw,
  permission: "sales.postsale.view",
  directLink: true,
  items: [{ title: "Postventa", url: appRoutes.postsales }],
};

const cajaGroup: SidebarGroup = {
  title: "Caja",
  icon: Banknote,
  items: [
    { title: "Caja del día", url: appRoutes.cash },
    { title: "Historial de caja", url: `${appRoutes.cash}/historial` },
    { title: "Control de cajas", url: `${appRoutes.cash}/control` },
  ],
};

const clientesGroup: SidebarGroup = {
  title: "Clientes",
  icon: Users,
  onlyForRoles: ["ADMIN", "TIENDA", "CAJA", "VENTAS"],
  items: [
    { title: "Clientes", url: appRoutes.customers },
    { title: "Nuevo cliente", url: `${appRoutes.customers}/nuevo` },
  ],
};

const stockGroup: SidebarGroup = {
  title: "Stock",
  icon: Boxes,
  items: [
    {
      title: "Stock actual",
      url: appRoutes.inventory,
      permission: "inventory.view",
    },
    {
      title: "Movimientos de stock",
      url: appRoutes.inventoryMovements,
      permission: "inventory.view",
    },
    {
      title: "Ajustes de inventario",
      url: appRoutes.inventoryAdjustments,
      permission: "inventory.view",
      onlyForRoles: ["ADMIN", "ALMACEN"],
    },
  ],
};

const transferenciasGroup: SidebarGroup = {
  title: "Transferencias",
  icon: ArrowRightLeft,
  items: [
    {
      title: "Solicitar transferencia",
      url: appRoutes.transferRequest,
      icon: ArrowRightLeft,
    },
    {
      title: "Transferencias",
      url: appRoutes.transfers,
      icon: ArrowRightLeft,
    },
    {
      title: "Recepciones pendientes",
      url: appRoutes.transferPendingReceipts,
      icon: ArrowRightLeft,
    },
    {
      title: "Historial de transferencias",
      url: appRoutes.transferHistory,
      icon: ArrowRightLeft,
    },
  ],
};

const catalogosGroup: SidebarGroup = {
  title: "Catálogos",
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
};

const productosGroup: SidebarGroup = {
  title: "Productos",
  icon: ShoppingBag,
  permission: "products.manage",
  excludeRoles: SELLER_FOCUSED_ROLES,
  items: productMasterLinks.map((link) => ({
    title: link.label,
    url: link.href,
    icon: link.icon,
  })),
};

const preciosGroup: SidebarGroup = {
  title: "Precios",
  icon: Tag,
  permission: "prices.manage",
  excludeRoles: SELLER_FOCUSED_ROLES,
  items: [
    { title: "Listado de precios", url: appRoutes.prices, icon: Tag },
    { title: "Reglas", url: `${appRoutes.prices}/reglas`, icon: Settings2 },
  ],
};

const administracionGroup: SidebarGroup = {
  title: "Administración",
  icon: Settings,
  permission: "admin.manage",
  items: [
    { title: "Usuarios", url: appRoutes.administrationUsers },
    { title: "Roles", url: appRoutes.administrationRoles },
    { title: "Ubicaciones", url: appRoutes.administrationLocations },
  ],
};

export const sidebarSections: SidebarSection[] = [
  {
    label: "Operaciones",
    groups: [ventasGroup, postventaGroup, cajaGroup, clientesGroup],
  },
  {
    label: "Inventario",
    groups: [
      stockGroup,
      transferenciasGroup,
      catalogosGroup,
      productosGroup,
      preciosGroup,
    ],
  },
  {
    label: "Sistema",
    groups: [administracionGroup],
  },
];

