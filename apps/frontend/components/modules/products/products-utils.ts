import { PRODUCTS } from "./products-messages"
import type {
  ExistingProductStyle,
  ProductNameDuplicateIndex,
  ProductCreateCatalogItem,
  ProductCreateFieldName,
  ProductCreateFormErrors,
  ProductCreateReadiness,
  ProductCreateFormState,
  ProductCreateValidationContext,
} from "./products-types"

export const PRODUCT_DESCRIPTION_MAX_LENGTH = 240

export const EMPTY_PRODUCT_CREATE_FORM: ProductCreateFormState = {
  name: "",
  garment_type_id: "",
  description: "",
  size_ids: [],
  use_unique_color: false,
  color_ids: [],
}

export const PRODUCT_CREATE_FIELD_IDS: Record<ProductCreateFieldName, string> = {
  name: "product-create-name",
  garment_type_id: "product-create-garment-type",
  description: "product-create-description",
  size_ids: "product-create-sizes",
  color_ids: "product-create-colors",
}

const PRODUCT_CREATE_ERROR_FIELD_ORDER: ProductCreateFieldName[] = [
  "name",
  "garment_type_id",
  "size_ids",
  "color_ids",
  "description",
]

export function normalizeProductComparableText(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
}

export function normalizeProductNameInput(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

export function getProductCatalogItemId(
  item: ProductCreateCatalogItem,
  keys: Array<keyof ProductCreateCatalogItem>,
) {
  for (const key of keys) {
    const value = item[key]
    if (value) return String(value)
  }

  return ""
}

export function toggleProductCreateSelection(list: string[], value: string) {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value]
}

export function calculateProjectedVariants(sizeCount: number, colorCount: number) {
  return Math.max(0, sizeCount) * Math.max(1, colorCount)
}

export function deriveProductCreateReadiness(
  input: ProductCreateFormState,
): ProductCreateReadiness {
  const missingLabels: string[] = []

  if (!input.name.trim()) {
    missingLabels.push(PRODUCTS.form.missing.name)
  }

  if (!input.garment_type_id.trim()) {
    missingLabels.push(PRODUCTS.form.missing.garmentType)
  }

  if (!input.size_ids.length) {
    missingLabels.push(PRODUCTS.form.missing.sizes)
  }

  if (!input.use_unique_color && !input.color_ids.length) {
    missingLabels.push(PRODUCTS.form.missing.colors)
  }

  return {
    missingLabels,
    statusLabel: missingLabels.length
      ? PRODUCTS.form.readinessMissing(missingLabels.join(", "))
      : PRODUCTS.form.readinessReady,
    ready: missingLabels.length === 0,
  }
}

export function buildProductNameDuplicateIndex(
  styles: ExistingProductStyle[],
): ProductNameDuplicateIndex {
  const index: ProductNameDuplicateIndex = new Map()

  for (const style of styles) {
    const normalizedName = normalizeProductComparableText(style.name)
    if (normalizedName && !index.has(normalizedName)) {
      index.set(normalizedName, style)
    }
  }

  return index
}

export function findDuplicateProductName(
  index: ProductNameDuplicateIndex,
  name: string,
) {
  const normalizedName = normalizeProductComparableText(name)
  if (!normalizedName) return null

  return index.get(normalizedName) || null
}

export function findDuplicateProductStyle(
  styles: ExistingProductStyle[],
  name: string,
) {
  return findDuplicateProductName(buildProductNameDuplicateIndex(styles), name)
}

export function getFirstProductCreateErrorField(
  errors: ProductCreateFormErrors | null,
): ProductCreateFieldName | null {
  if (!errors) return null

  return PRODUCT_CREATE_ERROR_FIELD_ORDER.find((field) => errors[field]) || null
}

export function updateProductCreateErrorsForField(
  errors: ProductCreateFormErrors | null,
  field: ProductCreateFieldName,
  nextError?: string | null,
): ProductCreateFormErrors | null {
  const nextErrors: ProductCreateFormErrors = { ...(errors || {}) }

  if (nextError) {
    nextErrors[field] = nextError
  } else {
    delete nextErrors[field]
  }

  delete nextErrors._form

  return Object.keys(nextErrors).length > 0 ? nextErrors : null
}

export function deriveProductCreateErrorsAfterChange({
  errors,
  field,
  state,
  duplicateIndex,
}: {
  errors: ProductCreateFormErrors | null
  field: ProductCreateFieldName
  state: ProductCreateFormState
  duplicateIndex: ProductNameDuplicateIndex
}) {
  if (field === "name") {
    const duplicate = findDuplicateProductName(duplicateIndex, state.name)

    return updateProductCreateErrorsForField(
      errors,
      "name",
      duplicate ? PRODUCTS.form.errors.duplicateName : null,
    )
  }

  return updateProductCreateErrorsForField(errors, field, null)
}

export function validateProductCreateInput(
  input: ProductCreateFormState,
  duplicateIndex: ProductNameDuplicateIndex = buildProductNameDuplicateIndex([]),
  context: ProductCreateValidationContext = {},
): ProductCreateFormErrors | null {
  const errors: ProductCreateFormErrors = {}

  if (!input.name.trim()) {
    errors.name = PRODUCTS.form.errors.nameRequired
  } else if (findDuplicateProductName(duplicateIndex, input.name)) {
    errors.name = PRODUCTS.form.errors.duplicateName
  }

  if (!input.garment_type_id.trim()) {
    errors.garment_type_id = PRODUCTS.form.errors.garmentTypeRequired
  }

  if (input.description.length > PRODUCT_DESCRIPTION_MAX_LENGTH) {
    errors.description = PRODUCTS.form.errors.descriptionMaxLength(
      PRODUCT_DESCRIPTION_MAX_LENGTH,
    )
  }

  if (!input.size_ids.length && context.activeSizeCount === 0) {
    errors.size_ids = PRODUCTS.form.noSizes
  } else if (!input.size_ids.length) {
    errors.size_ids = PRODUCTS.form.errors.sizeRequired
  }

  if (
    !input.use_unique_color &&
    !input.color_ids.length &&
    context.manualColorCount === 0
  ) {
    errors.color_ids = PRODUCTS.form.errors.colorRequiredNoCatalog
  } else if (!input.use_unique_color && !input.color_ids.length) {
    errors.color_ids = PRODUCTS.form.errors.colorRequired
  }

  return Object.keys(errors).length > 0 ? errors : null
}

export function buildProductStylePayload(input: ProductCreateFormState) {
  return {
    name: input.name.trim(),
    garment_type_id: input.garment_type_id,
    description: input.description.trim() || null,
    active: true,
  }
}
