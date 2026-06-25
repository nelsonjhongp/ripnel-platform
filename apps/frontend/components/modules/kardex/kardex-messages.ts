export const KARDEX = {
  header: {
    eyebrow: "Kardex",
    title: "Movimientos de stock",
  },

  metrics: {
    entries: "Entradas",
    exits: "Salidas",
    adjustments: "Ajustes",
    transfers: "Transferencias",
  },

  filters: {
    searchPlaceholder: "Buscar por SKU, producto, sede, origen o referencia",
    searchAria: "Buscar movimientos de stock",
    location: "Sede",
    locationAll: "Todas",
    operation: "Operacion",
    operationAll: "Todos",
    operationIn: "Entradas",
    operationOut: "Salidas",
    operationAdjust: "Ajustes",
    operationTransfer: "Por transferencia",
    origin: "Origen",
    originAll: "Todos",
    originSale: "Venta",
    originTransfer: "Transferencia",
    originExchange: "Cambio",
    originAdjustment: "Ajuste",
    originOpening: "Apertura",
    dateFrom: "Desde",
    dateTo: "Hasta",
    clear: "Limpiar filtros",
    clearAria: "Limpiar filtros",
  },

  columns: {
    date: "Fecha",
    sku: "SKU",
    product: "Producto",
    origin: "Origen",
    reference: "Ref.",
    type: "Tipo",
    quantity: "Cantidad",
    location: "Ubicacion",
    user: "Usuario",
  },

  table: {
    loading: "Cargando movimientos...",
    errorTitle: "No pudimos cargar movimientos",
    emptyNoData: "No hay movimientos de stock registrados.",
    emptyNoResults: "No se encontraron movimientos con los filtros actuales.",
    footerZero: "0 resultados",
    footerSummary: (first: number, last: number, total: number) =>
      `${first}-${last} de ${total}`,
  },

  actions: {
    exportCsv: "Exportar CSV",
    refresh: "Actualizar",
  },

  fallback: {
    systemUser: "Sistema",
  },

  locationBadge: {
    loading: "Cargando sede...",
    noLocation: "Sin sede asignada",
  },

  csv: {
    filename: "kardex",
    headers: [
      "SKU",
      "Producto",
      "Sede",
      "Tipo",
      "Cantidad",
      "Efecto",
      "Saldo",
      "Origen",
      "Referencia",
      "Usuario",
      "Fecha",
    ],
  },

  labels: {
    operation: {
      transfer_shipped: "Salida por transferencia",
      transfer_received: "Entrada por transferencia",
      sale_confirmed: "Salida por venta",
      sale_cancelled: "Entrada por anulacion",
      exchange_received: "Entrada por cambio",
      exchange_delivered: "Salida por cambio",
      opening_confirmed: "Apertura inicial",
      adjustment_confirmed: "Ajuste",
      fallback_entry: "Entrada",
      fallback_exit: "Salida",
      fallback_adjust: "Ajuste",
    } as Record<string, string>,

    origin: {
      transfer_shipped: "Transferencia despachada",
      transfer_received: "Transferencia recibida",
      sale_confirmed: "Venta confirmada",
      sale_cancelled: "Venta anulada",
      exchange_received: "Cambio recibido",
      exchange_delivered: "Cambio entregado",
      opening_confirmed: "Apertura inicial",
      adjustment_confirmed: "Ajuste de inventario",
      fallback: "Movimiento sin documento",
    } as Record<string, string>,

    reference: {
      sale: "Venta",
      transfer: "Transferencia",
      exchange: "Postventa",
      adjustment: "Ajuste",
      opening: "Apertura",
      fallback: "Sin referencia",
    } as Record<string, string>,
  },
} as const;
