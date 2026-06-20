"use client"

import { LoaderCircle } from "lucide-react"
import {
  AdminActionButton,
  AdminCheckboxField,
  AdminField,
  AdminFormActionsBar,
  AdminInlineMessage,
  AdminInput,
  AdminSection,
  AdminTextarea,
} from "@/components/admin/admin-ui"
import { OpsSelect } from "@/components/ui/ops-selection"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/date-utils"

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
  customer_type: string
  active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export type CustomerFormState = {
  document_type: string
  document_number: string
  full_name: string
  business_name: string
  commercial_name: string
  email: string
  phone: string
  customer_type: string
  active: boolean
  notes: string
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  none: "Sin doc.",
  dni: "DNI",
  ruc: "RUC",
  ce: "CE",
  passport: "Pasaporte",
}

export const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  retail: "Retail",
  wholesale: "Mayorista",
}

const DOC_RULES: Record<string, { label: string; regex: RegExp }> = {
  dni: { label: "DNI", regex: /^\d{8}$/ },
  ruc: { label: "RUC", regex: /^\d{11}$/ },
  ce: { label: "CE", regex: /^[A-Za-z0-9]{9,12}$/ },
  passport: { label: "Pasaporte", regex: /^[A-Za-z0-9]{6,15}$/ },
}

export const EMPTY_FORM: CustomerFormState = {
  document_type: "none",
  document_number: "",
  full_name: "",
  business_name: "",
  commercial_name: "",
  email: "",
  phone: "",
  customer_type: "retail",
  active: true,
  notes: "",
}

function trimOrNull(value: string) {
  const normalized = value.trim()
  return normalized.length ? normalized : null
}

export function buildDisplayName(customer: CustomerRecord) {
  return customer.full_name || customer.business_name || customer.commercial_name || "Cliente sin nombre"
}

export const formatCustomerDate = formatDate

export function validateCustomerInput(
  input: Pick<
    CustomerFormState,
    "document_type" | "document_number" | "full_name" | "business_name" | "commercial_name"
  >
) {
  const nameIsMissing =
    !input.full_name.trim() && !input.business_name.trim() && !input.commercial_name.trim()

  if (nameIsMissing) {
    return "Ingresa al menos un nombre."
  }

  if (input.document_type === "none") {
    if (input.document_number.trim()) {
      return "Si el tipo es sin documento, el número debe ir vacío."
    }

    return null
  }

  const rule = DOC_RULES[input.document_type]
  if (!rule) {
    return "Tipo de documento inválido."
  }

  const normalizedNumber =
    input.document_type === "passport"
      ? input.document_number.trim().toUpperCase()
      : input.document_number.trim()

  if (!normalizedNumber) {
    return "Número de documento obligatorio."
  }

  if (!rule.regex.test(normalizedNumber)) {
    return `Formato inválido para ${rule.label}.`
  }

  return null
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
    customer_type: input.customer_type,
    active: input.active,
    notes: trimOrNull(input.notes),
  }
}

export function toFormState(customer: CustomerRecord): CustomerFormState {
  return {
    document_type: customer.document_type,
    document_number: customer.document_number || "",
    full_name: customer.full_name || "",
    business_name: customer.business_name || "",
    commercial_name: customer.commercial_name || "",
    email: customer.email || "",
    phone: customer.phone || "",
    customer_type: customer.customer_type,
    active: customer.active,
    notes: customer.notes || "",
  }
}

type CustomerFormProps = {
  state: CustomerFormState
  onChange: (next: CustomerFormState) => void
  onSubmit: () => void
  onCancel?: () => void
  submitLabel: string
  submitting?: boolean
  submissionState?: "idle" | "validating" | "saving"
  error?: string | null
  mode?: "create" | "edit"
  className?: string
}

export function CustomerForm({
  state,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  submitting = false,
  submissionState = "idle",
  error,
  mode = "create",
  className,
}: CustomerFormProps) {
  function patch(next: Partial<CustomerFormState>) {
    onChange({ ...state, ...next })
  }

  const documentTypeOptions = [
    { value: "none", label: "Sin documento" },
    { value: "dni", label: "DNI" },
    { value: "ruc", label: "RUC" },
    { value: "ce", label: "CE" },
    { value: "passport", label: "Pasaporte" },
  ]

  const customerTypeOptions = [
    { value: "retail", label: "Retail" },
    { value: "wholesale", label: "Mayorista" },
  ]

  const isBusy = submitting || submissionState !== "idle"
  const submitContent =
    submissionState === "validating" ? (
      <span className="inline-flex items-center gap-2">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Validando...
      </span>
    ) : submissionState === "saving" || submitting ? (
      <span className="inline-flex items-center gap-2">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Guardando...
      </span>
    ) : (
      submitLabel
    )

  return (
    <div className={cn("space-y-5", className)}>
      {error ? (
        <AdminInlineMessage tone="danger">{error}</AdminInlineMessage>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="space-y-5">
          <AdminSection title="Identidad comercial">
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="Tipo de documento">
                <OpsSelect
                  value={state.document_type}
                  onValueChange={(value) =>
                    patch({
                      document_type: value,
                      document_number: value === "none" ? "" : state.document_number,
                    })
                  }
                  placeholder="Selecciona un tipo"
                  options={documentTypeOptions}
                />
              </AdminField>

              <AdminField label="Número de documento">
                <AdminInput
                  value={state.document_number}
                  disabled={state.document_type === "none"}
                  onChange={(event) => patch({ document_number: event.target.value })}
                  placeholder={state.document_type === "none" ? "Sin documento" : "Número de documento"}
                />
              </AdminField>

              <AdminField label="Nombre completo">
                <AdminInput
                  value={state.full_name}
                  onChange={(event) => patch({ full_name: event.target.value })}
                  placeholder="Nombre completo"
                />
              </AdminField>

              <AdminField label="Razón social">
                <AdminInput
                  value={state.business_name}
                  onChange={(event) => patch({ business_name: event.target.value })}
                  placeholder="Razón social"
                />
              </AdminField>

              <AdminField label="Nombre comercial">
                <AdminInput
                  value={state.commercial_name}
                  onChange={(event) => patch({ commercial_name: event.target.value })}
                  placeholder="Nombre comercial"
                />
              </AdminField>

              <AdminField label="Tipo de cliente">
                <OpsSelect
                  value={state.customer_type}
                  onValueChange={(value) => patch({ customer_type: value })}
                  placeholder="Selecciona un tipo"
                  options={customerTypeOptions}
                />
              </AdminField>
            </div>
          </AdminSection>
        </div>

        <div className="space-y-5">
          <AdminSection title="Contacto y operación">
            <div className="space-y-4">
              <AdminField label="Email">
                <AdminInput
                  type="email"
                  value={state.email}
                  onChange={(event) => patch({ email: event.target.value })}
                  placeholder="email@ejemplo.com"
                  spellCheck={false}
                />
              </AdminField>

              <AdminField label="Teléfono">
                <AdminInput
                  type="tel"
                  value={state.phone}
                  onChange={(event) => patch({ phone: event.target.value })}
                  placeholder="999 000 000"
                />
              </AdminField>

              <AdminField label="Notas">
                <AdminTextarea
                  value={state.notes}
                  onChange={(event) => patch({ notes: event.target.value })}
                  rows={4}
                  placeholder="Notas operativas"
                />
              </AdminField>

              <AdminField label="Estado">
                <AdminCheckboxField
                  label="Cliente activo"
                  checked={state.active}
                  onChange={(checked) => patch({ active: checked })}
                />
              </AdminField>
            </div>
          </AdminSection>
        </div>
      </div>

      <AdminFormActionsBar>
        {onCancel ? (
          <AdminActionButton type="button" onClick={onCancel} disabled={isBusy}>
            {mode === "edit" ? "Cancelar" : "Volver"}
          </AdminActionButton>
        ) : null}
        <AdminActionButton type="button" tone="accent" onClick={onSubmit} disabled={isBusy}>
          {submitContent}
        </AdminActionButton>
      </AdminFormActionsBar>
    </div>
  )
}
