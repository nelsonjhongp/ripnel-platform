const { AppError } = require('../../shared/errors');
const {
  findCashClosingByLocationAndDate,
  findCashClosingById,
  findAllCashClosings,
  insertCashClosing,
  updateCashClosingClose,
  sumSalesPaymentsByLocationAndDate,
  countSalesByLocationAndDate,
} = require('./cash.repo');
const { query } = require('../../shared/db');
const { findActiveUserById } = require('../auth/auth.repo');
const { findDefaultLocationByUserId } = require('../users/users.repo');

function todayPeruDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

function normalizeUuid(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalized
  )
    ? normalized
    : null;
}

function normalizeDate(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  return str;
}

function buildPaymentTotals(rows) {
  const totals = { cash: 0, yape: 0, plin: 0, transfer: 0 };
  for (const row of rows) {
    const method = row.method;
    if (method in totals) {
      totals[method] = Math.round(Number(row.total) * 100) / 100;
    }
  }
  const all = Math.round((totals.cash + totals.yape + totals.plin + totals.transfer) * 100) / 100;
  return { ...totals, all };
}

async function validateLocationExists(locationId) {
  const result = await query(
    `SELECT location_id FROM locations WHERE location_id = $1`,
    [locationId]
  );
  return result.rows.length > 0;
}

async function resolveCashContext(userId, requestedLocationId = null) {
  const normalizedUserId = normalizeUuid(userId);

  if (!normalizedUserId) {
    throw new AppError('Not authenticated', 401, { code: 'AUTH_REQUIRED' });
  }

  const user = await findActiveUserById(normalizedUserId);
  if (!user) {
    throw new AppError('Not authenticated', 401, { code: 'AUTH_REQUIRED' });
  }

  const defaultLocation = await findDefaultLocationByUserId(normalizedUserId);
  if (!defaultLocation) {
    throw new AppError('Authenticated user has no default location assigned', 409, {
      code: 'DEFAULT_LOCATION_REQUIRED',
    });
  }

  if (!defaultLocation.active) {
    throw new AppError('Default location is inactive', 409, {
      code: 'DEFAULT_LOCATION_INACTIVE',
    });
  }

  if (requestedLocationId && requestedLocationId !== defaultLocation.location_id) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN_LOCATION' });
  }

  return {
    user,
    locationId: requestedLocationId || defaultLocation.location_id,
  };
}

async function openCash(input) {
  const requestedLocationId = normalizeUuid(input.location_id);
  const businessDate = normalizeDate(input.business_date) || todayPeruDate();
  const notes = input.notes ? String(input.notes).trim() : null;

  const { user, locationId } = await resolveCashContext(input.user_id, requestedLocationId);

  const locationExists = await validateLocationExists(locationId);
  if (!locationExists) throw new AppError('Location not found', 404, { code: 'LOCATION_NOT_FOUND' });

  const existing = await findCashClosingByLocationAndDate(locationId, businessDate);

  if (existing) {
    if (existing.status === 'open') return existing;
    throw new AppError('La caja de ese día ya fue cerrada', 409);
  }

  const record = await insertCashClosing({
    location_id: locationId,
    business_date: businessDate,
    opened_by: user.user_id,
    notes,
  });

  return findCashClosingById(record.cash_closing_id);
}

async function closeCash(input) {
  const normalizedId = normalizeUuid(input.cash_closing_id);
  if (!normalizedId) throw new AppError('cash_closing_id is required', 400, { code: 'INVALID_CASH_CLOSING_ID' });

  const { user, locationId } = await resolveCashContext(input.user_id, normalizeUuid(input.location_id));

  const closing = await findCashClosingById(normalizedId);
  if (!closing) throw new AppError('Caja no encontrada', 404, { code: 'CASH_CLOSING_NOT_FOUND' });
  if (closing.location_id !== locationId) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN_LOCATION' });
  }
  if (closing.status === 'closed') throw new AppError('La caja ya fue cerrada', 409, { code: 'CASH_ALREADY_CLOSED' });

  const paymentRows = await sumSalesPaymentsByLocationAndDate(
    closing.location_id,
    closing.business_date
  );
  const totals = buildPaymentTotals(paymentRows);

  await updateCashClosingClose(normalizedId, {
    closed_by: user.user_id,
    total_cash: totals.cash,
    total_yape: totals.yape,
    total_plin: totals.plin,
    total_transfer: totals.transfer,
    total_all: totals.all,
    notes: input.notes || null,
  });

  return findCashClosingById(normalizedId);
}

async function getCurrentCash(input) {
  const requestedLocationId = normalizeUuid(input.location_id);
  const businessDate = normalizeDate(input.business_date) || todayPeruDate();

  const { locationId } = await resolveCashContext(input.user_id, requestedLocationId);

  const locationExists = await validateLocationExists(locationId);
  if (!locationExists) throw new AppError('Location not found', 404, { code: 'LOCATION_NOT_FOUND' });

  const closing = await findCashClosingByLocationAndDate(locationId, businessDate);

  const [paymentRows, salesRow] = await Promise.all([
    sumSalesPaymentsByLocationAndDate(locationId, businessDate),
    countSalesByLocationAndDate(locationId, businessDate),
  ]);

  const salesSummary = {
    sale_count: Number(salesRow.sale_count || 0),
    grand_total: Math.round(Number(salesRow.grand_total || 0) * 100) / 100,
    by_method: buildPaymentTotals(paymentRows),
  };

  return { closing: closing || null, business_date: businessDate, sales_summary: salesSummary };
}

async function listCashClosings(input = {}) {
  const requestedLocationId = normalizeUuid(input.location_id);
  const status = input.status ? String(input.status).trim() : null;
  const { locationId } = await resolveCashContext(input.user_id, requestedLocationId);

  if (status && !['open', 'closed'].includes(status)) {
    throw new AppError('Invalid status value', 400, { code: 'INVALID_STATUS' });
  }

  return findAllCashClosings({ locationId, status });
}

async function getCashClosing(input = {}) {
  const normalizedId = normalizeUuid(input.cash_closing_id);
  if (!normalizedId) {
    throw new AppError('cash_closing_id is required', 400, { code: 'INVALID_CASH_CLOSING_ID' });
  }

  const closing = await findCashClosingById(normalizedId);
  if (!closing) throw new AppError('Caja no encontrada', 404, { code: 'CASH_CLOSING_NOT_FOUND' });

  const { locationId } = await resolveCashContext(input.user_id, closing.location_id);
  if (closing.location_id !== locationId) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN_LOCATION' });
  }

  const [paymentRows, salesRow] = await Promise.all([
    sumSalesPaymentsByLocationAndDate(closing.location_id, closing.business_date),
    countSalesByLocationAndDate(closing.location_id, closing.business_date),
  ]);

  const salesSummary = {
    sale_count: Number(salesRow.sale_count || 0),
    grand_total: Math.round(Number(salesRow.grand_total || 0) * 100) / 100,
    by_method: buildPaymentTotals(paymentRows),
  };

  return { ...closing, sales_summary: salesSummary };
}

module.exports = {
  openCash,
  closeCash,
  getCurrentCash,
  listCashClosings,
  getCashClosing,
};
