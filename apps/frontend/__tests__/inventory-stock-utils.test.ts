import { expect, test } from "@playwright/test"

import {
  buildAdjustmentReason,
  formatAdjustmentIntent,
  formatAdjustmentStatus,
  getAdjustmentDifferenceClasses,
  getAdjustmentStatusClasses,
  groupAdjustmentVariantsByStyle,
  inferAdjustmentIntent,
  resolveAdjustmentIntent,
} from "../components/modules/inventory/inventory-adjustments-shared"
import {
  formatInventoryCount,
  formatInventoryVariantsSummary,
  getProductStatusTone,
  normalizeProductStatusFilter,
} from "../components/modules/inventory/inventory-summary-shared"
import {
  CHIP_CANCELLED,
  CHIP_CONFIRMED,
  CHIP_DRAFT,
  DIFF_NEGATIVE,
  DIFF_POSITIVE,
  DIFF_ZERO,
} from "../components/modules/inventory/adjustments-constants"
import {
  formatMovementOperationLabel,
  formatMovementOriginLabel,
  formatReference,
  isOpeningMovement,
  resolveBackendReferenceType,
  resolveDocumentFamily,
  resolveMovementDirection,
  resolveMovementTypeFromParams,
  resolveOriginFilterFromParams,
  resolveSemanticOrigin,
  type KardexMovement,
} from "../components/modules/kardex/kardex-domain"

function makeMovement(
  overrides: Partial<KardexMovement> = {}
): KardexMovement {
  return {
    movement_id: "mov-001",
    location_id: "loc-001",
    location_code: "LIM",
    location_name: "Lima Centro",
    variant_id: "var-001",
    sku: "SKU-001",
    style_code: "ST-001",
    style_name: "Polo Basico",
    movement_type: "OUT",
    quantity: 3,
    quantity_effect: -3,
    balance_qty: 7,
    reason: null,
    reference_type: "sale",
    reference_id: "12345678-aaaa-bbbb-cccc-1234567890ab",
    reference_line_id: null,
    created_by: "usr-001",
    created_by_name: "Operador",
    created_at: "2026-06-24T10:00:00.000Z",
    ...overrides,
  }
}

test.describe("inventory-summary-shared", () => {
  test("normalizes valid product status filters", () => {
    expect(normalizeProductStatusFilter("available")).toBe("available")
    expect(normalizeProductStatusFilter("low")).toBe("low")
    expect(normalizeProductStatusFilter("out")).toBe("out")
    expect(normalizeProductStatusFilter("incomplete")).toBe("incomplete")
  })

  test("falls back to all for unknown product status filters", () => {
    expect(normalizeProductStatusFilter("con-alertas")).toBe("all")
    expect(normalizeProductStatusFilter(null)).toBe("all")
  })

  test("maps product statuses to the expected tones", () => {
    expect(getProductStatusTone("available")).toBe("success")
    expect(getProductStatusTone("low")).toBe("warning")
    expect(getProductStatusTone("incomplete")).toBe("warning")
    expect(getProductStatusTone("out")).toBe("danger")
  })

  test("formats singular and plural inventory counts", () => {
    expect(formatInventoryCount(1, "talla", "tallas")).toBe("1 talla")
    expect(formatInventoryCount(3, "color", "colores")).toBe("3 colores")
  })

  test("formats inventory variants summary", () => {
    const summary = formatInventoryVariantsSummary(2, 4)

    expect(summary).toContain("2 tallas")
    expect(summary).toContain("4 colores")
  })
})

test.describe("inventory-adjustments-shared", () => {
  test("groups variants by style code and sums system quantity", () => {
    const groups = groupAdjustmentVariantsByStyle([
      {
        variant_id: "var-001",
        sku: "SKU-001",
        style_code: "ST-01",
        style_name: "Polo",
        size_code: "M",
        color_name: "Negro",
        system_qty: 4,
      },
      {
        variant_id: "var-002",
        sku: "SKU-002",
        style_code: "ST-01",
        style_name: "Polo",
        size_code: "L",
        color_name: "Negro",
        system_qty: 6,
      },
      {
        variant_id: "var-003",
        sku: "SKU-003",
        style_code: "ST-02",
        style_name: "Casaca",
        size_code: "S",
        color_name: "Azul",
        system_qty: 2,
      },
    ])

    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({
      styleId: "ST-01",
      styleCode: "ST-01",
      styleName: "Polo",
      totalSystemQty: 10,
    })
    expect(groups[0].variants).toHaveLength(2)
    expect(groups[1]).toMatchObject({
      styleId: "ST-02",
      totalSystemQty: 2,
    })
  })

  test("infers opening intent from reason text", () => {
    expect(inferAdjustmentIntent("Apertura inicial de tienda")).toBe("opening")
    expect(inferAdjustmentIntent("Stock inicial previo al go live")).toBe("opening")
    expect(inferAdjustmentIntent("Conteo fisico")).toBe("adjustment")
  })

  test("resolves explicit intent before falling back to the reason", () => {
    expect(
      resolveAdjustmentIntent({
        intent_type: "adjustment",
        reason: "Apertura inicial",
      })
    ).toBe("adjustment")

    expect(
      resolveAdjustmentIntent({
        reason: "Apertura de inventario",
      })
    ).toBe("opening")
  })

  test("builds default and prefixed adjustment reasons", () => {
    expect(buildAdjustmentReason("adjustment", "")).toBe("Ajuste por conteo")
    expect(buildAdjustmentReason("opening", "")).toBe("Apertura inicial")
    expect(buildAdjustmentReason("opening", "conteo sede 1")).toBe(
      "Apertura inicial - conteo sede 1"
    )
    expect(buildAdjustmentReason("opening", "Apertura previa")).toBe(
      "Apertura previa"
    )
  })

  test("formats adjustment labels and semantic classes", () => {
    expect(formatAdjustmentIntent("opening")).toBe("Apertura inicial")
    expect(formatAdjustmentStatus("draft")).toBe("Borrador")
    expect(formatAdjustmentStatus("confirmed")).toBe("Confirmado")
    expect(formatAdjustmentStatus("cancelled")).toBe("Cancelado")
    expect(getAdjustmentStatusClasses("draft")).toBe(CHIP_DRAFT)
    expect(getAdjustmentStatusClasses("confirmed")).toBe(CHIP_CONFIRMED)
    expect(getAdjustmentStatusClasses("cancelled")).toBe(CHIP_CANCELLED)
  })

  test("maps quantity differences to the right visual classes", () => {
    expect(getAdjustmentDifferenceClasses(5)).toBe(DIFF_POSITIVE)
    expect(getAdjustmentDifferenceClasses(-2)).toBe(DIFF_NEGATIVE)
    expect(getAdjustmentDifferenceClasses(0)).toBe(DIFF_ZERO)
  })
})

test.describe("kardex-domain", () => {
  test("detects opening movements from adjustment reasons", () => {
    expect(
      isOpeningMovement(
        makeMovement({
          movement_type: "ADJUST",
          reference_type: "adjustment",
          reason: "Apertura inicial de sede",
        })
      )
    ).toBe(true)

    expect(
      isOpeningMovement(
        makeMovement({
          movement_type: "ADJUST",
          reference_type: "adjustment",
          reason: "Regularizacion por conteo",
        })
      )
    ).toBe(false)
  })

  test("resolves document family from semantic hints and fallback fields", () => {
    expect(resolveDocumentFamily(makeMovement({ document_family: "transfer" }))).toBe(
      "transfer"
    )
    expect(resolveDocumentFamily(makeMovement({ reference_type: "exchange" }))).toBe(
      "exchange"
    )
    expect(
      resolveDocumentFamily(
        makeMovement({
          reference_type: null,
          movement_type: "ADJUST",
        })
      )
    ).toBe("adjustment")
  })

  test("resolves movement direction from explicit value or movement type", () => {
    expect(
      resolveMovementDirection(makeMovement({ movement_direction: "entry" }))
    ).toBe("entry")
    expect(resolveMovementDirection(makeMovement({ movement_type: "OUT" }))).toBe("exit")
    expect(
      resolveMovementDirection(makeMovement({ movement_type: "ADJUST" }))
    ).toBe("adjustment")
  })

  test("resolves semantic origin for transfers, sales, exchanges and adjustments", () => {
    expect(
      resolveSemanticOrigin(
        makeMovement({
          reference_type: "transfer",
          movement_type: "OUT",
        })
      )
    ).toBe("transfer_shipped")

    expect(
      resolveSemanticOrigin(
        makeMovement({
          reference_type: "sale",
          movement_type: "IN",
        })
      )
    ).toBe("sale_cancelled")

    expect(
      resolveSemanticOrigin(
        makeMovement({
          reference_type: "exchange",
          movement_type: "OUT",
        })
      )
    ).toBe("exchange_delivered")

    expect(
      resolveSemanticOrigin(
        makeMovement({
          reference_type: "adjustment",
          movement_type: "ADJUST",
          reason: "Apertura inicial",
        })
      )
    ).toBe("opening_confirmed")
  })

  test("formats movement labels and references consistently", () => {
    const transfer = makeMovement({
      reference_type: "transfer",
      movement_type: "OUT",
      reference_id: "87654321-aaaa-bbbb-cccc-abcdefabcdef",
    })
    const opening = makeMovement({
      reference_type: "adjustment",
      movement_type: "ADJUST",
      reason: "Apertura inicial",
      reference_id: "99999999-aaaa-bbbb-cccc-abcdefabcdef",
    })

    expect(formatMovementOperationLabel(transfer)).toBe("Salida por transferencia")
    expect(formatMovementOriginLabel(transfer)).toBe("Transferencia despachada")
    expect(formatReference(transfer)).toBe("Transferencia 87654321")
    expect(formatReference(opening)).toBe("Apertura 99999999")
  })

  test("resolves filter params for movement type and origin", () => {
    expect(resolveMovementTypeFromParams("OUT", null)).toBe("OUT")
    expect(resolveMovementTypeFromParams("foo", "transfer")).toBe("TRANSFER")
    expect(resolveMovementTypeFromParams(null, null)).toBe("ALL")

    expect(resolveOriginFilterFromParams("sale")).toBe("sale")
    expect(resolveOriginFilterFromParams("opening")).toBe("ALL")
  })

  test("derives backend reference type from the active filters", () => {
    expect(resolveBackendReferenceType("TRANSFER", "ALL", null)).toBe("transfer")
    expect(resolveBackendReferenceType("ALL", "sale", null)).toBe("sale")
    expect(resolveBackendReferenceType("ALL", "ALL", "exchange")).toBe("exchange")
    expect(resolveBackendReferenceType("ALL", "ALL", null)).toBeNull()
  })
})
