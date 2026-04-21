const { AppError } = require('../../shared/errors');
const {
  findCashClosingByLocationAndDate,
  findCashClosingById,
  findAllCashClosings,
  insertCashClosing,
  updateCashClosingClose,
  sumSalesPaymentsByLocationAndDate,
  countSalesByLocationAndDate,
  getAdminCashSummary,
  findAdminCashSessions,
} = require('./cash.repo');
const { query } = require('../../shared/db');
const { findActiveUserById } = require('../auth/auth.repo');
const { findDefaultLocationByUserId } = require('../users/users.repo');

const ALLOWED_CASH_ROLES = new Set(['ADMIN', 'CAJA']);

function todayPeruDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

function normalizeBusinessDateValue(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return value.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  }

  const normalized = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  }

  return normalized;
}

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function toNumber(value) {
  return round2(value || 0);
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

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00-05:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeRange(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '7d';
  return ['7d', '30d'].includes(normalized) ? normalized : null;
}

function buildRangeFilter(range) {
  const normalizedRange = normalizeRange(range);
  if (!normalizedRange) {
    throw new AppError('Invalid range value', 400, { code: 'INVALID_RANGE' });
  }

  const endDate = todayPeruDate();
  const startDate = normalizedRange === '30d' ? addDays(endDate, -29) : addDays(endDate, -6);

  return {
    range: normalizedRange,
    startDate,
    endDate,
  };
}

function buildPaymentTotals(rows) {
  const totals = { cash: 0, yape: 0, plin: 0, transfer: 0 };
  for (const row of rows) {
    const method = row.method;
    if (method in totals) {
      totals[method] = round2(row.total);
    }
  }
  const all = round2(totals.cash + totals.yape + totals.plin + totals.transfer);
  return { ...totals, all };
}

function buildSalesSummary(paymentRows, salesRow) {
  const byMethod = buildPaymentTotals(paymentRows);
  const grandTotal = round2(salesRow.grand_total || 0);
  const difference = round2(grandTotal - byMethod.all);

  return {
    sale_count: Number(salesRow.sale_count || 0),
    grand_total: grandTotal,
    by_method: byMethod,
    consistency: {
      payment_total: byMethod.all,
      difference,
      is_consistent: Math.abs(difference) < 0.01,
    },
  };
}

function serializeCashClosing(closing) {
  if (!closing) return null;

  return {
    ...closing,
    business_date: normalizeBusinessDateValue(closing.business_date),
    total_cash: toNumber(closing.total_cash),
    total_yape: toNumber(closing.total_yape),
    total_plin: toNumber(closing.total_plin),
    total_transfer: toNumber(closing.total_transfer),
    total_all: toNumber(closing.total_all),
    sale_count: closing.sale_count == null ? undefined : Number(closing.sale_count || 0),
    grand_total: closing.grand_total == null ? undefined : toNumber(closing.grand_total),
    payment_total: closing.payment_total == null ? undefined : toNumber(closing.payment_total),
    difference: closing.difference == null ? undefined : toNumber(closing.difference),
    is_consistent:
      closing.is_consistent == null ? undefined : Boolean(closing.is_consistent),
  };
}

function serializeCashSummary(summary) {
  if (!summary) return null;

  return {
    session_count: Number(summary.session_count || 0),
    open_count: Number(summary.open_count || 0),
    closed_count: Number(summary.closed_count || 0),
    open_location_count: Number(summary.open_location_count || 0),
    total_registered: toNumber(summary.total_registered),
  };
}

function serializeCashSummaryRow(row) {
  if (!row) return null;

  return {
    ...row,
    business_date: normalizeBusinessDateValue(row.business_date),
    session_count: Number(row.session_count || 0),
    open_count: Number(row.open_count || 0),
    closed_count: Number(row.closed_count || 0),
    open_location_count:
      row.open_location_count == null ? undefined : Number(row.open_location_count || 0),
    total_registered: row.total_registered == null ? undefined : toNumber(row.total_registered),
    total_all: row.total_all == null ? undefined : toNumber(row.total_all),
    grand_total: row.grand_total == null ? undefined : toNumber(row.grand_total),
    payment_total: row.payment_total == null ? undefined : toNumber(row.payment_total),
    difference: row.difference == null ? undefined : toNumber(row.difference),
    is_consistent:
      row.is_consistent == null ? undefined : Boolean(row.is_consistent),
  };
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

  if (!ALLOWED_CASH_ROLES.has(String(user.role_name || ''))) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN_ROLE' });
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
    if (existing.status === 'open') return serializeCashClosing(existing);
    throw new AppError('La caja operativa de la sede ya fue cerrada para esa fecha.', 409, {
      code: 'CASH_ALREADY_CLOSED_FOR_DATE',
    });
  }

  const record = await insertCashClosing({
    location_id: locationId,
    business_date: businessDate,
    opened_by: user.user_id,
    notes,
  });

  return serializeCashClosing(await findCashClosingById(record.cash_closing_id));
}

async function resolveCashAdminContext(userId) {
  const normalizedUserId = normalizeUuid(userId);

  if (!normalizedUserId) {
    throw new AppError('Not authenticated', 401, { code: 'AUTH_REQUIRED' });
  }

  const user = await findActiveUserById(normalizedUserId);
  if (!user) {
    throw new AppError('Not authenticated', 401, { code: 'AUTH_REQUIRED' });
  }

  if (String(user.role_name || '') !== 'ADMIN') {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN_ROLE' });
  }

  return { user };
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
  if (closing.status === 'closed') throw new AppError('La caja operativa de la sede ya fue cerrada.', 409, { code: 'CASH_ALREADY_CLOSED' });

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

  return serializeCashClosing(await findCashClosingById(normalizedId));
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

  return {
    closing: serializeCashClosing(closing),
    business_date: normalizeBusinessDateValue(businessDate),
    sales_summary: buildSalesSummary(paymentRows, salesRow),
  };
}

async function listCashClosings(input = {}) {
  const requestedLocationId = normalizeUuid(input.location_id);
  const status = input.status ? String(input.status).trim() : null;
  const rangeFilter = buildRangeFilter(input.range);
  const { locationId } = await resolveCashContext(input.user_id, requestedLocationId);

  if (status && !['open', 'closed'].includes(status)) {
    throw new AppError('Invalid status value', 400, { code: 'INVALID_STATUS' });
  }

  const closings = await findAllCashClosings({
    locationId,
    status,
    startDate: rangeFilter.startDate,
    endDate: rangeFilter.endDate,
  });
  return closings.map(serializeCashClosing);
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

  return {
    ...serializeCashClosing(closing),
    sales_summary: buildSalesSummary(paymentRows, salesRow),
  };
}

async function getCashAdminSummary(input = {}) {
  const requestedLocationId = normalizeUuid(input.location_id);
  const status = input.status ? String(input.status).trim() : null;
  const rangeFilter = buildRangeFilter(input.range);

  await resolveCashAdminContext(input.user_id);

  if (status && !['open', 'closed'].includes(status)) {
    throw new AppError('Invalid status value', 400, { code: 'INVALID_STATUS' });
  }

  if (requestedLocationId) {
    const locationExists = await validateLocationExists(requestedLocationId);
    if (!locationExists) {
      throw new AppError('Location not found', 404, { code: 'LOCATION_NOT_FOUND' });
    }
  }

  const summary = await getAdminCashSummary({
    locationId: requestedLocationId,
    status,
    startDate: rangeFilter.startDate,
    endDate: rangeFilter.endDate,
  });

  return {
    filters: {
      range: rangeFilter.range,
      status: status || 'all',
      location_id: requestedLocationId || null,
    },
    stats: serializeCashSummary(summary.stats),
    trend: summary.trend.map(serializeCashSummaryRow),
    by_location: summary.by_location.map(serializeCashSummaryRow),
    alerts: {
      open_locations: summary.open_locations.map(serializeCashSummaryRow),
      inconsistent_sessions: summary.inconsistent_sessions.map(serializeCashClosing),
    },
  };
}

async function listCashAdminSessions(input = {}) {
  const requestedLocationId = normalizeUuid(input.location_id);
  const status = input.status ? String(input.status).trim() : null;
  const rangeFilter = buildRangeFilter(input.range);
  const page = Number(input.page || 1);
  const pageSize = Number(input.page_size || input.pageSize || 20);

  await resolveCashAdminContext(input.user_id);

  if (status && !['open', 'closed'].includes(status)) {
    throw new AppError('Invalid status value', 400, { code: 'INVALID_STATUS' });
  }

  if (requestedLocationId) {
    const locationExists = await validateLocationExists(requestedLocationId);
    if (!locationExists) {
      throw new AppError('Location not found', 404, { code: 'LOCATION_NOT_FOUND' });
    }
  }

  const result = await findAdminCashSessions({
    locationId: requestedLocationId,
    status,
    startDate: rangeFilter.startDate,
    endDate: rangeFilter.endDate,
    page,
    pageSize,
  });

  const totalPages = result.totalItems > 0 ? Math.ceil(result.totalItems / result.pageSize) : 0;

  return {
    filters: {
      range: rangeFilter.range,
      status: status || 'all',
      location_id: requestedLocationId || null,
    },
    items: result.rows.map(serializeCashClosing),
    pagination: {
      page: result.page,
      page_size: result.pageSize,
      total_items: result.totalItems,
      total_pages: totalPages,
    },
  };
}

module.exports = {
  openCash,
  closeCash,
  getCurrentCash,
  listCashClosings,
  getCashClosing,
  getCashAdminSummary,
  listCashAdminSessions,
};
