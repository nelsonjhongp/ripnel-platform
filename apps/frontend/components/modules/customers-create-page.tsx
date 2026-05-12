"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { buildApiUrl } from "@/lib/api"
import { AdminFormPageShell } from "@/components/admin/admin-form-page-shell"
import {
  buildCustomerPayload,
  CustomerForm,
  CustomerFormState,
  EMPTY_FORM,
  validateCustomerInput,
} from "@/components/modules/customer-form"

export default function CustomersCreatePage() {
  const router = useRouter()
  const [state, setState] = useState<CustomerFormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createCustomer() {
    setError(null)
    const validationError = validateCustomerInput(state)

    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(buildApiUrl("/api/customers"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCustomerPayload(state)),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.message || "No se pudo crear el cliente")
      }

      router.push("/clientes")
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo crear el cliente")
    } finally {
      setSubmitting(false)
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
        error={error}
      />
    </AdminFormPageShell>
  )
}
