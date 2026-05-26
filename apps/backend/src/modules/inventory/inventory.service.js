const { AppError } = require('../../shared/errors');
const { pool } = require('../../shared/db');
const { findUserByEmail } = require('../users/users.repo');
const {
  findAllInventory,
  findAllKardex,
  findAllAdjustments,
  findAdjustmentVariants,
  findAdjustmentHeaderById,
  findAdjustmentLinesByAdjustmentId,
  findLocationById,
  findUserById,
  findVariantsByIds,
  findInventoryQtyByLocationAndVariant,
  insertAdjustment,
  insertAdjustmentLine,
  confirmAdjustment,
  cancelAdjustment,
  upsertInventoryQty,
  insertStockMovement,
} = require('./inventory.repo');

const ALLOWED_MOVEMENT_TYPES = ['IN', 'OUT', 'ADJUST'];
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

function normalizeDateTime(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function normalizeNonNegativeInteger(value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function buildAdjustmentNumber() {
  return `AJ-${Date.now()}`;
}

function hasPermission(permissions, permissionKey) {
  return (
    Array.isArray(permissions) &&
    (permissions.includes('admin.manage') || permissions.includes(permissionKey))
  );
}

function canManageInventoryAdjustments(auth = {}) {
  return hasPermission(auth.permissions, 'inventory.adjust');
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

async function resolveAdjustmentActorUserId(value, fieldLabel) {
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
    throw new AppError('Development adjustment actor is not available', 500);
  }

  return fallbackUser.user_id;
}

async function listInventory(input = {}, auth = {}) {
  if (!hasPermission(auth.permissions, 'inventory.view')) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  const filters = {
    locationId: normalizeUuid(input.location_id),
    query: normalizeText(input.query),
    styleCode: normalizeText(input.style_code),
    sku: normalizeText(input.sku),
  };

  return findAllInventory(filters);
}

async function listKardex(input = {}, auth = {}) {
  if (!hasPermission(auth.permissions, 'inventory.view')) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  const movementType = normalizeText(input.movement_type);
  const referenceType = normalizeText(input.reference_type);
  const referenceId = normalizeUuid(input.reference_id);

  if (movementType && !ALLOWED_MOVEMENT_TYPES.includes(movementType)) {
    throw new AppError('Movement type is invalid', 400);
  }

  if (input.reference_id && !referenceId) {
    throw new AppError('Reference id is invalid', 400);
  }

  const filters = {
    locationId: normalizeUuid(input.location_id),
    variantId: normalizeUuid(input.variant_id),
    movementType,
    referenceType,
    referenceId,
    dateFrom: normalizeDateTime(input.date_from),
    dateTo: normalizeDateTime(input.date_to),
    query: normalizeText(input.query),
  };

  if (input.date_from && !filters.dateFrom) {
    throw new AppError('Date from is invalid', 400);
  }

  if (input.date_to && !filters.dateTo) {
    throw new AppError('Date to is invalid', 400);
  }

  return findAllKardex(filters);
}

async function listAdjustments(auth = {}) {
  if (!canManageInventoryAdjustments(auth)) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  return findAllAdjustments();
}

async function searchVariantsForAdjustment(input = {}, auth = {}) {
  if (!canManageInventoryAdjustments(auth)) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  const locationId = normalizeUuid(input.location_id);
  const query = normalizeText(input.query);

  if (!locationId) {
    throw new AppError('Location id is required', 400);
  }

  const location = await findLocationById(locationId);

  if (!location) {
    throw new AppError('Location is invalid', 400);
  }

  if (!query || query.length < 2) {
    return [];
  }

  return findAdjustmentVariants(locationId, query);
}

async function getAdjustmentById(adjustmentId, auth = {}) {
  if (!canManageInventoryAdjustments(auth)) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  const normalizedAdjustmentId = normalizeUuid(adjustmentId);

  if (!normalizedAdjustmentId) {
    throw new AppError('Adjustment id is required', 400);
  }

  const header = await findAdjustmentHeaderById(normalizedAdjustmentId);

  if (!header) {
    throw new AppError('Adjustment not found', 404);
  }

  const lines = await findAdjustmentLinesByAdjustmentId(normalizedAdjustmentId);

  return {
    ...header,
    lines,
  };
}

async function createAdjustment(input, auth = {}) {
  if (!canManageInventoryAdjustments(auth)) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  const locationId = normalizeUuid(input.location_id);
  const createdBy = await resolveAdjustmentActorUserId(
    input.created_by || auth.sub || auth.user_id,
    'Created by'
  );
  const reason = normalizeText(input.reason);
  const notes = normalizeText(input.notes);
  const lines = Array.isArray(input.lines) ? input.lines : [];

  if (!locationId) {
    throw new AppError('Location id is required', 400);
  }

  if (!lines.length) {
    throw new AppError('At least one adjustment line is required', 400);
  }

  const normalizedLines = lines.map((line) => ({
    variant_id: normalizeUuid(line.variant_id),
    counted_qty: normalizeNonNegativeInteger(line.counted_qty),
    notes: normalizeText(line.notes),
  }));

  if (normalizedLines.some((line) => !line.variant_id)) {
    throw new AppError('Adjustment line variant is invalid', 400);
  }

  if (normalizedLines.some((line) => line.counted_qty === null)) {
    throw new AppError('Adjustment line counted quantity is invalid', 400);
  }

  if (!ensureUniqueVariantIds(normalizedLines)) {
    throw new AppError('Adjustment lines cannot contain duplicated variants', 400);
  }

  const [location, createdByUser, variants] = await Promise.all([
    findLocationById(locationId),
    findUserById(createdBy),
    findVariantsByIds(normalizedLines.map((line) => line.variant_id)),
  ]);

  if (!location) {
    throw new AppError('Location is invalid', 400);
  }

  if (!createdByUser) {
    throw new AppError('Created by user is invalid', 400);
  }

  if (variants.length !== normalizedLines.length) {
    throw new AppError('One or more variants are invalid', 400);
  }

  const client = await pool.connect();
  let createdAdjustmentId = null;

  try {
    await client.query('begin');

    const adjustment = await insertAdjustment(
      {
        adjustment_number: buildAdjustmentNumber(),
        location_id: locationId,
        status: 'draft',
        reason,
        notes,
        created_by: createdBy,
      },
      client.query.bind(client)
    );

    createdAdjustmentId = adjustment.adjustment_id;

    for (const line of normalizedLines) {
      const systemQty = await findInventoryQtyByLocationAndVariant(
        locationId,
        line.variant_id,
        client.query.bind(client)
      );

      await insertAdjustmentLine(
        {
          adjustment_id: adjustment.adjustment_id,
          variant_id: line.variant_id,
          system_qty: systemQty,
          counted_qty: line.counted_qty,
          notes: line.notes,
        },
        client.query.bind(client)
      );
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');

    if (error.code === '23505') {
      throw new AppError('Adjustment line variants must be unique', 409);
    }

    throw error;
  } finally {
    client.release();
  }

  return getAdjustmentById(createdAdjustmentId, auth);
}

async function confirmAdjustmentById(adjustmentId, input = {}, auth = {}) {
  if (!canManageInventoryAdjustments(auth)) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  const normalizedAdjustmentId = normalizeUuid(adjustmentId);
  const confirmedBy = await resolveAdjustmentActorUserId(
    input.confirmed_by || auth.sub || auth.user_id,
    'Confirmed by'
  );

  if (!normalizedAdjustmentId) {
    throw new AppError('Adjustment id is required', 400);
  }

  const existingAdjustment = await findAdjustmentHeaderById(normalizedAdjustmentId);

  if (!existingAdjustment) {
    throw new AppError('Adjustment not found', 404);
  }

  if (existingAdjustment.status !== 'draft') {
    throw new AppError('Only draft adjustments can be confirmed', 400);
  }

  const confirmedByUser = await findUserById(confirmedBy);

  if (!confirmedByUser) {
    throw new AppError('Confirmed by user is invalid', 400);
  }

  const lines = await findAdjustmentLinesByAdjustmentId(normalizedAdjustmentId);

  if (!lines.length) {
    throw new AppError('Adjustment has no lines to confirm', 400);
  }

  const client = await pool.connect();

  try {
    await client.query('begin');

    for (const line of lines) {
      const countedQty = Number(line.counted_qty);
      const differenceQty = Number(line.difference_qty);

      await upsertInventoryQty(
        existingAdjustment.location_id,
        line.variant_id,
        countedQty,
        client.query.bind(client)
      );

      if (differenceQty !== 0) {
        await insertStockMovement(
          {
            location_id: existingAdjustment.location_id,
            variant_id: line.variant_id,
            movement_type: 'ADJUST',
            quantity: Math.abs(differenceQty),
            reason: existingAdjustment.reason || 'Inventory adjustment confirmation',
            reference_type: 'adjustment',
            reference_id: normalizedAdjustmentId,
            reference_line_id: line.adjustment_line_id,
            created_by: confirmedBy || existingAdjustment.created_by,
          },
          client.query.bind(client)
        );
      }
    }

    await confirmAdjustment(
      normalizedAdjustmentId,
      confirmedBy || existingAdjustment.created_by,
      client.query.bind(client)
    );

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }

  return getAdjustmentById(normalizedAdjustmentId, auth);
}

async function cancelAdjustmentById(adjustmentId, input = {}, auth = {}) {
  if (!canManageInventoryAdjustments(auth)) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  const normalizedAdjustmentId = normalizeUuid(adjustmentId);
  const cancelledBy = await resolveAdjustmentActorUserId(
    input.cancelled_by || auth.sub || auth.user_id,
    'Cancelled by'
  );

  if (!normalizedAdjustmentId) {
    throw new AppError('Adjustment id is required', 400);
  }

  const existingAdjustment = await findAdjustmentHeaderById(normalizedAdjustmentId);

  if (!existingAdjustment) {
    throw new AppError('Adjustment not found', 404);
  }

  if (existingAdjustment.status !== 'draft') {
    throw new AppError('Only draft adjustments can be cancelled', 400);
  }

  const cancelledByUser = await findUserById(cancelledBy);

  if (!cancelledByUser) {
    throw new AppError('Cancelled by user is invalid', 400);
  }

  await cancelAdjustment(normalizedAdjustmentId, cancelledBy);

  return getAdjustmentById(normalizedAdjustmentId, auth);
}

module.exports = {
  listInventory,
  listKardex,
  listAdjustments,
  searchVariantsForAdjustment,
  getAdjustmentById,
  createAdjustment,
  confirmAdjustmentById,
  cancelAdjustmentById,
};
