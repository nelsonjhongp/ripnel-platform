export type UserFormState = {
  full_name: string
  username: string
  email: string
  role_id: string
  active: boolean
  location_ids: string[]
  default_location_id: string
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

export type RoleFormState = {
  name: string
  description: string
  active: boolean
  permission_keys: string[]
}

export const EMPTY_ROLE_FORM: RoleFormState = {
  name: "",
  description: "",
  active: true,
  permission_keys: [],
}

export type LocationType = "store" | "warehouse" | "workshop" | "third_party"

export type LocationFormState = {
  name: string
  type: LocationType
  address: string
  active: boolean
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
