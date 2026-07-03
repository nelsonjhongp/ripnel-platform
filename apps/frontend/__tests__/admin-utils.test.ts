import { expect, test } from "@playwright/test"

import { validateUserInput } from "../components/modules/administration/admin-utils"
import { ADMIN } from "../components/modules/administration/admin-messages"

const baseUserInput = {
  full_name: "Usuario Prueba",
  username: "usuario_prueba",
  email: "",
  role_id: "role-1",
  location_ids: ["location-1"],
  default_location_id: "location-1",
}

test.describe("validateUserInput", () => {
  test("keeps required-field errors for create mode", () => {
    expect(
      validateUserInput(
        {
          full_name: "",
          username: "",
          email: "",
          role_id: "",
          location_ids: [],
          default_location_id: "",
        },
        false,
      ),
    ).toEqual({
      full_name: ADMIN.errors.user.fullNameRequired,
      username: ADMIN.errors.user.usernameRequired,
      role_id: ADMIN.errors.user.roleRequired,
      location_ids: ADMIN.errors.user.locationsRequired,
    })
  })

  test("requires a default location when at least one location is assigned", () => {
    expect(
      validateUserInput(
        {
          ...baseUserInput,
          default_location_id: "",
        },
        false,
      ),
    ).toEqual({
      default_location_id: ADMIN.errors.user.defaultLocationRequired,
    })
  })

  test("validates optional email only when provided", () => {
    expect(validateUserInput(baseUserInput, false)).toBeNull()
    expect(validateUserInput({ ...baseUserInput, email: "correo-invalido" }, false)).toEqual({
      email: ADMIN.errors.user.emailInvalid,
    })
  })

  test("does not require role or locations in edit mode", () => {
    expect(
      validateUserInput(
        {
          ...baseUserInput,
          role_id: "",
          location_ids: [],
          default_location_id: "",
        },
        true,
      ),
    ).toBeNull()
  })
})
