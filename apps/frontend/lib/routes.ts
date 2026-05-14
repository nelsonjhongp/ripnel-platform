export const appRoutes = {
  login: "/",
  forbidden: "/forbidden",
  home: "/inicio",
  dashboard: "/panel",
  businessIntelligence: "/panel",
  account: "/cuenta",
  accountSecurity: "/cuenta/seguridad",
  administrationUsers: "/administracion/usuarios",
  administrationRoles: "/administracion/roles",
  administrationLocations: "/administracion/ubicaciones",
  customers: "/clientes",
  catalogs: "/catalogos",
  products: "/productos",
  prices: "/precios",
  inventory: "/inventario",
  inventoryAdjustments: "/inventario/ajustes",
  kardex: "/kardex",
  transfers: "/transferencias",
  purchaseSystem: "/ventas",
  transactionHistory: "/ventas/historial",
  postsales: "/postventa",
  cash: "/caja",
} as const

export const transferRouteSlugs = {
  create: "crear-transferencia",
  list: "listado-de-transferencias",
  pendingReceipts: "recepciones-pendientes",
  requestProducts: "solicitar-productos",
} as const

export const productRouteSlugs = {
  styles: "estilos",
  variants: "variantes",
} as const

export type TransferRouteSlug = (typeof transferRouteSlugs)[keyof typeof transferRouteSlugs]
export type ProductRouteSlug = (typeof productRouteSlugs)[keyof typeof productRouteSlugs]

export function buildCatalogRoute(slug: string) {
  return `${appRoutes.catalogs}/${slug}`
}

export function buildProductModuleRoute(slug: ProductRouteSlug) {
  return `${appRoutes.products}/${slug}`
}

export function buildTransferModuleRoute(slug: TransferRouteSlug) {
  return `${appRoutes.transfers}/${slug}`
}

export function buildSaleDetailRoute(saleId: string) {
  return `${appRoutes.purchaseSystem}/${saleId}`
}
