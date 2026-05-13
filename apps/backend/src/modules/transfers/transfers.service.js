const { AppError } = require('../../shared/errors');
const { pool } = require('../../shared/db');
const {
  findAllTransfers,
  findTransferHeaderById,
  findTransferLinesByTransferId,
  findTransferRequestCandidateRows,
  insertTransfer,
  insertTransferLine,
  updateTransferLineShipment,
  updateTransferLineReceipt,
  markTransferShipped,
  markTransferReceived,
  markTransferCancelled,
} = require('./transfers.repo');
const {
  findLocationById,
  findVariantsByIds,
  findInventoryQtyByLocationAndVariant,
  upsertInventoryQty,
  insertStockMovement,
} = require('../inventory/inventory.repo');
const {
  findUserById,
  findUserLocationsByUserId,
  findDefaultLocationByUserId,
} = require('../users/users.repo');
const { buildTransferCapabilities } = require('./transfers-access');

const ALLOWED_TRANSFER_STATUSES = ['draft', 'shipped', 'received', 'cancelled'];

function normalizeUuid(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function normalizeText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function normalizePositiveInteger(value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function buildTransferNumber() {
  return `TR-${Date.now()}`;
}

function ensureUniqueVariantIds(lines) {
  const ids = new Set();

  for (const line of lines) {
    if (ids.has(line.variant_id)) {
      return false;
    }

    ids.add(line.variant_id);
  }

  return true;
}

function groupRequestCandidates(rows = []) {
  const grouped = new Map();

  for (const row of rows) {
    if (!grouped.has(row.variant_id)) {
      grouped.set(row.variant_id, {
        variant_id: row.variant_id,
        sku: row.sku,
        style_code: row.style_code,
        style_name: row.style_name,
        garment_type_name: row.garment_type_name || null,
        size_code: row.size_code,
        color_name: row.color_name,
        total_available: 0,
        candidate_sources: [],
      });
    }

    const current = grouped.get(row.variant_id);
    current.total_available += Number(row.qty_available || 0);
    current.candidate_sources.push({
      location_id: row.location_id,
      location_code: row.location_code,
      location_name: row.location_name,
      qty_available: Number(row.qty_available || 0),
    });
  }

  return [...grouped.values()];
}

async function resolveTransferActorContext(auth = {}) {
  const userId = normalizeUuid(auth.sub || auth.user_id);

  if (!userId) {
    throw new AppError('Not authenticated', 401, { code: 'AUTH_REQUIRED' });
  }

  const [user, defaultLocation, assignments] = await Promise.all([
    findUserById(userId),
    findDefaultLocationByUserId(userId),
    findUserLocationsByUserId(userId),
  ]);

  if (!user || user.active === false) {
    throw new AppError('Not authenticated', 401, { code: 'AUTH_REQUIRED' });
  }

  const locationIds = assignments
    .filter((assignment) => assignment.active)
    .map((assignment) => assignment.location_id);

  return {
    user_id: userId,
    role_name: auth.role_name || user.role_name || null,
    permissions: Array.isArray(auth.permissions) ? auth.permissions : [],
    default_location_id: defaultLocation ? defaultLocation.location_id : null,
    location_ids: locationIds,
    capabilities: buildTransferCapabilities({
      permissions: Array.isArray(auth.permissions) ? auth.permissions : [],
      roleName: auth.role_name || user.role_name,
    }),
  };
}

function canAccessTransferHeader(transfer, actor) {
  if (!transfer || !actor) {
    return false;
  }

  if (actor.capabilities.manage) {
    return true;
  }

  const locationIds = new Set(actor.location_ids || []);
  const destinationVisible =
    locationIds.has(transfer.to_location_id) &&
    (actor.capabilities.request_view_own || actor.capabilities.receive);
  const originVisible =
    locationIds.has(transfer.from_location_id) && actor.capabilities.ship;

  return destinationVisible || originVisible;
}

async function getTransferById(transferId, auth = {}) {
  const actor = await resolveTransferActorContext(auth);
  const normalizedTransferId = normalizeUuid(transferId);

  if (!normalizedTransferId) {
    throw new AppError('Transfer id is required', 400);
  }

  const header = await findTransferHeaderById(normalizedTransferId);

  if (!header) {
    throw new AppError('Transfer not found', 404);
  }

  if (!canAccessTransferHeader(header, actor)) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  const lines = await findTransferLinesByTransferId(normalizedTransferId);

  return {
    ...header,
    lines,
  };
}

async function listTransfers(input = {}, auth = {}) {
  const actor = await resolveTransferActorContext(auth);
  const status = normalizeText(input.status);

  if (status && !ALLOWED_TRANSFER_STATUSES.includes(status)) {
    throw new AppError('Transfer status is invalid', 400);
  }

  const filters = {
    status,
    fromLocationId: normalizeUuid(input.from_location_id),
    toLocationId: normalizeUuid(input.to_location_id),
    query: normalizeText(input.query),
  };

  const transfers = await findAllTransfers(filters);

  if (actor.capabilities.manage) {
    return transfers;
  }

  return transfers.filter((transfer) => canAccessTransferHeader(transfer, actor));
}

async function listPendingReceipts(auth = {}) {
  const actor = await resolveTransferActorContext(auth);
  const transfers = await findAllTransfers({ status: 'shipped' });

  if (actor.capabilities.manage) {
    return transfers;
  }

  if (!actor.capabilities.receive) {
    return [];
  }

  const locationIds = new Set(actor.location_ids || []);
  return transfers.filter((transfer) => locationIds.has(transfer.to_location_id));
}

async function listTransferRequestCandidates(input = {}, auth = {}) {
  const actor = await resolveTransferActorContext(auth);
  const query = normalizeText(input.query);
  const sourceLocationId = normalizeUuid(input.source_location_id);

  if (!actor.capabilities.request_create) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  if (!actor.default_location_id) {
    throw new AppError('Authenticated user has no default location assigned', 409, {
      code: 'DEFAULT_LOCATION_REQUIRED',
    });
  }

  if (!query || query.length < 2) {
    return [];
  }

  const rows = await findTransferRequestCandidateRows({
    destinationLocationId: actor.default_location_id,
    searchQuery: query,
    sourceLocationId,
  });

  return groupRequestCandidates(rows);
}

async function createTransfer(input, auth = {}) {
  const actor = await resolveTransferActorContext(auth);
  const fromLocationId = normalizeUuid(input.from_location_id);
  const requestedToLocationId = normalizeUuid(input.to_location_id);
  const toLocationId = actor.capabilities.manage
    ? requestedToLocationId
    : actor.default_location_id;
  const notes = normalizeText(input.notes);
  const lines = Array.isArray(input.lines) ? input.lines : [];

  if (!actor.capabilities.manage && !actor.default_location_id) {
    throw new AppError('Authenticated user has no default location assigned', 409, {
      code: 'DEFAULT_LOCATION_REQUIRED',
    });
  }

  if (!fromLocationId || !toLocationId) {
    throw new AppError('Origin and destination locations are required', 400);
  }

  if (
    !actor.capabilities.manage &&
    requestedToLocationId &&
    requestedToLocationId !== actor.default_location_id
  ) {
    throw new AppError('Store requests must use the current default location as destination', 400);
  }

  if (fromLocationId === toLocationId) {
    throw new AppError('Origin and destination must be different', 400);
  }

  if (!lines.length) {
    throw new AppError('At least one transfer line is required', 400);
  }

  const normalizedLines = lines.map((line) => ({
    variant_id: normalizeUuid(line.variant_id),
    qty_requested: normalizePositiveInteger(line.qty_requested),
    notes: normalizeText(line.notes),
  }));

  if (normalizedLines.some((line) => !line.variant_id)) {
    throw new AppError('Transfer line variant is invalid', 400);
  }

  if (normalizedLines.some((line) => line.qty_requested === null)) {
    throw new AppError('Transfer line requested quantity is invalid', 400);
  }

  if (!ensureUniqueVariantIds(normalizedLines)) {
    throw new AppError('Transfer lines cannot contain duplicated variants', 400);
  }

  const [fromLocation, toLocation, variants] = await Promise.all([
    findLocationById(fromLocationId),
    findLocationById(toLocationId),
    findVariantsByIds(normalizedLines.map((line) => line.variant_id)),
  ]);

  if (!fromLocation || !toLocation) {
    throw new AppError('Transfer locations are invalid', 400);
  }

  if (variants.length !== normalizedLines.length) {
    throw new AppError('One or more variants are invalid', 400);
  }

  const client = await pool.connect();
  let createdTransferId = null;

  try {
    await client.query('begin');

    for (const line of normalizedLines) {
      const availableQty = await findInventoryQtyByLocationAndVariant(
        fromLocationId,
        line.variant_id,
        client.query.bind(client)
      );

      if (availableQty < Number(line.qty_requested)) {
        const variant = variants.find((candidate) => candidate.variant_id === line.variant_id);
        throw new AppError(
          `Stock insuficiente para ${variant?.sku || line.variant_id}. Actualiza la solicitud o ajusta cantidades.`,
          409,
          { code: 'TRANSFER_REQUEST_STOCK_CHANGED' }
        );
      }
    }

    const transfer = await insertTransfer(
      {
        transfer_number: buildTransferNumber(),
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        status: 'draft',
        notes,
        created_by: actor.user_id,
      },
      client.query.bind(client)
    );

    createdTransferId = transfer.transfer_id;

    for (const line of normalizedLines) {
      await insertTransferLine(
        {
          transfer_id: transfer.transfer_id,
          variant_id: line.variant_id,
          qty_requested: line.qty_requested,
          qty_shipped: 0,
          qty_received: 0,
          notes: line.notes,
        },
        client.query.bind(client)
      );
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');

    if (error.code === '23505') {
      throw new AppError('Transfer line variants must be unique', 409);
    }

    throw error;
  } finally {
    client.release();
  }

  return getTransferById(createdTransferId, auth);
}

async function shipTransferById(transferId, input = {}, auth = {}) {
  const actor = await resolveTransferActorContext(auth);
  const normalizedTransferId = normalizeUuid(transferId);

  if (!normalizedTransferId) {
    throw new AppError('Transfer id is required', 400);
  }

  const transfer = await findTransferHeaderById(normalizedTransferId);

  if (!transfer) {
    throw new AppError('Transfer not found', 404);
  }

  if (!canAccessTransferHeader(transfer, actor)) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  if (
    !actor.capabilities.manage &&
    !actor.location_ids.includes(transfer.from_location_id)
  ) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  if (transfer.status !== 'draft') {
    throw new AppError('Only draft transfers can be shipped', 400);
  }
  const shippedBy = actor.user_id;

  const lines = await findTransferLinesByTransferId(normalizedTransferId);

  if (!lines.length) {
    throw new AppError('Transfer has no lines to ship', 400);
  }

  for (const line of lines) {
    const availableQty = await findInventoryQtyByLocationAndVariant(
      transfer.from_location_id,
      line.variant_id
    );

    if (availableQty < Number(line.qty_requested)) {
      throw new AppError(
        `Insufficient stock to ship ${line.sku} from ${transfer.from_location_code}`,
        409
      );
    }
  }

  const client = await pool.connect();

  try {
    await client.query('begin');

    for (const line of lines) {
      const shippedQty = Number(line.qty_requested);
      const currentQty = await findInventoryQtyByLocationAndVariant(
        transfer.from_location_id,
        line.variant_id,
        client.query.bind(client)
      );

      await updateTransferLineShipment(
        line.transfer_line_id,
        shippedQty,
        client.query.bind(client)
      );

      await upsertInventoryQty(
        transfer.from_location_id,
        line.variant_id,
        currentQty - shippedQty,
        client.query.bind(client)
      );

      await insertStockMovement(
        {
          location_id: transfer.from_location_id,
          variant_id: line.variant_id,
          movement_type: 'OUT',
          quantity: shippedQty,
          reason: `Transfer ${transfer.transfer_number} shipped`,
          reference_type: 'transfer',
          reference_id: normalizedTransferId,
          reference_line_id: line.transfer_line_id,
          created_by: shippedBy,
        },
        client.query.bind(client)
      );
    }

    await markTransferShipped(
      normalizedTransferId,
      shippedBy,
      client.query.bind(client)
    );

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }

  return getTransferById(normalizedTransferId, auth);
}

async function receiveTransferById(transferId, input = {}, auth = {}) {
  const actor = await resolveTransferActorContext(auth);
  const normalizedTransferId = normalizeUuid(transferId);

  if (!normalizedTransferId) {
    throw new AppError('Transfer id is required', 400);
  }

  const transfer = await findTransferHeaderById(normalizedTransferId);

  if (!transfer) {
    throw new AppError('Transfer not found', 404);
  }

  if (!canAccessTransferHeader(transfer, actor)) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  if (
    !actor.capabilities.manage &&
    !actor.location_ids.includes(transfer.to_location_id)
  ) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  if (transfer.status !== 'shipped') {
    throw new AppError('Only shipped transfers can be received', 400);
  }
  const receivedBy = actor.user_id;

  const lines = await findTransferLinesByTransferId(normalizedTransferId);

  if (!lines.length) {
    throw new AppError('Transfer has no lines to receive', 400);
  }

  if (lines.some((line) => Number(line.qty_shipped) <= 0)) {
    throw new AppError('Transfer has no shipped quantity to receive', 400);
  }

  const client = await pool.connect();

  try {
    await client.query('begin');

    for (const line of lines) {
      const receivedQty = Number(line.qty_shipped);
      const currentQty = await findInventoryQtyByLocationAndVariant(
        transfer.to_location_id,
        line.variant_id,
        client.query.bind(client)
      );

      await updateTransferLineReceipt(
        line.transfer_line_id,
        receivedQty,
        client.query.bind(client)
      );

      await upsertInventoryQty(
        transfer.to_location_id,
        line.variant_id,
        currentQty + receivedQty,
        client.query.bind(client)
      );

      await insertStockMovement(
        {
          location_id: transfer.to_location_id,
          variant_id: line.variant_id,
          movement_type: 'IN',
          quantity: receivedQty,
          reason: `Transfer ${transfer.transfer_number} received`,
          reference_type: 'transfer',
          reference_id: normalizedTransferId,
          reference_line_id: line.transfer_line_id,
          created_by: receivedBy,
        },
        client.query.bind(client)
      );
    }

    await markTransferReceived(
      normalizedTransferId,
      receivedBy,
      client.query.bind(client)
    );

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }

  return getTransferById(normalizedTransferId, auth);
}

async function cancelTransferById(transferId, input = {}, auth = {}) {
  const actor = await resolveTransferActorContext(auth);
  const normalizedTransferId = normalizeUuid(transferId);

  if (!normalizedTransferId) {
    throw new AppError('Transfer id is required', 400);
  }

  const transfer = await findTransferHeaderById(normalizedTransferId);

  if (!transfer) {
    throw new AppError('Transfer not found', 404);
  }

  if (!canAccessTransferHeader(transfer, actor)) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  if (transfer.status !== 'draft') {
    throw new AppError('Only draft transfers can be cancelled', 400);
  }
  await markTransferCancelled(normalizedTransferId, actor.user_id);

  return getTransferById(normalizedTransferId, auth);
}

module.exports = {
  listTransfers,
  listPendingReceipts,
  listTransferRequestCandidates,
  getTransferById,
  createTransfer,
  shipTransferById,
  receiveTransferById,
  cancelTransferById,
};
