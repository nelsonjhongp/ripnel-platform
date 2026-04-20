const { query } = require('../../shared/db');

async function findCashClosingByLocationAndDate(locationId, businessDate) {
  const result = await query(
    `SELECT
       cc.cash_closing_id,
       cc.location_id,
       cc.business_date,
       cc.status,
       cc.opened_by,
       cc.closed_by,
       cc.total_cash,
       cc.total_yape,
       cc.total_plin,
       cc.total_transfer,
       cc.total_all,
       cc.notes,
       cc.created_at,
       cc.closed_at,
       cc.updated_at,
       l.name AS location_name,
       ou.full_name AS opened_by_name,
       cu.full_name AS closed_by_name
     FROM cash_closings cc
     INNER JOIN locations l ON l.location_id = cc.location_id
     LEFT JOIN users ou ON ou.user_id = cc.opened_by
     LEFT JOIN users cu ON cu.user_id = cc.closed_by
     WHERE cc.location_id = $1 AND cc.business_date = $2`,
    [locationId, businessDate]
  );
  return result.rows[0] || null;
}

async function findCashClosingById(cashClosingId) {
  const result = await query(
    `SELECT
       cc.cash_closing_id,
       cc.location_id,
       cc.business_date,
       cc.status,
       cc.opened_by,
       cc.closed_by,
       cc.total_cash,
       cc.total_yape,
       cc.total_plin,
       cc.total_transfer,
       cc.total_all,
       cc.notes,
       cc.created_at,
       cc.closed_at,
       cc.updated_at,
       l.name AS location_name,
       ou.full_name AS opened_by_name,
       cu.full_name AS closed_by_name
     FROM cash_closings cc
     INNER JOIN locations l ON l.location_id = cc.location_id
     LEFT JOIN users ou ON ou.user_id = cc.opened_by
     LEFT JOIN users cu ON cu.user_id = cc.closed_by
     WHERE cc.cash_closing_id = $1`,
    [cashClosingId]
  );
  return result.rows[0] || null;
}

async function findAllCashClosings(filters = {}) {
  const conditions = [];
  const values = [];

  if (filters.locationId) {
    values.push(filters.locationId);
    conditions.push(`cc.location_id = $${values.length}`);
  }

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`cc.status = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT
       cc.cash_closing_id,
       cc.location_id,
       cc.business_date,
       cc.status,
       cc.total_cash,
       cc.total_yape,
       cc.total_plin,
       cc.total_transfer,
       cc.total_all,
       cc.created_at,
       cc.closed_at,
       l.name AS location_name,
       ou.full_name AS opened_by_name,
       cu.full_name AS closed_by_name
     FROM cash_closings cc
     INNER JOIN locations l ON l.location_id = cc.location_id
     LEFT JOIN users ou ON ou.user_id = cc.opened_by
     LEFT JOIN users cu ON cu.user_id = cc.closed_by
     ${whereClause}
     ORDER BY cc.business_date DESC, cc.created_at DESC
     LIMIT 100`,
    values
  );
  return result.rows;
}

async function insertCashClosing(data) {
  const result = await query(
    `INSERT INTO cash_closings
       (location_id, business_date, status, opened_by, notes)
     VALUES ($1, $2, 'open', $3, $4)
     RETURNING *`,
    [data.location_id, data.business_date, data.opened_by, data.notes || null]
  );
  return result.rows[0];
}

async function updateCashClosingClose(cashClosingId, data) {
  const result = await query(
    `UPDATE cash_closings
     SET
       status = 'closed',
       closed_by = $2,
       closed_at = NOW(),
       total_cash = $3,
       total_yape = $4,
       total_plin = $5,
       total_transfer = $6,
       total_all = $7,
       notes = COALESCE($8, notes)
     WHERE cash_closing_id = $1
     RETURNING *`,
    [
      cashClosingId,
      data.closed_by,
      data.total_cash,
      data.total_yape,
      data.total_plin,
      data.total_transfer,
      data.total_all,
      data.notes || null,
    ]
  );
  return result.rows[0];
}

async function sumSalesPaymentsByLocationAndDate(locationId, businessDate) {
  const result = await query(
    `WITH payment_movements AS (
       SELECT
         sp.method,
         sp.amount AS signed_amount
       FROM sales_payments sp
       INNER JOIN sales s ON s.sale_id = sp.sale_id
       WHERE s.location_id = $1
         AND DATE(COALESCE(s.confirmed_at, s.created_at) AT TIME ZONE 'America/Lima') = $2::date

       UNION ALL

       SELECT
         spr.method,
         -spr.amount AS signed_amount
       FROM sales_payment_reversals spr
       WHERE spr.location_id = $1
         AND DATE(spr.reversed_at AT TIME ZONE 'America/Lima') = $2::date
     )
     SELECT
       method,
       COALESCE(SUM(signed_amount), 0) AS total
     FROM payment_movements
     GROUP BY method`,
    [locationId, businessDate]
  );
  return result.rows;
}

async function countSalesByLocationAndDate(locationId, businessDate) {
  const result = await query(
    `SELECT COUNT(*) AS sale_count, COALESCE(SUM(total_amount), 0) AS grand_total
     FROM sales
     WHERE location_id = $1
       AND status = 'confirmed'
       AND DATE(confirmed_at AT TIME ZONE 'America/Lima') = $2::date`,
    [locationId, businessDate]
  );
  return result.rows[0];
}

module.exports = {
  findCashClosingByLocationAndDate,
  findCashClosingById,
  findAllCashClosings,
  insertCashClosing,
  updateCashClosingClose,
  sumSalesPaymentsByLocationAndDate,
  countSalesByLocationAndDate,
};
