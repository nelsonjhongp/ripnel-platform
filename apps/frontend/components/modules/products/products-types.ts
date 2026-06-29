import type { CatalogItem } from "@/types/products"

export type ProductCreateCatalogItem = CatalogItem & {
  garment_type_id?: string
  size_id?: string
  color_id?: string
}

export type ExistingProductStyle = {
  style_id: string
  name: string
  style_code: string | null
}

export type ProductNameDuplicateIndex = Map<string, ExistingProductStyle>

export type CreatedProductStyle = {
  style_id: string
  style_code: string | null
  name: string
}

export type GeneratedProductVariants = {
  created_count: number
  existing_count: number
  total_possible: number
}

export type ProductCreateFormState = {
  name: string
  garment_type_id: string
  description: string
  size_ids: string[]
  use_unique_color: boolean
  color_ids: string[]
}

export type ProductCreateFormErrors = {
  _form?: string
  name?: string
  garment_type_id?: string
  description?: string
  size_ids?: string
  color_ids?: string
}

export type ProductCreateFieldName = Exclude<keyof ProductCreateFormErrors, "_form">

export type ProductCreateReadiness = {
  missingLabels: string[]
  statusLabel: string
  ready: boolean
}

export type ProductCreateActionState = "idle" | "validating" | "saving"

export type ProductCreateValidationContext = {
  activeSizeCount?: number
  manualColorCount?: number
}
