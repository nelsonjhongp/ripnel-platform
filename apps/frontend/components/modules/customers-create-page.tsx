"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { Button } from "@/components/ui/button"
import { buildApiUrl } from "@/lib/api"
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
    <section className="ops-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <PosHeader
          eyebrow="Clientes"
          title="Nuevo cliente"
          actions={
            <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
              <Link href="/clientes">Volver al listado</Link>
            </Button>
          }
        />

        <div className="rounded-2xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-5 shadow-sm">
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
        </div>
      </div>
    </section>
  )
}
