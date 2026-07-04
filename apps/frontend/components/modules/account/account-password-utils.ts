import { ACC } from "./account-messages"

export type PasswordForm = {
  current_password: string
  new_password: string
  confirm_password: string
}

export type PasswordFormErrors = {
  _form?: string
  current_password?: string
  new_password?: string
  confirm_password?: string
}

export type PasswordChecklistState = {
  hasMinLength: boolean
  hasLetter: boolean
  hasNumber: boolean
}

export const emptyPasswordForm: PasswordForm = {
  current_password: "",
  new_password: "",
  confirm_password: "",
}

export function derivePasswordChecklist(password: string): PasswordChecklistState {
  return {
    hasMinLength: password.length >= 10,
    hasLetter: /[A-Za-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  }
}

export function validatePasswordChangeInput(
  input: PasswordForm,
  mode: "auth" | "settings" = "settings",
): PasswordFormErrors | null {
  const errors: PasswordFormErrors = {}
  const checklist = derivePasswordChecklist(input.new_password)

  if (!input.current_password) {
    errors.current_password = ACC.security.errors.currentRequired
  }

  if (!input.new_password) {
    errors.new_password = ACC.security.errors.newRequired
  } else if (!checklist.hasMinLength) {
    errors.new_password = ACC.security.errors.tooShort
  } else if (!checklist.hasLetter) {
    errors.new_password = ACC.security.errors.missingLetter
  } else if (!checklist.hasNumber) {
    errors.new_password = ACC.security.errors.missingNumber
  } else if (input.current_password && input.new_password === input.current_password) {
    errors.new_password = ACC.security.errors.sameAsCurrent
  }

  if (mode === "settings") {
    if (!input.confirm_password) {
      errors.confirm_password = ACC.security.errors.confirmRequired
    } else if (input.new_password && input.new_password !== input.confirm_password) {
      errors.confirm_password = ACC.security.mismatch
    }
  }

  return Object.keys(errors).length > 0 ? errors : null
}

export function mapPasswordChangeError(error: unknown): PasswordFormErrors {
  const message = error instanceof Error ? error.message : ACC.security.error

  if (/current password is invalid/i.test(message)) {
    return { current_password: ACC.security.errors.currentInvalid }
  }

  if (/current password and new password are required/i.test(message)) {
    return { _form: ACC.security.errors.requiredFields }
  }

  if (/at least 10 characters|at least 8 characters/i.test(message)) {
    return { new_password: ACC.security.errors.tooShort }
  }

  if (/include at least one letter and one number/i.test(message)) {
    return { new_password: ACC.security.errors.missingLetterOrNumber }
  }

  if (/different from current password/i.test(message)) {
    return { new_password: ACC.security.errors.sameAsCurrent }
  }

  return { _form: ACC.security.error }
}
