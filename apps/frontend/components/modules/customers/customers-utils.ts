import { formatDate } from "@/lib/date-utils"
import type { CustomerFormState, CustomerRecord, CustomerFormErrors } from "./customers-types"
import { DOC_RULES } from "./customers-constants"
import { CUSTOMERS } from "./customers-messages"

function trimOrNull(value: string) {
  const normalized = value.trim()
  return normalized.length ? normalized : null
}

export function buildDisplayName(customer: CustomerRecord) {
  return (
    customer.full_name ||
    customer.business_name ||
    customer.commercial_name ||
    CUSTOMERS.fallback.noName
  )
}

export const formatCustomerDate = formatDate

export function validateCustomerInput(
  input: Pick<
    CustomerFormState,
    "document_type" | "document_number" | "full_name" | "business_name" | "commercial_name" | "address"
  >,
): CustomerFormErrors | null {
  const errors: CustomerFormErrors = {}
  const isRuc = input.document_type === "ruc"

  if (isRuc) {
    if (!input.business_name.trim()) {
      errors.business_name = CUSTOMERS.form.rucBusinessNameRequired
    }
    if (!input.address.trim()) {
      errors.address = CUSTOMERS.form.rucAddressRequired
    }
  } else {
    const nameIsMissing =
      !input.full_name.trim() && !input.business_name.trim() && !input.commercial_name.trim()

    if (nameIsMissing) {
      errors.full_name = CUSTOMERS.form.noNameError
    }
  }

  if (input.document_type === "none") {
    if (input.document_number.trim()) {
      errors.document_number = CUSTOMERS.form.noDocWithNone
    }
    return Object.keys(errors).length > 0 ? errors : null
  }

  const rule = DOC_RULES[input.document_type]
  if (!rule) {
    errors.document_number = CUSTOMERS.form.invalidDocType
    return errors
  }

  const normalizedNumber =
    input.document_type === "passport"
      ? input.document_number.trim().toUpperCase()
      : input.document_number.trim()

  if (!normalizedNumber) {
    errors.document_number = CUSTOMERS.form.docRequired
  } else if (!rule.regex.test(normalizedNumber)) {
    errors.document_number = CUSTOMERS.form.invalidFormat(rule.label)
  }

  return Object.keys(errors).length > 0 ? errors : null
}

export function buildCustomerPayload(input: CustomerFormState) {
  const normalizedDocumentNumber =
    input.document_type === "none"
      ? null
      : input.document_type === "passport"
        ? input.document_number.trim().toUpperCase()
        : input.document_number.trim()

  return {
    document_type: input.document_type,
    document_number: normalizedDocumentNumber,
    full_name: trimOrNull(input.full_name),
    business_name: trimOrNull(input.business_name),
    commercial_name: trimOrNull(input.commercial_name),
    email: trimOrNull(input.email),
    phone: trimOrNull(input.phone),
    address: trimOrNull(input.address),
    customer_type: input.customer_type,
    active: input.active,
    notes: trimOrNull(input.notes),
  }
}

export function toFormState(customer: CustomerRecord): CustomerFormState {
  return {
    entry_mode: customer.document_type === "ruc" ? "empresa" : "persona_natural",
    document_type: customer.document_type,
    document_number: customer.document_number || "",
    full_name: customer.full_name || "",
    business_name: customer.business_name || "",
    commercial_name: customer.commercial_name || "",
    email: customer.email || "",
    phone: customer.phone || "",
    address: customer.address || "",
    customer_type: customer.customer_type,
    active: customer.active,
    notes: customer.notes || "",
  }
}

export const EMPTY_FORM: CustomerFormState = {
  entry_mode: "persona_natural",
  document_type: "dni",
  document_number: "",
  full_name: "",
  business_name: "",
  commercial_name: "",
  email: "",
  phone: "",
  address: "",
  customer_type: "retail",
  active: true,
  notes: "",
}
