import { test, expect } from "@playwright/test"
import {
  formatAmount,
  formatBusinessDate,
  getCashStatusLabel,
  deriveConsistencyTone,
  buildCashAdminQuery,
} from "../components/modules/cash/cash-utils"
import {
  buildCloseCashPayload,
  buildOpenCashPayload,
  deriveCashPageState,
} from "../components/modules/cash/cash-page-logic"
import {
  buildCashLocationChartData,
  buildCashLocationOptions,
  buildCashTrendData,
  buildReopenCashPayload,
  CASH_ADMIN_DEFAULT_FILTERS,
  hasCashAdminActiveFilters,
} from "../components/modules/cash/cash-admin-logic"
import type {
  CashAdminSummaryResponse,
  CurrentCashResponse,
  LocationOption,
} from "../components/modules/cash/cash-types"

function makeCurrentCashResponse(
  overrides: Partial<CurrentCashResponse> = {},
): CurrentCashResponse {
  return {
    business_date: "2026-06-24",
    closing: {
      cash_closing_id: "cash-1",
      location_id: "loc-1",
      location_name: "Tienda Principal",
      business_date: "2026-06-24",
      status: "open",
      opened_by: "user-1",
      opened_by_name: "Ana Caja",
      closed_by: null,
      closed_by_name: null,
      reopened_by: null,
      reopened_by_name: null,
      reopened_at: null,
      reopen_notes: null,
      opening_balance: 25,
      closing_balance_declared: 90,
      total_cash: 60,
      total_yape: 20,
      total_plin: 10,
      total_transfer: 5,
      total_all: 95,
      notes: null,
      created_at: "2026-06-24T09:00:00Z",
      closed_at: null,
    },
    sales_summary: {
      sale_count: 3,
      grand_total: 95,
      by_method: {
        cash: 60,
        yape: 20,
        plin: 10,
        transfer: 5,
        all: 95,
      },
      consistency: {
        payment_total: 95,
        difference: 0,
        is_consistent: true,
      },
    },
    ...overrides,
  }
}

function makeAdminSummary(
  overrides: Partial<CashAdminSummaryResponse> = {},
): CashAdminSummaryResponse {
  return {
    filters: {
      range: "7d",
      status: "all",
      location_id: null,
    },
    stats: {
      session_count: 2,
      open_count: 1,
      closed_count: 1,
      open_location_count: 1,
      total_registered: 150,
    },
    trend: [
      {
        business_date: "2026-06-24",
        session_count: 2,
        open_count: 1,
        closed_count: 1,
        total_registered: 150,
      },
    ],
    by_location: [
      {
        location_id: "loc-1",
        location_name: "Tienda Principal Centro",
        session_count: 2,
        open_count: 1,
        closed_count: 1,
        total_registered: 150,
      },
    ],
    alerts: {
      open_locations: [],
      inconsistent_sessions: [],
    },
    ...overrides,
  }
}

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

test.describe("deriveConsistencyTone", () => {
  test("returns success tone for consistent data", () => {
    expect(deriveConsistencyTone(true)).toContain("success")
  })

  test("returns warning tone for inconsistent data", () => {
    expect(deriveConsistencyTone(false)).toContain("warning")
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

  test("supports backend-aligned 60d range", () => {
    const query = buildCashAdminQuery({
      range: "60d",
      status: "all",
      locationId: "all",
    })
    expect(query).toBe("range=60d")
  })
})

test.describe("cash page logic", () => {
  test("buildOpenCashPayload trims notes and omits empty fields", () => {
    expect(
      buildOpenCashPayload({
        locationId: "loc-1",
        openNotes: "  Apertura inicial  ",
        openingBalance: "15.5",
      }),
    ).toEqual({
      location_id: "loc-1",
      notes: "Apertura inicial",
      opening_balance: 15.5,
    })

    expect(
      buildOpenCashPayload({
        locationId: "loc-1",
        openNotes: "   ",
        openingBalance: "",
      }),
    ).toEqual({
      location_id: "loc-1",
    })
  })

  test("buildCloseCashPayload propagates values only when present", () => {
    expect(
      buildCloseCashPayload({
        closeNotes: "Cierre sin novedad",
        closingBalanceDeclared: "99.9",
      }),
    ).toEqual({
      notes: "Cierre sin novedad",
      closing_balance_declared: 99.9,
    })

    expect(
      buildCloseCashPayload({
        closeNotes: "",
        closingBalanceDeclared: "",
      }),
    ).toEqual({})
  })

  test("deriveCashPageState returns open banner and formatted values", () => {
    const state = deriveCashPageState(makeCurrentCashResponse())

    expect(state.isOpen).toBe(true)
    expect(state.isClosed).toBe(false)
    expect(state.bannerState).toEqual({
      kind: "open",
      openedByName: "Ana Caja",
    })
    expect(state.cashStatusMeta).toEqual({
      text: "24/06/2026",
      tooltip:
        "La fecha operativa corresponde al dia de trabajo de la sede actual en horario de Lima.",
    })
    expect(state.methodValues).toEqual({
      cash: "S/. 60.00",
      yape: "S/. 20.00",
      plin: "S/. 10.00",
      transfer: "S/. 5.00",
    })
    expect(state.grandTotal).toBe("S/. 95.00")
    expect(state.paymentTotal).toBe("S/. 95.00")
    expect(state.closeSummaryTotal).toBe("S/. 95.00")
    expect(state.closeWarningMessage).toBeNull()
    expect(state.saleCount).toBe(3)
    expect(state.balanceDifference).toBe(-5)
    expect(state.balanceDiffLabel).toEqual({
      label: "Faltante",
      value: "S/. 5.00",
      tone: "warning",
    })
  })

  test("deriveCashPageState returns closed banner and surplus label", () => {
    const state = deriveCashPageState(
      makeCurrentCashResponse({
        closing: {
          ...makeCurrentCashResponse().closing!,
          status: "closed",
          opened_by_name: null,
          closed_by_name: "Luis Supervisor",
          total_all: 80,
          closing_balance_declared: 90,
        },
        sales_summary: {
          ...makeCurrentCashResponse().sales_summary,
          consistency: {
            payment_total: 70,
            difference: 10,
            is_consistent: false,
          },
        },
      }),
    )

    expect(state.isClosed).toBe(true)
    expect(state.consistencyOk).toBe(false)
    expect(state.closeWarningMessage).toBe(
      "Los pagos registrados no coinciden con el total de ventas confirmadas. Puedes cerrar, pero conviene revisar la diferencia antes.",
    )
    expect(state.bannerState).toEqual({
      kind: "closed",
      closedByName: "Luis Supervisor",
    })
    expect(state.balanceDifference).toBe(10)
    expect(state.balanceDiffLabel).toEqual({
      label: "Sobrante",
      value: "S/. 10.00",
      tone: undefined,
    })
  })

  test("deriveCashPageState returns not-open state when there is no session", () => {
    const state = deriveCashPageState(
      makeCurrentCashResponse({
        closing: null,
        business_date: "" as never,
      }),
    )

    expect(state.bannerState).toEqual({ kind: "not-open" })
    expect(state.cashStatusMeta).toBeNull()
    expect(state.declaredBalance).toBeNull()
    expect(state.balanceDifference).toBeNull()
    expect(state.balanceDiffLabel).toBeNull()
  })
})

test.describe("cash admin logic", () => {
  test("buildReopenCashPayload trims text and falls back to null", () => {
    expect(buildReopenCashPayload("  Revision manual  ")).toEqual({
      reopen_notes: "Revision manual",
    })
    expect(buildReopenCashPayload("   ")).toEqual({
      reopen_notes: null,
    })
  })

  test("buildCashLocationOptions prepends all locations option", () => {
    const locations: LocationOption[] = [
      { location_id: "loc-1", name: "Tienda Centro" },
      { location_id: "loc-2", name: "Tienda Norte" },
    ]

    expect(buildCashLocationOptions(locations)).toEqual([
      { value: "all", label: "Todas las sedes" },
      { value: "loc-1", label: "Tienda Centro" },
      { value: "loc-2", label: "Tienda Norte" },
    ])
  })

  test("buildCashTrendData formats short dates for charts", () => {
    expect(buildCashTrendData(makeAdminSummary())).toEqual([
      expect.objectContaining({
        business_date: "2026-06-24",
        short_date: "24/06",
      }),
    ])
  })

  test("buildCashLocationChartData truncates long names and limits rows", () => {
    const summary = makeAdminSummary({
      by_location: [
        {
          location_id: "loc-1",
          location_name: "Tienda Principal Centro",
          session_count: 2,
          open_count: 1,
          closed_count: 1,
          total_registered: 150,
        },
        {
          location_id: "loc-2",
          location_name: "Sur",
          session_count: 1,
          open_count: 0,
          closed_count: 1,
          total_registered: 50,
        },
      ],
    })

    expect(buildCashLocationChartData(summary)).toEqual([
      expect.objectContaining({
        location_id: "loc-1",
        short_name: "Tienda Princip…",
      }),
      expect.objectContaining({
        location_id: "loc-2",
        short_name: "Sur",
      }),
    ])
  })

  test("hasCashAdminActiveFilters reflects default admin contract", () => {
    expect(CASH_ADMIN_DEFAULT_FILTERS).toEqual({
      range: "7d",
      status: "all",
      locationId: "all",
      page: 1,
    })

    expect(
      hasCashAdminActiveFilters({
        range: "7d",
        status: "all",
        locationId: "all",
      }),
    ).toBe(false)

    expect(
      hasCashAdminActiveFilters({
        range: "60d",
        status: "all",
        locationId: "all",
      }),
    ).toBe(true)
  })
})
