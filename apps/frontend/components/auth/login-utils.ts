import { explainApiError } from "@/lib/error-utils"
import { LOGIN, type LoginReason } from "@/components/auth/login-messages"

const reasonMessageMap: Record<LoginReason, string> = {
  "session-expired": LOGIN.reason.sessionExpired,
  "auth-required": LOGIN.reason.authRequired,
  forbidden: LOGIN.reason.forbidden,
}

export function resolveLoginReasonMessage(
  reason: string | null | undefined,
  authMessage: string | null | undefined,
): string | null {
  if (reason && reason in reasonMessageMap) {
    return reasonMessageMap[reason as LoginReason]
  }

  return authMessage ?? null
}

export function sanitizeNextHref(nextPath: string | null | undefined): string {
  return nextPath?.startsWith("/") ? nextPath : "/inicio"
}

export function translateLoginError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === "Invalid credentials") {
      return LOGIN.error.invalidCredentials
    }

    if (error.message === "Username and password are required") {
      return LOGIN.error.missingCredentials
    }

    if (error.message === "AUTH_CONTEXT_LOAD_FAILED") {
      return LOGIN.error.contextLoadFailed
    }
  }

  const explained = explainApiError(error, LOGIN.error.fallback)

  if (explained === "La sesion ya no es valida. Inicia sesion otra vez para continuar.") {
    return LOGIN.error.invalidSession
  }

  return explained
}
