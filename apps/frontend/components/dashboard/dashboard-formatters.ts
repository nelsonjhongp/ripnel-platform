import { formatCurrency, formatNumber as libFormatNumber } from "@/lib/format-utils"

export function formatCurrencyPEN(value: number | null | undefined) {
  if (value == null) return formatCurrency(0)
  return formatCurrency(value)
}

export function formatNumber(value: number | null | undefined) {
  return libFormatNumber(value ?? 0)
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

