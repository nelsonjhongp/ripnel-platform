import { ApiError, formatApiFetchError } from "@/lib/api"
import type {
  UserFormState,
  UserFormErrors,
  RoleFormState,
  RoleFormErrors,
  LocationFormState,
  LocationFormErrors,
  Role,
  User,
} from "./admin-types"
import { ADMIN } from "./admin-messages"

function trimOrNull(value: string) {
  const normalized = value.trim()
  return normalized.length ? normalized : null
}

export function validateUserInput(
  input: Pick<UserFormState, "full_name" | "username" | "email" | "role_id" | "location_ids" | "default_location_id">,
  isEdit: boolean,
): UserFormErrors | null {
  const errors: UserFormErrors = {}

  if (!input.full_name.trim()) {
    errors.full_name = ADMIN.errors.user.fullNameRequired
  }

  if (!input.username.trim()) {
    errors.username = ADMIN.errors.user.usernameRequired
  }

  if (input.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    errors.email = ADMIN.errors.user.emailInvalid
  }

  if (!isEdit) {
    if (!input.role_id) {
      errors.role_id = ADMIN.errors.user.roleRequired
    }

    if (input.location_ids.length === 0) {
      errors.location_ids = ADMIN.errors.user.locationsRequired
    }

    if (input.location_ids.length > 0 && !input.default_location_id) {
      errors.default_location_id = ADMIN.errors.user.defaultLocationRequired
    }
  }

  return Object.keys(errors).length > 0 ? errors : null
}

export function buildUserPayload(input: UserFormState) {
  return {
    full_name: input.full_name.trim(),
    username: input.username.trim(),
    email: trimOrNull(input.email),
    role_id: input.role_id || null,
    active: input.active,
  }
}

export function buildUserCreatePayload(input: UserFormState) {
  return {
    ...buildUserPayload(input),
    role_id: input.role_id,
    assignments: input.location_ids.map((location_id) => ({
      location_id,
      is_default: input.default_location_id === location_id,
    })),
  }
}

export function toUserFormState(user: User): UserFormState {
  return {
    full_name: user.full_name,
    username: user.username,
    email: user.email || "",
    role_id: user.role_id || "",
    active: user.active,
    location_ids: [],
    default_location_id: "",
  }
}

export function mapUserSaveError(error: unknown): UserFormErrors {
  if (error instanceof ApiError && error.status === 409) {
    const msg = error.message.toLowerCase()
    if (msg.includes("username")) {
      return { username: ADMIN.errors.user.usernameExists }
    }
    if (msg.includes("email")) {
      return { email: ADMIN.errors.user.emailExists }
    }
  }

  const message = formatApiFetchError(error, ADMIN.dialog.saving)
  if (/username already exists/i.test(message) || /ya existe.*usuario/i.test(message)) {
    return { username: ADMIN.errors.user.usernameExists }
  }
  if (/email already exists/i.test(message) || /ya existe.*email/i.test(message)) {
    return { email: ADMIN.errors.user.emailExists }
  }

  return { _form: message }
}

export function validateRoleInput(
  input: Pick<RoleFormState, "name">,
): RoleFormErrors | null {
  const errors: RoleFormErrors = {}

  if (!input.name.trim()) {
    errors.name = ADMIN.errors.role.nameRequired
  }

  return Object.keys(errors).length > 0 ? errors : null
}

export function buildRolePayload(input: RoleFormState) {
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    active: input.active,
    permission_keys: input.permission_keys,
  }
}

export function toRoleFormState(role: Role): RoleFormState {
  return {
    name: role.name,
    description: role.description || "",
    active: role.active,
    permission_keys: role.permissions.map((p) => p.key),
  }
}

export function mapRoleSaveError(error: unknown): RoleFormErrors {
  if (error instanceof ApiError && error.status === 409) {
    return { name: ADMIN.errors.role.nameExists }
  }

  const message = formatApiFetchError(error, ADMIN.dialog.saving)
  if (/role name already exists/i.test(message) || /ya existe.*rol/i.test(message)) {
    return { name: ADMIN.errors.role.nameExists }
  }

  return { _form: message }
}

export function validateLocationInput(
  input: Pick<LocationFormState, "name" | "type">,
  isEdit: boolean,
): LocationFormErrors | null {
  const errors: LocationFormErrors = {}

  if (!input.name.trim()) {
    errors.name = ADMIN.errors.location.nameRequired
  }

  if (!isEdit && !input.type) {
    errors.type = ADMIN.errors.location.typeRequired
  }

  return Object.keys(errors).length > 0 ? errors : null
}

export function buildLocationCreatePayload(input: LocationFormState) {
  return {
    name: input.name.trim(),
    type: input.type,
    code: null,
    address: trimOrNull(input.address),
    active: input.active,
  }
}

export function buildLocationEditPayload(input: LocationFormState) {
  return {
    name: input.name.trim(),
    address: trimOrNull(input.address),
    active: input.active,
  }
}

export function toLocationFormState(location: {
  name: string
  type: string
  address: string | null
  active: boolean
}): LocationFormState {
  return {
    name: location.name,
    type: location.type as LocationFormState["type"],
    address: location.address || "",
    active: location.active,
  }
}

export function mapLocationSaveError(error: unknown): LocationFormErrors {
  if (error instanceof ApiError && error.status === 409) {
    return { name: ADMIN.errors.location.codeExists }
  }

  const message = formatApiFetchError(error, ADMIN.dialog.saving)
  if (/location code already exists/i.test(message) || /ya existe.*codigo/i.test(message)) {
    return { name: ADMIN.errors.location.codeExists }
  }

  return { _form: message }
}

export function formatPermissionChip(permission: { key: string; description: string | null }) {
  if (permission.description?.trim()) {
    return permission.description.trim()
  }

  return permission.key
    .split(".")
    .slice(1)
    .join(" ")
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}