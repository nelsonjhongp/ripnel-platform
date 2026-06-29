import { expect, test } from "@playwright/test"

import { runLoginSubmission } from "../components/auth/login-submission"

test.describe("runLoginSubmission", () => {
  test("ignores a second submit while the first is still running", async () => {
    let locked = false
    let loginCalls = 0
    let redirectCalls = 0
    let release!: () => void

    const first = runLoginSubmission({
      isLocked: () => locked,
      lock: () => {
        locked = true
      },
      unlock: () => {
        locked = false
      },
      validate: () => null,
      onValidationError: () => {},
      beforeSubmit: () => {},
      executeLogin: async () => {
        loginCalls += 1
        await new Promise<void>((resolve) => {
          release = resolve
        })
      },
      beforeRedirect: () => {},
      redirect: async () => {
        redirectCalls += 1
      },
      onError: () => {},
    })

    const second = await runLoginSubmission({
      isLocked: () => locked,
      lock: () => {
        locked = true
      },
      unlock: () => {
        locked = false
      },
      validate: () => null,
      onValidationError: () => {},
      beforeSubmit: () => {},
      executeLogin: async () => {
        loginCalls += 1
      },
      beforeRedirect: () => {},
      redirect: async () => {
        redirectCalls += 1
      },
      onError: () => {},
    })

    expect(second).toBe("ignored")
    expect(loginCalls).toBe(1)

    release()
    await first

    expect(redirectCalls).toBe(1)
  })

  test("stops before login when validation fails", async () => {
    let capturedError: { username: string } | null = null

    const result = await runLoginSubmission({
      isLocked: () => false,
      lock: () => {},
      unlock: () => {},
      validate: () => ({ username: "Requerido" }),
      onValidationError: (error) => {
        capturedError = error
      },
      beforeSubmit: () => {
        throw new Error("should not submit")
      },
      executeLogin: async () => {
        throw new Error("should not login")
      },
      beforeRedirect: () => {
        throw new Error("should not redirect")
      },
      redirect: () => {},
      onError: () => {},
    })

    expect(result).toBe("validation_failed")
    expect(capturedError).toEqual({ username: "Requerido" })
  })

  test("reports errors and unlocks the form for retry", async () => {
    let locked = false
    let reported: string | null = null

    const result = await runLoginSubmission({
      isLocked: () => locked,
      lock: () => {
        locked = true
      },
      unlock: () => {
        locked = false
      },
      validate: () => null,
      onValidationError: () => {},
      beforeSubmit: () => {},
      executeLogin: async () => {
        throw new Error("Invalid credentials")
      },
      beforeRedirect: () => {},
      redirect: () => {},
      onError: (error) => {
        reported = error instanceof Error ? error.message : "unknown"
      },
    })

    expect(result).toBe("error")
    expect(reported).toBe("Invalid credentials")
    expect(locked).toBe(false)
  })
})
