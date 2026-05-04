"use client"

import React, { type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

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

export function formatCustomerDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

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

function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
      {children}
    </label>
  )
}

type CustomerFormProps = {
  state: CustomerFormState
  onChange: (next: CustomerFormState) => void
  onSubmit: () => void
  onCancel?: () => void
  submitLabel: string
  submitting?: boolean
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
  error,
  mode = "create",
  className,
}: CustomerFormProps) {
  const docTypeId = React.useId()
  const docNumberId = React.useId()
  const fullNameId = React.useId()
  const businessNameId = React.useId()
  const commercialNameId = React.useId()
  const customerTypeId = React.useId()
  const emailId = React.useId()
  const phoneId = React.useId()
  const notesId = React.useId()

  function patch(next: Partial<CustomerFormState>) {
    onChange({ ...state, ...next })
  }

  return (
    <div className={cn("space-y-5", className)}>
      {error ? (
        <div role="alert" aria-live="polite" className="rounded-xl border border-rose-300 bg-rose-100/70 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <FieldLabel htmlFor={docTypeId}>Tipo de documento</FieldLabel>
          <select
            id={docTypeId}
            value={state.document_type}
            onChange={(event) =>
              patch({
                document_type: event.target.value,
                document_number: event.target.value === "none" ? "" : state.document_number,
              })
            }
            className="sales-field h-10 w-full rounded-lg px-3 text-sm outline-none bg-[var(--ops-field)]"
          >
            <option value="none">Sin documento</option>
            <option value="dni">DNI</option>
            <option value="ruc">RUC</option>
            <option value="ce">CE</option>
            <option value="passport">Pasaporte</option>
          </select>
        </div>

        <div>
          <FieldLabel htmlFor={docNumberId}>Número de documento</FieldLabel>
          <Input
            id={docNumberId}
            value={state.document_number}
            disabled={state.document_type === "none"}
            onChange={(event) => patch({ document_number: event.target.value })}
            placeholder="Número de documento…"
            className="sales-field h-10 rounded-lg border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 text-sm text-[var(--ops-text)]"
          />
        </div>

        <div>
          <FieldLabel htmlFor={fullNameId}>Nombre completo</FieldLabel>
          <Input
            id={fullNameId}
            value={state.full_name}
            onChange={(event) => patch({ full_name: event.target.value })}
            placeholder="Nombre completo…"
            className="sales-field h-10 rounded-lg border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 text-sm text-[var(--ops-text)]"
          />
        </div>

        <div>
          <FieldLabel htmlFor={businessNameId}>Razón social</FieldLabel>
          <Input
            id={businessNameId}
            value={state.business_name}
            onChange={(event) => patch({ business_name: event.target.value })}
            placeholder="Razón social…"
            className="sales-field h-10 rounded-lg border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 text-sm text-[var(--ops-text)]"
          />
        </div>

        <div>
          <FieldLabel htmlFor={commercialNameId}>Nombre comercial</FieldLabel>
          <Input
            id={commercialNameId}
            value={state.commercial_name}
            onChange={(event) => patch({ commercial_name: event.target.value })}
            placeholder="Nombre comercial…"
            className="sales-field h-10 rounded-lg border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 text-sm text-[var(--ops-text)]"
          />
        </div>

        <div>
          <FieldLabel htmlFor={customerTypeId}>Tipo de cliente</FieldLabel>
          <select
            id={customerTypeId}
            value={state.customer_type}
            onChange={(event) => patch({ customer_type: event.target.value })}
            className="sales-field h-10 w-full rounded-lg px-3 text-sm outline-none bg-[var(--ops-field)]"
          >
            <option value="retail">Retail</option>
            <option value="wholesale">Mayorista</option>
          </select>
        </div>

        <div>
          <FieldLabel htmlFor={emailId}>Email</FieldLabel>
          <Input
            id={emailId}
            type="email"
            value={state.email}
            onChange={(event) => patch({ email: event.target.value })}
            placeholder="email@ejemplo.com"
            spellCheck={false}
            className="sales-field h-10 rounded-lg border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 text-sm text-[var(--ops-text)]"
          />
        </div>

        <div>
          <FieldLabel htmlFor={phoneId}>Teléfono</FieldLabel>
          <Input
            id={phoneId}
            type="tel"
            value={state.phone}
            onChange={(event) => patch({ phone: event.target.value })}
            placeholder="999 000 000…"
            className="sales-field h-10 rounded-lg border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 text-sm text-[var(--ops-text)]"
          />
        </div>

        <div className="md:col-span-2">
          <FieldLabel htmlFor={notesId}>Notas</FieldLabel>
          <textarea
            id={notesId}
            value={state.notes}
            onChange={(event) => patch({ notes: event.target.value })}
            rows={4}
            placeholder="Notas operativas…"
            className="sales-field min-h-28 w-full rounded-lg px-3 py-2.5 text-sm outline-none bg-[var(--ops-field)]"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ops-border-strong)] pt-4">
        <button
          type="button"
          onClick={() => patch({ active: !state.active })}
          className={cn(
            "inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition",
            state.active
              ? "border-[color:color-mix(in_srgb,#10b981_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_74%,var(--ops-text))]"
              : "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]"
          )}
        >
          {state.active ? "Cliente activo" : "Cliente inactivo"}
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {onCancel ? (
            <Button type="button" variant="outline" size="sm" onClick={onCancel} className="rounded-lg px-3">
              {mode === "edit" ? "Cancelar" : "Volver"}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={onSubmit}
            disabled={submitting}
            className="rounded-lg px-3"
          >
            {submitting ? (mode === "create" ? "Creando..." : "Guardando...") : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
