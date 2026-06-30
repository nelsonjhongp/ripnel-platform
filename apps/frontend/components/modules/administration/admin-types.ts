export type Role = {
  role_id: string
  name: string
  description: string | null
  active: boolean
  created_at: string
  updated_at: string
  permissions: RolePermission[]
}

export type RolePermission = {
  permission_id: string
  key: string
  description: string | null
}

export type User = {
  user_id: string
  full_name: string
  username: string
  email: string | null
  role_id: string | null
  role_name?: string | null
  active: boolean
  must_change_password?: boolean
  password_changed_at?: string | null
  created_at: string
  updated_at: string
  temporary_password?: string
}

export type Location = {
  location_id: string
  name: string
  code: string | null
  type: LocationType
  address: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export type LocationType = "store" | "warehouse" | "workshop" | "third_party"

export type UserLocationAssignment = {
  location_id: string
  is_default: boolean
  location: Location
}

export type UserLocationsPayload = {
  user: Pick<User, "user_id" | "full_name" | "email" | "role_id" | "active">
  default_location_id: string | null
  assignments: UserLocationAssignment[]
}

export type UserFormState = {
  full_name: string
  username: string
  email: string
  role_id: string
  active: boolean
  location_ids: string[]
  default_location_id: string
}

export type UserFormErrors = {
  _form?: string
  full_name?: string
  username?: string
  email?: string
  role_id?: string
  location_ids?: string
  default_location_id?: string
}

export type RoleFormState = {
  name: string
  description: string
  active: boolean
  permission_keys: string[]
}

export type RoleFormErrors = {
  _form?: string
  name?: string
}

export type LocationFormState = {
  name: string
  type: LocationType
  address: string
  active: boolean
}

export type LocationFormErrors = {
  _form?: string
  name?: string
  type?: string
}

export const EMPTY_USER_FORM: UserFormState = {
  full_name: "",
  username: "",
  email: "",
  role_id: "",
  active: true,
  location_ids: [],
  default_location_id: "",
}

export const EMPTY_ROLE_FORM: RoleFormState = {
  name: "",
  description: "",
  active: true,
  permission_keys: [],
}

export const EMPTY_LOCATION_FORM: LocationFormState = {
  name: "",
  type: "store",
  address: "",
  active: true,
}

export const LOCATION_TYPE_OPTIONS = [
  { value: "store", label: "Tienda" },
  { value: "warehouse", label: "Almacén" },
  { value: "workshop", label: "Taller" },
  { value: "third_party", label: "Tercero" },
] as const