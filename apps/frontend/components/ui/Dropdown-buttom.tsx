"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export type DropdownButtomOption = {
  value: string
  label: string
}

type DropdownButtomProps = {
  label: string
  id: string
  options: DropdownButtomOption[]
  placeholder?: string
  className?: string
  storageKey?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

export function DropdownButtom({
  label,
  id,
  options,
  placeholder = "Selecciona una opcion",
  className,
  storageKey,
  defaultValue = "",
  onValueChange,
}: DropdownButtomProps) {
  const [value, setValue] = React.useState(defaultValue)

  React.useEffect(() => {
    if (!storageKey || typeof window === "undefined") return
    const storedValue = localStorage.getItem(storageKey)
    if (storedValue !== null) {
      setValue(storedValue)
    }
  }, [storageKey])

  React.useEffect(() => {
    if (!storageKey || typeof window === "undefined") return
    localStorage.setItem(storageKey, value)
  }, [storageKey, value])

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextValue = event.target.value
    setValue(nextValue)
    onValueChange?.(nextValue)
  }

  return (
    <div className={cn("mt-3", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={handleChange}
        className="mt-1 block w-full rounded-2xl border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default DropdownButtom
