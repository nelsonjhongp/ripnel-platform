"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { buildApiUrl } from "@/lib/api"
import { AdminFormPageShell } from "@/components/admin/admin-form-page-shell"
import {
  AdminActionButton,
  AdminCheckboxRow,
  AdminField,
  AdminFormActionsBar,
  AdminInput,
  AdminInlineMessage,
  AdminSection,
  AdminSelect,
} from "@/components/admin/admin-ui"

type LocationType = "store" | "warehouse" | "workshop" | "third_party"

type FormState = {
  name: string
  type: LocationType
  address: string
  active: boolean
}

const initialFormState: FormState = {
  name: "",
  type: "store",
  address: "",
  active: true,
}

const locationTypeOptions = [
  { value: "store", label: "Tienda" },
  { value: "warehouse", label: "Almacén" },
  { value: "workshop", label: "Taller" },
  { value: "third_party", label: "Tercero" },
] as const

export default function LocationsCreatePage() {
  const router = useRouter()
  const [formState, setFormState] = useState<FormState>(initialFormState)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(buildApiUrl("/api/locations"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formState.name,
          type: formState.type,
          code: null,
          address: formState.address.trim() || null,
          active: formState.active,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || "No se pudo crear la ubicación")
      }

      router.push("/administracion/ubicaciones")
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo crear la ubicación")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AdminFormPageShell
      eyebrow="Administración"
      title="Nueva sede"
      backHref="/administracion/ubicaciones"
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? (
          <AdminInlineMessage tone="danger">{error}</AdminInlineMessage>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-5">
            <AdminSection title="Identidad de la sede">
              <div className="space-y-4">
                <AdminField label="Nombre">
                  <AdminInput
                    value={formState.name}
                    onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Tienda Centro"
                    autoComplete="off"
                    required
                  />
                </AdminField>

                <AdminField label="Tipo" htmlFor="location-type">
                  <AdminSelect
                    id="location-type"
                    value={formState.type}
                    onChange={(event) => setFormState((current) => ({ ...current, type: event.target.value as LocationType }))}
                  >
                    {locationTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </AdminSelect>
                </AdminField>
              </div>
            </AdminSection>
          </div>

          <div className="space-y-5">
            <AdminSection title="Operación">
              <div className="space-y-4">
                <AdminField label="Dirección">
                  <AdminInput
                    value={formState.address}
                    onChange={(event) => setFormState((current) => ({ ...current, address: event.target.value }))}
                    placeholder="Av. Ejemplo 123, Lima"
                    autoComplete="off"
                  />
                </AdminField>

                <AdminCheckboxRow
                  label="Crear como sede activa"
                  description="Quedará disponible para asignaciones y operación apenas se guarde."
                  checked={formState.active}
                  onChange={(checked) => setFormState((current) => ({ ...current, active: checked }))}
                />
              </div>
            </AdminSection>
          </div>
        </div>

        <AdminFormActionsBar>
          <AdminActionButton
            type="button"
            onClick={() => router.push("/administracion/ubicaciones")}
            disabled={submitting}
          >
            Cancelar
          </AdminActionButton>
          <AdminActionButton type="submit" tone="accent" disabled={submitting}>
            {submitting ? "Guardando..." : "Crear sede"}
          </AdminActionButton>
        </AdminFormActionsBar>
      </form>
    </AdminFormPageShell>
  )
}
