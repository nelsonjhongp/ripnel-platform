import { test, expect } from "@playwright/test"
import {
  formatAmount,
  formatBusinessDate,
  getCashStatusLabel,
  deriveConsistencyTone,
  buildCashAdminQuery,
} from "../components/modules/cash/cash-utils"

test.describe("formatAmount", () => {
  test("formats positive number", () => {
    expect(formatAmount(150.5)).toBe("S/. 150.50")
  })

  test("formats zero", () => {
    expect(formatAmount(0)).toBe("S/. 0.00")
  })

  test("formats undefined as zero", () => {
    expect(formatAmount(undefined)).toBe("S/. 0.00")
  })

  test("formats string number", () => {
    expect(formatAmount("45.5")).toBe("S/. 45.50")
  })

  test("formats negative number", () => {
    expect(formatAmount(-25.3)).toBe("S/. -25.30")
  })
})

test.describe("formatBusinessDate", () => {
  test("formats YYYY-MM-DD to DD/MM/YYYY", () => {
    expect(formatBusinessDate("2026-06-15")).toBe("15/06/2026")
  })

  test("returns dash for null", () => {
    expect(formatBusinessDate(null)).toBe("-")
  })

  test("returns dash for undefined", () => {
    expect(formatBusinessDate(undefined)).toBe("-")
  })

  test("returns dash for empty string", () => {
    expect(formatBusinessDate("")).toBe("-")
  })

  test("handles other date formats", () => {
    const result = formatBusinessDate("2026-06-15T12:00:00Z")
    expect(result).not.toBe("-")
  })
})

test.describe("getCashStatusLabel", () => {
  test('returns "Pendiente de cierre" for open', () => {
    expect(getCashStatusLabel("open")).toBe("Pendiente de cierre")
  })

  test('returns "Cerrada" for closed', () => {
    expect(getCashStatusLabel("closed")).toBe("Cerrada")
  })
})

test.describe("buildCashAdminQuery", () => {
  test("builds query with only range", () => {
    const query = buildCashAdminQuery({
      range: "7d",
      status: "all",
      locationId: "all",
    })
    expect(query).toBe("range=7d")
  })

  test("includes status when not all", () => {
    const query = buildCashAdminQuery({
      range: "30d",
      status: "open",
      locationId: "all",
    })
    expect(query).toContain("range=30d")
    expect(query).toContain("status=open")
    expect(query).not.toContain("locationId")
  })

  test("includes locationId when not all", () => {
    const query = buildCashAdminQuery({
      range: "60d",
      status: "all",
      locationId: "loc_001",
    })
    expect(query).toContain("range=60d")
    expect(query).toContain("locationId=loc_001")
    expect(query).not.toContain("status")
  })

  test("includes pagination when page is set", () => {
    const query = buildCashAdminQuery({
      range: "7d",
      status: "all",
      locationId: "all",
      page: 3,
      pageSize: 10,
    })
    expect(query).toContain("page=3")
    expect(query).toContain("pageSize=10")
  })

  test("uses default pageSize 20 when not provided", () => {
    const query = buildCashAdminQuery({
      range: "7d",
      status: "all",
      locationId: "all",
      page: 1,
    })
    expect(query).toContain("pageSize=20")
  })

  test("includes all filters together", () => {
    const query = buildCashAdminQuery({
      range: "30d",
      status: "closed",
      locationId: "loc_002",
      page: 2,
      pageSize: 5,
    })
    expect(query).toContain("range=30d")
    expect(query).toContain("status=closed")
    expect(query).toContain("locationId=loc_002")
    expect(query).toContain("page=2")
    expect(query).toContain("pageSize=5")
  })

  test("omits status and locationId when both are all", () => {
    const query = buildCashAdminQuery({
      range: "7d",
      status: "all",
      locationId: "all",
      page: 1,
    })
    expect(query).not.toContain("status")
    expect(query).not.toContain("locationId")
  })
})
