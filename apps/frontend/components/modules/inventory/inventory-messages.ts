export const STOCK = {
  header: {
    eyebrow: "INVENTARIO",
    title: "Stock actual",
  },

  metrics: {
    stockTotal: "Stock total",
    productsWithStock: "Productos con stock",
    lowStock: "Bajo stock",
    outOfStock: "Sin stock",
  },

  filters: {
    searchLabel: "Buscar",
    searchProduct: "Buscar producto",
    location: "Sede",
    status: "Estado",
    garmentType: "Tipo de prenda",
    clear: "Limpiar filtros",
  },

  status: {
    all: "Todos",
    allLocations: "Todas las sedes",
    available: "Disponible",
    incomplete: "Stock incompleto",
    low: "Bajo stock",
    out: "Sin stock",
  },

  columns: {
    product: "Producto",
    type: "Tipo",
    stock: "Stock",
    variants: "Variantes",
    locations: "Sedes",
    status: "Estado",
    action: "Accion",
  },

  actions: {
    viewStock: "Ver stock",
    exportCsv: "Exportar CSV",
    refresh: "Actualizar",
  },

  loading: {
    products: "Cargando stock actual...",
  },

  error: {
    productsTitle: "No pudimos cargar stock actual",
  },

  empty: {
    products: "No encontramos productos para los filtros actuales.",
  },

  footer: {
    scopeProduct: (name: string) => `Stock en sede: ${name}`,
    scopeAll: "Todas las sedes",
    locationsCount: (n: number) => `${n} sedes`,
  },

  csv: {
    productFilename: "stock-por-producto",
    productHeaders: ["Codigo", "Producto", "Tipo", "Stock Total", "Tallas", "Colores", "Sedes", "Estado"],
  },

  locationBadge: {
    loading: "Cargando sede...",
    noLocation: "Sin sede asignada",
    defaultBadge: "Actual",
  },

  fallback: {
    noType: "Sin tipo",
  },

  detail: {
    loading: "Cargando detalle de stock",
    loadingDesc: "Recuperando matriz de tallas y colores.",
    error: "No pudimos abrir el detalle de stock",
    notFound: "Producto no encontrado",
    back: "Volver a stock actual",
    refresh: "Actualizar detalle",
    totalStock: "Stock total",
    breadcrumbs: {
      home: "Inicio",
      fallbackProduct: "Producto",
    },

    sections: {
      matrix: "Tallas y colores",
      locations: "Stock por sede",
      movements: "Movimientos",
    },

    matrix: {
      colorSize: "Color / Talla",
      total: "Total",
      status: "Estado",
      empty: "No hay stock registrado en esta sede.",
      locationLabel: "Sede",
    },

    locations: {
      units: (n: number) => `${n} unidades`,
      variants: (n: number) => `${n} variantes con stock`,
      empty: "Sin stock en otras sedes",
    },

    movements: {
      description: "Revisa entradas, salidas, transferencias y ajustes de este producto.",
      link: "Ver historial completo",
    },

    fields: {
      code: "Codigo",
      type: "Tipo",
      sizes: "Tallas disponibles",
      colors: "Colores disponibles",
      globalStatus: "Estado general",
    },
  },
} as const;
