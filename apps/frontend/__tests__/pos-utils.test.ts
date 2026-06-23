import { test, expect } from "@playwright/test"
import type { CartItem, PosCustomer, PosContext, SaleDiscountState, SaleVariant } from "../components/modules/sales/pos/pos-types"
import {
  trimOrNull,
  parseAmountInput,
  round2,
  formatMoney,
  createPaymentDraft,
  createDefaultMixedPayments,
  getPaymentMethodLabel,
  buildCashLabel,
} from "../components/modules/sales/pos/pos-utils"
import {
  groupVariantsByStyle,
  findVariantByAttributes,
  getVariantOptionValues,
  buildProductSearchResults,
} from "../components/modules/sales/pos/pos-search-utils"
import {
  computeSaleDiscountAmount,
  calculateSalePreview,
  resolveEffectivePriceMode,
  allocateDiscountAcrossItems,
} from "../components/modules/sales/pos/pos-pricing-utils"
import {
  isCustomerValidForDocumentType,
  getCustomerSearchFilter,
  filterCustomersByDocumentType,
  validateCustomerForm,
  buildCustomerPayload,
  createEmptyCustomerForm,
  buildCustomerFormFromCustomer,
  buildCustomerDisplayName,
  buildCustomerDocument,
} from "../components/modules/sales/pos/pos-customer-utils"
import {
  deriveSummaryState,
} from "../components/modules/sales/pos/pos-summary-utils"

function makeVariant(overrides: Partial<SaleVariant> = {}): SaleVariant {
  return {
    variant_id: "v-001",
    sku: "SKU-001",
    style_id: "s-001",
    style_name: "Polo Basico",
    style_code: "PB-001",
    size_code: "M",
    size_name: "Mediano",
    color_code: "NEG",
    color_name: "Negro",
    retail_price: 50,
    wholesale_price: 40,
    stock: 10,
    ...overrides,
  }
}

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    variant_id: "v-001",
    sku: "SKU-001",
    style_name: "Polo Basico",
    size_code: "M",
    size_name: "Mediano",
    color_code: "NEG",
    color_name: "Negro",
    label: "Polo Basico - M / NEG",
    quantity: 2,
    retail_price: 50,
    wholesale_price: 40,
    stock: 10,
    price_override: null,
    ...overrides,
  }
}

function makeCustomer(overrides: Partial<PosCustomer> = {}): PosCustomer {
  return {
    customer_id: "c-001",
    document_type: "dni",
    document_number: "12345678",
    full_name: "Juan Perez",
    ...overrides,
  }
}

test.describe("trimOrNull", () => {
  test("returns trimmed value for non-empty string", () => {
    expect(trimOrNull("  hello  ")).toBe("hello")
  })

  test("returns null for empty string", () => {
    expect(trimOrNull("")).toBeNull()
    expect(trimOrNull("   ")).toBeNull()
  })

  test("returns null for nullish values", () => {
    expect(trimOrNull(null)).toBeNull()
    expect(trimOrNull(undefined)).toBeNull()
  })
})

test.describe("parseAmountInput", () => {
  test("parses integer value", () => {
    expect(parseAmountInput("100")).toBe(100)
  })

  test("parses decimal with point", () => {
    expect(parseAmountInput("99.99")).toBe(99.99)
  })

  test("parses decimal with comma", () => {
    expect(parseAmountInput("99,99")).toBe(99.99)
  })

  test("returns null for empty input", () => {
    expect(parseAmountInput("")).toBeNull()
  })

  test("returns null for negative values", () => {
    expect(parseAmountInput("-10")).toBeNull()
  })

  test("returns null for non-numeric input", () => {
    expect(parseAmountInput("abc")).toBeNull()
  })

  test("returns null for nullish values", () => {
    expect(parseAmountInput(null)).toBeNull()
    expect(parseAmountInput(undefined)).toBeNull()
  })

  test("rounds to 2 decimals", () => {
    expect(parseAmountInput("10.999")).toBe(11)
  })
})

test.describe("round2", () => {
  test("rounds to 2 decimals", () => {
    expect(round2(10.999)).toBe(11)
    expect(round2(10.555)).toBe(10.56)
    expect(round2(10.001)).toBe(10)
  })
})

test.describe("formatMoney", () => {
  test("formats number to 2 decimals", () => {
    expect(formatMoney(100)).toBe("100.00")
    expect(formatMoney(99.9)).toBe("99.90")
  })

  test("returns -- for NaN", () => {
    expect(formatMoney(NaN)).toBe("--")
  })

  test("returns 0.00 for null", () => {
    expect(formatMoney(null)).toBe("0.00")
  })
})

test.describe("groupVariantsByStyle", () => {
  test("groups variants by style_id", () => {
    const variants: SaleVariant[] = [
      makeVariant({ variant_id: "v1", style_id: "s-001" }),
      makeVariant({ variant_id: "v2", style_id: "s-001", size_code: "L", size_name: "Large" }),
      makeVariant({ variant_id: "v3", style_id: "s-002", style_name: "Camisa" }),
    ]
    const groups = groupVariantsByStyle(variants)
    expect(groups).toHaveLength(2)
    expect(groups[0].variants).toHaveLength(2)
    expect(groups[1].variants).toHaveLength(1)
    expect(groups[0].style_name).toBe("Polo Basico")
    expect(groups[1].style_name).toBe("Camisa")
  })

  test("returns empty array for empty input", () => {
    expect(groupVariantsByStyle([])).toHaveLength(0)
  })
})

test.describe("findVariantByAttributes", () => {
  test("finds variant by size and color", () => {
    const variants: SaleVariant[] = [
      makeVariant({ variant_id: "v1", size_code: "M", color_code: "NEG" }),
      makeVariant({ variant_id: "v2", size_code: "L", color_code: "NEG" }),
      makeVariant({ variant_id: "v3", size_code: "M", color_code: "BLAN" }),
    ]
    const found = findVariantByAttributes(variants, "M", "NEG")
    expect(found?.variant_id).toBe("v1")
  })

  test("returns null when no match", () => {
    const variants = [makeVariant({ size_code: "M", color_code: "NEG" })]
    expect(findVariantByAttributes(variants, "XL", "NEG")).toBeNull()
  })

  test("returns null for empty size or color", () => {
    const variants = [makeVariant({ size_code: "M", color_code: "NEG" })]
    expect(findVariantByAttributes(variants, "", "NEG")).toBeNull()
    expect(findVariantByAttributes(variants, "M", "")).toBeNull()
  })
})

test.describe("getVariantOptionValues", () => {
  const variants: SaleVariant[] = [
    makeVariant({ size_code: "M", size_name: "Mediano" }),
    makeVariant({ size_code: "L", size_name: "Large" }),
    makeVariant({ size_code: "M", size_name: "Mediano", color_code: "BLAN" }),
  ]

  test("returns unique size codes sorted", () => {
    expect(getVariantOptionValues(variants, "size_code")).toEqual(["L", "M"])
  })

  test("filters by provided criteria", () => {
    expect(getVariantOptionValues(variants, "color_code", { size_code: "M" })).toEqual(["BLAN", "NEG"])
  })
})

test.describe("buildProductSearchResults", () => {
  test("ranks exact code match highest", () => {
    const styles = groupVariantsByStyle([
      makeVariant({ style_code: "ABC", style_name: "Alpha" }),
      makeVariant({ style_code: "XYZ", style_name: "Beta" }),
    ])
    const results = buildProductSearchResults(styles, "ABC")
    expect(results[0].searchRank).toBe(0)
  })

  test("ranks by stock when rank ties", () => {
    const styles = groupVariantsByStyle([
      makeVariant({ style_id: "s-001", style_code: "A", stock: 5 }),
      makeVariant({ style_id: "s-002", style_code: "B", stock: 20 }),
    ])
    const results = buildProductSearchResults(styles, "")
    expect(results[0].totalStock).toBe(20)
    expect(results[0].style_code).toBe("B")
  })

  test("filters out non-matching styles when query present", () => {
    const styles = groupVariantsByStyle([
      makeVariant({ style_code: "ABC", style_name: "Alpha" }),
      makeVariant({ style_code: "XYZ", style_name: "Beta" }),
    ])
    const results = buildProductSearchResults(styles, "ALPHA")
    expect(results).toHaveLength(1)
  })
})

test.describe("computeSaleDiscountAmount", () => {
  test("calculates percent discount", () => {
    const discount: SaleDiscountState = { mode: "percent", value: "10", reason: "Promo" }
    expect(computeSaleDiscountAmount(200, discount)).toBe(20)
  })

  test("calculates amount discount", () => {
    const discount: SaleDiscountState = { mode: "amount", value: "50", reason: "Promo" }
    expect(computeSaleDiscountAmount(200, discount)).toBe(50)
  })

  test("caps amount discount to subtotal", () => {
    const discount: SaleDiscountState = { mode: "amount", value: "300", reason: "Promo" }
    expect(computeSaleDiscountAmount(200, discount)).toBe(200)
  })

  test("returns 0 for none mode", () => {
    expect(computeSaleDiscountAmount(200, null)).toBe(0)
    expect(computeSaleDiscountAmount(200, { mode: "none", value: "", reason: "" })).toBe(0)
  })
})

test.describe("calculateSalePreview", () => {
  test("computes retail totals without tax or discount", () => {
    const cart: CartItem[] = [
      makeCartItem({ variant_id: "v1", quantity: 2, retail_price: 50, wholesale_price: null }),
    ]
    const preview = calculateSalePreview(cart, "none", null, null)
    expect(preview.total).toBe(100)
    expect(preview.tax).toBe(0)
    expect(preview.priceMode).toBe("retail")
  })

  test("applies wholesale when eligible", () => {
    const cart: CartItem[] = [
      makeCartItem({ variant_id: "v1", quantity: 3, retail_price: 50, wholesale_price: 40 }),
    ]
    const pricing: PosContext["pricing"] = { wholesale_min_qty_total: 2, wholesale_rule_type: "qty" }
    const preview = calculateSalePreview(cart, "none", null, pricing)
    expect(preview.total).toBe(120)
    expect(preview.priceMode).toBe("wholesale")
  })

  test("includes tax for boleta", () => {
    const cart: CartItem[] = [
      makeCartItem({ variant_id: "v1", quantity: 1, retail_price: 100 }),
    ]
    const preview = calculateSalePreview(cart, "boleta", null, null)
    expect(preview.taxRate).toBe(0.18)
    expect(preview.tax).toBeGreaterThan(0)
  })

  test("applies sale discount before tax", () => {
    const cart: CartItem[] = [
      makeCartItem({ variant_id: "v1", quantity: 1, retail_price: 100 }),
    ]
    const discount: SaleDiscountState = { mode: "percent", value: "50", reason: "Promo" }
    const preview = calculateSalePreview(cart, "none", discount, null)
    expect(preview.total).toBe(50)
    expect(preview.saleDiscountAmount).toBe(50)
  })

  test("respects price overrides", () => {
    const cart: CartItem[] = [
      makeCartItem({
        variant_id: "v1",
        quantity: 2,
        retail_price: 50,
        price_override: { unit_price_final: 30, reason: "Promo" },
      }),
    ]
    const preview = calculateSalePreview(cart, "none", null, null)
    expect(preview.baseSubtotal).toBe(60)
  })

  test("marks hasMissingPrice when item has no price", () => {
    const cart: CartItem[] = [
      makeCartItem({ variant_id: "v1", retail_price: null, wholesale_price: null }),
    ]
    const preview = calculateSalePreview(cart, "none", null, null)
    expect(preview.hasMissingPrice).toBe(true)
  })
})

test.describe("isCustomerValidForDocumentType", () => {
  test("validates DNI for boleta", () => {
    const customer = makeCustomer({ document_type: "dni", document_number: "12345678" })
    expect(isCustomerValidForDocumentType(customer, "boleta")).toBe(true)
  })

  test("rejects invalid DNI for boleta", () => {
    const customer = makeCustomer({ document_type: "dni", document_number: "1234" })
    expect(isCustomerValidForDocumentType(customer, "boleta")).toBe(false)
  })

  test("validates RUC for factura with address", () => {
    const customer = makeCustomer({ document_type: "ruc", document_number: "12345678901", address: "Av. Principal 123" })
    expect(isCustomerValidForDocumentType(customer, "factura")).toBe(true)
  })

  test("rejects factura without address", () => {
    const customer = makeCustomer({ document_type: "ruc", document_number: "12345678901" })
    expect(isCustomerValidForDocumentType(customer, "factura")).toBe(false)
  })

  test("returns false for null customer", () => {
    expect(isCustomerValidForDocumentType(null, "boleta")).toBe(false)
  })
})

test.describe("getCustomerSearchFilter", () => {
  test("factura searches only RUC", () => {
    const filter = getCustomerSearchFilter("factura")
    expect(filter.queryDocumentType).toBe("ruc")
    expect(filter.localDocumentTypes).toEqual(["ruc"])
  })

  test("boleta searches DNI and CE", () => {
    const filter = getCustomerSearchFilter("boleta")
    expect(filter.queryDocumentType).toBeNull()
    expect(filter.localDocumentTypes).toEqual(["dni", "ce"])
  })

  test("none returns no filter", () => {
    const filter = getCustomerSearchFilter("none")
    expect(filter.queryDocumentType).toBeNull()
    expect(filter.localDocumentTypes).toBeNull()
  })
})

test.describe("filterCustomersByDocumentType", () => {
  test("filters by allowed document types", () => {
    const customers = [
      makeCustomer({ customer_id: "c1", document_type: "dni" }),
      makeCustomer({ customer_id: "c2", document_type: "ruc" }),
      makeCustomer({ customer_id: "c3", document_type: "ce" }),
    ]
    const filtered = filterCustomersByDocumentType(customers, "boleta")
    expect(filtered).toHaveLength(2)
    expect(filtered.map((c) => c.customer_id)).toEqual(["c1", "c3"])
  })

  test("returns all for proforma", () => {
    const customers = [
      makeCustomer({ customer_id: "c1", document_type: "dni" }),
      makeCustomer({ customer_id: "c2", document_type: "ruc" }),
    ]
    expect(filterCustomersByDocumentType(customers, "proforma")).toHaveLength(2)
  })
})

test.describe("validateCustomerForm", () => {
  test("validates retail customer with DNI", () => {
    const form = createEmptyCustomerForm("retail")
    form.full_name = "Juan Perez"
    form.document_type = "dni"
    form.document_number = "12345678"
    expect(validateCustomerForm(form)).toBeNull()
  })

  test("requires full name for retail", () => {
    const form = createEmptyCustomerForm("retail")
    form.document_type = "dni"
    form.document_number = "12345678"
    const errors = validateCustomerForm(form)
    expect(errors?.full_name).toBeDefined()
  })

  test("requires business name for factura", () => {
    const form = createEmptyCustomerForm("factura")
    form.document_number = "12345678901"
    form.address = "Av. Principal 123"
    const errors = validateCustomerForm(form)
    expect(errors?.business_name).toBeDefined()
  })

  test("requires address for factura", () => {
    const form = createEmptyCustomerForm("factura")
    form.business_name = "Empresa SAC"
    form.document_number = "12345678901"
    const errors = validateCustomerForm(form)
    expect(errors?.address).toBeDefined()
  })

  test("rejects invalid RUC length", () => {
    const form = createEmptyCustomerForm("factura")
    form.business_name = "Empresa SAC"
    form.document_number = "123"
    form.address = "Av. Principal 123"
    const errors = validateCustomerForm(form)
    expect(errors?.document_number).toBeDefined()
  })
})

test.describe("buildCustomerPayload", () => {
  test("builds retail customer payload", () => {
    const form = createEmptyCustomerForm("retail")
    form.full_name = "Juan Perez"
    form.document_type = "dni"
    form.document_number = "12345678"
    const payload = buildCustomerPayload(form)
    expect(payload.full_name).toBe("Juan Perez")
    expect(payload.document_type).toBe("dni")
    expect(payload.customer_type).toBe("retail")
  })

  test("nullifies document_number for none type", () => {
    const form = createEmptyCustomerForm("retail")
    form.document_type = "none"
    form.full_name = "Cliente Generico"
    const payload = buildCustomerPayload(form)
    expect(payload.document_number).toBeNull()
  })
})

test.describe("buildCustomerFormFromCustomer", () => {
  test("maps customer to form state", () => {
    const customer = makeCustomer({
      document_type: "ruc",
      document_number: "12345678901",
      business_name: "Empresa SAC",
      address: "Av. Principal 123",
    })
    const form = buildCustomerFormFromCustomer(customer)
    expect(form.entry_mode).toBe("factura")
    expect(form.document_type).toBe("ruc")
    expect(form.business_name).toBe("Empresa SAC")
  })
})

test.describe("createPaymentDraft", () => {
  test("creates draft with unique id", () => {
    const draft = createPaymentDraft("cash", "100")
    expect(draft.method).toBe("cash")
    expect(draft.amount).toBe("100")
    expect(draft.reference).toBe("")
    expect(draft.id).toBeTruthy()
  })
})

test.describe("createDefaultMixedPayments", () => {
  test("creates two default payment lines", () => {
    const payments = createDefaultMixedPayments(100, "cash")
    expect(payments).toHaveLength(2)
    expect(payments[0].method).toBe("cash")
    expect(payments[0].amount).toBe("100.00")
    expect(payments[1].method).toBe("")
  })
})

test.describe("buildCustomerDisplayName", () => {
  test("uses display_name first", () => {
    const customer = makeCustomer({ display_name: "Juancho" })
    expect(buildCustomerDisplayName(customer)).toBe("Juancho")
  })

  test("falls back to full_name", () => {
    const customer = makeCustomer({ full_name: "Juan Perez" })
    expect(buildCustomerDisplayName(customer)).toBe("Juan Perez")
  })

  test("returns Pendiente for null", () => {
    expect(buildCustomerDisplayName(null)).toBe("Pendiente")
  })
})

test.describe("buildCustomerDocument", () => {
  test("formats document with type", () => {
    const customer = makeCustomer({ document_type: "dni", document_number: "12345678" })
    expect(buildCustomerDocument(customer)).toBe("DNI 12345678")
  })

  test("returns Sin documento for none type", () => {
    const customer = makeCustomer({ document_type: "none" })
    expect(buildCustomerDocument(customer)).toBe("Sin documento")
  })
})

test.describe("deriveSummaryState", () => {
  const baseInput = {
    documentType: "none",
    activeDocumentOption: { label: "Sin comprobante", value: "none" } as { label: string; value: string },
    selectedCustomerName: "Juan Perez",
    selectedCustomerDocument: "DNI 12345678",
    customerStepReady: true,
    cartCount: 3,
    totals: {
      items: [],
      subtotal: 100,
      tax: 0,
      total: 100,
      taxRate: 0,
      hasMissingPrice: false,
      baseSubtotal: 100,
      saleDiscountAmount: 0,
      priceMode: "retail" as const,
      wholesaleApplied: false,
    },
    paymentMode: "single" as const,
    paymentMethod: "cash",
    paymentSummaryLabel: "Efectivo",
    mixedPaymentsPreview: {
      payments: [],
      enteredTotal: 100,
      difference: 0,
      error: null,
    },
    mixedPayments: [],
    cashReady: true,
    cashStatus: "open",
    submitDisabled: false,
    submitting: false,
  }

  test("returns ready when all steps complete", () => {
    const state = deriveSummaryState({ ...baseInput, documentType: "boleta" })
    expect(state.headerStatus).toBe("Listo para finalizar")
    expect(state.headerTone).toBe("success")
  })

  test("returns pending when no products", () => {
    const state = deriveSummaryState({ ...baseInput, cartCount: 0 })
    expect(state.headerStatus).toBe("Sin productos")
  })

  test("returns warning when cash not ready", () => {
    const state = deriveSummaryState({ ...baseInput, cashReady: false, cashStatus: "closed" })
    expect(state.headerTone).toBe("danger")
  })

  test("returns ready for mixed payment with exact match", () => {
    const state = deriveSummaryState({
      ...baseInput,
      documentType: "boleta",
      activeDocumentOption: { label: "Boleta (DNI/CE)", value: "boleta" },
      paymentMode: "mixed",
      paymentMethod: "",
      paymentSummaryLabel: "2 lineas de pago",
      mixedPaymentsPreview: {
        payments: [
          { method: "cash", amount: 60, reference: null },
          { method: "yape", amount: 40, reference: null },
        ],
        enteredTotal: 100,
        difference: 0,
        error: null,
      },
      mixedPayments: [
        { id: "1", method: "cash", amount: "60", reference: "" },
        { id: "2", method: "yape", amount: "40", reference: "" },
      ],
    })
    expect(state.headerStatus).toBe("Listo para finalizar")
    expect(state.paymentState).toBe("ready")
  })

  test("returns warning for mixed payment with excess", () => {
    const state = deriveSummaryState({
      ...baseInput,
      paymentMode: "mixed",
      paymentMethod: "",
      paymentSummaryLabel: "2 lineas de pago",
      mixedPaymentsPreview: {
        payments: [
          { method: "cash", amount: 60, reference: null },
          { method: "yape", amount: 50, reference: null },
        ],
        enteredTotal: 110,
        difference: -10,
        error: "El pago excede el total por S/. 10.00",
      },
      mixedPayments: [
        { id: "1", method: "cash", amount: "60", reference: "" },
        { id: "2", method: "yape", amount: "50", reference: "" },
      ],
    })
    expect(state.paymentState).toBe("warning")
  })

  test("returns ready for proforma with any customer", () => {
    const state = deriveSummaryState({
      ...baseInput,
      documentType: "proforma",
      activeDocumentOption: { label: "Proforma", value: "proforma" },
      selectedCustomerName: "Cliente generico",
      selectedCustomerDocument: "Sin documento",
    })
    expect(state.headerStatus).toBe("Listo para finalizar")
    expect(state.documentBadge).toBe("Listo")
  })

  test("returns processing when submitting", () => {
    const state = deriveSummaryState({ ...baseInput, submitting: true })
    expect(state.headerStatus).toBe("Procesando...")
    expect(state.headerTone).toBe("accent")
  })
})

test.describe("allocateDiscountAcrossItems", () => {
  test("distributes discount proportionally", () => {
    const items = [
      { ...makeCartItem({ variant_id: "v1", quantity: 1, retail_price: 100 }), unit_price_list: 100, unit_price_before_discount: 100, price_type_applied: "retail", pricing_rule_applied: null, line_subtotal_before_discount: 100 },
      { ...makeCartItem({ variant_id: "v2", quantity: 3, retail_price: 50 }), unit_price_list: 50, unit_price_before_discount: 50, price_type_applied: "retail", pricing_rule_applied: null, line_subtotal_before_discount: 150 },
    ]
    const result = allocateDiscountAcrossItems(items, 50)
    const totalDiscount = result.reduce((sum, item) => sum + item.line_discount_amount, 0)
    expect(totalDiscount).toBe(50)
  })

  test("returns items unchanged when no discount", () => {
    const items = [
      { ...makeCartItem({ variant_id: "v1" }), unit_price_list: 50, unit_price_before_discount: 50, price_type_applied: "retail", pricing_rule_applied: null, line_subtotal_before_discount: 100 },
    ]
    const result = allocateDiscountAcrossItems(items, 0)
    expect(result[0].line_discount_amount).toBe(0)
  })
})

test.describe("buildCashLabel", () => {
  test("returns readable labels", () => {
    expect(buildCashLabel("open")).toBe("Caja operativa abierta")
    expect(buildCashLabel("closed")).toBe("Caja cerrada")
    expect(buildCashLabel("missing")).toBe("A\u00fan no se abri\u00f3 caja")
  })
})

test.describe("getPaymentMethodLabel", () => {
  test("returns label for known method", () => {
    expect(getPaymentMethodLabel("cash")).toBe("Efectivo")
    expect(getPaymentMethodLabel("yape")).toBe("Yape")
  })

  test("returns Selecciona for unknown method", () => {
    expect(getPaymentMethodLabel("bitcoin")).toBe("Selecciona")
  })
})

test.describe("resolveEffectivePriceMode", () => {
  test("returns retail by default", () => {
    expect(resolveEffectivePriceMode([], null)).toBe("retail")
  })

  test("returns wholesale when override is set", () => {
    expect(resolveEffectivePriceMode([], null, "wholesale")).toBe("wholesale")
  })

  test("auto activates wholesale when qty threshold met", () => {
    const cart: CartItem[] = [
      makeCartItem({ quantity: 3 }),
    ]
    const pricing = { wholesale_min_qty_total: 2, wholesale_rule_type: "qty" }
    expect(resolveEffectivePriceMode(cart, pricing)).toBe("wholesale")
  })
})
