const { query } = require('../../shared/db');
const { findAllTransfers } = require('../transfers/transfers.repo');
const {
  buildTransferPendingCounts,
  buildTransferPendingItems,
} = require('../transfers/transfers-inbox');

function normalizeLocationIds(locationIdOrIds) {
  if (Array.isArray(locationIdOrIds)) {
    return locationIdOrIds.filter(Boolean);
  }

  return locationIdOrIds ? [locationIdOrIds] : [];
}

async function findCommercialActivityByTimeSlot(locationIds, dateFrom, dateTo, executor = query) {
  const result = await executor(
    `WITH filtered_sales AS (
       SELECT
         s.location_id,
         FLOOR(EXTRACT(HOUR FROM COALESCE(s.confirmed_at, s.created_at) AT TIME ZONE 'America/Lima') / 2)::int AS slot_index,
         COALESCE(s.total_amount, 0) AS total_amount
       FROM sales s
       WHERE s.location_id = ANY($1::uuid[])
         AND s.status = 'confirmed'
         AND DATE(COALESCE(s.confirmed_at, s.created_at) AT TIME ZONE 'America/Lima') >= $2::date
         AND DATE(COALESCE(s.confirmed_at, s.created_at) AT TIME ZONE 'America/Lima') <= $3::date
     )
     SELECT
       fs.location_id,
       fs.slot_index,
       COUNT(*)::int AS sale_count,
       ROUND(SUM(fs.total_amount)::numeric, 2) AS total_amount,
       ROUND((SUM(fs.total_amount) / NULLIF(COUNT(*), 0))::numeric, 2) AS avg_ticket
     FROM filtered_sales fs
     GROUP BY fs.location_id, fs.slot_index
     ORDER BY fs.location_id, fs.slot_index`,
    [locationIds, dateFrom, dateTo]
  );

  return result.rows;
}

async function findCommercialActivityByWeekday(locationIds, dateFrom, dateTo, executor = query) {
  const result = await executor(
    `WITH filtered_sales AS (
       SELECT
         s.location_id,
         EXTRACT(ISODOW FROM COALESCE(s.confirmed_at, s.created_at) AT TIME ZONE 'America/Lima')::int AS weekday_number,
         COALESCE(s.total_amount, 0) AS total_amount
       FROM sales s
       WHERE s.location_id = ANY($1::uuid[])
         AND s.status = 'confirmed'
         AND DATE(COALESCE(s.confirmed_at, s.created_at) AT TIME ZONE 'America/Lima') >= $2::date
         AND DATE(COALESCE(s.confirmed_at, s.created_at) AT TIME ZONE 'America/Lima') <= $3::date
     )
     SELECT
       fs.location_id,
       fs.weekday_number,
       COUNT(*)::int AS sale_count,
       ROUND(SUM(fs.total_amount)::numeric, 2) AS total_amount,
       ROUND((SUM(fs.total_amount) / NULLIF(COUNT(*), 0))::numeric, 2) AS avg_ticket
     FROM filtered_sales fs
     GROUP BY fs.location_id, fs.weekday_number
     ORDER BY fs.location_id, fs.weekday_number`,
    [locationIds, dateFrom, dateTo]
  );

  return result.rows;
}

async function findCommercialActivityByDay(locationIds, dateFrom, dateTo, executor = query) {
  const result = await executor(
    `WITH filtered_sales AS (
       SELECT
         s.location_id,
         DATE(COALESCE(s.confirmed_at, s.created_at) AT TIME ZONE 'America/Lima') AS business_date,
         COALESCE(s.total_amount, 0) AS total_amount
       FROM sales s
       WHERE s.location_id = ANY($1::uuid[])
         AND s.status = 'confirmed'
         AND DATE(COALESCE(s.confirmed_at, s.created_at) AT TIME ZONE 'America/Lima') >= $2::date
         AND DATE(COALESCE(s.confirmed_at, s.created_at) AT TIME ZONE 'America/Lima') <= $3::date
     )
     SELECT
       fs.location_id,
       fs.business_date,
       COUNT(*)::int AS sale_count,
       ROUND(SUM(fs.total_amount)::numeric, 2) AS total_amount,
       ROUND((SUM(fs.total_amount) / NULLIF(COUNT(*), 0))::numeric, 2) AS avg_ticket
     FROM filtered_sales fs
     GROUP BY fs.location_id, fs.business_date
     ORDER BY fs.business_date, fs.location_id`,
    [locationIds, dateFrom, dateTo]
  );

  return result.rows;
}

async function findCommercialActivityAggregate(locationIds, dateFrom, dateTo, executor = query) {
  const result = await executor(
    `SELECT
       s.location_id,
       COUNT(*)::int AS sale_count,
       ROUND(SUM(COALESCE(s.total_amount, 0))::numeric, 2) AS total_amount,
       ROUND((SUM(COALESCE(s.total_amount, 0)) / NULLIF(COUNT(*), 0))::numeric, 2) AS avg_ticket
     FROM sales s
     WHERE s.location_id = ANY($1::uuid[])
       AND s.status = 'confirmed'
       AND DATE(COALESCE(s.confirmed_at, s.created_at) AT TIME ZONE 'America/Lima') >= $2::date
       AND DATE(COALESCE(s.confirmed_at, s.created_at) AT TIME ZONE 'America/Lima') <= $3::date
     GROUP BY s.location_id
     ORDER BY total_amount DESC, sale_count DESC`,
    [locationIds, dateFrom, dateTo]
  );

  return result.rows;
}

async function findSalesHeadlineByLocationAndDate(locationId, dateFrom, dateToOrExecutor, executor) {
  const locationIds = normalizeLocationIds(locationId);
  let dateEnd, exec
  if (typeof dateToOrExecutor === "function") {
    dateEnd = dateFrom
    exec = dateToOrExecutor
  } else if (typeof dateToOrExecutor === "string") {
    dateEnd = dateToOrExecutor
    exec = typeof executor === "function" ? executor : query
  } else {
    dateEnd = dateFrom
    exec = query
  }
  const result = await exec(
     `SELECT
       COUNT(*)::int AS sale_count,
       COALESCE(SUM(total_amount), 0)::numeric(12,2) AS total_amount,
       MAX(confirmed_at) AS last_confirmed_at
     FROM sales
     WHERE location_id = ANY($1::uuid[])
       AND status = 'confirmed'
       AND DATE(confirmed_at AT TIME ZONE 'America/Lima') >= $2::date
       AND DATE(confirmed_at AT TIME ZONE 'America/Lima') <= $3::date`,
    [locationIds, dateFrom, dateEnd]
  );

  return result.rows[0] || null;
}

async function findPaymentTotalsByLocationAndDate(locationId, dateFrom, dateToOrExecutor, executor) {
  const locationIds = normalizeLocationIds(locationId);
  let dateEnd, exec
  if (typeof dateToOrExecutor === "function") {
    dateEnd = dateFrom
    exec = dateToOrExecutor
  } else if (typeof dateToOrExecutor === "string") {
    dateEnd = dateToOrExecutor
    exec = typeof executor === "function" ? executor : query
  } else {
    dateEnd = dateFrom
    exec = query
  }
  const result = await exec(
    `WITH payment_movements AS (
       SELECT
         sp.method,
         sp.amount AS signed_amount
       FROM sales_payments sp
       INNER JOIN sales s ON s.sale_id = sp.sale_id
       WHERE s.location_id = ANY($1::uuid[])
         AND s.status = 'confirmed'
         AND DATE(s.confirmed_at AT TIME ZONE 'America/Lima') >= $2::date
         AND DATE(s.confirmed_at AT TIME ZONE 'America/Lima') <= $3::date

       UNION ALL

       SELECT
         spr.method,
         -spr.amount AS signed_amount
       FROM sales_payment_reversals spr
       WHERE spr.location_id = ANY($1::uuid[])
         AND DATE(spr.reversed_at AT TIME ZONE 'America/Lima') >= $2::date
         AND DATE(spr.reversed_at AT TIME ZONE 'America/Lima') <= $3::date
     )
     SELECT
       method,
       COALESCE(SUM(signed_amount), 0)::numeric(12,2) AS total
     FROM payment_movements
     GROUP BY method`,
    [locationIds, dateFrom, dateEnd]
  );

  return result.rows;
}

async function findPostsalesWindowCounts(
  locationId,
  businessDate,
  lookbackDays = 14,
  executor = query
) {
  const locationIds = normalizeLocationIds(locationId);
  const result = await executor(
    `WITH recent_sales AS (
       SELECT
         s.sale_id,
         COALESCE(cc.status, 'missing') AS cash_status,
         (sc.sale_cancellation_id IS NOT NULL) AS has_cancellation,
         COALESCE(ex.confirmed_exchange_count, 0)::int AS confirmed_exchange_count
       FROM sales s
       LEFT JOIN cash_closings cc
         ON cc.location_id = s.location_id
        AND cc.business_date = DATE(COALESCE(s.confirmed_at, s.created_at) AT TIME ZONE 'America/Lima')
       LEFT JOIN sale_cancellations sc ON sc.sale_id = s.sale_id
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS confirmed_exchange_count
         FROM exchanges e
         WHERE e.sale_id = s.sale_id
           AND e.status = 'confirmed'
       ) ex ON TRUE
       WHERE s.location_id = ANY($1::uuid[])
         AND s.status = 'confirmed'
         AND DATE(COALESCE(s.confirmed_at, s.created_at) AT TIME ZONE 'America/Lima') >= ($2::date - ($3::int - 1))
     )
     SELECT
       COUNT(*)::int AS total_recent_confirmed,
       COUNT(*) FILTER (
         WHERE NOT has_cancellation
           AND confirmed_exchange_count = 0
       )::int AS eligible_exchange_count,
       COUNT(*) FILTER (
         WHERE NOT has_cancellation
           AND confirmed_exchange_count = 0
           AND cash_status = 'open'
       )::int AS eligible_cancel_count,
       COUNT(*) FILTER (
         WHERE has_cancellation
            OR confirmed_exchange_count > 0
            OR cash_status <> 'open'
       )::int AS blocked_cancel_count
     FROM recent_sales`,
    [locationIds, businessDate, lookbackDays]
  );

  return result.rows[0] || null;
}

async function findPostsalesWindowItems(
  locationId,
  businessDate,
  lookbackDays = 14,
  limit = 5,
  executor = query
) {
  const locationIds = normalizeLocationIds(locationId);
  const result = await executor(
    `WITH recent_sales AS (
       SELECT
         s.sale_id,
         s.sale_number,
         s.customer_name_text,
         s.total_amount,
         s.currency,
         DATE(COALESCE(s.confirmed_at, s.created_at) AT TIME ZONE 'America/Lima') AS business_date,
         COALESCE(s.confirmed_at, s.created_at) AS occurred_at,
         COALESCE(cc.status, 'missing') AS cash_status,
         (sc.sale_cancellation_id IS NOT NULL) AS has_cancellation,
         COALESCE(ex.confirmed_exchange_count, 0)::int AS confirmed_exchange_count
       FROM sales s
       LEFT JOIN cash_closings cc
         ON cc.location_id = s.location_id
        AND cc.business_date = DATE(COALESCE(s.confirmed_at, s.created_at) AT TIME ZONE 'America/Lima')
       LEFT JOIN sale_cancellations sc ON sc.sale_id = s.sale_id
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS confirmed_exchange_count
         FROM exchanges e
         WHERE e.sale_id = s.sale_id
           AND e.status = 'confirmed'
       ) ex ON TRUE
       WHERE s.location_id = ANY($1::uuid[])
         AND s.status = 'confirmed'
         AND DATE(COALESCE(s.confirmed_at, s.created_at) AT TIME ZONE 'America/Lima') >= ($2::date - ($3::int - 1))
     )
     SELECT
       sale_id,
       sale_number,
       customer_name_text,
       total_amount,
       currency,
       business_date,
       occurred_at,
       cash_status,
       (NOT has_cancellation AND confirmed_exchange_count = 0) AS exchange_allowed,
       (
         NOT has_cancellation
         AND confirmed_exchange_count = 0
         AND cash_status = 'open'
       ) AS cancel_allowed
     FROM recent_sales
     WHERE NOT has_cancellation
       AND confirmed_exchange_count = 0
     ORDER BY occurred_at DESC
     LIMIT $4`,
    [locationIds, businessDate, lookbackDays, limit]
  );

  return result.rows;
}

async function findPendingTransfersCounts(locationId, executor = query) {
  const locationIds = normalizeLocationIds(locationId);
  const rows = await findAllTransfers({ locationIds });
  return buildTransferPendingCounts(rows, locationIds);
}

async function findPendingTransfersItems(locationId, limit = 5, executor = query) {
  const locationIds = normalizeLocationIds(locationId);
  const rows = await findAllTransfers({ locationIds });
  return buildTransferPendingItems(rows, locationIds, limit);
}

async function findTransferPendingData(locationId, limit = 5) {
  const locationIds = normalizeLocationIds(locationId);
  const rows = await findAllTransfers({ locationIds });
  return {
    counts: buildTransferPendingCounts(rows, locationIds),
    items: buildTransferPendingItems(rows, locationIds, limit),
  };
}

async function findCriticalInventoryCounts(locationId, lowStockThreshold = 3, executor = query) {
  const locationIds = normalizeLocationIds(locationId);
  const result = await executor(
    `SELECT
       COUNT(*) FILTER (WHERE qty = 0)::int AS zero_stock_count,
       COUNT(*) FILTER (WHERE qty > 0 AND qty <= $2)::int AS low_stock_count
     FROM inventory
     WHERE location_id = ANY($1::uuid[])`,
    [locationIds, lowStockThreshold]
  );

  return result.rows[0] || null;
}

async function findCriticalInventoryItems(
  locationId,
  lowStockThreshold = 3,
  limit = 6,
  executor = query
) {
  const locationIds = normalizeLocationIds(locationId);
  const result = await executor(
    `SELECT
       i.variant_id,
       pv.sku,
       ps.style_name,
       ps.style_code,
       s.code AS size_code,
       c.code AS color_code,
       i.qty
     FROM inventory i
     INNER JOIN product_variants pv ON pv.variant_id = i.variant_id
     INNER JOIN (
       SELECT style_id, name AS style_name, style_code
       FROM product_styles
     ) ps ON ps.style_id = pv.style_id
     INNER JOIN sizes s ON s.size_id = pv.size_id
     INNER JOIN colors c ON c.color_id = pv.color_id
     WHERE i.location_id = ANY($1::uuid[])
       AND i.qty <= $2
     ORDER BY i.qty ASC, ps.style_name ASC, s.sort_order ASC, c.name ASC
     LIMIT $3`,
    [locationIds, lowStockThreshold, limit]
  );

  return result.rows;
}

async function findRecentSalesEvents(locationId, limit = 5, executor = query) {
  const locationIds = normalizeLocationIds(locationId);
  const result = await executor(
    `SELECT
       sale_id,
       sale_number,
       customer_name_text,
       total_amount,
       currency,
       confirmed_at AS occurred_at,
       document_type
     FROM sales
     WHERE location_id = ANY($1::uuid[])
       AND status = 'confirmed'
     ORDER BY confirmed_at DESC
     LIMIT $2`,
    [locationIds, limit]
  );

  return result.rows;
}

async function findRecentPostsaleEvents(locationId, limit = 5, executor = query) {
  const locationIds = normalizeLocationIds(locationId);
  const result = await executor(
    `SELECT
       event_id,
       event_type,
       sale_id,
       sale_number,
       customer_name_text,
       status,
       reason,
       occurred_at
     FROM (
       SELECT
         sc.sale_cancellation_id::text AS event_id,
         'sale_cancellation' AS event_type,
         sc.sale_id,
         s.sale_number,
         s.customer_name_text,
         sc.status,
         sc.reason,
         sc.cancelled_at AS occurred_at
       FROM sale_cancellations sc
       INNER JOIN sales s ON s.sale_id = sc.sale_id
       WHERE sc.location_id = ANY($1::uuid[])

       UNION ALL

       SELECT
         e.exchange_id::text AS event_id,
         'exchange' AS event_type,
         e.sale_id,
         s.sale_number,
         s.customer_name_text,
         e.status,
         e.reason,
         COALESCE(e.confirmed_at, e.created_at) AS occurred_at
       FROM exchanges e
       INNER JOIN sales s ON s.sale_id = e.sale_id
       WHERE e.location_id = ANY($1::uuid[])
         AND e.status = 'confirmed'
     ) events
     ORDER BY occurred_at DESC
     LIMIT $2`,
    [locationIds, limit]
  );

  return result.rows;
}

async function findRecentTransferEvents(locationId, limit = 5, executor = query) {
  const locationIds = normalizeLocationIds(locationId);
  const result = await executor(
    `SELECT
       st.transfer_id,
       st.transfer_number,
       st.status,
       st.from_location_id,
       lf.name AS from_location_name,
       st.to_location_id,
       lt.name AS to_location_name,
       st.updated_at,
       COALESCE(st.received_at, st.shipped_at, st.approved_at, st.cancelled_at, st.updated_at, st.created_at) AS occurred_at
     FROM stock_transfers st
     INNER JOIN locations lf ON lf.location_id = st.from_location_id
     INNER JOIN locations lt ON lt.location_id = st.to_location_id
     WHERE st.from_location_id = ANY($1::uuid[])
        OR st.to_location_id = ANY($1::uuid[])
     ORDER BY occurred_at DESC
     LIMIT $2`,
    [locationIds, limit]
  );

  return result.rows;
}

async function findRecentAdjustmentEvents(locationId, limit = 5, executor = query) {
  const locationIds = normalizeLocationIds(locationId);
  const result = await executor(
    `SELECT
       adjustment_id,
       adjustment_number,
       status,
       reason,
       updated_at,
       COALESCE(confirmed_at, cancelled_at, updated_at, created_at) AS occurred_at
     FROM inventory_adjustments
     WHERE location_id = ANY($1::uuid[])
     ORDER BY occurred_at DESC
     LIMIT $2`,
    [locationIds, limit]
  );

  return result.rows;
}

async function findRecentCashEvents(locationId, limit = 5, executor = query) {
  const locationIds = normalizeLocationIds(locationId);
  const result = await executor(
    `SELECT
       cash_closing_id,
       business_date,
       status,
       total_all,
       created_at,
       closed_at,
       updated_at,
       CASE
         WHEN status = 'closed' THEN COALESCE(closed_at, updated_at, created_at)
         ELSE COALESCE(updated_at, created_at)
       END AS occurred_at
     FROM cash_closings
     WHERE location_id = ANY($1::uuid[])
     ORDER BY occurred_at DESC
     LIMIT $2`,
    [locationIds, limit]
  );

  return result.rows;
}

async function findSalesByDepartment(locationId, dateFrom, dateTo, executor = query) {
  const locationIds = normalizeLocationIds(locationId);
  const result = await executor(
    `SELECT
       c.department,
       COUNT(*)::int AS sale_count,
       COALESCE(SUM(s.total_amount), 0)::numeric(12,2) AS total_amount
     FROM sales s
     INNER JOIN customers c ON c.customer_id = s.customer_id
     WHERE s.location_id = ANY($1::uuid[])
       AND s.status = 'confirmed'
       AND c.department IS NOT NULL
       AND c.department <> ''
       AND DATE(s.confirmed_at AT TIME ZONE 'America/Lima') >= $2::date
       AND DATE(s.confirmed_at AT TIME ZONE 'America/Lima') <= $3::date
     GROUP BY c.department
     ORDER BY total_amount DESC`,
    [locationIds, dateFrom, dateTo]
  );

  return result.rows;
}

module.exports = {
  findCommercialActivityByTimeSlot,
  findCommercialActivityByWeekday,
  findCommercialActivityByDay,
  findCommercialActivityAggregate,
  findSalesHeadlineByLocationAndDate,
  findPaymentTotalsByLocationAndDate,
  findPostsalesWindowCounts,
  findPostsalesWindowItems,
  findPendingTransfersCounts,
  findPendingTransfersItems,
  findTransferPendingData,
  findCriticalInventoryCounts,
  findCriticalInventoryItems,
  findRecentSalesEvents,
  findRecentPostsaleEvents,
  findRecentTransferEvents,
  findRecentAdjustmentEvents,
  findRecentCashEvents,
  findSalesByDepartment,
};
