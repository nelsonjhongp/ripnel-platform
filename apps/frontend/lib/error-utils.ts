export function explainApiError(
  error: unknown,
  fallback: string,
): string {
  const e = error as { status?: number; message?: string }
  if (!e || typeof e !== "object" || !("status" in e)) {
    return fallback
  }

  if (e.status === 403) {
    return "Tu usuario no tiene permisos para operar ventas en este modulo."
  }

  if (e.status === 409 || e.status === 400) {
    return e.message || fallback
  }

  if (e.status === 401) {
    return "La sesion ya no es valida. Inicia sesion otra vez para continuar."
  }

  return e.message || fallback
}
