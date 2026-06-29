import { expect, test } from "@playwright/test"

import { LOGIN } from "../components/auth/login-messages"
import {
  resolveLoginReasonMessage,
  sanitizeNextHref,
  translateLoginError,
} from "../components/auth/login-utils"

test.describe("resolveLoginReasonMessage", () => {
  test("returns predefined reason messages", () => {
    expect(resolveLoginReasonMessage("session-expired", null)).toBe(LOGIN.reason.sessionExpired)
    expect(resolveLoginReasonMessage("auth-required", null)).toBe(LOGIN.reason.authRequired)
    expect(resolveLoginReasonMessage("forbidden", null)).toBe(LOGIN.reason.forbidden)
  })

  test("falls back to auth message for unknown reason", () => {
    expect(resolveLoginReasonMessage("other", "Aviso actual")).toBe("Aviso actual")
  })
})

test.describe("sanitizeNextHref", () => {
  test("keeps safe internal routes", () => {
    expect(sanitizeNextHref("/inicio")).toBe("/inicio")
    expect(sanitizeNextHref("/ventas/nueva")).toBe("/ventas/nueva")
  })

  test("falls back for empty or external targets", () => {
    expect(sanitizeNextHref(null)).toBe("/inicio")
    expect(sanitizeNextHref("https://example.com")).toBe("/inicio")
    expect(sanitizeNextHref("ventas/nueva")).toBe("/inicio")
  })
})

test.describe("translateLoginError", () => {
  test("maps invalid credentials from backend", () => {
    expect(translateLoginError(new Error("Invalid credentials"))).toBe(
      LOGIN.error.invalidCredentials,
    )
  })

  test("maps missing credentials from backend", () => {
    expect(translateLoginError(new Error("Username and password are required"))).toBe(
      LOGIN.error.missingCredentials,
    )
  })

  test("maps context bootstrap failures to a recoverable login message", () => {
    expect(translateLoginError(new Error("AUTH_CONTEXT_LOAD_FAILED"))).toBe(
      LOGIN.error.contextLoadFailed,
    )
  })

  test("uses shared api error explanation for session errors", () => {
    expect(
      translateLoginError({ status: 401, message: "Not authenticated" }),
    ).toBe(LOGIN.error.invalidSession)
  })

  test("returns fallback for unknown errors", () => {
    expect(translateLoginError("unexpected")).toBe(LOGIN.error.fallback)
  })

  test("never returns an undefined message", () => {
    expect(translateLoginError(new Error("Username and password are required"))).toBeTruthy()
    expect(translateLoginError(new Error("AUTH_CONTEXT_LOAD_FAILED"))).toBeTruthy()
  })
})
