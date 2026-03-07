"use client"

import * as React from "react"
import FormField from "@/components/ui/FormField"

export function SedeSelector() {
  const [sede, setSede] = React.useState("")

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sede") || ""
      setSede(stored)
    }
  }, [])

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sede", sede)
    }
  }, [sede])

  return (
    <div className="mt-3">
      <FormField label="Sede" type="select" id="sede-sidebar" defaultValue={sede}>
        <option value="">Selecciona una sede</option>
        <option value="Almacen">Almacén</option>
        <option value="Tienda 1">Tienda 1</option>
        <option value="Tienda 2">Tienda 2</option>
      </FormField>
    </div>
  )
}

export default SedeSelector
