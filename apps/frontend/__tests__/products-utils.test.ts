import { test, expect } from "@playwright/test"

import {
  calculateProjectedVariants,
  buildProductNameDuplicateIndex,
  deriveProductCreateErrorsAfterChange,
  deriveProductCreateReadiness,
  EMPTY_PRODUCT_CREATE_FORM,
  findDuplicateProductName,
  findDuplicateProductStyle,
  getFirstProductCreateErrorField,
  PRODUCT_DESCRIPTION_MAX_LENGTH,
  updateProductCreateErrorsForField,
  validateProductCreateInput,
} from "../components/modules/products/products-utils"
import type {
  ExistingProductStyle,
  ProductCreateFormErrors,
} from "../components/modules/products/products-types"

const existingStyles: ExistingProductStyle[] = [
  { style_id: "style-1", name: "Polo Oversize Basico", style_code: "POL-001" },
  { style_id: "style-2", name: "Jogger Rib", style_code: "JOG-001" },
  { style_id: "style-3", name: "Cafarena - Rip", style_code: "CAF-RIP" },
  { style_id: "style-4", name: "Polo Básico", style_code: "POL-BAS" },
]

test.describe("products-utils", () => {
  test("builds a product name duplicate index for exact lookups", () => {
    const index = buildProductNameDuplicateIndex(existingStyles)
    const duplicate = findDuplicateProductName(index, "Polo Oversize Basico")

    expect(duplicate?.style_id).toBe("style-1")
  })

  test("detects duplicate product names through the index with normalized whitespace and case", () => {
    const index = buildProductNameDuplicateIndex(existingStyles)
    const duplicate = findDuplicateProductName(
      index,
      "  POLO   OVERSIZE BASICO ",
    )

    expect(duplicate?.style_id).toBe("style-1")
  })

  test("detects duplicate product names with hyphen separators", () => {
    const index = buildProductNameDuplicateIndex(existingStyles)
    const duplicate = findDuplicateProductName(index, "Cafarena Rip")

    expect(duplicate?.style_id).toBe("style-3")
  })

  test("detects duplicate product names with punctuation separators", () => {
    const index = buildProductNameDuplicateIndex(existingStyles)
    const duplicate = findDuplicateProductName(index, "Cafarena / Rip")

    expect(duplicate?.style_id).toBe("style-3")
  })

  test("detects duplicate product names without accents", () => {
    const index = buildProductNameDuplicateIndex(existingStyles)
    const duplicate = findDuplicateProductName(index, "Polo Basico")

    expect(duplicate?.style_id).toBe("style-4")
  })

  test("does not flag empty or unique product names as duplicates", () => {
    const index = buildProductNameDuplicateIndex(existingStyles)

    expect(findDuplicateProductName(index, "")).toBeNull()
    expect(findDuplicateProductName(index, "Casaca Boxy")).toBeNull()
  })

  test("clears only the edited product creation field error", () => {
    const errors: ProductCreateFormErrors = {
      name: "Nombre duplicado",
      color_ids: "Selecciona un color",
      _form: "Error general",
    }

    expect(updateProductCreateErrorsForField(errors, "name", null)).toEqual({
      color_ids: "Selecciona un color",
    })
  })

  test("keeps other field errors while applying reactive duplicate name validation", () => {
    const index = buildProductNameDuplicateIndex(existingStyles)

    expect(
      deriveProductCreateErrorsAfterChange({
        errors: {
          color_ids: "Selecciona un color",
        },
        field: "name",
        state: {
          ...EMPTY_PRODUCT_CREATE_FORM,
          name: "Cafarena Rip",
        },
        duplicateIndex: index,
      }),
    ).toEqual({
      name: "Ya existe un producto con ese nombre.",
      color_ids: "Selecciona un color",
    })

    expect(
      deriveProductCreateErrorsAfterChange({
        errors: {
          name: "Ya existe un producto con ese nombre.",
          color_ids: "Selecciona un color",
        },
        field: "name",
        state: {
          ...EMPTY_PRODUCT_CREATE_FORM,
          name: "Casaca Boxy",
        },
        duplicateIndex: index,
      }),
    ).toEqual({
      color_ids: "Selecciona un color",
    })
  })

  test("resolves the first invalid product creation field by visual priority", () => {
    expect(
      getFirstProductCreateErrorField({
        description: "Descripcion larga",
        color_ids: "Selecciona un color",
        size_ids: "Selecciona talla",
      }),
    ).toBe("size_ids")
  })

  test("starts product creation without UNICO selected", () => {
    expect(EMPTY_PRODUCT_CREATE_FORM.use_unique_color).toBe(false)
    expect(EMPTY_PRODUCT_CREATE_FORM.color_ids).toEqual([])
  })

  test("validates required product creation fields", () => {
    expect(
      validateProductCreateInput(
        {
          name: "",
          garment_type_id: "",
          description: "",
          size_ids: [],
          use_unique_color: true,
          color_ids: [],
        },
        buildProductNameDuplicateIndex(existingStyles),
      ),
    ).toEqual({
      name: "Ingresa el nombre del producto.",
      garment_type_id: "Selecciona el tipo de prenda.",
      size_ids: "Selecciona al menos una talla.",
    })
  })

  test("detects duplicate product names with normalized whitespace and case", () => {
    const duplicate = findDuplicateProductStyle(
      existingStyles,
      "  polo   oversize basico ",
    )

    expect(duplicate?.style_id).toBe("style-1")
    expect(
      validateProductCreateInput(
        {
          name: "POLO OVERSIZE BASICO",
          garment_type_id: "garment-1",
          description: "",
          size_ids: ["size-1"],
          use_unique_color: true,
          color_ids: [],
        },
        buildProductNameDuplicateIndex(existingStyles),
      ),
    ).toEqual({ name: "Ya existe un producto con ese nombre." })
  })

  test("accepts colorless input when UNICO is selected", () => {
    expect(
      validateProductCreateInput(
        {
          name: "Casaca Boxy",
          garment_type_id: "garment-1",
          description: "",
          size_ids: ["size-1", "size-2"],
          use_unique_color: true,
          color_ids: [],
        },
        buildProductNameDuplicateIndex(existingStyles),
      ),
    ).toBeNull()
  })

  test("requires at least one color when UNICO is disabled", () => {
    expect(
      validateProductCreateInput(
        {
          name: "Casaca Boxy",
          garment_type_id: "garment-1",
          description: "",
          size_ids: ["size-1"],
          use_unique_color: false,
          color_ids: [],
        },
        buildProductNameDuplicateIndex(existingStyles),
      ),
    ).toEqual({ color_ids: "Selecciona un color o marca Sin color especifico." })
  })

  test("uses catalog-aware errors when active sizes or manual colors are missing", () => {
    expect(
      validateProductCreateInput(
        {
          name: "Casaca Boxy",
          garment_type_id: "garment-1",
          description: "",
          size_ids: [],
          use_unique_color: false,
          color_ids: [],
        },
        buildProductNameDuplicateIndex(existingStyles),
        { activeSizeCount: 0, manualColorCount: 0 },
      ),
    ).toEqual({
      size_ids: "No hay tallas activas disponibles.",
      color_ids: "No hay colores manuales activos. Marca Sin color especifico.",
    })
  })

  test("accepts explicit colors when UNICO is disabled", () => {
    expect(
      validateProductCreateInput(
        {
          name: "Casaca Boxy",
          garment_type_id: "garment-1",
          description: "",
          size_ids: ["size-1"],
          use_unique_color: false,
          color_ids: ["color-1"],
        },
        buildProductNameDuplicateIndex(existingStyles),
      ),
    ).toBeNull()
  })

  test("rejects descriptions over the product limit", () => {
    expect(
      validateProductCreateInput(
        {
          name: "Casaca Boxy",
          garment_type_id: "garment-1",
          description: "x".repeat(PRODUCT_DESCRIPTION_MAX_LENGTH + 1),
          size_ids: ["size-1"],
          use_unique_color: true,
          color_ids: [],
        },
        buildProductNameDuplicateIndex(existingStyles),
      ),
    ).toEqual({
      description: `La descripcion no puede superar ${PRODUCT_DESCRIPTION_MAX_LENGTH} caracteres.`,
    })
  })

  test("calculates projected variants with UNICO fallback when no colors are selected", () => {
    expect(calculateProjectedVariants(3, 0)).toBe(3)
    expect(calculateProjectedVariants(3, 2)).toBe(6)
    expect(calculateProjectedVariants(0, 2)).toBe(0)
  })

  test("derives readiness with all required fields missing", () => {
    expect(deriveProductCreateReadiness(EMPTY_PRODUCT_CREATE_FORM)).toEqual({
      missingLabels: ["nombre", "tipo", "tallas", "colores"],
      statusLabel: "Falta: nombre, tipo, tallas, colores",
      ready: false,
    })
  })

  test("derives readiness when only color is missing", () => {
    expect(
      deriveProductCreateReadiness({
        name: "Casaca Boxy",
        garment_type_id: "garment-1",
        description: "",
        size_ids: ["size-1"],
        use_unique_color: false,
        color_ids: [],
      }),
    ).toEqual({
      missingLabels: ["colores"],
      statusLabel: "Falta: colores",
      ready: false,
    })
  })

  test("derives readiness with explicit colorless option selected", () => {
    expect(
      deriveProductCreateReadiness({
        name: "Casaca Boxy",
        garment_type_id: "garment-1",
        description: "",
        size_ids: ["size-1"],
        use_unique_color: true,
        color_ids: [],
      }),
    ).toEqual({
      missingLabels: [],
      statusLabel: "Listo para crear",
      ready: true,
    })
  })

  test("derives readiness when product creation is complete", () => {
    expect(
      deriveProductCreateReadiness({
        name: "Casaca Boxy",
        garment_type_id: "garment-1",
        description: "",
        size_ids: ["size-1"],
        use_unique_color: false,
        color_ids: ["color-1"],
      }),
    ).toEqual({
      missingLabels: [],
      statusLabel: "Listo para crear",
      ready: true,
    })
  })
})
