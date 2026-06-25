export const appRoutes = {
  login: "/",
  forbidden: "/forbidden",
  demo: "/demo",
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
  inventoryMovements: "/inventario/movimientos",
  inventoryAdjustments: "/inventario/ajustes",
  kardex: "/inventario/movimientos",
  transfers: "/transferencias",
  transferRequest: "/transferencias/solicitar",
  transferPendingReceipts: "/transferencias/recepciones",
  transferHistory: "/transferencias/historial",
  purchaseSystem: "/ventas/nueva",
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

export function buildInventoryDetailRoute(styleId: string, locationId?: string | null) {
  const params = new URLSearchParams()

  if (locationId) {
    params.set("location_id", locationId)
  }

  return params.toString()
    ? `${appRoutes.inventory}/${styleId}?${params.toString()}`
    : `${appRoutes.inventory}/${styleId}`
}

export function buildSaleDetailRoute(saleId: string) {
  return `/ventas/${saleId}`
}

export function buildAdjustmentDetailRoute(adjustmentId: string) {
  return `${appRoutes.inventoryAdjustments}/${adjustmentId}`
}
