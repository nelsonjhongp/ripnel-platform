const { afterEach, beforeEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");

const usersRepo = require("../modules/users/users.repo");
const transfersRepo = require("../modules/transfers/transfers.repo");

const SERVICE_PATH = require.resolve("../modules/transfers/transfers.service");

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";
const MONTEVIDEO = {
  location_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  code: "TD-MONT",
  name: "Montevideo",
  type: "store",
  active: true,
};
const TIENDA_CENTRO = {
  location_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  code: "TD-CENT",
  name: "Tienda Centro",
  type: "store",
  active: true,
};
const ALMACEN = {
  location_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  code: "ALM-CENT",
  name: "Almacen Central",
  type: "warehouse",
  active: true,
};

const originalUsersRepo = {
  findUserById: usersRepo.findUserById,
  findDefaultLocationByUserId: usersRepo.findDefaultLocationByUserId,
  findUserLocationsByUserId: usersRepo.findUserLocationsByUserId,
};

const originalTransfersRepo = {
  findAllTransfers: transfersRepo.findAllTransfers,
  findTransferHeaderById: transfersRepo.findTransferHeaderById,
  findTransferLinesByTransferId: transfersRepo.findTransferLinesByTransferId,
  markTransferApproved: transfersRepo.markTransferApproved,
  markTransferCancelled: transfersRepo.markTransferCancelled,
};

function buildTransfer(overrides = {}) {
  return {
    transfer_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    transfer_number: "TR-100",
    from_location_id: TIENDA_CENTRO.location_id,
    from_location_code: TIENDA_CENTRO.code,
    from_location_name: TIENDA_CENTRO.name,
    to_location_id: MONTEVIDEO.location_id,
    to_location_code: MONTEVIDEO.code,
    to_location_name: MONTEVIDEO.name,
    status: "requested",
    notes: null,
    created_by: USER_ID,
    created_by_name: "Operador Montevideo",
    approved_by: null,
    approved_by_name: null,
    shipped_by: null,
    shipped_by_name: null,
    received_by: null,
    received_by_name: null,
    cancelled_by: null,
    cancelled_by_name: null,
    created_at: "2026-06-01T03:10:00.000Z",
    approved_at: null,
    shipped_at: null,
    received_at: null,
    cancelled_at: null,
    updated_at: "2026-06-01T03:10:00.000Z",
    line_count: 1,
    qty_requested_total: 4,
    qty_shipped_total: 0,
    qty_received_total: 0,
    ...overrides,
  };
}

function buildTransferLine(overrides = {}) {
  return {
    transfer_line_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    transfer_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    variant_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    sku: "SKU-1",
    style_code: "ST-1",
    style_name: "Blusa Alba",
    size_code: "M",
    color_name: "Negro",
    qty_requested: 4,
    qty_shipped: 0,
    qty_received: 0,
    notes: null,
    ...overrides,
  };
}

function buildAssignment(location, isDefault = false) {
  return {
    user_id: USER_ID,
    location_id: location.location_id,
    is_default: isDefault,
    created_at: "2026-06-01T00:00:00.000Z",
    name: location.name,
    code: location.code,
    type: location.type,
    address: null,
    active: location.active,
  };
}

function buildAuth(permissions, roleName = "TIENDA", userId = USER_ID) {
  return {
    sub: userId,
    permissions,
    role_name: roleName,
  };
}

function applyBaseStubs(overrides = {}) {
  usersRepo.findUserById =
    overrides.findUserById ||
    (async (userId) => ({
      user_id: userId,
      full_name: userId === USER_ID ? "Operador Montevideo" : "Operador Centro",
      role_name: "TIENDA",
      active: true,
    }));
  usersRepo.findDefaultLocationByUserId =
    overrides.findDefaultLocationByUserId || (async () => MONTEVIDEO);
  usersRepo.findUserLocationsByUserId =
    overrides.findUserLocationsByUserId ||
    (async () => [buildAssignment(MONTEVIDEO, true), buildAssignment(TIENDA_CENTRO)]);

  transfersRepo.findAllTransfers = overrides.findAllTransfers || (async () => []);
  transfersRepo.findTransferHeaderById =
    overrides.findTransferHeaderById || (async () => null);
  transfersRepo.findTransferLinesByTransferId =
    overrides.findTransferLinesByTransferId || (async () => []);
  transfersRepo.markTransferApproved =
    overrides.markTransferApproved || (async () => null);
  transfersRepo.markTransferCancelled =
    overrides.markTransferCancelled || (async () => null);
}

function loadTransfersService(overrides = {}) {
  applyBaseStubs(overrides);
  delete require.cache[SERVICE_PATH];
  return require(SERVICE_PATH);
}

function restoreStubs() {
  usersRepo.findUserById = originalUsersRepo.findUserById;
  usersRepo.findDefaultLocationByUserId = originalUsersRepo.findDefaultLocationByUserId;
  usersRepo.findUserLocationsByUserId = originalUsersRepo.findUserLocationsByUserId;

  transfersRepo.findAllTransfers = originalTransfersRepo.findAllTransfers;
  transfersRepo.findTransferHeaderById = originalTransfersRepo.findTransferHeaderById;
  transfersRepo.findTransferLinesByTransferId = originalTransfersRepo.findTransferLinesByTransferId;
  transfersRepo.markTransferApproved = originalTransfersRepo.markTransferApproved;
  transfersRepo.markTransferCancelled = originalTransfersRepo.markTransferCancelled;

  delete require.cache[SERVICE_PATH];
}

describe("transfers service", () => {
  beforeEach(() => {
    restoreStubs();
  });

  afterEach(() => {
    restoreStubs();
  });

  it("builds the inbox from the active location queues by default", async () => {
    let capturedFilters = null;
    const service = loadTransfersService({
      findAllTransfers: async (filters) => {
        capturedFilters = filters;
        return [
          buildTransfer({
            transfer_id: "10000000-0000-4000-8000-000000000001",
            transfer_number: "TR-OPEN",
            from_location_id: TIENDA_CENTRO.location_id,
            from_location_code: TIENDA_CENTRO.code,
            from_location_name: TIENDA_CENTRO.name,
            to_location_id: MONTEVIDEO.location_id,
            to_location_code: MONTEVIDEO.code,
            to_location_name: MONTEVIDEO.name,
            status: "requested",
          }),
          buildTransfer({
            transfer_id: "10000000-0000-4000-8000-000000000002",
            transfer_number: "TR-APPROVE",
            from_location_id: MONTEVIDEO.location_id,
            from_location_code: MONTEVIDEO.code,
            from_location_name: MONTEVIDEO.name,
            to_location_id: TIENDA_CENTRO.location_id,
            to_location_code: TIENDA_CENTRO.code,
            to_location_name: TIENDA_CENTRO.name,
            status: "requested",
          }),
          buildTransfer({
            transfer_id: "10000000-0000-4000-8000-000000000003",
            transfer_number: "TR-DISPATCH",
            from_location_id: MONTEVIDEO.location_id,
            from_location_code: MONTEVIDEO.code,
            from_location_name: MONTEVIDEO.name,
            to_location_id: TIENDA_CENTRO.location_id,
            to_location_code: TIENDA_CENTRO.code,
            to_location_name: TIENDA_CENTRO.name,
            status: "approved",
            approved_at: "2026-06-01T05:00:00.000Z",
            updated_at: "2026-06-01T05:00:00.000Z",
          }),
          buildTransfer({
            transfer_id: "10000000-0000-4000-8000-000000000004",
            transfer_number: "TR-RECEIVE",
            from_location_id: TIENDA_CENTRO.location_id,
            from_location_code: TIENDA_CENTRO.code,
            from_location_name: TIENDA_CENTRO.name,
            to_location_id: MONTEVIDEO.location_id,
            to_location_code: MONTEVIDEO.code,
            to_location_name: MONTEVIDEO.name,
            status: "shipped",
            shipped_at: "2026-06-01T06:00:00.000Z",
            qty_shipped_total: 5,
            updated_at: "2026-06-01T06:00:00.000Z",
          }),
          buildTransfer({
            transfer_id: "10000000-0000-4000-8000-000000000005",
            transfer_number: "TR-OUTSIDE",
            from_location_id: TIENDA_CENTRO.location_id,
            from_location_code: TIENDA_CENTRO.code,
            from_location_name: TIENDA_CENTRO.name,
            to_location_id: ALMACEN.location_id,
            to_location_code: ALMACEN.code,
            to_location_name: ALMACEN.name,
            status: "requested",
            created_by: OTHER_USER_ID,
          }),
        ];
      },
    });

    const inbox = await service.listTransferInbox(
      {},
      buildAuth(
        [
          "transfers.request.create",
          "transfers.request.view_own",
          "transfers.approve",
          "transfers.ship",
          "transfers.receive",
          "transfers.cancel",
        ],
        "TIENDA"
      )
    );

    assert.deepEqual(capturedFilters.locationIds, [MONTEVIDEO.location_id]);
    assert.equal(inbox.context.scope, "current");
    assert.deepEqual(inbox.counts, {
      open_for_store_count: 1,
      pending_approval_count: 1,
      pending_dispatch_count: 1,
      pending_receipts_count: 1,
    });
    assert.deepEqual(inbox.totals, {
      active_total: 4,
    });
    assert.deepEqual(
      inbox.queues.open_for_store.map((item) => item.transfer_number),
      ["TR-OPEN"]
    );
    assert.deepEqual(
      inbox.queues.pending_approval.map((item) => item.transfer_number),
      ["TR-APPROVE"]
    );
    assert.deepEqual(
      inbox.queues.pending_dispatch.map((item) => item.transfer_number),
      ["TR-DISPATCH"]
    );
    assert.deepEqual(
      inbox.queues.pending_receipts.map((item) => item.transfer_number),
      ["TR-RECEIVE"]
    );
  });

  it("supports network scope only for manage users", async () => {
    let capturedFilters = null;
    const service = loadTransfersService({
      findAllTransfers: async (filters) => {
        capturedFilters = filters;
        return [
          buildTransfer({
            transfer_id: "20000000-0000-4000-8000-000000000001",
            transfer_number: "TR-MONT-REQ",
            from_location_id: MONTEVIDEO.location_id,
            from_location_code: MONTEVIDEO.code,
            from_location_name: MONTEVIDEO.name,
            to_location_id: TIENDA_CENTRO.location_id,
            to_location_code: TIENDA_CENTRO.code,
            to_location_name: TIENDA_CENTRO.name,
            status: "requested",
          }),
          buildTransfer({
            transfer_id: "20000000-0000-4000-8000-000000000002",
            transfer_number: "TR-CENT-REQ",
            from_location_id: TIENDA_CENTRO.location_id,
            from_location_code: TIENDA_CENTRO.code,
            from_location_name: TIENDA_CENTRO.name,
            to_location_id: MONTEVIDEO.location_id,
            to_location_code: MONTEVIDEO.code,
            to_location_name: MONTEVIDEO.name,
            status: "requested",
          }),
          buildTransfer({
            transfer_id: "20000000-0000-4000-8000-000000000003",
            transfer_number: "TR-DISPATCH",
            from_location_id: MONTEVIDEO.location_id,
            from_location_code: MONTEVIDEO.code,
            from_location_name: MONTEVIDEO.name,
            to_location_id: TIENDA_CENTRO.location_id,
            to_location_code: TIENDA_CENTRO.code,
            to_location_name: TIENDA_CENTRO.name,
            status: "approved",
            approved_at: "2026-06-01T05:00:00.000Z",
          }),
          buildTransfer({
            transfer_id: "20000000-0000-4000-8000-000000000004",
            transfer_number: "TR-RECEIVE",
            from_location_id: TIENDA_CENTRO.location_id,
            from_location_code: TIENDA_CENTRO.code,
            from_location_name: TIENDA_CENTRO.name,
            to_location_id: MONTEVIDEO.location_id,
            to_location_code: MONTEVIDEO.code,
            to_location_name: MONTEVIDEO.name,
            status: "shipped",
            shipped_at: "2026-06-01T06:00:00.000Z",
          }),
        ];
      },
    });

    const inbox = await service.listTransferInbox(
      { scope: "network" },
      buildAuth(["admin.manage", "transfers.manage"], "ADMIN")
    );

    assert.deepEqual(capturedFilters.locationIds, [
      MONTEVIDEO.location_id,
      TIENDA_CENTRO.location_id,
    ]);
    assert.equal(inbox.context.scope, "network");
    assert.equal(inbox.context.can_view_network, true);
    assert.deepEqual(inbox.counts, {
      open_for_store_count: 0,
      pending_approval_count: 2,
      pending_dispatch_count: 1,
      pending_receipts_count: 1,
    });
    assert.equal(inbox.totals.active_total, 4);
  });

  it("maps closed history requests to received and cancelled statuses", async () => {
    let capturedFilters = null;
    const service = loadTransfersService({
      findAllTransfers: async (filters) => {
        capturedFilters = filters;
        return [
          buildTransfer({
            transfer_id: "21000000-0000-4000-8000-000000000001",
            transfer_number: "TR-RECEIVED",
            status: "received",
            received_at: "2026-06-01T08:10:00.000Z",
          }),
          buildTransfer({
            transfer_id: "21000000-0000-4000-8000-000000000002",
            transfer_number: "TR-CANCELLED",
            status: "cancelled",
            cancelled_at: "2026-06-01T07:10:00.000Z",
          }),
        ];
      },
    });

    const transfers = await service.listTransfers(
      {
        scope: "current",
        status: "closed",
        date_from: "2026-06-01",
        date_to: "2026-06-30",
      },
      buildAuth(["transfers.request.view_own", "transfers.receive"], "TIENDA")
    );

    assert.equal(capturedFilters.status, null);
    assert.deepEqual(capturedFilters.statusList, ["received", "cancelled"]);
    assert.equal(capturedFilters.dateFrom, "2026-06-01");
    assert.equal(capturedFilters.dateTo, "2026-06-30");
    assert.deepEqual(
      transfers.map((transfer) => transfer.transfer_number),
      ["TR-RECEIVED", "TR-CANCELLED"]
    );
  });

  it("enriches transfer detail for the destination store and exposes the next step", async () => {
    const requestedTransfer = buildTransfer({
      transfer_id: "30000000-0000-4000-8000-000000000001",
      transfer_number: "TR-DETAIL",
      status: "requested",
      created_by: USER_ID,
    });
    const service = loadTransfersService({
      findTransferHeaderById: async () => requestedTransfer,
      findTransferLinesByTransferId: async () => [
        buildTransferLine({ transfer_id: requestedTransfer.transfer_id }),
      ],
    });

    const detail = await service.getTransferById(
      requestedTransfer.transfer_id,
      buildAuth(
        [
          "transfers.request.create",
          "transfers.request.view_own",
          "transfers.receive",
        ],
        "TIENDA"
      )
    );

    assert.equal(detail.scope_role, "destination");
    assert.equal(detail.next_step, "approval");
    assert.equal(detail.next_owner.location_name, TIENDA_CENTRO.name);
    assert.deepEqual(detail.available_actions, {
      approve: false,
      ship: false,
      receive: false,
      cancel: true,
    });
    assert.match(detail.active_message, /Todav[ií]a puedes cancelar/i);
    assert.equal(detail.active_location.location_name, MONTEVIDEO.name);
    assert.equal(detail.lines.length, 1);
  });

  it("blocks detail access for transfers outside the current active location", async () => {
    const outsideTransfer = buildTransfer({
      transfer_id: "40000000-0000-4000-8000-000000000001",
      transfer_number: "TR-OUTSIDE",
      from_location_id: TIENDA_CENTRO.location_id,
      from_location_code: TIENDA_CENTRO.code,
      from_location_name: TIENDA_CENTRO.name,
      to_location_id: ALMACEN.location_id,
      to_location_code: ALMACEN.code,
      to_location_name: ALMACEN.name,
      created_by: OTHER_USER_ID,
    });
    const service = loadTransfersService({
      findTransferHeaderById: async () => outsideTransfer,
    });

    await assert.rejects(
      () =>
        service.getTransferById(
          outsideTransfer.transfer_id,
          buildAuth(
            [
              "transfers.request.create",
              "transfers.request.view_own",
              "transfers.approve",
              "transfers.ship",
              "transfers.receive",
              "transfers.cancel",
            ],
            "TIENDA"
          )
        ),
      (error) => {
        assert.equal(error.statusCode, 403);
        assert.equal(error.code, "FORBIDDEN");
        return true;
      }
    );
  });

  it("only lets the requester cancel a requested transfer", async () => {
    const requestedTransfer = buildTransfer({
      transfer_id: "50000000-0000-4000-8000-000000000001",
      transfer_number: "TR-CANCEL",
      status: "requested",
      created_by: OTHER_USER_ID,
    });
    const service = loadTransfersService({
      findTransferHeaderById: async () => requestedTransfer,
    });

    await assert.rejects(
      () =>
        service.cancelTransferById(
          requestedTransfer.transfer_id,
          {},
          buildAuth(
            [
              "transfers.request.create",
              "transfers.request.view_own",
              "transfers.cancel",
            ],
            "TIENDA"
          )
        ),
      (error) => {
        assert.equal(error.statusCode, 403);
        assert.equal(error.code, "FORBIDDEN");
        return true;
      }
    );
  });

  it("does not grant approve ownership to admin users outside the source location", async () => {
    const requestedTransfer = buildTransfer({
      transfer_id: "60000000-0000-4000-8000-000000000001",
      transfer_number: "TR-ADMIN-VIEW",
      from_location_id: MONTEVIDEO.location_id,
      from_location_code: MONTEVIDEO.code,
      from_location_name: MONTEVIDEO.name,
      to_location_id: TIENDA_CENTRO.location_id,
      to_location_code: TIENDA_CENTRO.code,
      to_location_name: TIENDA_CENTRO.name,
      status: "requested",
      created_by: OTHER_USER_ID,
    });
    const service = loadTransfersService({
      findDefaultLocationByUserId: async () => TIENDA_CENTRO,
      findUserLocationsByUserId: async () => [buildAssignment(TIENDA_CENTRO, true), buildAssignment(MONTEVIDEO)],
      findTransferHeaderById: async () => requestedTransfer,
      findTransferLinesByTransferId: async () => [
        buildTransferLine({ transfer_id: requestedTransfer.transfer_id }),
      ],
    });

    const detail = await service.getTransferById(
      requestedTransfer.transfer_id,
      buildAuth(["admin.manage", "transfers.manage", "transfers.approve"], "ADMIN")
    );

    assert.equal(detail.scope_role, "destination");
    assert.equal(detail.available_actions.approve, false);
    assert.equal(detail.available_actions.cancel, true);
    assert.equal(detail.next_owner.location_name, MONTEVIDEO.name);
    assert.doesNotMatch(detail.active_message, /debe aprobar esta solicitud/i);
  });
});
