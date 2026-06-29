const { afterEach, beforeEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");

const cashRepo = require("../modules/cash/cash.repo");
const authRepo = require("../modules/auth/auth.repo");
const usersRepo = require("../modules/users/users.repo");
const db = require("../shared/db");

const SERVICE_PATH = require.resolve("../modules/cash/cash.service");

const USER_ID = "11111111-1111-4111-8111-111111111111";
const ADMIN_ID = "22222222-2222-4222-8222-222222222222";
const LOCATION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_LOCATION_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CASH_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const originalCashRepo = {
  findCashClosingByLocationAndDate: cashRepo.findCashClosingByLocationAndDate,
  findCashClosingById: cashRepo.findCashClosingById,
  findAllCashClosings: cashRepo.findAllCashClosings,
  insertCashClosing: cashRepo.insertCashClosing,
  updateCashClosingClose: cashRepo.updateCashClosingClose,
  updateCashClosingReopen: cashRepo.updateCashClosingReopen,
  sumSalesPaymentsByLocationAndDate: cashRepo.sumSalesPaymentsByLocationAndDate,
  countSalesByLocationAndDate: cashRepo.countSalesByLocationAndDate,
  countUnconfirmedSalesByLocationAndDate:
    cashRepo.countUnconfirmedSalesByLocationAndDate,
  getAdminCashSummary: cashRepo.getAdminCashSummary,
  findAdminCashSessions: cashRepo.findAdminCashSessions,
};

const originalAuthRepo = {
  findActiveUserById: authRepo.findActiveUserById,
};

const originalUsersRepo = {
  findDefaultLocationByUserId: usersRepo.findDefaultLocationByUserId,
};

const originalDb = {
  query: db.query,
};

function buildUser(overrides = {}) {
  return {
    user_id: USER_ID,
    full_name: "Operador Caja",
    role_name: "CAJA",
    active: true,
    ...overrides,
  };
}

function buildLocation(overrides = {}) {
  return {
    location_id: LOCATION_ID,
    name: "Tienda Principal",
    code: "TP-01",
    type: "store",
    active: true,
    ...overrides,
  };
}

function buildCashClosing(overrides = {}) {
  return {
    cash_closing_id: CASH_ID,
    location_id: LOCATION_ID,
    business_date: "2026-06-24",
    status: "open",
    opened_by: USER_ID,
    closed_by: null,
    reopened_by: null,
    reopened_at: null,
    reopen_notes: null,
    opening_balance: "125.5",
    closing_balance_declared: null,
    total_cash: "0",
    total_yape: "0",
    total_plin: "0",
    total_transfer: "0",
    total_all: "0",
    notes: "Turno manana",
    created_at: "2026-06-24T12:00:00.000Z",
    closed_at: null,
    updated_at: "2026-06-24T12:00:00.000Z",
    location_name: "Tienda Principal",
    opened_by_name: "Operador Caja",
    closed_by_name: null,
    reopened_by_name: null,
    sale_count: 0,
    grand_total: "0",
    payment_total: "0",
    difference: "0",
    is_consistent: true,
    ...overrides,
  };
}

function applyBaseStubs(overrides = {}) {
  const existingLocationIds = new Set(
    overrides.existingLocationIds || [LOCATION_ID, OTHER_LOCATION_ID],
  );

  cashRepo.findCashClosingByLocationAndDate =
    overrides.findCashClosingByLocationAndDate || (async () => null);
  cashRepo.findCashClosingById =
    overrides.findCashClosingById || (async () => null);
  cashRepo.findAllCashClosings =
    overrides.findAllCashClosings ||
    (async () => ({ rows: [], totalItems: 0 }));
  cashRepo.insertCashClosing =
    overrides.insertCashClosing ||
    (async () => ({ cash_closing_id: CASH_ID }));
  cashRepo.updateCashClosingClose =
    overrides.updateCashClosingClose || (async () => null);
  cashRepo.updateCashClosingReopen =
    overrides.updateCashClosingReopen || (async () => null);
  cashRepo.sumSalesPaymentsByLocationAndDate =
    overrides.sumSalesPaymentsByLocationAndDate || (async () => []);
  cashRepo.countSalesByLocationAndDate =
    overrides.countSalesByLocationAndDate ||
    (async () => ({ sale_count: 0, grand_total: 0 }));
  cashRepo.countUnconfirmedSalesByLocationAndDate =
    overrides.countUnconfirmedSalesByLocationAndDate || (async () => 0);
  cashRepo.getAdminCashSummary =
    overrides.getAdminCashSummary ||
    (async () => ({
      stats: {
        session_count: 0,
        open_count: 0,
        closed_count: 0,
        open_location_count: 0,
        total_registered: 0,
      },
      trend: [],
      by_location: [],
      open_locations: [],
      inconsistent_sessions: [],
    }));
  cashRepo.findAdminCashSessions =
    overrides.findAdminCashSessions ||
    (async () => ({
      rows: [],
      totalItems: 0,
      page: 1,
      pageSize: 20,
    }));

  authRepo.findActiveUserById =
    overrides.findActiveUserById || (async (userId) => buildUser({ user_id: userId }));
  usersRepo.findDefaultLocationByUserId =
    overrides.findDefaultLocationByUserId || (async () => buildLocation());
  db.query =
    overrides.query ||
    (async (_sql, params = []) => ({
      rows: existingLocationIds.has(params[0])
        ? [{ location_id: params[0] }]
        : [],
    }));
}

function restoreStubs() {
  Object.assign(cashRepo, originalCashRepo);
  Object.assign(authRepo, originalAuthRepo);
  Object.assign(usersRepo, originalUsersRepo);
  Object.assign(db, originalDb);
  delete require.cache[SERVICE_PATH];
}

function loadCashService(overrides = {}) {
  applyBaseStubs(overrides);
  delete require.cache[SERVICE_PATH];
  return require(SERVICE_PATH);
}

function assertAppError(error, { statusCode, code }) {
  assert.equal(error.name, "AppError");
  assert.equal(error.statusCode, statusCode);
  assert.equal(error.code, code);
  return true;
}

describe("cash service", () => {
  beforeEach(() => {
    restoreStubs();
  });

  afterEach(() => {
    restoreStubs();
  });

  it("openCash creates a new session with normalized payload", async () => {
    let capturedInsert = null;
    const createdClosing = buildCashClosing({
      opening_balance: "150.75",
      notes: "Apertura de prueba",
    });
    const service = loadCashService({
      insertCashClosing: async (payload) => {
        capturedInsert = payload;
        return { cash_closing_id: CASH_ID };
      },
      findCashClosingById: async () => createdClosing,
    });

    const result = await service.openCash({
      user_id: USER_ID,
      permissions: ["cash.operate"],
      location_id: LOCATION_ID,
      business_date: " 2026-06-24 ",
      opening_balance: "150.75",
      notes: "  Apertura de prueba  ",
    });

    assert.deepEqual(capturedInsert, {
      location_id: LOCATION_ID,
      business_date: "2026-06-24",
      opened_by: USER_ID,
      opening_balance: 150.75,
      notes: "Apertura de prueba",
    });
    assert.equal(result.cash_closing_id, CASH_ID);
    assert.equal(result.opening_balance, 150.75);
    assert.equal(result.notes, "Apertura de prueba");
  });

  it("openCash returns the existing session when it is already open", async () => {
    const existing = buildCashClosing({ status: "open", opening_balance: "90" });
    const service = loadCashService({
      findCashClosingByLocationAndDate: async () => existing,
    });

    const result = await service.openCash({
      user_id: USER_ID,
      permissions: ["cash.operate"],
      location_id: LOCATION_ID,
      business_date: "2026-06-24",
    });

    assert.equal(result.cash_closing_id, CASH_ID);
    assert.equal(result.status, "open");
    assert.equal(result.opening_balance, 90);
  });

  it("openCash rejects when a closed session already exists for the date", async () => {
    const service = loadCashService({
      findCashClosingByLocationAndDate: async () =>
        buildCashClosing({ status: "closed" }),
    });

    await assert.rejects(
      () =>
        service.openCash({
          user_id: USER_ID,
          permissions: ["cash.operate"],
          location_id: LOCATION_ID,
        }),
      (error) =>
        assertAppError(error, {
          statusCode: 409,
          code: "CASH_ALREADY_CLOSED_FOR_DATE",
        }),
    );
  });

  it("openCash rejects when the location does not exist", async () => {
    const service = loadCashService({
      existingLocationIds: [OTHER_LOCATION_ID],
    });

    await assert.rejects(
      () =>
        service.openCash({
          user_id: USER_ID,
          permissions: ["cash.operate"],
          location_id: LOCATION_ID,
        }),
      (error) =>
        assertAppError(error, {
          statusCode: 404,
          code: "LOCATION_NOT_FOUND",
        }),
    );
  });

  it("openCash rejects when the user can see cash but cannot operate it", async () => {
    const service = loadCashService();

    await assert.rejects(
      () =>
        service.openCash({
          user_id: USER_ID,
          permissions: ["cash.view"],
          location_id: LOCATION_ID,
        }),
      (error) => assertAppError(error, { statusCode: 403, code: "FORBIDDEN" }),
    );
  });

  it("closeCash computes payment totals and persists the closing payload", async () => {
    let capturedUpdate = null;
    let findByIdCalls = 0;
    const service = loadCashService({
      findCashClosingById: async () => {
        findByIdCalls += 1;
        return findByIdCalls === 1
          ? buildCashClosing({ status: "open" })
          : buildCashClosing({
              status: "closed",
              closed_by: USER_ID,
              total_cash: "50",
              total_yape: "20",
              total_plin: "10",
              total_transfer: "5",
              total_all: "85",
              closing_balance_declared: "82.25",
              notes: "Cierre final",
            });
      },
      sumSalesPaymentsByLocationAndDate: async () => [
        { method: "cash", total: 50 },
        { method: "yape", total: 20 },
        { method: "plin", total: 10 },
        { method: "transfer", total: 5 },
      ],
      updateCashClosingClose: async (cashClosingId, payload) => {
        capturedUpdate = { cashClosingId, payload };
      },
    });

    const result = await service.closeCash({
      user_id: USER_ID,
      permissions: ["cash.operate"],
      location_id: LOCATION_ID,
      cash_closing_id: CASH_ID,
      closing_balance_declared: 82.25,
      notes: "Cierre final",
    });

    assert.deepEqual(capturedUpdate, {
      cashClosingId: CASH_ID,
      payload: {
        closed_by: USER_ID,
        total_cash: 50,
        total_yape: 20,
        total_plin: 10,
        total_transfer: 5,
        total_all: 85,
        closing_balance_declared: 82.25,
        notes: "Cierre final",
      },
    });
    assert.equal(result.status, "closed");
    assert.equal(result.total_all, 85);
    assert.equal(result.closing_balance_declared, 82.25);
  });

  it("closeCash allows closing even when payments differ from confirmed sales totals", async () => {
    let capturedUpdate = null;
    let findByIdCalls = 0;
    const service = loadCashService({
      findCashClosingById: async () => {
        findByIdCalls += 1;
        return findByIdCalls === 1
          ? buildCashClosing({ status: "open" })
          : buildCashClosing({
              status: "closed",
              total_cash: "40",
              total_yape: "10",
              total_plin: "0",
              total_transfer: "0",
              total_all: "50",
              grand_total: "65",
              payment_total: "50",
              difference: "15",
              is_consistent: false,
            });
      },
      sumSalesPaymentsByLocationAndDate: async () => [
        { method: "cash", total: 40 },
        { method: "yape", total: 10 },
      ],
      updateCashClosingClose: async (cashClosingId, payload) => {
        capturedUpdate = { cashClosingId, payload };
      },
    });

    const result = await service.closeCash({
      user_id: USER_ID,
      permissions: ["cash.operate"],
      location_id: LOCATION_ID,
      cash_closing_id: CASH_ID,
    });

    assert.deepEqual(capturedUpdate, {
      cashClosingId: CASH_ID,
      payload: {
        closed_by: USER_ID,
        total_cash: 40,
        total_yape: 10,
        total_plin: 0,
        total_transfer: 0,
        total_all: 50,
        closing_balance_declared: null,
        notes: null,
      },
    });
    assert.equal(result.total_all, 50);
    assert.equal(result.difference, 15);
    assert.equal(result.is_consistent, false);
  });

  it("closeCash rejects when the session is already closed", async () => {
    const service = loadCashService({
      findCashClosingById: async () => buildCashClosing({ status: "closed" }),
    });

    await assert.rejects(
      () =>
        service.closeCash({
          user_id: USER_ID,
          permissions: ["cash.operate"],
          location_id: LOCATION_ID,
          cash_closing_id: CASH_ID,
        }),
      (error) =>
        assertAppError(error, {
          statusCode: 409,
          code: "CASH_ALREADY_CLOSED",
        }),
    );
  });

  it("closeCash rejects when there are unconfirmed sales", async () => {
    const service = loadCashService({
      findCashClosingById: async () => buildCashClosing({ status: "open" }),
      countUnconfirmedSalesByLocationAndDate: async () => 3,
    });

    await assert.rejects(
      () =>
        service.closeCash({
          user_id: USER_ID,
          permissions: ["cash.operate"],
          location_id: LOCATION_ID,
          cash_closing_id: CASH_ID,
        }),
      (error) =>
        assertAppError(error, {
          statusCode: 409,
          code: "UNCONFIRMED_SALES_EXIST",
        }),
    );
  });

  it("closeCash rejects when the cash session belongs to another location", async () => {
    const service = loadCashService({
      findCashClosingById: async () =>
        buildCashClosing({ location_id: OTHER_LOCATION_ID }),
    });

    await assert.rejects(
      () =>
        service.closeCash({
          user_id: USER_ID,
          permissions: ["cash.operate"],
          location_id: LOCATION_ID,
          cash_closing_id: CASH_ID,
        }),
      (error) =>
        assertAppError(error, {
          statusCode: 403,
          code: "FORBIDDEN_LOCATION",
        }),
    );
  });

  it("closeCash rejects invalid cash_closing_id", async () => {
    const service = loadCashService();

    await assert.rejects(
      () =>
        service.closeCash({
          user_id: USER_ID,
          permissions: ["cash.operate"],
          location_id: LOCATION_ID,
          cash_closing_id: "not-a-uuid",
        }),
      (error) =>
        assertAppError(error, {
          statusCode: 400,
          code: "INVALID_CASH_CLOSING_ID",
        }),
    );
  });

  it("reopenCash reopens a closed session with the acting admin", async () => {
    let capturedUpdate = null;
    let findByIdCalls = 0;
    const service = loadCashService({
      findActiveUserById: async (userId) =>
        buildUser({ user_id: userId, full_name: "Admin Caja" }),
      findCashClosingById: async () => {
        findByIdCalls += 1;
        return findByIdCalls === 1
          ? buildCashClosing({ status: "closed", closed_by: USER_ID })
          : buildCashClosing({
              status: "open",
              reopened_by: ADMIN_ID,
              reopen_notes: "Revision de faltante",
              reopened_by_name: "Admin Caja",
            });
      },
      updateCashClosingReopen: async (cashClosingId, payload) => {
        capturedUpdate = { cashClosingId, payload };
      },
    });

    const result = await service.reopenCash({
      user_id: ADMIN_ID,
      permissions: ["cash.admin.view", "cash.admin.reopen"],
      cash_closing_id: CASH_ID,
      reopen_notes: "  Revision de faltante  ",
    });

    assert.deepEqual(capturedUpdate, {
      cashClosingId: CASH_ID,
      payload: {
        reopened_by: ADMIN_ID,
        reopen_notes: "Revision de faltante",
      },
    });
    assert.equal(result.status, "open");
    assert.equal(result.reopened_by, ADMIN_ID);
    assert.equal(result.reopen_notes, "Revision de faltante");
  });

  it("reopenCash rejects invalid session states and permissions", async () => {
    const serviceNoPermission = loadCashService();
    await assert.rejects(
      () =>
        serviceNoPermission.reopenCash({
          user_id: ADMIN_ID,
          permissions: ["cash.admin.view"],
          cash_closing_id: CASH_ID,
        }),
      (error) => assertAppError(error, { statusCode: 403, code: "FORBIDDEN" }),
    );

    const serviceNotFound = loadCashService({
      findCashClosingById: async () => null,
    });
    await assert.rejects(
      () =>
        serviceNotFound.reopenCash({
          user_id: ADMIN_ID,
          permissions: ["cash.admin.view", "cash.admin.reopen"],
          cash_closing_id: CASH_ID,
        }),
      (error) =>
        assertAppError(error, {
          statusCode: 404,
          code: "CASH_CLOSING_NOT_FOUND",
        }),
    );

    const serviceWrongState = loadCashService({
      findCashClosingById: async () => buildCashClosing({ status: "open" }),
    });
    await assert.rejects(
      () =>
        serviceWrongState.reopenCash({
          user_id: ADMIN_ID,
          permissions: ["cash.admin.view", "cash.admin.reopen"],
          cash_closing_id: CASH_ID,
        }),
      (error) =>
        assertAppError(error, { statusCode: 409, code: "CASH_NOT_CLOSED" }),
    );
  });

  it("getCurrentCash returns the session and a computed sales summary", async () => {
    const service = loadCashService({
      findCashClosingByLocationAndDate: async () =>
        buildCashClosing({ total_all: "85" }),
      sumSalesPaymentsByLocationAndDate: async () => [
        { method: "cash", total: 50 },
        { method: "yape", total: 25 },
      ],
      countSalesByLocationAndDate: async () => ({
        sale_count: 3,
        grand_total: 90,
      }),
    });

    const result = await service.getCurrentCash({
      user_id: USER_ID,
      permissions: ["cash.view"],
      location_id: LOCATION_ID,
      business_date: "2026-06-24",
    });

    assert.equal(result.business_date, "2026-06-24");
    assert.equal(result.closing.total_all, 85);
    assert.equal(result.sales_summary.sale_count, 3);
    assert.equal(result.sales_summary.by_method.cash, 50);
    assert.equal(result.sales_summary.consistency.payment_total, 75);
    assert.equal(result.sales_summary.consistency.difference, 15);
    assert.equal(result.sales_summary.consistency.is_consistent, false);
  });

  it("getCurrentCash rejects when the requested location does not exist", async () => {
    const service = loadCashService({
      existingLocationIds: [OTHER_LOCATION_ID],
    });

    await assert.rejects(
      () =>
        service.getCurrentCash({
          user_id: USER_ID,
          permissions: ["cash.view"],
          location_id: LOCATION_ID,
        }),
      (error) =>
        assertAppError(error, {
          statusCode: 404,
          code: "LOCATION_NOT_FOUND",
        }),
    );
  });

  it("listCashClosings applies default pagination and serializes rows", async () => {
    let capturedFilters = null;
    const service = loadCashService({
      findAllCashClosings: async (filters) => {
        capturedFilters = filters;
        return {
          rows: [buildCashClosing({ total_all: "80.5", sale_count: "2" })],
          totalItems: 1,
        };
      },
    });

    const result = await service.listCashClosings({
      user_id: USER_ID,
      permissions: ["cash.view"],
      location_id: LOCATION_ID,
    });

    assert.equal(capturedFilters.locationId, LOCATION_ID);
    assert.equal(capturedFilters.status, null);
    assert.equal(capturedFilters.limit, 10);
    assert.equal(capturedFilters.offset, 0);
    assert.match(capturedFilters.startDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(capturedFilters.endDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(result.items[0].total_all, 80.5);
    assert.equal(result.items[0].sale_count, 2);
    assert.deepEqual(result.pagination, {
      page: 1,
      page_size: 10,
      total_items: 1,
      total_pages: 1,
    });
  });

  it("listCashClosings supports custom ranges and rejects invalid status", async () => {
    let capturedFilters = null;
    const service = loadCashService({
      findAllCashClosings: async (filters) => {
        capturedFilters = filters;
        return { rows: [], totalItems: 0 };
      },
    });

    await service.listCashClosings({
      user_id: USER_ID,
      permissions: ["cash.view"],
      location_id: LOCATION_ID,
      date_from: "2026-06-01",
      date_to: "2026-06-15",
      status: "closed",
      page: 2,
      pageSize: 5,
    });

    assert.deepEqual(capturedFilters, {
      locationId: LOCATION_ID,
      status: "closed",
      startDate: "2026-06-01",
      endDate: "2026-06-15",
      limit: 5,
      offset: 5,
    });

    await assert.rejects(
      () =>
        service.listCashClosings({
          user_id: USER_ID,
          permissions: ["cash.view"],
          location_id: LOCATION_ID,
          status: "pending",
        }),
      (error) =>
        assertAppError(error, {
          statusCode: 400,
          code: "INVALID_STATUS",
        }),
    );
  });

  it("getCashClosing returns detail with sales summary and enforces location scope", async () => {
    const service = loadCashService({
      findCashClosingById: async () =>
        buildCashClosing({
          grand_total: "110",
          payment_total: "100",
          difference: "10",
          is_consistent: false,
        }),
      sumSalesPaymentsByLocationAndDate: async () => [
        { method: "cash", total: 60 },
        { method: "transfer", total: 40 },
      ],
      countSalesByLocationAndDate: async () => ({
        sale_count: 4,
        grand_total: 110,
      }),
    });

    const result = await service.getCashClosing({
      user_id: USER_ID,
      permissions: ["cash.view"],
      cash_closing_id: CASH_ID,
    });

    assert.equal(result.cash_closing_id, CASH_ID);
    assert.equal(result.sales_summary.sale_count, 4);
    assert.equal(result.sales_summary.by_method.transfer, 40);
    assert.equal(result.sales_summary.consistency.difference, 10);

    const serviceMissing = loadCashService({
      findCashClosingById: async () => null,
    });
    await assert.rejects(
      () =>
        serviceMissing.getCashClosing({
          user_id: USER_ID,
          permissions: ["cash.view"],
          cash_closing_id: CASH_ID,
        }),
      (error) =>
        assertAppError(error, {
          statusCode: 404,
          code: "CASH_CLOSING_NOT_FOUND",
        }),
    );

    const serviceForbidden = loadCashService({
      findCashClosingById: async () =>
        buildCashClosing({ location_id: LOCATION_ID }),
      findDefaultLocationByUserId: async () =>
        buildLocation({ location_id: OTHER_LOCATION_ID }),
    });
    await assert.rejects(
      () =>
        serviceForbidden.getCashClosing({
          user_id: USER_ID,
          permissions: ["cash.view"],
          cash_closing_id: CASH_ID,
        }),
      (error) =>
        assertAppError(error, {
          statusCode: 403,
          code: "FORBIDDEN_LOCATION",
        }),
    );
  });

  it("getCashAdminSummary requires admin permission and serializes admin data", async () => {
    const serviceNoAdmin = loadCashService();
    await assert.rejects(
      () =>
        serviceNoAdmin.getCashAdminSummary({
          user_id: ADMIN_ID,
          permissions: ["cash.view"],
          range: "7d",
        }),
      (error) => assertAppError(error, { statusCode: 403, code: "FORBIDDEN" }),
    );

    let capturedFilters = null;
    const service = loadCashService({
      getAdminCashSummary: async (filters) => {
        capturedFilters = filters;
        return {
          stats: {
            session_count: "5",
            open_count: "1",
            closed_count: "4",
            open_location_count: "1",
            total_registered: "355.9",
          },
          trend: [
            {
              business_date: "2026-06-24",
              session_count: "2",
              open_count: "0",
              closed_count: "2",
              total_registered: "180",
            },
          ],
          by_location: [
            {
              location_id: LOCATION_ID,
              business_date: "2026-06-24",
              session_count: "2",
              open_count: "0",
              closed_count: "2",
              open_location_count: "0",
              total_registered: "180",
            },
          ],
          open_locations: [
            {
              location_id: LOCATION_ID,
              business_date: "2026-06-24",
              session_count: "1",
              open_count: "1",
              closed_count: "0",
              open_location_count: "1",
              total_registered: "50",
            },
          ],
          inconsistent_sessions: [
            buildCashClosing({
              status: "closed",
              difference: "5.5",
              is_consistent: false,
            }),
          ],
        };
      },
      findActiveUserById: async (userId) =>
        buildUser({ user_id: userId, full_name: "Admin Caja" }),
    });

    const result = await service.getCashAdminSummary({
      user_id: ADMIN_ID,
      permissions: ["cash.admin.view"],
      range: "7d",
      status: "closed",
      location_id: LOCATION_ID,
    });

    assert.deepEqual(capturedFilters, {
      locationId: LOCATION_ID,
      status: "closed",
      startDate: capturedFilters.startDate,
      endDate: capturedFilters.endDate,
    });
    assert.match(capturedFilters.startDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(capturedFilters.endDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(result.filters.range, "7d");
    assert.equal(result.stats.total_registered, 355.9);
    assert.equal(result.trend[0].session_count, 2);
    assert.equal(result.by_location[0].total_registered, 180);
    assert.equal(result.alerts.open_locations[0].open_count, 1);
    assert.equal(result.alerts.inconsistent_sessions[0].difference, 5.5);
  });

  it("listCashAdminSessions validates filters and returns paginated results", async () => {
    const serviceInvalid = loadCashService({
      findActiveUserById: async (userId) => buildUser({ user_id: userId }),
    });

    await assert.rejects(
      () =>
        serviceInvalid.listCashAdminSessions({
          user_id: ADMIN_ID,
          permissions: ["cash.admin.view"],
          range: "30d",
          status: "pending",
        }),
      (error) =>
        assertAppError(error, {
          statusCode: 400,
          code: "INVALID_STATUS",
        }),
    );

    let capturedFilters = null;
    const service = loadCashService({
      findActiveUserById: async (userId) =>
        buildUser({ user_id: userId, full_name: "Admin Caja" }),
      findAdminCashSessions: async (filters) => {
        capturedFilters = filters;
        return {
          rows: [buildCashClosing({ status: "closed", total_all: "200" })],
          totalItems: 7,
          page: 2,
          pageSize: 3,
        };
      },
    });

    const result = await service.listCashAdminSessions({
      user_id: ADMIN_ID,
      permissions: ["cash.admin.view"],
      range: "30d",
      status: "closed",
      location_id: LOCATION_ID,
      page: 2,
      page_size: 3,
    });

    assert.deepEqual(capturedFilters, {
      locationId: LOCATION_ID,
      status: "closed",
      startDate: capturedFilters.startDate,
      endDate: capturedFilters.endDate,
      page: 2,
      pageSize: 3,
    });
    assert.equal(result.filters.status, "closed");
    assert.equal(result.items[0].total_all, 200);
    assert.deepEqual(result.pagination, {
      page: 2,
      page_size: 3,
      total_items: 7,
      total_pages: 3,
    });
  });
});
