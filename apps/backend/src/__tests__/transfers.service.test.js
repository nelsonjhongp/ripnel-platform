const { afterEach, beforeEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");

const usersRepo = require("../modules/users/users.repo");
const transfersRepo = require("../modules/transfers/transfers.repo");
const inventoryRepo = require("../modules/inventory/inventory.repo");
const db = require("../shared/db");

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
  findTransferHeaderByIdForUpdate: transfersRepo.findTransferHeaderByIdForUpdate,
  findTransferLinesByTransferId: transfersRepo.findTransferLinesByTransferId,
  updateTransferLineShipment: transfersRepo.updateTransferLineShipment,
  updateTransferLineReceipt: transfersRepo.updateTransferLineReceipt,
  markTransferApproved: transfersRepo.markTransferApproved,
  markTransferApprovedIfRequested: transfersRepo.markTransferApprovedIfRequested,
  markTransferCancelled: transfersRepo.markTransferCancelled,
  markTransferCancelledIfOpen: transfersRepo.markTransferCancelledIfOpen,
  markTransferShippedIfApproved: transfersRepo.markTransferShippedIfApproved,
  markTransferReceivedIfShipped: transfersRepo.markTransferReceivedIfShipped,
};

const originalInventoryRepo = {
  findInventoryQtyByLocationAndVariant: inventoryRepo.findInventoryQtyByLocationAndVariant,
  upsertInventoryQty: inventoryRepo.upsertInventoryQty,
  insertStockMovement: inventoryRepo.insertStockMovement,
};

const originalPoolConnect = db.pool.connect;

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
  transfersRepo.findTransferHeaderByIdForUpdate =
    overrides.findTransferHeaderByIdForUpdate || (async () => null);
  transfersRepo.findTransferLinesByTransferId =
    overrides.findTransferLinesByTransferId || (async () => []);
  transfersRepo.updateTransferLineShipment =
    overrides.updateTransferLineShipment || (async () => null);
  transfersRepo.updateTransferLineReceipt =
    overrides.updateTransferLineReceipt || (async () => null);
  transfersRepo.markTransferApproved =
    overrides.markTransferApproved || (async () => null);
  transfersRepo.markTransferApprovedIfRequested =
    overrides.markTransferApprovedIfRequested || (async () => null);
  transfersRepo.markTransferCancelled =
    overrides.markTransferCancelled || (async () => null);
  transfersRepo.markTransferCancelledIfOpen =
    overrides.markTransferCancelledIfOpen || (async () => null);
  transfersRepo.markTransferShippedIfApproved =
    overrides.markTransferShippedIfApproved || (async () => null);
  transfersRepo.markTransferReceivedIfShipped =
    overrides.markTransferReceivedIfShipped || (async () => null);

  inventoryRepo.findInventoryQtyByLocationAndVariant =
    overrides.findInventoryQtyByLocationAndVariant || (async () => 0);
  inventoryRepo.upsertInventoryQty = overrides.upsertInventoryQty || (async () => null);
  inventoryRepo.insertStockMovement = overrides.insertStockMovement || (async () => null);

  db.pool.connect = overrides.poolConnect || (async () => createMockClient().client);
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
  transfersRepo.findTransferHeaderByIdForUpdate = originalTransfersRepo.findTransferHeaderByIdForUpdate;
  transfersRepo.findTransferLinesByTransferId = originalTransfersRepo.findTransferLinesByTransferId;
  transfersRepo.updateTransferLineShipment = originalTransfersRepo.updateTransferLineShipment;
  transfersRepo.updateTransferLineReceipt = originalTransfersRepo.updateTransferLineReceipt;
  transfersRepo.markTransferApproved = originalTransfersRepo.markTransferApproved;
  transfersRepo.markTransferApprovedIfRequested =
    originalTransfersRepo.markTransferApprovedIfRequested;
  transfersRepo.markTransferCancelled = originalTransfersRepo.markTransferCancelled;
  transfersRepo.markTransferCancelledIfOpen = originalTransfersRepo.markTransferCancelledIfOpen;
  transfersRepo.markTransferShippedIfApproved = originalTransfersRepo.markTransferShippedIfApproved;
  transfersRepo.markTransferReceivedIfShipped = originalTransfersRepo.markTransferReceivedIfShipped;

  inventoryRepo.findInventoryQtyByLocationAndVariant =
    originalInventoryRepo.findInventoryQtyByLocationAndVariant;
  inventoryRepo.upsertInventoryQty = originalInventoryRepo.upsertInventoryQty;
  inventoryRepo.insertStockMovement = originalInventoryRepo.insertStockMovement;

  db.pool.connect = originalPoolConnect;

  delete require.cache[SERVICE_PATH];
}

function createMockClient() {
  const txCalls = [];
  const client = {
    query: async (sql) => {
      if (sql === "begin" || sql === "commit" || sql === "rollback") {
        txCalls.push(sql);
      }
      return { rows: [] };
    },
    release() {},
  };
  return { client, txCalls };
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
      findTransferHeaderByIdForUpdate: async () => requestedTransfer,
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

  it("approve rechecks origin stock and commits the conditional mark", async () => {
    const requestedTransfer = buildTransfer({
      transfer_id: "70000000-0000-4000-8000-000000000006",
      transfer_number: "TR-APPROVE-OK",
      from_location_id: MONTEVIDEO.location_id,
      from_location_code: MONTEVIDEO.code,
      from_location_name: MONTEVIDEO.name,
      to_location_id: TIENDA_CENTRO.location_id,
      to_location_code: TIENDA_CENTRO.code,
      to_location_name: TIENDA_CENTRO.name,
      status: "requested",
      created_by: OTHER_USER_ID,
    });
    const requestedLine = buildTransferLine({
      transfer_id: requestedTransfer.transfer_id,
      qty_requested: 4,
    });
    const approvedTransfer = { ...requestedTransfer, status: "approved" };

    let approvedCall = null;
    const { client, txCalls } = createMockClient();

    const service = loadTransfersService({
      findTransferHeaderByIdForUpdate: async () => requestedTransfer,
      findTransferHeaderById: async () => approvedTransfer,
      findTransferLinesByTransferId: async () => [requestedLine],
      findInventoryQtyByLocationAndVariant: async () => 5,
      markTransferApprovedIfRequested: async (transferId, approvedBy) => {
        approvedCall = { transferId, approvedBy };
        return approvedTransfer;
      },
    });

    db.pool.connect = async () => client;

    const result = await service.approveTransferById(
      requestedTransfer.transfer_id,
      {},
      buildAuth(["transfers.approve", "transfers.cancel"], "TIENDA")
    );

    assert.equal(result.status, "approved");
    assert.deepEqual(approvedCall, {
      transferId: requestedTransfer.transfer_id,
      approvedBy: USER_ID,
    });
    assert.ok(txCalls.includes("begin"));
    assert.ok(txCalls.includes("commit"));
    assert.ok(!txCalls.includes("rollback"));
  });

  it("approve rejects when origin stock changed before approval", async () => {
    const requestedTransfer = buildTransfer({
      transfer_id: "70000000-0000-4000-8000-000000000007",
      transfer_number: "TR-APPROVE-STOCK",
      from_location_id: MONTEVIDEO.location_id,
      from_location_code: MONTEVIDEO.code,
      from_location_name: MONTEVIDEO.name,
      to_location_id: TIENDA_CENTRO.location_id,
      to_location_code: TIENDA_CENTRO.code,
      to_location_name: TIENDA_CENTRO.name,
      status: "requested",
      created_by: OTHER_USER_ID,
    });
    const requestedLine = buildTransferLine({
      transfer_id: requestedTransfer.transfer_id,
      qty_requested: 4,
    });

    let approvedCalls = 0;
    const { client, txCalls } = createMockClient();

    const service = loadTransfersService({
      findTransferHeaderByIdForUpdate: async () => requestedTransfer,
      findTransferLinesByTransferId: async () => [requestedLine],
      findInventoryQtyByLocationAndVariant: async () => 2,
      markTransferApprovedIfRequested: async () => {
        approvedCalls++;
        return null;
      },
    });

    db.pool.connect = async () => client;

    await assert.rejects(
      () =>
        service.approveTransferById(
          requestedTransfer.transfer_id,
          {},
          buildAuth(["transfers.approve", "transfers.cancel"], "TIENDA")
        ),
      (error) => {
        assert.equal(error.statusCode, 409);
        assert.equal(error.code, "TRANSFER_APPROVAL_STOCK_CHANGED");
        return true;
      }
    );

    assert.equal(approvedCalls, 0);
    assert.ok(txCalls.includes("begin"));
    assert.ok(txCalls.includes("rollback"));
    assert.ok(!txCalls.includes("commit"));
  });

  it("rolls back approval when the conditional mark returns null", async () => {
    const requestedTransfer = buildTransfer({
      transfer_id: "70000000-0000-4000-8000-000000000008",
      transfer_number: "TR-APPROVE-RACE",
      from_location_id: MONTEVIDEO.location_id,
      from_location_code: MONTEVIDEO.code,
      from_location_name: MONTEVIDEO.name,
      to_location_id: TIENDA_CENTRO.location_id,
      to_location_code: TIENDA_CENTRO.code,
      to_location_name: TIENDA_CENTRO.name,
      status: "requested",
      created_by: OTHER_USER_ID,
    });
    const requestedLine = buildTransferLine({
      transfer_id: requestedTransfer.transfer_id,
      qty_requested: 4,
    });

    const { client, txCalls } = createMockClient();

    const service = loadTransfersService({
      findTransferHeaderByIdForUpdate: async () => requestedTransfer,
      findTransferLinesByTransferId: async () => [requestedLine],
      findInventoryQtyByLocationAndVariant: async () => 5,
      markTransferApprovedIfRequested: async () => null,
    });

    db.pool.connect = async () => client;

    await assert.rejects(
      () =>
        service.approveTransferById(
          requestedTransfer.transfer_id,
          {},
          buildAuth(["transfers.approve", "transfers.cancel"], "TIENDA")
        ),
      (error) => {
        assert.equal(error.statusCode, 409);
        assert.equal(error.code, "TRANSFER_STATUS_CHANGED");
        return true;
      }
    );

    assert.ok(txCalls.includes("begin"));
    assert.ok(txCalls.includes("rollback"));
    assert.ok(!txCalls.includes("commit"));
  });

  it("cancel commits the conditional mark for open transfers", async () => {
    const requestedTransfer = buildTransfer({
      transfer_id: "70000000-0000-4000-8000-000000000009",
      transfer_number: "TR-CANCEL-OK",
      status: "requested",
      created_by: USER_ID,
    });
    const cancelledTransfer = { ...requestedTransfer, status: "cancelled" };

    let cancelledCall = null;
    const { client, txCalls } = createMockClient();

    const service = loadTransfersService({
      findTransferHeaderByIdForUpdate: async () => requestedTransfer,
      findTransferHeaderById: async () => cancelledTransfer,
      markTransferCancelledIfOpen: async (transferId, cancelledBy) => {
        cancelledCall = { transferId, cancelledBy };
        return cancelledTransfer;
      },
    });

    db.pool.connect = async () => client;

    const result = await service.cancelTransferById(
      requestedTransfer.transfer_id,
      {},
      buildAuth(["transfers.request.create", "transfers.request.view_own", "transfers.cancel"])
    );

    assert.equal(result.status, "cancelled");
    assert.deepEqual(cancelledCall, {
      transferId: requestedTransfer.transfer_id,
      cancelledBy: USER_ID,
    });
    assert.ok(txCalls.includes("begin"));
    assert.ok(txCalls.includes("commit"));
    assert.ok(!txCalls.includes("rollback"));
  });

  it("rolls back cancellation when the conditional mark returns null", async () => {
    const approvedTransfer = buildTransfer({
      transfer_id: "70000000-0000-4000-8000-000000000010",
      transfer_number: "TR-CANCEL-RACE",
      from_location_id: MONTEVIDEO.location_id,
      from_location_code: MONTEVIDEO.code,
      from_location_name: MONTEVIDEO.name,
      to_location_id: TIENDA_CENTRO.location_id,
      to_location_code: TIENDA_CENTRO.code,
      to_location_name: TIENDA_CENTRO.name,
      status: "approved",
      created_by: OTHER_USER_ID,
    });

    const { client, txCalls } = createMockClient();

    const service = loadTransfersService({
      findTransferHeaderByIdForUpdate: async () => approvedTransfer,
      markTransferCancelledIfOpen: async () => null,
    });

    db.pool.connect = async () => client;

    await assert.rejects(
      () =>
        service.cancelTransferById(
          approvedTransfer.transfer_id,
          {},
          buildAuth(["transfers.cancel"], "TIENDA")
        ),
      (error) => {
        assert.equal(error.statusCode, 409);
        assert.equal(error.code, "TRANSFER_STATUS_CHANGED");
        return true;
      }
    );

    assert.ok(txCalls.includes("begin"));
    assert.ok(txCalls.includes("rollback"));
    assert.ok(!txCalls.includes("commit"));
  });

  it("rejects a second shipment when the transfer is already shipped", async () => {
    const shippedTransfer = buildTransfer({
      transfer_id: "70000000-0000-4000-8000-000000000001",
      transfer_number: "TR- DOUBLE-SHIP",
      from_location_id: MONTEVIDEO.location_id,
      from_location_code: MONTEVIDEO.code,
      from_location_name: MONTEVIDEO.name,
      to_location_id: TIENDA_CENTRO.location_id,
      to_location_code: TIENDA_CENTRO.code,
      to_location_name: TIENDA_CENTRO.name,
      status: "shipped",
      shipped_at: "2026-06-01T06:00:00.000Z",
      qty_shipped_total: 4,
      updated_at: "2026-06-01T06:00:00.000Z",
    });

    let stockMovementCalls = 0;
    let inventoryUpsertCalls = 0;
    const { client } = createMockClient();

    const service = loadTransfersService({
      findTransferHeaderByIdForUpdate: async () => shippedTransfer,
      markTransferShippedIfApproved: async () => null,
      upsertInventoryQty: async () => {
        inventoryUpsertCalls++;
        return null;
      },
      insertStockMovement: async () => {
        stockMovementCalls++;
        return { movement_id: "x" };
      },
    });

    db.pool.connect = async () => client;

    await assert.rejects(
      () =>
        service.shipTransferById(
          shippedTransfer.transfer_id,
          {},
          buildAuth(["transfers.ship", "transfers.receive"], "TIENDA")
        ),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.match(error.message, /Only approved transfers can be shipped/);
        return true;
      }
    );

    assert.equal(stockMovementCalls, 0);
    assert.equal(inventoryUpsertCalls, 0);
  });

  it("rejects a second receipt when the transfer is already received", async () => {
    const receivedTransfer = buildTransfer({
      transfer_id: "70000000-0000-4000-8000-000000000002",
      transfer_number: "TR-DOUBLE-RECEIVE",
      from_location_id: TIENDA_CENTRO.location_id,
      from_location_code: TIENDA_CENTRO.code,
      from_location_name: TIENDA_CENTRO.name,
      to_location_id: MONTEVIDEO.location_id,
      to_location_code: MONTEVIDEO.code,
      to_location_name: MONTEVIDEO.name,
      status: "received",
      received_at: "2026-06-01T08:00:00.000Z",
      qty_received_total: 4,
      updated_at: "2026-06-01T08:00:00.000Z",
    });

    let stockMovementCalls = 0;
    let inventoryUpsertCalls = 0;
    const { client } = createMockClient();

    const service = loadTransfersService({
      findTransferHeaderByIdForUpdate: async () => receivedTransfer,
      markTransferReceivedIfShipped: async () => null,
      upsertInventoryQty: async () => {
        inventoryUpsertCalls++;
        return null;
      },
      insertStockMovement: async () => {
        stockMovementCalls++;
        return { movement_id: "x" };
      },
    });

    db.pool.connect = async () => client;

    await assert.rejects(
      () =>
        service.receiveTransferById(
          receivedTransfer.transfer_id,
          {},
          buildAuth(["transfers.ship", "transfers.receive"], "TIENDA")
        ),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.match(error.message, /Only shipped transfers can be received/);
        return true;
      }
    );

    assert.equal(stockMovementCalls, 0);
    assert.equal(inventoryUpsertCalls, 0);
  });

  it("ship creates an OUT stock movement with transfer references", async () => {
    const approvedTransfer = buildTransfer({
      transfer_id: "70000000-0000-4000-8000-000000000003",
      transfer_number: "TR-SHIP-OK",
      from_location_id: MONTEVIDEO.location_id,
      from_location_code: MONTEVIDEO.code,
      from_location_name: MONTEVIDEO.name,
      to_location_id: TIENDA_CENTRO.location_id,
      to_location_code: TIENDA_CENTRO.code,
      to_location_name: TIENDA_CENTRO.name,
      status: "approved",
      approved_at: "2026-06-01T05:00:00.000Z",
      updated_at: "2026-06-01T05:00:00.000Z",
    });
    const shippedLine = buildTransferLine({
      transfer_id: approvedTransfer.transfer_id,
      qty_requested: 4,
      qty_shipped: 0,
    });
    const shippedTransfer = { ...approvedTransfer, status: "shipped" };

    let stockMovementCalls = [];
    let inventoryUpsertCalls = [];
    let markShippedCall = null;
    const { client, txCalls } = createMockClient();

    const service = loadTransfersService({
      findTransferHeaderByIdForUpdate: async () => approvedTransfer,
      findTransferHeaderById: async () => shippedTransfer,
      findTransferLinesByTransferId: async () => [shippedLine],
      findInventoryQtyByLocationAndVariant: async () => 10,
      upsertInventoryQty: async (locationId, variantId, qty) => {
        inventoryUpsertCalls.push({ locationId, variantId, qty });
        return null;
      },
      insertStockMovement: async (payload) => {
        stockMovementCalls.push(payload);
        return { movement_id: "m-1" };
      },
      markTransferShippedIfApproved: async (transferId, shippedBy) => {
        markShippedCall = { transferId, shippedBy };
        return shippedTransfer;
      },
    });

    db.pool.connect = async () => client;

    const result = await service.shipTransferById(
      approvedTransfer.transfer_id,
      {},
      buildAuth(["transfers.ship", "transfers.receive"], "TIENDA")
    );

    assert.equal(result.status, "shipped");
    assert.equal(stockMovementCalls.length, 1);
    assert.equal(stockMovementCalls[0].movement_type, "OUT");
    assert.equal(stockMovementCalls[0].reference_type, "transfer");
    assert.equal(stockMovementCalls[0].reference_id, approvedTransfer.transfer_id);
    assert.equal(stockMovementCalls[0].reference_line_id, shippedLine.transfer_line_id);
    assert.equal(stockMovementCalls[0].quantity, 4);
    assert.equal(stockMovementCalls[0].location_id, MONTEVIDEO.location_id);
    assert.equal(inventoryUpsertCalls.length, 1);
    assert.equal(inventoryUpsertCalls[0].qty, 6);
    assert.equal(inventoryUpsertCalls[0].locationId, MONTEVIDEO.location_id);
    assert.ok(markShippedCall);
    assert.equal(markShippedCall.transferId, approvedTransfer.transfer_id);
    assert.ok(txCalls.includes("begin"));
    assert.ok(txCalls.includes("commit"));
    assert.ok(!txCalls.includes("rollback"));
  });

  it("receive creates an IN stock movement with transfer references", async () => {
    const shippedTransfer = buildTransfer({
      transfer_id: "70000000-0000-4000-8000-000000000004",
      transfer_number: "TR-RECEIVE-OK",
      from_location_id: TIENDA_CENTRO.location_id,
      from_location_code: TIENDA_CENTRO.code,
      from_location_name: TIENDA_CENTRO.name,
      to_location_id: MONTEVIDEO.location_id,
      to_location_code: MONTEVIDEO.code,
      to_location_name: MONTEVIDEO.name,
      status: "shipped",
      shipped_at: "2026-06-01T06:00:00.000Z",
      qty_shipped_total: 4,
      updated_at: "2026-06-01T06:00:00.000Z",
    });
    const receivedLine = buildTransferLine({
      transfer_id: shippedTransfer.transfer_id,
      qty_requested: 4,
      qty_shipped: 4,
      qty_received: 0,
    });
    const receivedTransfer = { ...shippedTransfer, status: "received" };

    let stockMovementCalls = [];
    let inventoryUpsertCalls = [];
    let markReceivedCall = null;
    const { client, txCalls } = createMockClient();

    const service = loadTransfersService({
      findTransferHeaderByIdForUpdate: async () => shippedTransfer,
      findTransferHeaderById: async () => receivedTransfer,
      findTransferLinesByTransferId: async () => [receivedLine],
      findInventoryQtyByLocationAndVariant: async () => 0,
      upsertInventoryQty: async (locationId, variantId, qty) => {
        inventoryUpsertCalls.push({ locationId, variantId, qty });
        return null;
      },
      insertStockMovement: async (payload) => {
        stockMovementCalls.push(payload);
        return { movement_id: "m-1" };
      },
      markTransferReceivedIfShipped: async (transferId, receivedBy) => {
        markReceivedCall = { transferId, receivedBy };
        return receivedTransfer;
      },
    });

    db.pool.connect = async () => client;

    const result = await service.receiveTransferById(
      shippedTransfer.transfer_id,
      {},
      buildAuth(["transfers.ship", "transfers.receive"], "TIENDA")
    );

    assert.equal(result.status, "received");
    assert.equal(stockMovementCalls.length, 1);
    assert.equal(stockMovementCalls[0].movement_type, "IN");
    assert.equal(stockMovementCalls[0].reference_type, "transfer");
    assert.equal(stockMovementCalls[0].reference_id, shippedTransfer.transfer_id);
    assert.equal(stockMovementCalls[0].reference_line_id, receivedLine.transfer_line_id);
    assert.equal(stockMovementCalls[0].quantity, 4);
    assert.equal(stockMovementCalls[0].location_id, MONTEVIDEO.location_id);
    assert.equal(inventoryUpsertCalls.length, 1);
    assert.equal(inventoryUpsertCalls[0].qty, 4);
    assert.equal(inventoryUpsertCalls[0].locationId, MONTEVIDEO.location_id);
    assert.ok(markReceivedCall);
    assert.equal(markReceivedCall.transferId, shippedTransfer.transfer_id);
    assert.ok(txCalls.includes("begin"));
    assert.ok(txCalls.includes("commit"));
    assert.ok(!txCalls.includes("rollback"));
  });

  it("rolls back shipment when the conditional mark returns null", async () => {
    const approvedTransfer = buildTransfer({
      transfer_id: "70000000-0000-4000-8000-000000000005",
      transfer_number: "TR-SHIP-RACE",
      from_location_id: MONTEVIDEO.location_id,
      from_location_code: MONTEVIDEO.code,
      from_location_name: MONTEVIDEO.name,
      to_location_id: TIENDA_CENTRO.location_id,
      to_location_code: TIENDA_CENTRO.code,
      to_location_name: TIENDA_CENTRO.name,
      status: "approved",
      approved_at: "2026-06-01T05:00:00.000Z",
      updated_at: "2026-06-01T05:00:00.000Z",
    });
    const shippedLine = buildTransferLine({
      transfer_id: approvedTransfer.transfer_id,
      qty_requested: 4,
    });

    const { client, txCalls } = createMockClient();

    const service = loadTransfersService({
      findTransferHeaderByIdForUpdate: async () => approvedTransfer,
      findTransferLinesByTransferId: async () => [shippedLine],
      findInventoryQtyByLocationAndVariant: async () => 10,
      markTransferShippedIfApproved: async () => null,
    });

    db.pool.connect = async () => client;

    await assert.rejects(
      () =>
        service.shipTransferById(
          approvedTransfer.transfer_id,
          {},
          buildAuth(["transfers.ship", "transfers.receive"], "TIENDA")
        ),
      (error) => {
        assert.equal(error.statusCode, 409);
        assert.equal(error.code, "TRANSFER_STATUS_CHANGED");
        return true;
      }
    );

    assert.ok(txCalls.includes("begin"));
    assert.ok(txCalls.includes("rollback"));
    assert.ok(!txCalls.includes("commit"));
  });
});
