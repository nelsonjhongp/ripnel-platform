export type LoginSubmissionResult =
  | "ignored"
  | "validation_failed"
  | "success"
  | "error"

type RunLoginSubmissionOptions<TValidationError> = {
  isLocked: () => boolean
  lock: () => void
  unlock: () => void
  validate: () => TValidationError | null
  onValidationError: (error: TValidationError) => void
  beforeSubmit: () => void
  executeLogin: () => Promise<void>
  beforeRedirect: () => void
  redirect: () => void | Promise<void>
  onError: (error: unknown) => void
}

export async function runLoginSubmission<TValidationError>({
  isLocked,
  lock,
  unlock,
  validate,
  onValidationError,
  beforeSubmit,
  executeLogin,
  beforeRedirect,
  redirect,
  onError,
}: RunLoginSubmissionOptions<TValidationError>): Promise<LoginSubmissionResult> {
  if (isLocked()) {
    return "ignored"
  }

  const validationError = validate()
  if (validationError) {
    onValidationError(validationError)
    return "validation_failed"
  }

  lock()
  beforeSubmit()

  try {
    await executeLogin()
    beforeRedirect()
    await redirect()
    return "success"
  } catch (error) {
    onError(error)
    return "error"
  } finally {
    unlock()
  }
}
