const { afterEach, beforeEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');

const authRepo = require('../modules/auth/auth.repo');
const usersRepo = require('../modules/users/users.repo');
const locationsRepo = require('../modules/locations/locations.repo');
const inventoryRepo = require('../modules/inventory/inventory.repo');

const SERVICE_PATH = require.resolve('../modules/inventory/inventory.service');

const USER_ID = '11111111-1111-4111-8111-111111111111';
const LOCATION_A = {
  location_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  code: 'ALM-CENT',
  name: 'Almacen Central',
  type: 'warehouse',
  active: true,
};
const LOCATION_B = {
  location_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  code: 'TD-CENT',
  name: 'Tienda Centro',
  type: 'store',
  active: true,
};

const originalAuthRepo = {
  findActiveUserById: authRepo.findActiveUserById,
};

const originalUsersRepo = {
  findUserByEmail: usersRepo.findUserByEmail,
  findDefaultLocationByUserId: usersRepo.findDefaultLocationByUserId,
  findUserLocationsByUserId: usersRepo.findUserLocationsByUserId,
};

const originalLocationsRepo = {
  findAllLocations: locationsRepo.findAllLocations,
};

const originalInventoryRepo = {
  findAllKardex: inventoryRepo.findAllKardex,
  findAllAdjustments: inventoryRepo.findAllAdjustments,
  findAdjustmentVariants: inventoryRepo.findAdjustmentVariants,
  findAdjustmentHeaderById: inventoryRepo.findAdjustmentHeaderById,
  findAdjustmentLinesByAdjustmentId: inventoryRepo.findAdjustmentLinesByAdjustmentId,
  findLocationById: inventoryRepo.findLocationById,
  findUserById: inventoryRepo.findUserById,
  findVariantsByIds: inventoryRepo.findVariantsByIds,
  findInventoryQtyByLocationAndVariant: inventoryRepo.findInventoryQtyByLocationAndVariant,
  insertAdjustment: inventoryRepo.insertAdjustment,
  insertAdjustmentLine: inventoryRepo.insertAdjustmentLine,
  confirmAdjustment: inventoryRepo.confirmAdjustment,
  cancelAdjustment: inventoryRepo.cancelAdjustment,
  upsertInventoryQty: inventoryRepo.upsertInventoryQty,
  insertStockMovement: inventoryRepo.insertStockMovement,
};

function applyBaseStubs(overrides = {}) {
  authRepo.findActiveUserById =
    overrides.findActiveUserById ||
    (async () => ({ user_id: USER_ID, role_name: 'ALMACEN' }));

  usersRepo.findUserByEmail =
    overrides.findUserByEmail ||
    (async () => ({ user_id: USER_ID, full_name: 'Usuario Test' }));
  usersRepo.findDefaultLocationByUserId =
    overrides.findDefaultLocationByUserId || (async () => LOCATION_A);
  usersRepo.findUserLocationsByUserId =
    overrides.findUserLocationsByUserId ||
    (async () => [{ ...LOCATION_A, user_id: USER_ID, is_default: true }]);

  locationsRepo.findAllLocations =
    overrides.findAllLocations || (async () => [LOCATION_A, LOCATION_B]);

  inventoryRepo.findAllKardex = overrides.findAllKardex || (async () => []);
  inventoryRepo.findAllAdjustments = overrides.findAllAdjustments || (async () => []);
  inventoryRepo.findAdjustmentVariants = overrides.findAdjustmentVariants || (async () => []);
  inventoryRepo.findAdjustmentHeaderById =
    overrides.findAdjustmentHeaderById || (async () => null);
  inventoryRepo.findAdjustmentLinesByAdjustmentId =
    overrides.findAdjustmentLinesByAdjustmentId || (async () => []);
  inventoryRepo.findLocationById =
    overrides.findLocationById ||
    (async (locationId) => {
      if (locationId === LOCATION_A.location_id) return LOCATION_A;
      if (locationId === LOCATION_B.location_id) return LOCATION_B;
      return null;
    });
  inventoryRepo.findUserById =
    overrides.findUserById || (async () => ({ user_id: USER_ID, full_name: 'Usuario Test' }));
  inventoryRepo.findVariantsByIds = overrides.findVariantsByIds || (async () => []);
  inventoryRepo.findInventoryQtyByLocationAndVariant =
    overrides.findInventoryQtyByLocationAndVariant || (async () => 0);
  inventoryRepo.insertAdjustment = overrides.insertAdjustment || (async () => null);
  inventoryRepo.insertAdjustmentLine = overrides.insertAdjustmentLine || (async () => null);
  inventoryRepo.confirmAdjustment = overrides.confirmAdjustment || (async () => null);
  inventoryRepo.cancelAdjustment = overrides.cancelAdjustment || (async () => null);
  inventoryRepo.upsertInventoryQty = overrides.upsertInventoryQty || (async () => null);
  inventoryRepo.insertStockMovement = overrides.insertStockMovement || (async () => null);
}

function loadInventoryService(overrides = {}) {
  applyBaseStubs(overrides);
  delete require.cache[SERVICE_PATH];
  return require(SERVICE_PATH);
}

function restoreStubs() {
  authRepo.findActiveUserById = originalAuthRepo.findActiveUserById;

  usersRepo.findUserByEmail = originalUsersRepo.findUserByEmail;
  usersRepo.findDefaultLocationByUserId = originalUsersRepo.findDefaultLocationByUserId;
  usersRepo.findUserLocationsByUserId = originalUsersRepo.findUserLocationsByUserId;

  locationsRepo.findAllLocations = originalLocationsRepo.findAllLocations;

  inventoryRepo.findAllKardex = originalInventoryRepo.findAllKardex;
  inventoryRepo.findAllAdjustments = originalInventoryRepo.findAllAdjustments;
  inventoryRepo.findAdjustmentVariants = originalInventoryRepo.findAdjustmentVariants;
  inventoryRepo.findAdjustmentHeaderById = originalInventoryRepo.findAdjustmentHeaderById;
  inventoryRepo.findAdjustmentLinesByAdjustmentId =
    originalInventoryRepo.findAdjustmentLinesByAdjustmentId;
  inventoryRepo.findLocationById = originalInventoryRepo.findLocationById;
  inventoryRepo.findUserById = originalInventoryRepo.findUserById;
  inventoryRepo.findVariantsByIds = originalInventoryRepo.findVariantsByIds;
  inventoryRepo.findInventoryQtyByLocationAndVariant =
    originalInventoryRepo.findInventoryQtyByLocationAndVariant;
  inventoryRepo.insertAdjustment = originalInventoryRepo.insertAdjustment;
  inventoryRepo.insertAdjustmentLine = originalInventoryRepo.insertAdjustmentLine;
  inventoryRepo.confirmAdjustment = originalInventoryRepo.confirmAdjustment;
  inventoryRepo.cancelAdjustment = originalInventoryRepo.cancelAdjustment;
  inventoryRepo.upsertInventoryQty = originalInventoryRepo.upsertInventoryQty;
  inventoryRepo.insertStockMovement = originalInventoryRepo.insertStockMovement;

  delete require.cache[SERVICE_PATH];
}

function buildAuth(permissions) {
  return {
    sub: USER_ID,
    permissions,
    role_name: permissions.includes('admin.manage') ? 'ADMIN' : 'ALMACEN',
  };
}

describe('inventory service phase 2', () => {
  beforeEach(() => {
    restoreStubs();
  });

  afterEach(() => {
    restoreStubs();
  });

  it('scopes kardex rows to assigned locations and adds semantic fields', async () => {
    let capturedFilters = null;
    const service = loadInventoryService({
      findAllKardex: async (filters) => {
        capturedFilters = filters;
        return [
          {
            movement_id: '1',
            location_id: LOCATION_A.location_id,
            location_code: LOCATION_A.code,
            location_name: LOCATION_A.name,
            variant_id: 'v-1',
            sku: 'SKU-1',
            style_code: 'ST-1',
            style_name: 'Style 1',
            movement_type: 'OUT',
            quantity: 2,
            quantity_effect: -2,
            balance_qty: 6,
            reason: 'Venta N-001',
            reference_type: 'sale',
            reference_id: '99999999-9999-4999-8999-999999999999',
            reference_line_id: null,
            created_by: USER_ID,
            created_by_name: 'Usuario Test',
            created_at: '2026-05-28T15:00:00.000Z',
          },
          {
            movement_id: '2',
            location_id: LOCATION_A.location_id,
            location_code: LOCATION_A.code,
            location_name: LOCATION_A.name,
            variant_id: 'v-2',
            sku: 'SKU-2',
            style_code: 'ST-2',
            style_name: 'Style 2',
            movement_type: 'IN',
            quantity: 1,
            quantity_effect: 1,
            balance_qty: 3,
            reason: 'Anulación controlada N-001',
            reference_type: 'sale',
            reference_id: '88888888-8888-4888-8888-888888888888',
            reference_line_id: 'line-1',
            created_by: USER_ID,
            created_by_name: 'Usuario Test',
            created_at: '2026-05-28T15:10:00.000Z',
          },
          {
            movement_id: '3',
            location_id: LOCATION_A.location_id,
            location_code: LOCATION_A.code,
            location_name: LOCATION_A.name,
            variant_id: 'v-3',
            sku: 'SKU-3',
            style_code: 'ST-3',
            style_name: 'Style 3',
            movement_type: 'OUT',
            quantity: 5,
            quantity_effect: -5,
            balance_qty: 10,
            reason: 'Transfer TR-1 shipped',
            reference_type: 'transfer',
            reference_id: '77777777-7777-4777-8777-777777777777',
            reference_line_id: 'tl-1',
            created_by: USER_ID,
            created_by_name: 'Usuario Test',
            created_at: '2026-05-28T15:20:00.000Z',
          },
          {
            movement_id: '4',
            location_id: LOCATION_A.location_id,
            location_code: LOCATION_A.code,
            location_name: LOCATION_A.name,
            variant_id: 'v-4',
            sku: 'SKU-4',
            style_code: 'ST-4',
            style_name: 'Style 4',
            movement_type: 'IN',
            quantity: 5,
            quantity_effect: 5,
            balance_qty: 8,
            reason: 'Transfer TR-1 received',
            reference_type: 'transfer',
            reference_id: '66666666-6666-4666-8666-666666666666',
            reference_line_id: 'tl-2',
            created_by: USER_ID,
            created_by_name: 'Usuario Test',
            created_at: '2026-05-28T15:30:00.000Z',
          },
          {
            movement_id: '5',
            location_id: LOCATION_A.location_id,
            location_code: LOCATION_A.code,
            location_name: LOCATION_A.name,
            variant_id: 'v-5',
            sku: 'SKU-5',
            style_code: 'ST-5',
            style_name: 'Style 5',
            movement_type: 'IN',
            quantity: 1,
            quantity_effect: 1,
            balance_qty: 4,
            reason: 'Cambio simple EX-1',
            reference_type: 'exchange',
            reference_id: '55555555-5555-4555-8555-555555555555',
            reference_line_id: 'exl-1',
            created_by: USER_ID,
            created_by_name: 'Usuario Test',
            created_at: '2026-05-28T15:40:00.000Z',
          },
          {
            movement_id: '6',
            location_id: LOCATION_A.location_id,
            location_code: LOCATION_A.code,
            location_name: LOCATION_A.name,
            variant_id: 'v-6',
            sku: 'SKU-6',
            style_code: 'ST-6',
            style_name: 'Style 6',
            movement_type: 'OUT',
            quantity: 1,
            quantity_effect: -1,
            balance_qty: 2,
            reason: 'Cambio simple EX-1',
            reference_type: 'exchange',
            reference_id: '44444444-4444-4444-8444-444444444444',
            reference_line_id: 'exl-2',
            created_by: USER_ID,
            created_by_name: 'Usuario Test',
            created_at: '2026-05-28T15:50:00.000Z',
          },
          {
            movement_id: '7',
            location_id: LOCATION_A.location_id,
            location_code: LOCATION_A.code,
            location_name: LOCATION_A.name,
            variant_id: 'v-7',
            sku: 'SKU-7',
            style_code: 'ST-7',
            style_name: 'Style 7',
            movement_type: 'ADJUST',
            quantity: 10,
            quantity_effect: 10,
            balance_qty: 10,
            reason: 'Apertura inicial',
            reference_type: 'adjustment',
            reference_id: '33333333-3333-4333-8333-333333333333',
            reference_line_id: 'adj-1',
            created_by: USER_ID,
            created_by_name: 'Usuario Test',
            created_at: '2026-05-28T16:00:00.000Z',
          },
          {
            movement_id: '8',
            location_id: LOCATION_A.location_id,
            location_code: LOCATION_A.code,
            location_name: LOCATION_A.name,
            variant_id: 'v-8',
            sku: 'SKU-8',
            style_code: 'ST-8',
            style_name: 'Style 8',
            movement_type: 'ADJUST',
            quantity: 2,
            quantity_effect: -2,
            balance_qty: 1,
            reason: 'Conteo físico',
            reference_type: 'adjustment',
            reference_id: '22222222-2222-4222-8222-222222222222',
            reference_line_id: 'adj-2',
            created_by: USER_ID,
            created_by_name: 'Usuario Test',
            created_at: '2026-05-28T16:10:00.000Z',
          },
          {
            movement_id: '9',
            location_id: LOCATION_A.location_id,
            location_code: LOCATION_A.code,
            location_name: LOCATION_A.name,
            variant_id: 'v-9',
            sku: 'SKU-9',
            style_code: 'ST-9',
            style_name: 'Style 9',
            movement_type: 'IN',
            quantity: 3,
            quantity_effect: 3,
            balance_qty: 3,
            reason: null,
            reference_type: null,
            reference_id: null,
            reference_line_id: null,
            created_by: USER_ID,
            created_by_name: 'Usuario Test',
            created_at: '2026-05-28T16:20:00.000Z',
          },
        ];
      },
    });

    const result = await service.listKardex({}, buildAuth(['inventory.view']));

    assert.deepEqual(capturedFilters.locationIds, [LOCATION_A.location_id]);
    assert.equal(result.meta.can_view_all_locations, false);
    assert.equal(result.meta.selected_location_id, LOCATION_A.location_id);
    assert.equal(result.rows[0].movement_direction, 'exit');
    assert.equal(result.rows[0].document_family, 'sale');
    assert.equal(result.rows[0].semantic_origin, 'sale_confirmed');
    assert.equal(result.rows[1].semantic_origin, 'sale_cancelled');
    assert.equal(result.rows[2].semantic_origin, 'transfer_shipped');
    assert.equal(result.rows[3].semantic_origin, 'transfer_received');
    assert.equal(result.rows[4].semantic_origin, 'exchange_received');
    assert.equal(result.rows[5].semantic_origin, 'exchange_delivered');
    assert.equal(result.rows[6].semantic_origin, 'opening_confirmed');
    assert.equal(result.rows[7].semantic_origin, 'adjustment_confirmed');
    assert.equal(result.rows[8].semantic_origin, 'unclassified');
    assert.equal(result.rows[8].document_family, 'none');
  });

  it('rejects kardex queries for a location outside assigned scope', async () => {
    const service = loadInventoryService();

    await assert.rejects(
      () =>
        service.listKardex(
          { location_id: LOCATION_B.location_id },
          buildAuth(['inventory.view'])
        ),
      (error) => {
        assert.equal(error.statusCode, 403);
        assert.equal(error.code, 'INVENTORY_LOCATION_FORBIDDEN');
        return true;
      }
    );
  });

  it('returns adjustments with rows and meta scoped to assigned locations', async () => {
    let capturedFilters = null;
    const service = loadInventoryService({
      findAllAdjustments: async (filters) => {
        capturedFilters = filters;
        return [
          {
            adjustment_id: 'adj-1',
            adjustment_number: 'AJ-1',
            location_id: LOCATION_A.location_id,
            location_code: LOCATION_A.code,
            location_name: LOCATION_A.name,
            status: 'confirmed',
            reason: 'Apertura inicial - salida en vivo',
            notes: null,
            created_by: USER_ID,
            created_by_name: 'Usuario Test',
            confirmed_by: USER_ID,
            confirmed_by_name: 'Usuario Test',
            cancelled_by: null,
            cancelled_by_name: null,
            created_at: '2026-05-28T16:00:00.000Z',
            confirmed_at: '2026-05-28T16:10:00.000Z',
            cancelled_at: null,
            updated_at: '2026-05-28T16:10:00.000Z',
            line_count: 3,
          },
        ];
      },
    });

    const result = await service.listAdjustments({}, buildAuth(['inventory.adjust']));

    assert.deepEqual(capturedFilters.locationIds, [LOCATION_A.location_id]);
    assert.equal(result.meta.selected_location_id, LOCATION_A.location_id);
    assert.equal(result.rows[0].intent_type, 'opening');
    assert.equal(result.rows[0].line_count, 3);
  });

  it('blocks adjustment detail outside assigned scope', async () => {
    const service = loadInventoryService({
      findAdjustmentHeaderById: async () => ({
        adjustment_id: 'adj-outside',
        adjustment_number: 'AJ-OUT',
        location_id: LOCATION_B.location_id,
        location_code: LOCATION_B.code,
        location_name: LOCATION_B.name,
        status: 'draft',
        reason: 'Conteo físico',
        notes: null,
        created_by: USER_ID,
        created_by_name: 'Usuario Test',
        confirmed_by: null,
        confirmed_by_name: null,
        cancelled_by: null,
        cancelled_by_name: null,
        created_at: '2026-05-28T16:00:00.000Z',
        confirmed_at: null,
        cancelled_at: null,
        updated_at: '2026-05-28T16:00:00.000Z',
      }),
    });

    await assert.rejects(
      () => service.getAdjustmentById('99999999-9999-4999-8999-999999999999', buildAuth(['inventory.adjust'])),
      (error) => {
        assert.equal(error.statusCode, 403);
        assert.equal(error.code, 'INVENTORY_LOCATION_FORBIDDEN');
        return true;
      }
    );
  });

  it('blocks adjustment variant search outside assigned scope', async () => {
    const service = loadInventoryService();

    await assert.rejects(
      () =>
        service.searchVariantsForAdjustment(
          { location_id: LOCATION_B.location_id, query: 'PO' },
          buildAuth(['inventory.adjust'])
        ),
      (error) => {
        assert.equal(error.statusCode, 403);
        assert.equal(error.code, 'INVENTORY_LOCATION_FORBIDDEN');
        return true;
      }
    );
  });

  it('blocks adjustment creation outside assigned scope', async () => {
    const service = loadInventoryService();

    await assert.rejects(
      () =>
        service.createAdjustment(
          {
            location_id: LOCATION_B.location_id,
            reason: 'Conteo físico',
            lines: [
              {
                variant_id: '12121212-1212-4212-8212-121212121212',
                counted_qty: 5,
              },
            ],
          },
          buildAuth(['inventory.adjust'])
        ),
      (error) => {
        assert.equal(error.statusCode, 403);
        assert.equal(error.code, 'INVENTORY_LOCATION_FORBIDDEN');
        return true;
      }
    );
  });

  it('blocks adjustment confirmation outside assigned scope', async () => {
    const service = loadInventoryService({
      findAdjustmentHeaderById: async () => ({
        adjustment_id: 'adj-outside',
        adjustment_number: 'AJ-OUT',
        location_id: LOCATION_B.location_id,
        location_code: LOCATION_B.code,
        location_name: LOCATION_B.name,
        status: 'draft',
        reason: 'Conteo físico',
        notes: null,
        created_by: USER_ID,
        created_by_name: 'Usuario Test',
        confirmed_by: null,
        confirmed_by_name: null,
        cancelled_by: null,
        cancelled_by_name: null,
        created_at: '2026-05-28T16:00:00.000Z',
        confirmed_at: null,
        cancelled_at: null,
        updated_at: '2026-05-28T16:00:00.000Z',
      }),
    });

    await assert.rejects(
      () =>
        service.confirmAdjustmentById(
          '99999999-9999-4999-8999-999999999999',
          {},
          buildAuth(['inventory.adjust'])
        ),
      (error) => {
        assert.equal(error.statusCode, 403);
        assert.equal(error.code, 'INVENTORY_LOCATION_FORBIDDEN');
        return true;
      }
    );
  });

  it('blocks adjustment cancellation outside assigned scope', async () => {
    const service = loadInventoryService({
      findAdjustmentHeaderById: async () => ({
        adjustment_id: 'adj-outside',
        adjustment_number: 'AJ-OUT',
        location_id: LOCATION_B.location_id,
        location_code: LOCATION_B.code,
        location_name: LOCATION_B.name,
        status: 'draft',
        reason: 'Conteo físico',
        notes: null,
        created_by: USER_ID,
        created_by_name: 'Usuario Test',
        confirmed_by: null,
        confirmed_by_name: null,
        cancelled_by: null,
        cancelled_by_name: null,
        created_at: '2026-05-28T16:00:00.000Z',
        confirmed_at: null,
        cancelled_at: null,
        updated_at: '2026-05-28T16:00:00.000Z',
      }),
    });

    await assert.rejects(
      () =>
        service.cancelAdjustmentById(
          '99999999-9999-4999-8999-999999999999',
          {},
          buildAuth(['inventory.adjust'])
        ),
      (error) => {
        assert.equal(error.statusCode, 403);
        assert.equal(error.code, 'INVENTORY_LOCATION_FORBIDDEN');
        return true;
      }
    );
  });

  it('allows admin inventory scope to see all active locations in kardex meta', async () => {
    const service = loadInventoryService({
      findUserLocationsByUserId: async () => [{ ...LOCATION_A, user_id: USER_ID, is_default: true }],
      findAllKardex: async () => [],
    });

    const result = await service.listKardex({}, buildAuth(['admin.manage', 'inventory.view']));

    assert.equal(result.meta.can_view_all_locations, true);
    assert.equal(result.meta.selected_location_id, null);
    assert.deepEqual(
      result.meta.available_locations.map((location) => location.location_id),
      [LOCATION_A.location_id, LOCATION_B.location_id]
    );
  });
});
