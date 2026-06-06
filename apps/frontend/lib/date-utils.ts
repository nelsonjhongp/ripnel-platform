export function formatDateTime(
  value: string | null | undefined,
  fallback?: string | null
) {
  const source = value || fallback
  if (!source) return "-"

  const parsed = new Date(source)
  if (Number.isNaN(parsed.getTime())) {
    return String(source)
  }

  return parsed.toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Lima",
  })
}

export function formatDate(
  value: string | null | undefined,
  fallback?: string | null
) {
  const source = value || fallback
  if (!source) return "-"

  const parsed = new Date(source)
  if (Number.isNaN(parsed.getTime())) {
    return String(source)
  }

  return parsed.toLocaleDateString("es-PE", { timeZone: "America/Lima" })
}

export function formatTime(
  value: string | null | undefined,
  fallback?: string | null
) {
  const source = value || fallback
  if (!source) return "-"

  const parsed = new Date(source)
  if (Number.isNaN(parsed.getTime())) {
    return String(source)
  }

  return parsed.toLocaleTimeString("es-PE", {
    timeStyle: "short",
    timeZone: "America/Lima",
  })
}

export function formatDateTimeParts(value: string | null | undefined) {
  if (!value) return { date: "-", time: "" }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return { date: String(value), time: "" }
  }

  return {
    date: parsed.toLocaleDateString("es-PE", { timeZone: "America/Lima" }),
    time: parsed.toLocaleTimeString("es-PE", {
      timeStyle: "short",
      timeZone: "America/Lima",
    }),
  }
}
