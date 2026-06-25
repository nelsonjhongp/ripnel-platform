export const CAJA = {
  header: {
    eyebrow: "Caja",
    dayTitle: "Caja del dia",
    controlTitle: "Control de cajas",
    historyTitle: "Historial de caja",
    detailEyebrow: "Detalle de caja",
  } as const,

  status: {
    open: "Caja operativa abierta",
    closed: "Caja cerrada",
    notOpen: "Aun no se abrio caja",
    notOpenDesc: "Abre caja para habilitar ventas en esta sede.",
    openBy: (name: string) => `Abierta por ${name}`,
    closedBy: (name: string) => `Cerrada por ${name}`,
    businessDateTooltip:
      "La fecha operativa corresponde al dia de trabajo de la sede actual en horario de Lima.",
  } as const,

  actions: {
    open: "Abrir caja",
    close: "Cerrar caja",
    reopen: "Reabrir",
    goSale: "Ir a venta",
    history: "Historial",
    update: "Actualizar",
    dayBox: "Caja del dia",
    view: "Ver",
    review: "Revisar",
  } as const,

  openDialog: {
    title: "Abrir caja",
    description: "Confirma la apertura de la sesion de caja para la fecha operativa actual en esta sede.",
    location: "Sede",
    businessDate: "Fecha operativa",
    openingBalanceLabel: "Saldo inicial",
    openingBalancePlaceholder: "0.00",
    notesLabel: "Observaciones (opcional)",
    notesPlaceholder: "Ej: Apertura de jornada",
    cancel: "Cancelar",
    confirm: "Abrir caja",
    processing: "Abriendo...",
  } as const,

  closeDialog: {
    title: "Confirmar cierre de caja",
    description:
      "Se consolidaran los pagos registrados y ventas confirmadas de la fecha operativa actual para esta sede.",
    total: "Total",
    declaredLabel: "Efectivo declarado",
    declaredPlaceholder: "0.00",
    notesLabel: "Observaciones (opcional)",
    notesPlaceholder: "Ej: Sin novedades",
    cancel: "Cancelar",
    confirm: "Cerrar caja",
    processing: "Procesando...",
  } as const,

  reopenDialog: {
    title: "Reabrir caja",
    description: "Confirma la reapertura de esta sesion de caja.",
    reasonLabel: "Motivo de reapertura",
    reasonPlaceholder: "Ej. Error en cierre, venta pendiente de registrar...",
    hint: "Al reabrir la caja se volvera a habilitar el registro de ventas en esa sede para la fecha de la sesion. Esta accion quedara registrada en el historial.",
    cancel: "Cancelar",
    confirm: "Reabrir caja",
    reopening: "Reabriendo...",
  } as const,

  summary: {
    dayTotal: "Total del dia",
    dayTotalHint: "Suma de ventas confirmadas en la fecha operativa actual.",
    sales: "Ventas",
    salesCount: (n: number) => `${n} confirmadas`,
    consistency: "Consistencia",
    consistencyHint:
      "Compara el total de ventas contra los pagos registrados. Si no cuadra, revisa posibles diferencias.",
    matches: "Cuadra",
    review: "Revisar",
    paymentMethods: "Medios de pago",
    totalPayments: "Total pagos",
    totalPaymentsHint:
      "Total de pagos registrados en el sistema para esta fecha.",
    openingBalance: "Saldo inicial",
    surplus: "Sobrante",
    shortage: "Faltante",
    balanceDiffTooltip:
      "Diferencia entre el total sistema y el efectivo declarado.",
  } as const,

  methods: {
    cash: "Efectivo",
    yape: "Yape",
    plin: "Plin",
    transfer: "Transferencia",
  } as const,

  admin: {
    sessions: "Sesiones",
    totalRegistered: "Total registrado",
    pendingClose: "Pendientes de cierre",
    openLocations: "Sedes abiertas",
    chartsTitle: "Graficos y tendencias",
    trendTitle: "Tendencia diaria",
    trendSubtitle: "Evolucion del total registrado por fecha",
    comparisonTitle: "Comparativo por sede",
    comparisonSubtitle: "Top 6 sedes por total registrado",
    multiSessions: "Sesiones multi-sede",
    operationalAlerts: "Alertas operativas",
    noSessions: "No hay sesiones registradas para los filtros seleccionados.",
    noAlerts: "No hay alertas operativas con estos filtros.",
    noTrendDataTitle: "Sin datos para la tendencia",
    noTrendDataDesc:
      "Ajusta los filtros o espera nuevas sesiones registradas.",
    noLocationDataTitle: "Sin datos por sede",
    noLocationDataDesc:
      "Todavia no hay suficiente informacion para comparar sedes con estos filtros.",
    chartDateLabel: (label: string) => `Fecha ${label}`,
    pendingBadge: "Pendiente",
    openSession: (n: number) => `${n} sesion abierta`,
    consistencyOk: "Consistencia OK",
    unknownUser: "Usuario no identificado",
    pendingCloseStatus: "Cierre pendiente",
    openLabel: "Apertura:",
    closeLabel: "Cierre:",
    diffLabel: "Dif.",
    filters: {
      range: "Rango",
      status: "Estado",
      location: "Sede",
      allLocations: "Todas las sedes",
      clearFilters: "Limpiar filtros",
    } as const,
    rangeOptions: {
      d7: "Ultimos 7 dias",
      d30: "Ultimos 30 dias",
      d60: "Ultimos 60 dias",
      d90: "Ultimos 90 dias",
    } as const,
    statusOptions: {
      all: "Todas",
      pending: "Pendientes",
      closed: "Cerradas",
    } as const,
    table: {
      dateStatus: "Fecha / estado",
      location: "Sede",
      openClose: "Apertura / cierre",
      total: "Total",
      action: "",
    } as const,
  } as const,

  history: {
    table: {
      date: "Fecha",
      openedBy: "Abrio",
      closedBy: "Cerro",
      total: "Total",
      action: "",
      error: "No pudimos cargar el historial de caja",
    } as const,
    noResults: "No se encontraron sesiones de caja para los filtros elegidos.",
    ok: "Cuadra",
    diffLabel: "Diferencia:",
    filters: {
      dateFrom: "Desde",
      dateTo: "Hasta",
      dateFromAria: "Fecha desde",
      dateToAria: "Fecha hasta",
    } as const,
  } as const,

  detail: {
    backToHistory: "Volver al historial",
    methodsTitle: "Montos por metodo",
    consistencySection: "Consistencia",
    consistencyHint:
      "La diferencia compara ventas confirmadas vs pagos registrados en el sistema. No representa arqueo fisico.",
    consistencyOk: "Los pagos coinciden con las ventas confirmadas.",
    consistencyError:
      "Hay diferencia entre ventas y pagos. Revisar movimientos.",
    notesSection: "Observaciones",
    reopenedLabel: "Reapertura",
    headerReopenedBy: "Reabierta por",
    metrics: {
      total: "Total",
      sales: "Ventas",
      opening: "Apertura",
      closing: "Cierre",
      openedBy: "Abrio",
      closedBy: "Cerro",
      openingBalance: "Saldo inicial",
      declaredBalance: "Efectivo declarado",
      difference: "Diferencia",
    } as const,
    totals: {
      totalSales: "Total ventas",
      totalPayments: "Total pagos",
      difference: "Diferencia",
    } as const,
  } as const,

  toast: {
    openSuccess: {
      title: "Caja abierta",
      desc: "La sesion de caja esta lista para operar.",
    },
    openError: {
      title: "Error al abrir caja",
      fallback: "No se pudo aperturar la caja.",
    },
    closeSuccess: {
      title: "Caja cerrada",
      desc: "La jornada fue cerrada correctamente.",
    },
    closeError: {
      title: "Error al cerrar caja",
      fallback: "No se pudo cerrar la caja.",
    },
    reopenError: {
      title: "Error al reabrir caja",
      fallback: "No se pudo reabrir la caja.",
    },
    reopenSuccess: {
      title: "Caja reabierta",
      desc: "La sesion ha sido reabierta correctamente.",
    },
  } as const,

  errors: {
    noLocation: {
      title: "Sin sede asignada",
      desc: "Tu usuario no tiene una sede default configurada. Contacta a un administrador antes de aperturar caja.",
    },
    generic: {
      title: "Error de caja",
    },
    consultOnly: {
      title: "Acceso de consulta",
      desc: "Tu usuario puede revisar la caja y su consistencia, pero no aperturar ni cerrar sesiones desde esta pantalla.",
    },
    loadFailed: "No se pudo cargar el historial.",
  } as const,

  loading: {
    cash: {
      title: "Cargando caja",
      desc: "Consultando el estado de la caja actual para tu sede operativa.",
    },
    admin: {
      title: "Cargando control de cajas",
      desc: "Estamos reuniendo sesiones, sedes y alertas operativas para la vista administrativa.",
      errorTitle: "No pudimos abrir el control de cajas",
    },
    history: {
      title: "Cargando historial de caja",
      desc: "Estamos recuperando las sesiones de caja registradas para tu sede operativa.",
      errorTitle: "No pudimos abrir el historial de caja",
    },
    detail: {
      title: "Cargando detalle de caja",
      desc: "Estamos recuperando la sesion de caja, sus montos y la consistencia operativa.",
      errorTitle: "No pudimos abrir el detalle de caja",
      errorDesc:
        "La sesion solicitada no esta disponible para esta sede.",
    },
  } as const,

  statusLabels: {
    pending: "Pendiente de cierre",
    closed: "Cerrada",
  } as const,

  fallback: {
    dash: "\u2014",
  } as const,
} as const
