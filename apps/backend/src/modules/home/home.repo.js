const { query } = require('../../shared/db');
const { findAllTransfers } = require('../transfers/transfers.repo');
const {
  buildTransferPendingCounts,
  buildTransferPendingItems,
} = require('../transfers/transfers-inbox');

async function findPersonalSalesSummary(locationId, sellerUserId, businessDate, weekStartDate, executor = query) {
  const result = await executor(
    `SELECT
       COUNT(*) FILTER (
         WHERE DATE(s.confirmed_at AT TIME ZONE 'America/Lima') = $3::date
       )::int AS sales_today_count,
       COALESCE(SUM(s.total_amount) FILTER (
         WHERE DATE(s.confirmed_at AT TIME ZONE 'America/Lima') = $3::date
       ), 0)::numeric(12,2) AS sales_today_total,
       COUNT(*) FILTER (
         WHERE DATE(s.confirmed_at AT TIME ZONE 'America/Lima') BETWEEN $4::date AND $3::date
       )::int AS sales_week_count,
       COALESCE(SUM(s.total_amount) FILTER (
         WHERE DATE(s.confirmed_at AT TIME ZONE 'America/Lima') BETWEEN $4::date AND $3::date
       ), 0)::numeric(12,2) AS sales_week_total
     FROM sales s
     WHERE s.location_id = $1
       AND s.seller_user_id = $2
       AND s.status = 'confirmed'`,
    [locationId, sellerUserId, businessDate, weekStartDate]
  );

  return result.rows[0] || null;
}

async function findLastPersonalSale(locationId, sellerUserId, executor = query) {
  const result = await executor(
    `SELECT
       sale_id,
       sale_number,
       customer_name_text,
       total_amount,
       currency,
       confirmed_at
     FROM sales
     WHERE location_id = $1
       AND seller_user_id = $2
       AND status = 'confirmed'
     ORDER BY confirmed_at DESC
     LIMIT 1`,
    [locationId, sellerUserId]
  );

  return result.rows[0] || null;
}

async function findAssignedNetworkSummary(locationIds, businessDate, executor = query) {
  if (!Array.isArray(locationIds) || locationIds.length === 0) {
    return {
      active_user_count: 0,
      active_location_count: 0,
      sales_today_count: 0,
      sales_today_total: 0,
      pending_requests_count: 0,
    };
  }

  const result = await executor(
    `WITH assigned_locations AS (
       SELECT location_id
       FROM locations
       WHERE location_id = ANY($1::uuid[])
         AND active = TRUE
     ),
     active_users AS (
       SELECT DISTINCT ul.user_id
       FROM user_locations ul
       INNER JOIN users u ON u.user_id = ul.user_id
       WHERE ul.location_id IN (SELECT location_id FROM assigned_locations)
         AND u.active = TRUE
     ),
     sales_today AS (
       SELECT
         COUNT(*)::int AS sale_count,
         COALESCE(SUM(s.total_amount), 0)::numeric(12,2) AS total_amount
       FROM sales s
       WHERE s.location_id IN (SELECT location_id FROM assigned_locations)
         AND s.status = 'confirmed'
         AND DATE(s.confirmed_at AT TIME ZONE 'America/Lima') = $2::date
     ),
     pending_requests AS (
       SELECT COUNT(*)::int AS pending_requests_count
       FROM stock_transfers st
       WHERE st.to_location_id IN (SELECT location_id FROM assigned_locations)
         AND st.status IN ('requested', 'approved')
     )
     SELECT
       (SELECT COUNT(*)::int FROM active_users) AS active_user_count,
       (SELECT COUNT(*)::int FROM assigned_locations) AS active_location_count,
       (SELECT sale_count FROM sales_today) AS sales_today_count,
       (SELECT total_amount FROM sales_today) AS sales_today_total,
       (SELECT pending_requests_count FROM pending_requests) AS pending_requests_count`,
    [locationIds, businessDate]
  );

  return result.rows[0] || null;
}

async function findTransferRequestCounts(locationId, executor = query) {
  const rows = await findAllTransfers({ locationIds: [locationId] });
  return buildTransferPendingCounts(rows, [locationId]);
}

async function findTransferRequestItems(locationId, limit = 5, executor = query) {
  const rows = await findAllTransfers({ locationIds: [locationId] });
  return buildTransferPendingItems(rows, [locationId], limit);
}

module.exports = {
  findPersonalSalesSummary,
  findLastPersonalSale,
  findAssignedNetworkSummary,
  findTransferRequestCounts,
  findTransferRequestItems,
};
