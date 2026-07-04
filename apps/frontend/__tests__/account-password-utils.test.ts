import { expect, test } from "@playwright/test"

import {
  derivePasswordChecklist,
  validatePasswordChangeInput,
  mapPasswordChangeError,
} from "../components/modules/account/account-password-utils"
import { ACC } from "../components/modules/account/account-messages"

const validInput = {
  current_password: "Temporal22!",
  new_password: "NuevaClave22",
  confirm_password: "NuevaClave22",
}

test.describe("account password validation", () => {
  test("derives checklist state for password requirements", () => {
    expect(derivePasswordChecklist("abc")).toEqual({
      hasMinLength: false,
      hasLetter: true,
      hasNumber: false,
    })
    expect(derivePasswordChecklist("NuevaClave22")).toEqual({
      hasMinLength: true,
      hasLetter: true,
      hasNumber: true,
    })
  })

  test("rejects short password", () => {
    expect(validatePasswordChangeInput({ ...validInput, new_password: "Clave22", confirm_password: "Clave22" }, "settings")).toEqual({
      new_password: ACC.security.errors.tooShort,
    })
  })

  test("rejects password without a letter", () => {
    expect(validatePasswordChangeInput({ ...validInput, new_password: "1234567890", confirm_password: "1234567890" }, "settings")).toEqual({
      new_password: ACC.security.errors.missingLetter,
    })
  })

  test("rejects password without a number", () => {
    expect(validatePasswordChangeInput({ ...validInput, new_password: "NuevaClave", confirm_password: "NuevaClave" }, "settings")).toEqual({
      new_password: ACC.security.errors.missingNumber,
    })
  })

  test("rejects mismatched confirmation", () => {
    expect(validatePasswordChangeInput({ ...validInput, confirm_password: "OtraClave22" }, "settings")).toEqual({
      confirm_password: ACC.security.mismatch,
    })
  })

  test("accepts a valid password change input", () => {
    expect(validatePasswordChangeInput(validInput)).toBeNull()
  })

  test("skips confirm validation in auth mode (first-time login)", () => {
    expect(validatePasswordChangeInput({
      current_password: "Temporal22!",
      new_password: "NuevaClave22",
      confirm_password: "",
    }, "auth")).toBeNull()
  })

  test("still validates new password requirements in auth mode", () => {
    expect(validatePasswordChangeInput({
      current_password: "Temporal22!",
      new_password: "Clave22",
      confirm_password: "",
    }, "auth")).toEqual({
      new_password: ACC.security.errors.tooShort,
    })
  })

  test("maps backend password errors to field messages", () => {
    expect(mapPasswordChangeError(new Error("Current password is invalid"))).toEqual({
      current_password: ACC.security.errors.currentInvalid,
    })
    expect(mapPasswordChangeError(new Error("New password must be different from current password"))).toEqual({
      new_password: ACC.security.errors.sameAsCurrent,
    })
  })
})
