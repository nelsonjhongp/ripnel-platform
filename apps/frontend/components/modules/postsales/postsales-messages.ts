export const PS = {
  header: {
    eyebrow: "Postventa",
    title: "Postventa controlada",
    detailEyebrow: "Postventa operativa",
  },

  kpis: {
    evaluated: "Evaluadas",
    exchangeReady: "Cambio habilitado",
    cancelReady: "Anulacion habilitada",
  },

  filters: {
    searchLabel: "Buscar",
    searchPlaceholder: "Buscar por nro. venta o cliente",
    searchAria: "Buscar ventas elegibles",
    statusLabel: "Estado",
    dateFrom: "Fecha desde",
    dateTo: "Fecha hasta",
    dateFromAria: "Fecha desde",
    dateToAria: "Fecha hasta",
    clear: "Limpiar filtros",
  },

  table: {
    columns: {
      sale: "Venta",
      date: "Fecha",
      customer: "Cliente",
      location: "Sede",
      status: "Estado",
      total: "Total",
      postsale: "Postventa",
      actions: "",
    },
    loading: "Cargando ventas elegibles...",
    error: "No pudimos cargar la cola de postventa",
    empty: "No se encontraron ventas para los filtros aplicados.",
    zero: "0 resultados",
    noCorrelative: "Sin correlativo",
    genericCustomer: "Cliente general",
  },

  actions: {
    history: "Historial",
    newSale: "Nueva venta",
    viewDetail: "Ver detalle",
    viewSale: "Ver venta",
    open: "Abrir",
  },

  detail: {
    back: "Volver",
    viewFullSale: "Ver venta completa",
    openProforma: "Abrir proforma",
    downloadReceipt: "Descargar comprobante",
    exchangeBlocked: "Cambio simple bloqueado",
    cancelBlocked: "Anulacion bloqueada",
    operationCompleted: "Operacion completada",
    operationFailed: "No pudimos completar la operacion",
    loading: "Cargando contexto de postventa",
    loadingDesc: "Recuperando la venta, sus pagos, caja y trazabilidad interna.",
    error: "No pudimos abrir la postventa",
    errorDesc: "La venta solicitada no esta disponible para esta sede.",

    sections: {
      baseSale: "Venta base",
      exchangeTrace: "Trazabilidad de cambios",
      cancellation: "Anulacion registrada",
      customerOperation: "Cliente y operacion",
      paymentsNet: "Pagos y neutralizacion",
      simpleExchange: "Cambio simple",
      totalCancellation: "Anulacion total",
      originalNotes: "Notas originales",
    },

    lines: {
      baseLine: "Linea base",
      searchReplacement: "Buscar reemplazo",
      searchPlaceholder: "Busca por SKU, estilo o codigo",
      searching: "Buscando variantes disponibles...",
      noMatch: "No encontramos variantes disponibles para ese criterio.",
      selectedReplacement: "Reemplazo seleccionado",
      sameValue: "Mismo valor total",
      reasonRequired: "Motivo obligatorio",
      reasonPlaceholder: "Ej. talla no adecuada, color reemplazado",
      notes: "Notas",
      notesExchangePlaceholder: "Detalle adicional del cambio",
      notesCancelPlaceholder: "Detalle adicional de la anulacion",
      reasonPlaceholderCancel: "Ej. venta digitada por error",
    },

    fields: {
      client: "Cliente",
      document: "Documento",
      location: "Sede",
      seller: "Vendedor",
      address: "Direccion",
      cashOpen: "Caja abierta",
      cashClosed: "Caja cerrada",
      noCash: "Sin caja",
    },

    payments: {
      registered: "Pagos registrados",
      reversals: "Reversos internos",
      net: "Neto operativo",
      reversalMethod: "Reverso",
    },

    buttons: {
      registerExchange: "Registrar cambio simple",
      registeringExchange: "Registrando cambio...",
      cancelSale: "Anular venta",
      cancellingSale: "Anulando venta...",
    },

    confirmCancel: {
      title: "Confirmar anulacion",
      description: "Confirmas que deseas anular esta venta? Esta accion es irreversible.",
      cancel: "Cancelar",
      confirm: "Anular venta",
      confirming: "Anulando...",
    },

    exchangeSuccess: "El cambio simple quedo registrado correctamente.",
    cancelSuccess: "La venta quedo anulada y la trazabilidad interna fue registrada.",
    exchangeBlockedMsg: "Selecciona una linea de venta y una variante de reemplazo.",
    reasonValidation: "El motivo es obligatorio.",
    operationFallback: "La operacion no se pudo completar.",
  },
} as const
