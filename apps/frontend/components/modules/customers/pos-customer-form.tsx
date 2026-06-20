"use client"

import { OpsFormField } from "@/components/ui/ops-form-field"
import { OpsSelect, type OpsOption } from "@/components/ui/ops-selection"
import { OpsSegmentedControl } from "@/components/ui/ops-segmented-control"
import type { CustomerFormErrors, CustomerFormState } from "@/components/modules/sales/pos/pos-types"

const INPUT_CLASS = "sales-field h-9 w-full rounded-lg px-3 py-2 text-sm"

export const POS_CUSTOMER_DOCUMENT_OPTIONS: OpsOption[] = [
  { value: "dni", label: "DNI" },
  { value: "ce", label: "CE" },
  { value: "passport", label: "Pasaporte" },
  { value: "none", label: "Sin documento" },
]

function getDocumentMaxLength(documentType: string) {
  if (documentType === "dni") return 8
  if (documentType === "ruc") return 11
  if (documentType === "ce") return 12
  if (documentType === "passport") return 15
  return 0
}

function normalizeDocumentInput(documentType: string, value: string) {
  if (documentType === "dni" || documentType === "ruc") {
    return value.replace(/\D/g, "")
  }

  if (documentType === "passport") {
    return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
  }

  if (documentType === "ce") {
    return value.replace(/[^A-Za-z0-9]/g, "")
  }

  return ""
}

export function patchPosCustomerDocumentType(
  form: CustomerFormState,
  documentType: string,
): CustomerFormState {
  return {
    ...form,
    document_type: documentType,
    document_number:
      documentType === "none"
        ? ""
        : normalizeDocumentInput(documentType, form.document_number),
  }
}

export function patchPosCustomerEntryMode(
  entryMode: string,
): CustomerFormState {
  if (entryMode === "factura") {
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

export function PosCustomerForm({
  form,
  errors,
  onChange,
}: {
  form: CustomerFormState
  errors: CustomerFormErrors | null
  onChange: (next: CustomerFormState) => void
}) {
  function patch(next: Partial<CustomerFormState>) {
    onChange({ ...form, ...next })
  }

  function updateDocumentNumber(value: string) {
    patch({
      document_number: normalizeDocumentInput(form.document_type, value),
    })
  }

  const documentMaxLength = getDocumentMaxLength(form.document_type)
  const documentCounter =
    form.document_type === "none" || documentMaxLength === 0
      ? null
      : `${form.document_number.length}/${documentMaxLength}`

  return (
    <div className="space-y-3">
      <OpsSegmentedControl
        options={[
          { value: "retail", label: "Cliente retail" },
          { value: "factura", label: "Cliente factura" },
        ]}
        value={form.entry_mode}
        onChange={(entryMode) => onChange(patchPosCustomerEntryMode(entryMode))}
        tone="accent"
        variant="switch"
        className="w-full [&>div]:grid [&>div]:w-full [&>div]:grid-cols-2"
      />

      {form.entry_mode === "factura" ? (
        <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
          <OpsFormField label="Documento" required density="compact">
            <div className="flex h-9 items-center rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-3 text-sm font-medium text-[var(--ops-text-muted)]">
              RUC
            </div>
          </OpsFormField>
          <OpsFormField label="Numero" required error={errors?.document_number} density="compact">
            <div className="relative">
              {documentCounter ? (
                <span className="pointer-events-none absolute right-0 top-[-1.15rem] text-[10px] font-medium text-[var(--ops-text-muted)]">
                  {documentCounter}
                </span>
              ) : null}
              <input
                type="text"
                name="customer_ruc"
                inputMode="numeric"
                autoComplete="off"
                value={form.document_number}
                onChange={(event) => updateDocumentNumber(event.target.value)}
                maxLength={11}
                className={INPUT_CLASS}
              />
            </div>
          </OpsFormField>
          <OpsFormField label="Razon social" required error={errors?.business_name} density="compact" className="col-span-full">
            <input
              type="text"
              name="customer_business_name"
              autoComplete="organization"
              value={form.business_name}
              onChange={(event) => patch({ business_name: event.target.value })}
              className={INPUT_CLASS}
            />
          </OpsFormField>
          <OpsFormField label="Direccion fiscal" required error={errors?.address} density="compact">
            <input
              type="text"
              name="customer_address"
              autoComplete="street-address"
              value={form.address}
              onChange={(event) => patch({ address: event.target.value })}
              className={INPUT_CLASS}
            />
          </OpsFormField>
          <OpsFormField label="Nombre comercial" density="compact">
            <input
              type="text"
              name="customer_commercial_name"
              autoComplete="off"
              value={form.commercial_name}
              onChange={(event) => patch({ commercial_name: event.target.value })}
              className={INPUT_CLASS}
            />
          </OpsFormField>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[minmax(132px,0.9fr)_minmax(0,1.1fr)]">
          <OpsFormField label="Documento" required error={errors?.document_number} density="compact">
            <OpsSelect
              value={form.document_type}
              onValueChange={(documentType) =>
                onChange(patchPosCustomerDocumentType(form, documentType))
              }
              placeholder="Seleccionar"
              options={POS_CUSTOMER_DOCUMENT_OPTIONS}
              className="h-9"
            />
          </OpsFormField>
          <OpsFormField
            label="Numero"
            required={form.document_type !== "none"}
            error={errors?.document_number}
            density="compact"
          >
            <div className="relative">
              {documentCounter ? (
                <span className="pointer-events-none absolute right-0 top-[-1.15rem] text-[10px] font-medium text-[var(--ops-text-muted)]">
                  {documentCounter}
                </span>
              ) : null}
              <input
                type="text"
                name="customer_document_number"
                inputMode={form.document_type === "dni" ? "numeric" : "text"}
                autoComplete="off"
                value={form.document_number}
                onChange={(event) => updateDocumentNumber(event.target.value)}
                disabled={form.document_type === "none"}
                maxLength={documentMaxLength || 15}
                placeholder={form.document_type === "none" ? "Sin documento" : "Numero"}
                className={INPUT_CLASS}
              />
            </div>
          </OpsFormField>
          <OpsFormField label="Nombre completo" required error={errors?.full_name} density="compact" className="col-span-full">
            <input
              type="text"
              name="customer_full_name"
              autoComplete="name"
              value={form.full_name}
              onChange={(event) => patch({ full_name: event.target.value })}
              className={INPUT_CLASS}
            />
          </OpsFormField>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <OpsFormField label="Telefono" density="compact">
          <input
            type="tel"
            name="customer_phone"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(event) => patch({ phone: event.target.value })}
            className={INPUT_CLASS}
          />
        </OpsFormField>
        <OpsFormField label="Email" density="compact">
          <input
            type="email"
            name="customer_email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            value={form.email}
            onChange={(event) => patch({ email: event.target.value })}
            className={INPUT_CLASS}
          />
        </OpsFormField>
      </div>
    </div>
  )
}
