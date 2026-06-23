import type {
  CustomerFormErrors,
  CustomerFormState,
  PosCustomer,
} from "./pos-types"
import { SELLER_DOC_RULES } from "./pos-types"

import { trimOrNull } from "./pos-utils"

export function buildCustomerDisplayName(customer: PosCustomer | null): string {
  if (!customer) return "Pendiente"

  return (
    customer.display_name ||
    customer.full_name ||
    customer.business_name ||
    customer.commercial_name ||
    "Cliente sin nombre"
  )
}

export function buildCustomerDocument(customer: PosCustomer | null): string {
  if (!customer || !customer.document_type || customer.document_type === "none") {
    return "Sin documento"
  }

  return `${String(customer.document_type).toUpperCase()} ${customer.document_number || ""}`.trim()
}

export function isCustomerValidForDocumentType(
  customer: PosCustomer | null,
  documentType: string
): boolean {
  if (!customer) return false
  const customerDocType = String(customer.document_type || "").toLowerCase()

  if (documentType === "boleta") {
    const documentNumber = String(customer.document_number || "").trim()

    if (customerDocType === "dni") {
      return /^\d{8}$/.test(documentNumber)
    }

    if (customerDocType === "ce") {
      return SELLER_DOC_RULES.ce.regex.test(documentNumber)
    }

    return false
  }

  if (documentType === "factura") {
    return (
      customerDocType === "ruc" &&
      Boolean(customer.document_number) &&
      Boolean(customer.address)
    )
  }

  return true
}

export function getCustomerSearchFilter(documentType: string): {
  queryDocumentType: string | null
  localDocumentTypes: string[] | null
} {
  if (documentType === "factura") {
    return { queryDocumentType: "ruc", localDocumentTypes: ["ruc"] }
  }

  if (documentType === "boleta") {
    return { queryDocumentType: null, localDocumentTypes: ["dni", "ce"] }
  }

  return { queryDocumentType: null, localDocumentTypes: null }
}

export function filterCustomersByDocumentType(
  customers: PosCustomer[],
  documentType: string
): PosCustomer[] {
  const { localDocumentTypes } = getCustomerSearchFilter(documentType)

  if (!localDocumentTypes) {
    return customers
  }

  return (customers || []).filter((customer) => {
    const customerDocType = String(customer?.document_type || "").toLowerCase()
    return localDocumentTypes.includes(customerDocType)
  })
}

export function createEmptyCustomerForm(
  mode = "retail"
): CustomerFormState {
  if (mode === "factura") {
    return {
      entry_mode: "factura",
      document_type: "ruc",
      document_number: "",
      full_name: "",
      business_name: "",
      commercial_name: "",
      address: "",
      phone: "",
      email: "",
    }
  }

  return {
    entry_mode: "retail",
    document_type: "dni",
    document_number: "",
    full_name: "",
    business_name: "",
    commercial_name: "",
    address: "",
    phone: "",
    email: "",
  }
}

export function buildCustomerFormFromCustomer(
  customer: PosCustomer
): CustomerFormState {
  const entryMode =
    String(customer?.document_type || "").toLowerCase() === "ruc"
      ? "factura"
      : "retail"

  return {
    entry_mode: entryMode,
    document_type:
      customer?.document_type || (entryMode === "factura" ? "ruc" : "dni"),
    document_number: customer?.document_number || "",
    full_name: customer?.full_name || "",
    business_name: customer?.business_name || "",
    commercial_name: customer?.commercial_name || "",
    address: customer?.address || "",
    phone: customer?.phone || "",
    email: customer?.email || "",
  }
}

export function validateCustomerForm(form: CustomerFormState): CustomerFormErrors | null {
  if (form.entry_mode === "factura") {
    const errors: CustomerFormErrors = {};

    if (!trimOrNull(form.business_name)) {
      errors.business_name = "La razon social es obligatoria para cliente factura."
    }

    if (
      !SELLER_DOC_RULES.ruc.regex.test(
        String(form.document_number || "").trim()
      )
    ) {
      errors.document_number = "El RUC debe tener 11 digitos."
    }

    if (!trimOrNull(form.address)) {
      errors.address = "La direccion fiscal es obligatoria para factura."
    }

    return Object.keys(errors).length > 0 ? errors : null
  }

  const errors: CustomerFormErrors = {};

  if (!trimOrNull(form.full_name)) {
    errors.full_name = "Ingresa el nombre completo del cliente."
  }

  if (form.document_type === "none") {
    if (String(form.document_number || "").trim()) {
      errors.document_number = "Si el cliente no tiene documento, el numero debe ir vacio."
    }
  } else {
    const rule = SELLER_DOC_RULES[form.document_type]

    if (!rule) {
      errors.document_number = "Selecciona un tipo de documento valido."
    } else if (!rule.regex.test(String(form.document_number || "").trim())) {
      errors.document_number = `Formato invalido para ${rule.label}.`
    }
  }

  return Object.keys(errors).length > 0 ? errors : null
}

export function buildCustomerPayload(form: CustomerFormState): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    document_type:
      form.entry_mode === "factura" ? "ruc" : form.document_type,
    document_number:
      form.entry_mode === "factura"
        ? trimOrNull(form.document_number)
        : form.document_type === "none"
          ? null
          : trimOrNull(form.document_number),
    full_name:
      form.entry_mode === "retail" ? trimOrNull(form.full_name) : null,
    business_name: trimOrNull(form.business_name),
    commercial_name: trimOrNull(form.commercial_name),
    address: trimOrNull(form.address),
    phone: trimOrNull(form.phone),
    email: trimOrNull(form.email),
    customer_type: "retail",
  }

  if (
    payload.document_type === "passport" &&
    payload.document_number
  ) {
    payload.document_number = String(payload.document_number).toUpperCase()
  }

  return payload
}

export function replaceCustomerInResults(
  results: PosCustomer[],
  customer: PosCustomer
): PosCustomer[] {
  const filtered = (results || []).filter(
    (item) => item.customer_id !== customer.customer_id
  )
  return [customer, ...filtered].slice(0, 8)
}
