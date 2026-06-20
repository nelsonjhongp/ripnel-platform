"use client"

import { apiFetchData, ApiError, formatApiFetchError } from "@/lib/api"

type CustomerDocumentLookupRecord = {
  customer_id: string
  document_type: string
  document_number: string | null
  full_name?: string | null
  business_name?: string | null
  commercial_name?: string | null
  display_name?: string | null
}

export function normalizeCustomerDocumentIdentity(documentType: string, documentNumber: string) {
  const normalizedType = String(documentType || "").trim().toLowerCase()

  if (!normalizedType || normalizedType === "none") {
    return null
  }

  const trimmedNumber = String(documentNumber || "").trim()
  if (!trimmedNumber) {
    return null
  }

  return {
    document_type: normalizedType,
    document_number: normalizedType === "passport" ? trimmedNumber.toUpperCase() : trimmedNumber,
  }
}

export async function findDuplicateCustomerByDocument({
  documentType,
  documentNumber,
  excludeCustomerId,
}: {
  documentType: string
  documentNumber: string
  excludeCustomerId?: string | null
}) {
  const normalized = normalizeCustomerDocumentIdentity(documentType, documentNumber)

  if (!normalized) {
    return null
  }

  const params = new URLSearchParams({
    document_type: normalized.document_type,
    q: normalized.document_number,
  })
  const customers = await apiFetchData<CustomerDocumentLookupRecord[]>(
    `/api/customers?${params.toString()}`,
    { cache: "no-store" },
  )

  return (
    (customers || []).find((customer) => {
      if (excludeCustomerId && customer.customer_id === excludeCustomerId) {
        return false
      }

      return (
        String(customer.document_type || "").trim().toLowerCase() === normalized.document_type &&
        String(customer.document_number || "").trim() === normalized.document_number
      )
    }) || null
  )
}

export function mapCustomerSaveError(error: unknown) {
  if (error instanceof ApiError && error.status === 409) {
    return "Ya existe un cliente con este documento."
  }

  const message = formatApiFetchError(error, "No se pudo guardar el cliente.")
  if (
    /document already exists/i.test(message) ||
    /ya existe/i.test(message) ||
    /duplicate/i.test(message)
  ) {
    return "Ya existe un cliente con este documento."
  }

  return message
}
