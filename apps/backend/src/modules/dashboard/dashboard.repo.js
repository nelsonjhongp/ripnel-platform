const { query } = require('../../shared/db');

async function findSalesHeadlineByLocationAndDate(locationId, businessDate, executor = query) {
  const result = await executor(
    `SELECT
       COUNT(*)::int AS sale_count,
       COALESCE(SUM(total_amount), 0)::numeric(12,2) AS total_amount,
       MAX(confirmed_at) AS last_confirmed_at
     FROM sales
     WHERE location_id = $1
       AND status = 'confirmed'
       AND DATE(confirmed_at AT TIME ZONE 'America/Lima') = $2::date`,
    [locationId, businessDate]
  );

  return result.rows[0] || null;
}

async function findPaymentTotalsByLocationAndDate(locationId, businessDate, executor = query) {
  const result = await executor(
    `WITH payment_movements AS (
       SELECT
         sp.method,
         sp.amount AS signed_amount
       FROM sales_payments sp
       INNER JOIN sales s ON s.sale_id = sp.sale_id
       WHERE s.location_id = $1
         AND s.status = 'confirmed'
         AND DATE(s.confirmed_at AT TIME ZONE 'America/Lima') = $2::date

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
       COALESCE(SUM(signed_amount), 0)::numeric(12,2) AS total
     FROM payment_movements
     GROUP BY method`,
    [locationId, businessDate]
  );

  return result.rows;
}

async function findReceiptQueueCounts(locationId, executor = query) {
  const result = await executor(
    `WITH receipt_queue AS (
       SELECT
         CASE
           WHEN sr.sales_receipt_id IS NULL THEN 'missing'
           WHEN sr.sunat_status = 'pending' THEN 'pending'
           WHEN sr.sunat_status = 'error' THEN 'error'
           ELSE 'resolved'
         END AS queue_status
       FROM sales s
       LEFT JOIN sales_receipts sr ON sr.sale_id = s.sale_id
       WHERE s.location_id = $1
         AND s.status = 'confirmed'
         AND s.document_type IN ('boleta', 'factura')
     )
     SELECT
       COUNT(*) FILTER (WHERE queue_status IN ('missing', 'pending', 'error'))::int AS open_count,
       COUNT(*) FILTER (WHERE queue_status = 'missing')::int AS missing_count,
       COUNT(*) FILTER (WHERE queue_status = 'pending')::int AS pending_count,
       COUNT(*) FILTER (WHERE queue_status = 'error')::int AS error_count
     FROM receipt_queue`,
    [locationId]
  );

  return result.rows[0] || null;
}

async function findReceiptQueueItems(locationId, limit = 5, executor = query) {
  const result = await executor(
    `SELECT
       s.sale_id,
       s.sale_number,
       s.document_type,
       s.customer_name_text,
       s.total_amount,
       s.currency,
       COALESCE(sr.updated_at, s.confirmed_at, s.created_at) AS queued_at,
       CASE
         WHEN sr.sales_receipt_id IS NULL THEN 'missing'
         WHEN sr.sunat_status = 'pending' THEN 'pending'
         WHEN sr.sunat_status = 'error' THEN 'error'
         ELSE 'resolved'
       END AS queue_status,
       sr.sunat_message
     FROM sales s
     LEFT JOIN sales_receipts sr ON sr.sale_id = s.sale_id
     WHERE s.location_id = $1
       AND s.status = 'confirmed'
       AND s.document_type IN ('boleta', 'factura')
       AND (
         sr.sales_receipt_id IS NULL
         OR sr.sunat_status IN ('pending', 'error')
       )
     ORDER BY COALESCE(sr.updated_at, s.confirmed_at, s.created_at) DESC
     LIMIT $2`,
    [locationId, limit]
  );

  return result.rows;
}

async function findPostsalesWindowCounts(
  locationId,
  businessDate,
  lookbackDays = 14,
  executor = query
) {
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
       WHERE s.location_id = $1
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
    [locationId, businessDate, lookbackDays]
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
       WHERE s.location_id = $1
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
    [locationId, businessDate, lookbackDays, limit]
  );

  return result.rows;
}

async function findPendingTransfersCounts(locationId, executor = query) {
  const result = await executor(
    `SELECT
       COUNT(*) FILTER (
         WHERE to_location_id = $1
           AND status = 'shipped'
       )::int AS pending_receipts_count,
       COUNT(*) FILTER (
         WHERE from_location_id = $1
           AND status = 'draft'
       )::int AS draft_outgoing_count
     FROM stock_transfers`,
    [locationId]
  );

  return result.rows[0] || null;
}

async function findPendingTransfersItems(locationId, limit = 5, executor = query) {
  const result = await executor(
    `SELECT
       st.transfer_id,
       st.transfer_number,
       st.status,
       st.from_location_id,
       lf.name AS from_location_name,
       st.to_location_id,
       lt.name AS to_location_name,
       st.shipped_at,
       st.updated_at,
       COALESCE(SUM(stl.qty_shipped), 0)::int AS qty_shipped_total
     FROM stock_transfers st
     INNER JOIN locations lf ON lf.location_id = st.from_location_id
     INNER JOIN locations lt ON lt.location_id = st.to_location_id
     LEFT JOIN stock_transfer_lines stl ON stl.transfer_id = st.transfer_id
     WHERE st.to_location_id = $1
       AND st.status = 'shipped'
     GROUP BY
       st.transfer_id,
       st.transfer_number,
       st.status,
       st.from_location_id,
       lf.name,
       st.to_location_id,
       lt.name,
       st.shipped_at,
       st.updated_at
     ORDER BY COALESCE(st.shipped_at, st.updated_at) DESC
     LIMIT $2`,
    [locationId, limit]
  );

  return result.rows;
}

async function findCriticalInventoryCounts(locationId, lowStockThreshold = 3, executor = query) {
  const result = await executor(
    `SELECT
       COUNT(*) FILTER (WHERE qty = 0)::int AS zero_stock_count,
       COUNT(*) FILTER (WHERE qty > 0 AND qty <= $2)::int AS low_stock_count
     FROM inventory
     WHERE location_id = $1`,
    [locationId, lowStockThreshold]
  );

  return result.rows[0] || null;
}

async function findCriticalInventoryItems(
  locationId,
  lowStockThreshold = 3,
  limit = 6,
  executor = query
) {
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
     WHERE i.location_id = $1
       AND i.qty <= $2
     ORDER BY i.qty ASC, ps.style_name ASC, s.sort_order ASC, c.name ASC
     LIMIT $3`,
    [locationId, lowStockThreshold, limit]
  );

  return result.rows;
}

async function findRecentSalesEvents(locationId, limit = 5, executor = query) {
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
     WHERE location_id = $1
       AND status = 'confirmed'
     ORDER BY confirmed_at DESC
     LIMIT $2`,
    [locationId, limit]
  );

  return result.rows;
}

async function findRecentReceiptEvents(locationId, limit = 5, executor = query) {
  const result = await executor(
    `SELECT
       s.sale_id,
       s.sale_number,
       s.document_type,
       s.customer_name_text,
       CASE
         WHEN sr.sales_receipt_id IS NULL THEN 'missing'
         WHEN sr.sunat_status = 'pending' THEN 'pending'
         WHEN sr.sunat_status = 'error' THEN 'error'
         ELSE 'resolved'
       END AS queue_status,
       sr.sunat_message,
       COALESCE(sr.updated_at, s.confirmed_at, s.created_at) AS occurred_at
     FROM sales s
     LEFT JOIN sales_receipts sr ON sr.sale_id = s.sale_id
     WHERE s.location_id = $1
       AND s.status = 'confirmed'
       AND s.document_type IN ('boleta', 'factura')
       AND (
         sr.sales_receipt_id IS NULL
         OR sr.sunat_status IN ('pending', 'error')
       )
     ORDER BY COALESCE(sr.updated_at, s.confirmed_at, s.created_at) DESC
     LIMIT $2`,
    [locationId, limit]
  );

  return result.rows;
}

async function findRecentPostsaleEvents(locationId, limit = 5, executor = query) {
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
       WHERE sc.location_id = $1

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
       WHERE e.location_id = $1
         AND e.status = 'confirmed'
     ) events
     ORDER BY occurred_at DESC
     LIMIT $2`,
    [locationId, limit]
  );

  return result.rows;
}

async function findRecentTransferEvents(locationId, limit = 5, executor = query) {
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
       COALESCE(st.received_at, st.shipped_at, st.cancelled_at, st.updated_at, st.created_at) AS occurred_at
     FROM stock_transfers st
     INNER JOIN locations lf ON lf.location_id = st.from_location_id
     INNER JOIN locations lt ON lt.location_id = st.to_location_id
     WHERE st.from_location_id = $1
        OR st.to_location_id = $1
     ORDER BY occurred_at DESC
     LIMIT $2`,
    [locationId, limit]
  );

  return result.rows;
}

async function findRecentAdjustmentEvents(locationId, limit = 5, executor = query) {
  const result = await executor(
    `SELECT
       adjustment_id,
       adjustment_number,
       status,
       reason,
       updated_at,
       COALESCE(confirmed_at, cancelled_at, updated_at, created_at) AS occurred_at
     FROM inventory_adjustments
     WHERE location_id = $1
     ORDER BY occurred_at DESC
     LIMIT $2`,
    [locationId, limit]
  );

  return result.rows;
}

async function findRecentCashEvents(locationId, limit = 5, executor = query) {
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
     WHERE location_id = $1
     ORDER BY occurred_at DESC
     LIMIT $2`,
    [locationId, limit]
  );

  return result.rows;
}

module.exports = {
  findSalesHeadlineByLocationAndDate,
  findPaymentTotalsByLocationAndDate,
  findReceiptQueueCounts,
  findReceiptQueueItems,
  findPostsalesWindowCounts,
  findPostsalesWindowItems,
  findPendingTransfersCounts,
  findPendingTransfersItems,
  findCriticalInventoryCounts,
  findCriticalInventoryItems,
  findRecentSalesEvents,
  findRecentReceiptEvents,
  findRecentPostsaleEvents,
  findRecentTransferEvents,
  findRecentAdjustmentEvents,
  findRecentCashEvents,
};
