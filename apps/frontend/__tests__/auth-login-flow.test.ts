import { expect, test } from "@playwright/test"

import {
  createSingleFlightRunner,
  finalizeAuthLoginFlow,
  type AuthLoginPayload,
} from "../components/auth/auth-login-flow"

const basePayload: AuthLoginPayload = {
  user: {
    user_id: "user-1",
    full_name: "Admin Sistema",
    username: "admin",
    must_change_password: false,
  },
  permissions: ["dashboard.view"],
}

test.describe("createSingleFlightRunner", () => {
  test("reuses the same in-flight login request", async () => {
    let calls = 0
    let release!: () => void

    const runner = createSingleFlightRunner(async () => {
      calls += 1
      await new Promise<void>((resolve) => {
        release = resolve
      })
    })

    const first = runner()
    const second = runner()

    expect(calls).toBe(1)
    expect(first).toBe(second)

    release()
    await Promise.all([first, second])
  })

  test("allows a new request after the previous one finishes", async () => {
    let calls = 0
    const runner = createSingleFlightRunner(async () => {
      calls += 1
    })

    await runner()
    await runner()

    expect(calls).toBe(2)
  })
})

test.describe("finalizeAuthLoginFlow", () => {
  test("marks login ready after locations load on first attempt", async () => {
    const events: string[] = []

    await finalizeAuthLoginFlow({
      payload: basePayload,
      fetchLocations: async (userId) => {
        events.push(`fetch:${userId}`)
      },
      setAuthenticatedPending: () => {
        events.push("pending")
      },
      clearLocations: () => {
        events.push("clear")
      },
      setReady: () => {
        events.push("ready")
      },
      handleContextFailure: () => {
        events.push("failed")
      },
    })

    expect(events).toEqual(["pending", "fetch:user-1", "ready"])
  })

  test("skips locations when password change is required", async () => {
    const events: string[] = []

    await finalizeAuthLoginFlow({
      payload: {
        ...basePayload,
        user: {
          ...basePayload.user,
          must_change_password: true,
        },
      },
      fetchLocations: async () => {
        events.push("fetch")
      },
      setAuthenticatedPending: () => {
        events.push("pending")
      },
      clearLocations: () => {
        events.push("clear")
      },
      setReady: () => {
        events.push("ready")
      },
      handleContextFailure: () => {
        events.push("failed")
      },
    })

    expect(events).toEqual(["pending", "clear", "ready"])
  })

  test("fails the login when post-login context cannot load", async () => {
    const events: string[] = []

    await expect(
      finalizeAuthLoginFlow({
        payload: basePayload,
        fetchLocations: async () => {
          events.push("fetch")
          throw new Error("AUTH_CONTEXT_LOAD_FAILED")
        },
        setAuthenticatedPending: () => {
          events.push("pending")
        },
        clearLocations: () => {
          events.push("clear")
        },
        setReady: () => {
          events.push("ready")
        },
        handleContextFailure: () => {
          events.push("failed")
        },
      }),
    ).rejects.toThrow("AUTH_CONTEXT_LOAD_FAILED")

    expect(events).toEqual(["pending", "fetch", "failed"])
  })
})
