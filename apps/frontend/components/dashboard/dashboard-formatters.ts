export function formatCurrencyPEN(value: number | null | undefined) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

export function formatDocumentStatus(status: string | null | undefined) {
  switch (status) {
    case "missing":
      return "Pendiente"
    case "pending":
      return "Pendiente"
    case "error":
      return "Con error"
    case "resolved":
      return "Emitido"
    case "none":
      return "Sin comprobante"
    default:
      return "Sin datos"
  }
}

export function formatCashStatus(status: string | null | undefined) {
  switch (status) {
    case "open":
      return "Abierto"
    case "closed":
      return "Cerrado"
    case "missing":
      return "Sin comprobante"
    default:
      return "Sin datos"
  }
}

