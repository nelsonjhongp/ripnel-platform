export type CustomerRecord = {
  customer_id: string
  internal_code: string | null
  document_type: string
  document_number: string | null
  full_name: string | null
  business_name: string | null
  commercial_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  customer_type: string
  active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export type CustomerEntryMode = "persona_natural" | "empresa"

export type CustomerFormState = {
  entry_mode: CustomerEntryMode
  document_type: string
  document_number: string
  full_name: string
  business_name: string
  commercial_name: string
  email: string
  phone: string
  address: string
  customer_type: string
  active: boolean
  notes: string
}

export type CustomerFormErrors = {
  _form?: string
  full_name?: string
  business_name?: string
  commercial_name?: string
  document_number?: string
  address?: string
}
