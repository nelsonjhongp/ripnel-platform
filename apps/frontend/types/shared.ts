export type Location = {
  location_id: string
  code: string | null
  name: string
  type: string | null
  address: string | null
  active: boolean
  is_default?: boolean
}

export type InventoryItem = {
  location_id: string
  location_code: string
  location_name: string
  variant_id: string
  sku: string
  style_code: string
  style_name: string
  garment_type_name: string | null
  size_code: string
  color_name: string
  qty: number
}
