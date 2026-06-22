import { test, expect } from "@playwright/test"
import {
  formatDocumentType,
  formatPaymentMethod,
  customerDocument,
} from "../components/modules/sales/sales-utils"

test.describe("formatDocumentType", () => {
  test("returns fallback for empty value", () => {
    expect(formatDocumentType("")).toBe("Documento")
  })

  test("returns custom fallback for empty value", () => {
    expect(formatDocumentType("", "Comprobante")).toBe("Comprobante")
  })

  test("capitalizes lowercase with underscores", () => {
    expect(formatDocumentType("boleta_electronica")).toBe("Boleta electronica")
  })

  test("capitalizes single word", () => {
    expect(formatDocumentType("factura")).toBe("Factura")
  })

  test("handles already capitalized value", () => {
    expect(formatDocumentType("Factura")).toBe("Factura")
  })

  test("handles SCREAMING_CASE", () => {
    expect(formatDocumentType("SALE_RECEIPT")).toBe("Sale receipt")
  })
})

test.describe("formatPaymentMethod", () => {
  test("returns label for known method", () => {
    expect(formatPaymentMethod("cash")).toBe("Efectivo")
  })

  test("returns label for yape", () => {
    expect(formatPaymentMethod("yape")).toBe("Yape")
  })

  test("returns label for card", () => {
    expect(formatPaymentMethod("card")).toBe("Tarjeta")
  })

  test("returns label for credit", () => {
    expect(formatPaymentMethod("credit")).toBe("Crédito")
  })

  test("returns label for transfer", () => {
    expect(formatPaymentMethod("transfer")).toBe("Transferencia")
  })

  test("returns label for plin", () => {
    expect(formatPaymentMethod("plin")).toBe("Plin")
  })

  test("matches case-insensitively", () => {
    expect(formatPaymentMethod("CASH")).toBe("Efectivo")
  })

  test("trims whitespace", () => {
    expect(formatPaymentMethod("  cash  ")).toBe("Efectivo")
  })

  test("formats unknown method as document type", () => {
    expect(formatPaymentMethod("bitcoin")).toBe("Bitcoin")
  })

  test("returns fallback for empty method", () => {
    expect(formatPaymentMethod("")).toBe("Documento")
  })
})

test.describe("customerDocument", () => {
  test("returns formatted document for DNI", () => {
    expect(customerDocument("dni", "12345678")).toBe("dni 12345678")
  })

  test("returns formatted document for RUC", () => {
    expect(customerDocument("ruc", "12345678901")).toBe("ruc 12345678901")
  })

  test("returns null when both are null", () => {
    expect(customerDocument(null, null)).toBeNull()
  })

  test("returns null when both are empty strings", () => {
    expect(customerDocument("", "")).toBeNull()
  })

  test("returns doc number only when type is null", () => {
    expect(customerDocument(null, "12345678")).toBe("12345678")
  })

  test("returns doc type only when number is null", () => {
    expect(customerDocument("dni", null)).toBe("dni")
  })

  test("trims result", () => {
    expect(customerDocument("dni", "12345678")).toBe("dni 12345678")
  })
})
