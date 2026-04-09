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

function todayPeruDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

function normalizeUuid(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
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

async function openCash(input) {
  const locationId = normalizeUuid(input.location_id);
  const businessDate = normalizeDate(input.business_date) || todayPeruDate();
  const userId = normalizeUuid(input.user_id);
  const notes = input.notes ? String(input.notes).trim() : null;

  if (!locationId) throw new AppError('location_id is required', 400);
  if (!userId) throw new AppError('user_id is required', 400);

  const locationExists = await validateLocationExists(locationId);
  if (!locationExists) throw new AppError('Location not found', 404);

  const existing = await findCashClosingByLocationAndDate(locationId, businessDate);

  if (existing) {
    if (existing.status === 'open') return existing;
    throw new AppError('La caja de ese día ya fue cerrada', 409);
  }

  const record = await insertCashClosing({
    location_id: locationId,
    business_date: businessDate,
    opened_by: userId,
    notes,
  });

  return findCashClosingById(record.cash_closing_id);
}

async function closeCash(cashClosingId, input) {
  const normalizedId = normalizeUuid(cashClosingId);
  if (!normalizedId) throw new AppError('cash_closing_id is required', 400);

  const userId = normalizeUuid(input.user_id);
  if (!userId) throw new AppError('user_id is required', 400);

  const closing = await findCashClosingById(normalizedId);
  if (!closing) throw new AppError('Caja no encontrada', 404);
  if (closing.status === 'closed') throw new AppError('La caja ya fue cerrada', 409);

  const paymentRows = await sumSalesPaymentsByLocationAndDate(
    closing.location_id,
    closing.business_date
  );
  const totals = buildPaymentTotals(paymentRows);

  await updateCashClosingClose(normalizedId, {
    closed_by: userId,
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
  const locationId = normalizeUuid(input.location_id);
  const businessDate = normalizeDate(input.business_date) || todayPeruDate();

  if (!locationId) throw new AppError('location_id is required', 400);

  const locationExists = await validateLocationExists(locationId);
  if (!locationExists) throw new AppError('Location not found', 404);

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
  const locationId = normalizeUuid(input.location_id);
  const status = input.status ? String(input.status).trim() : null;

  if (status && !['open', 'closed'].includes(status)) {
    throw new AppError('Invalid status value', 400);
  }

  return findAllCashClosings({ locationId, status });
}

async function getCashClosing(cashClosingId) {
  const normalizedId = normalizeUuid(cashClosingId);
  if (!normalizedId) throw new AppError('cash_closing_id is required', 400);

  const closing = await findCashClosingById(normalizedId);
  if (!closing) throw new AppError('Caja no encontrada', 404);

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
