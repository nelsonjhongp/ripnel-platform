"use client"

import { Info } from "lucide-react"
import { OpsFormField } from "@/components/ui/ops-form-field"
import { OpsSelect } from "@/components/ui/ops-selection"
import { OpsSegmentedControl } from "@/components/ui/ops-segmented-control"
import { opsInputCompact, INFO_BOX_MUTED } from "@/components/ui/ops-control-styles"
import { cn } from "@/lib/utils"
import type { CustomerFormState, CustomerFormErrors } from "./customers-types"
import { CUSTOMERS } from "./customers-messages"

export { type CustomerRecord, type CustomerFormState, type CustomerFormErrors } from "./customers-types"
export { EMPTY_FORM, buildDisplayName, buildCustomerPayload, toFormState, validateCustomerInput, formatCustomerDate } from "./customers-utils"
export { DOC_TYPE_LABELS, CUSTOMER_TYPE_LABELS } from "./customers-constants"

const DOCUMENT_MAX_LENGTH: Record<string, number> = {
  dni: 8,
  ruc: 11,
  ce: 12,
  passport: 15,
}

function normalizeDocumentInput(documentType: string, value: string) {
  if (documentType === "dni" || documentType === "ruc") return value.replace(/\D/g, "")
  if (documentType === "passport") return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
  if (documentType === "ce") return value.replace(/[^A-Za-z0-9]/g, "")
  return value
}

function patchEntryMode(mode: string): Partial<CustomerFormState> {
  if (mode === "empresa") {
    return {
      entry_mode: "empresa",
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
    entry_mode: "persona_natural",
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

export type CustomerFormProps = {
  state: CustomerFormState
  errors: CustomerFormErrors | null
  onChange: (next: CustomerFormState) => void
  mode?: "create" | "edit"
  className?: string
}

export function CustomerForm({ state, errors, onChange, mode = "create", className }: CustomerFormProps) {
  const isCreate = mode === "create"
  const isEdit = mode === "edit"
  const isEmpresa = state.entry_mode === "empresa"
  const isRuc = state.document_type === "ruc"

  function patch(next: Partial<CustomerFormState>) {
    onChange({ ...state, ...next })
  }

  function updateDocumentNumber(value: string) {
    patch({ document_number: normalizeDocumentInput(state.document_type, value) })
  }

  const documentTypeOptions = [
    { value: "dni", label: "DNI" },
    { value: "ce", label: "CE" },
    { value: "passport", label: "Pasaporte" },
    { value: "none", label: "Sin documento" },
  ]

  const customerTypeOptions = [
    { value: "retail", label: "Retail" },
    { value: "wholesale", label: "Mayorista" },
  ]

  const docMaxLength = DOCUMENT_MAX_LENGTH[state.document_type] || 0
  const documentCounter =
    state.document_type === "none" || docMaxLength === 0 ? null : `${state.document_number.length}/${docMaxLength}`

  return (
    <div className={cn("space-y-4", className)}>
      {isCreate ? (
        <OpsSegmentedControl
          options={[
            { value: "persona_natural", label: CUSTOMERS.form.switch.personaNatural },
            { value: "empresa", label: CUSTOMERS.form.switch.empresa },
          ]}
          value={state.entry_mode}
          onChange={(entryMode) => onChange({ ...state, ...patchEntryMode(entryMode) })}
          tone="accent"
          variant="switch"
          className="w-full [&>div]:grid [&>div]:w-full [&>div]:grid-cols-2"
        />
      ) : null}

      {isEmpresa ? (
        <>
          <div className="grid gap-3 sm:grid-cols-[minmax(132px,0.9fr)_minmax(0,1.1fr)]">
            <OpsFormField label={CUSTOMERS.form.docType} density="compact">
              <div className="flex h-9 items-center rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-3 text-sm font-medium text-[var(--ops-text-muted)]">
                RUC
              </div>
            </OpsFormField>
            <OpsFormField label={CUSTOMERS.form.docNumber} required error={errors?.document_number} density="compact">
              <div className="relative">
                {documentCounter ? (
                  <span className="pointer-events-none absolute right-0 top-[-1.15rem] text-[10px] font-medium text-[var(--ops-text-muted)]">
                    {documentCounter}
                  </span>
                ) : null}
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={state.document_number}
                  onChange={(event) => updateDocumentNumber(event.target.value)}
                  maxLength={11}
                  className={opsInputCompact}
                />
              </div>
            </OpsFormField>
          </div>

          <OpsFormField label={CUSTOMERS.form.businessName} required error={errors?.business_name} density="compact">
            <input
              type="text"
              autoComplete="organization"
              value={state.business_name}
              onChange={(event) => patch({ business_name: event.target.value })}
              placeholder={CUSTOMERS.form.businessNamePlaceholder}
              className={opsInputCompact}
            />
          </OpsFormField>

          <OpsFormField label={CUSTOMERS.form.address} required error={errors?.address} density="compact">
            <input
              type="text"
              autoComplete="street-address"
              value={state.address}
              onChange={(event) => patch({ address: event.target.value })}
              placeholder={CUSTOMERS.form.addressPlaceholder}
              className={opsInputCompact}
            />
          </OpsFormField>

          <OpsFormField label={CUSTOMERS.form.commercialName} density="compact">
            <input
              type="text"
              autoComplete="off"
              value={state.commercial_name}
              onChange={(event) => patch({ commercial_name: event.target.value })}
              placeholder={CUSTOMERS.form.commercialNamePlaceholder}
              className={opsInputCompact}
            />
          </OpsFormField>
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[minmax(132px,0.9fr)_minmax(0,1.1fr)]">
            <OpsFormField label={CUSTOMERS.form.docType} density="compact">
              {isCreate ? (
                <OpsSelect
                  value={state.document_type}
                  onValueChange={(value) =>
                    patch({
                      document_type: value,
                      document_number: value === "none" ? "" : normalizeDocumentInput(value, state.document_number),
                    })
                  }
                  placeholder={CUSTOMERS.form.selectDocType}
                  options={documentTypeOptions}
                  className="h-9"
                />
              ) : (
                <OpsSelect
                  value={state.document_type}
                  onValueChange={(value) =>
                    patch({
                      document_type: value,
                      document_number: value === "none" ? "" : normalizeDocumentInput(value, state.document_number),
                    })
                  }
                  placeholder={CUSTOMERS.form.selectDocType}
                  options={[
                    { value: "none", label: "Sin documento" },
                    { value: "dni", label: "DNI" },
                    { value: "ruc", label: "RUC" },
                    { value: "ce", label: "CE" },
                    { value: "passport", label: "Pasaporte" },
                  ]}
                  className="h-9"
                />
              )}
            </OpsFormField>
            <OpsFormField
              label={CUSTOMERS.form.docNumber}
              required={state.document_type !== "none"}
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
                  inputMode={state.document_type === "dni" || state.document_type === "ruc" ? "numeric" : "text"}
                  autoComplete="off"
                  value={state.document_number}
                  onChange={(event) => updateDocumentNumber(event.target.value)}
                  disabled={state.document_type === "none"}
                  maxLength={docMaxLength || 15}
                  placeholder={state.document_type === "none" ? CUSTOMERS.form.noDocPlaceholder : CUSTOMERS.form.docNumberPlaceholder}
                  className={opsInputCompact}
                />
              </div>
            </OpsFormField>
          </div>

          <OpsFormField label={CUSTOMERS.form.fullName} required error={errors?.full_name} density="compact">
            <input
              type="text"
              autoComplete="name"
              value={state.full_name}
              onChange={(event) => patch({ full_name: event.target.value })}
              placeholder={CUSTOMERS.form.fullNamePlaceholder}
              className={opsInputCompact}
            />
          </OpsFormField>

          <div className="grid gap-3 sm:grid-cols-2">
            <OpsFormField label={CUSTOMERS.form.businessName} required={isRuc} error={errors?.business_name} density="compact">
              <input
                type="text"
                autoComplete="organization"
                value={state.business_name}
                onChange={(event) => patch({ business_name: event.target.value })}
                placeholder={CUSTOMERS.form.businessNamePlaceholder}
                className={opsInputCompact}
              />
            </OpsFormField>
            <OpsFormField label={CUSTOMERS.form.commercialName} density="compact">
              <input
                type="text"
                autoComplete="off"
                value={state.commercial_name}
                onChange={(event) => patch({ commercial_name: event.target.value })}
                placeholder={CUSTOMERS.form.commercialNamePlaceholder}
                className={opsInputCompact}
              />
            </OpsFormField>
          </div>

          <OpsFormField label={CUSTOMERS.form.address} required={isRuc} error={errors?.address} density="compact">
            <input
              type="text"
              autoComplete="street-address"
              value={state.address}
              onChange={(event) => patch({ address: event.target.value })}
              placeholder={CUSTOMERS.form.addressPlaceholder}
              className={opsInputCompact}
            />
          </OpsFormField>
        </>
      )}

      {isEdit && isRuc && !isEmpresa ? (
        <div className={`${INFO_BOX_MUTED} flex items-start gap-2 text-xs text-[var(--ops-text-muted)]`}>
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ripnel-accent)]" />
          <span>{CUSTOMERS.form.hintRuc}</span>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <OpsFormField label={CUSTOMERS.form.customerType} density="compact">
          <OpsSelect
            value={state.customer_type}
            onValueChange={(value) => patch({ customer_type: value })}
            placeholder={CUSTOMERS.form.selectType}
            options={customerTypeOptions}
            className="h-9"
          />
        </OpsFormField>
        <OpsFormField label={CUSTOMERS.form.email} density="compact">
          <input
            type="email"
            autoComplete="email"
            spellCheck={false}
            value={state.email}
            onChange={(event) => patch({ email: event.target.value })}
            placeholder={CUSTOMERS.form.emailPlaceholder}
            className={opsInputCompact}
          />
        </OpsFormField>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <OpsFormField label={CUSTOMERS.form.phone} density="compact">
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={state.phone}
            onChange={(event) => patch({ phone: event.target.value })}
            placeholder={CUSTOMERS.form.phonePlaceholder}
            className={opsInputCompact}
          />
        </OpsFormField>
        <div />
      </div>

      <OpsFormField label={CUSTOMERS.form.notes} density="compact">
        <textarea
          value={state.notes}
          onChange={(event) => patch({ notes: event.target.value })}
          rows={3}
          placeholder={CUSTOMERS.form.notesPlaceholder}
          className={`${opsInputCompact} min-h-[72px] resize-y`}
        />
      </OpsFormField>

      <OpsFormField label={CUSTOMERS.form.active} density="compact">
        <label className="inline-flex cursor-pointer select-none items-center gap-2">
          <input
            type="checkbox"
            checked={state.active}
            onChange={(event) => patch({ active: event.target.checked })}
            className="m-0 h-[0.9375rem] w-[0.9375rem] cursor-pointer rounded-[0.25rem] accent-[var(--ripnel-accent)]"
          />
          <span className="text-[0.8125rem] leading-none text-[var(--ops-text-muted)]">
            {CUSTOMERS.form.activeLabel}
          </span>
        </label>
      </OpsFormField>
    </div>
  )
}
