const { AppError } = require('../../shared/errors');
const { pool } = require('../../shared/db');
const {
  findAllTransfers,
  findTransferHeaderById,
  findTransferLinesByTransferId,
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
const { findUserById, findUserByEmail } = require('../users/users.repo');

const ALLOWED_TRANSFER_STATUSES = ['draft', 'shipped', 'received', 'cancelled'];
const DEVELOPMENT_ACTOR_EMAIL = 'nelson@ripnel.com';

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

async function resolveActorUserId(value, fieldLabel) {
  const normalizedUserId = normalizeUuid(value);

  if (normalizedUserId) {
    const user = await findUserById(normalizedUserId);

    if (!user) {
      throw new AppError(`${fieldLabel} user is invalid`, 400);
    }

    return user.user_id;
  }

  const fallbackUser = await findUserByEmail(DEVELOPMENT_ACTOR_EMAIL);

  if (!fallbackUser) {
    throw new AppError('Development transfer actor is not available', 500);
  }

  return fallbackUser.user_id;
}

async function getTransferById(transferId) {
  const normalizedTransferId = normalizeUuid(transferId);

  if (!normalizedTransferId) {
    throw new AppError('Transfer id is required', 400);
  }

  const header = await findTransferHeaderById(normalizedTransferId);

  if (!header) {
    throw new AppError('Transfer not found', 404);
  }

  const lines = await findTransferLinesByTransferId(normalizedTransferId);

  return {
    ...header,
    lines,
  };
}

async function listTransfers(input = {}) {
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

  return findAllTransfers(filters);
}

async function listPendingReceipts() {
  return findAllTransfers({ status: 'shipped' });
}

async function createTransfer(input) {
  const fromLocationId = normalizeUuid(input.from_location_id);
  const toLocationId = normalizeUuid(input.to_location_id);
  const notes = normalizeText(input.notes);
  const lines = Array.isArray(input.lines) ? input.lines : [];

  if (!fromLocationId || !toLocationId) {
    throw new AppError('Origin and destination locations are required', 400);
  }

  if (fromLocationId === toLocationId) {
    throw new AppError('Origin and destination must be different', 400);
  }

  if (!lines.length) {
    throw new AppError('At least one transfer line is required', 400);
  }

  const createdBy = await resolveActorUserId(input.created_by, 'Created by');

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

    const transfer = await insertTransfer(
      {
        transfer_number: buildTransferNumber(),
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        status: 'draft',
        notes,
        created_by: createdBy,
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

  return getTransferById(createdTransferId);
}

async function shipTransferById(transferId, input = {}) {
  const normalizedTransferId = normalizeUuid(transferId);

  if (!normalizedTransferId) {
    throw new AppError('Transfer id is required', 400);
  }

  const transfer = await findTransferHeaderById(normalizedTransferId);

  if (!transfer) {
    throw new AppError('Transfer not found', 404);
  }

  if (transfer.status !== 'draft') {
    throw new AppError('Only draft transfers can be shipped', 400);
  }

  const shippedBy = await resolveActorUserId(input.shipped_by, 'Shipped by');

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

  return getTransferById(normalizedTransferId);
}

async function receiveTransferById(transferId, input = {}) {
  const normalizedTransferId = normalizeUuid(transferId);

  if (!normalizedTransferId) {
    throw new AppError('Transfer id is required', 400);
  }

  const transfer = await findTransferHeaderById(normalizedTransferId);

  if (!transfer) {
    throw new AppError('Transfer not found', 404);
  }

  if (transfer.status !== 'shipped') {
    throw new AppError('Only shipped transfers can be received', 400);
  }

  const receivedBy = await resolveActorUserId(input.received_by, 'Received by');

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

  return getTransferById(normalizedTransferId);
}

async function cancelTransferById(transferId, input = {}) {
  const normalizedTransferId = normalizeUuid(transferId);

  if (!normalizedTransferId) {
    throw new AppError('Transfer id is required', 400);
  }

  const transfer = await findTransferHeaderById(normalizedTransferId);

  if (!transfer) {
    throw new AppError('Transfer not found', 404);
  }

  if (transfer.status !== 'draft') {
    throw new AppError('Only draft transfers can be cancelled', 400);
  }

  const cancelledBy = await resolveActorUserId(input.cancelled_by, 'Cancelled by');

  await markTransferCancelled(normalizedTransferId, cancelledBy);

  return getTransferById(normalizedTransferId);
}

module.exports = {
  listTransfers,
  listPendingReceipts,
  getTransferById,
  createTransfer,
  shipTransferById,
  receiveTransferById,
  cancelTransferById,
};
