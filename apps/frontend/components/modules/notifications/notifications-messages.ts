export const NOTIF = {
  header: {
    eyebrow: "Centro de alertas",
    title: "Alertas operativas",
    refresh: "Actualizar",
  },
  metrics: {
    total: "Total",
    critical: "Criticas",
    attention: "Atencion",
  },
  filters: {
    title: "Filtros",
    module: "Modulo",
    all: "Todos",
    allSeverity: "Todas",
    critical: "Criticas",
    attention: "Atencion",
  },
  table: {
    columns: {
      alert: "Alerta",
      module: "Modulo",
      severity: "Severidad",
      date: "Fecha",
    },
    empty: "No hay alertas operativas pendientes para tu sede activa en este momento.",
  },
  modules: {
    cash: "Caja",
    transfers: "Transferencias",
    inventory: "Inventario",
  },
  severity: {
    danger: "Critica",
    warning: "Atencion",
    default: "Info",
  },
} as const
