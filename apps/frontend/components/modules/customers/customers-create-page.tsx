"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { apiFetchData } from "@/lib/api"
import { AdminFormPageShell } from "@/components/admin/admin-form-page-shell"
import {
  buildCustomerPayload,
  CustomerForm,
  CustomerFormState,
  EMPTY_FORM,
  validateCustomerInput,
} from "./customer-form"
import {
  findDuplicateCustomerByDocument,
  mapCustomerSaveError,
} from "./customer-document-guard"

export default function CustomersCreatePage() {
  const router = useRouter()
  const [state, setState] = useState<CustomerFormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submissionState, setSubmissionState] = useState<"idle" | "validating" | "saving">("idle")
  const [error, setError] = useState<string | null>(null)

  async function createCustomer() {
    setError(null)
    const validationError = validateCustomerInput(state)

    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setSubmissionState("validating")

    try {
      const duplicateCustomer = await findDuplicateCustomerByDocument({
        documentType: state.document_type,
        documentNumber: state.document_number,
      })

      if (duplicateCustomer) {
        setError("Ya existe un cliente con este documento.")
        return
      }

      setSubmissionState("saving")
      await apiFetchData("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCustomerPayload(state)),
      })

      router.push("/clientes")
    } catch (submitError: unknown) {
      setError(mapCustomerSaveError(submitError))
    } finally {
      setSubmitting(false)
      setSubmissionState("idle")
    }
  }

  return (
    <AdminFormPageShell eyebrow="Clientes" title="Nuevo cliente" backHref="/clientes" backLabel="Volver">
      <CustomerForm
        mode="create"
        state={state}
        onChange={setState}
        onSubmit={createCustomer}
        onCancel={() => router.push("/clientes")}
        submitLabel="Crear cliente"
        submitting={submitting}
        submissionState={submissionState}
        error={error}
      />
    </AdminFormPageShell>
  )
}
