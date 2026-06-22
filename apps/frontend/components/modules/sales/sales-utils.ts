import { PAYMENT_METHOD_LABELS } from "@/types/sales"

export function formatDocumentType(value: string, fallback = "Documento") {
  if (!value) return fallback
  return value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (l) => l.toUpperCase())
}

export function formatPaymentMethod(value: string) {
  const normalized = String(value || "").trim().toLowerCase()
  return PAYMENT_METHOD_LABELS[normalized] || formatDocumentType(value)
}

export function customerDocument(
  docType: string | null,
  docNumber: string | null,
) {
  if (!docType && !docNumber) return null
  return `${docType || ""} ${docNumber || ""}`.trim()
}
