"use client"

import { useEffect, useRef, useState } from "react"
import { CalendarRange } from "lucide-react"
import { format, parse, isValid } from "date-fns"
import { es } from "date-fns/locale"

import { Calendar } from "@/components/ui/calendar"
import { opsFieldLabelClassName } from "@/components/ui/ops-control-styles"
import { cn } from "@/lib/utils"

type DateFilterPickerProps = {
  label: string
  value: string
  onChange: (nextValue: string) => void
  placeholder?: string
  ariaLabel?: string
  min?: string
  max?: string
  density?: "default" | "compact"
}

function parseDateValue(value: string) {
  if (!value) return undefined
  const parsed = parse(value, "yyyy-MM-dd", new Date())
  return isValid(parsed) ? parsed : undefined
}

function formatDateValue(value: string, placeholder: string) {
  const parsed = parseDateValue(value)
  if (!parsed) return placeholder
  return format(parsed, "dd/MM/yyyy", { locale: es })
}

function toDateValue(date: Date | undefined) {
  if (!date || Number.isNaN(date.getTime())) return ""
  return format(date, "yyyy-MM-dd")
}

export function DateFilterPicker({
  label,
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  ariaLabel,
  min,
  max,
  density,
}: DateFilterPickerProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const selectedDate = parseDateValue(value)
  const minDate = parseDateValue(min || "")
  const maxDate = parseDateValue(max || "")
  const buttonLabel = formatDateValue(value, placeholder)
  const height = density === "compact" ? "h-9" : "h-10"

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current) return
      if (rootRef.current.contains(event.target as Node)) return
      setOpen(false)
    }

    if (!open) return

    document.addEventListener("mousedown", handlePointerDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <label className={`mb-1 ${opsFieldLabelClassName}`}>
        {label}
      </label>

      <button
        type="button"
        aria-label={ariaLabel || label}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`sales-field sales-field-interactive flex ${height} w-full items-center gap-2 rounded-lg px-3 text-left`}
      >
        <CalendarRange className="h-4 w-4 text-[var(--ops-text-muted)]" />
        <span
          className={cn(
            "flex-1 text-sm",
            value ? "text-[var(--ops-text)]" : "text-[var(--ops-text-muted)]"
          )}
        >
          {buttonLabel}
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.375rem)] z-50 rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] shadow-lg">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              onChange(toDateValue(date))
              setOpen(false)
            }}
            defaultMonth={selectedDate}
            locale={es}
            disabled={(date) => {
              if (minDate && date < minDate) return true
              if (maxDate && date > maxDate) return true
              return false
            }}
            className="border-0"
          />
        </div>
      ) : null}
    </div>
  )
}

export default DateFilterPicker
