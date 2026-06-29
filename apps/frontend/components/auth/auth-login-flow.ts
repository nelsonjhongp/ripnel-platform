import type { AuthUser } from "@/components/auth/AuthProvider"

export type AuthLoginPayload = {
  user: AuthUser
  permissions: string[]
}

type FinalizeAuthLoginFlowOptions = {
  payload: AuthLoginPayload
  fetchLocations: (userId: string) => Promise<void>
  setAuthenticatedPending: (payload: AuthLoginPayload) => void
  clearLocations: () => void
  setReady: () => void
  handleContextFailure: (error: unknown) => Promise<void> | void
}

export async function finalizeAuthLoginFlow({
  payload,
  fetchLocations,
  setAuthenticatedPending,
  clearLocations,
  setReady,
  handleContextFailure,
}: FinalizeAuthLoginFlowOptions): Promise<void> {
  setAuthenticatedPending(payload)

  if (payload.user.must_change_password) {
    clearLocations()
    setReady()
    return
  }

  try {
    await fetchLocations(payload.user.user_id)
    setReady()
  } catch (error) {
    await handleContextFailure(error)
    throw error
  }
}

export function createSingleFlightRunner<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
) {
  let inFlight: Promise<TResult> | null = null

  return (...args: TArgs): Promise<TResult> => {
    if (inFlight) {
      return inFlight
    }

    let nextPromise: Promise<TResult>

    try {
      nextPromise = action(...args)
    } catch (error) {
      nextPromise = Promise.reject(error)
    }

    const wrappedPromise = nextPromise.finally(() => {
      if (inFlight === wrappedPromise) {
        inFlight = null
      }
    })

    inFlight = wrappedPromise
    return wrappedPromise
  }
}
