const { query } = require('../../shared/db');
const { upsertInventoryQty, insertStockMovement } = require('../inventory/inventory.repo');

function buildEligibleSalesWhereClause(filters = {}) {
  const values = [filters.locationId];
  const conditions = ['s.location_id = $1'];
  const businessDateExpr = `DATE(COALESCE(s.confirmed_at, s.created_at) AT TIME ZONE 'America/Lima')`;

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`s.status = $${values.length}`);
  }

  if (filters.q) {
    values.push(`%${filters.q}%`);
    const idx = values.length;
    conditions.push(
      `(s.sale_number ILIKE $${idx} OR COALESCE(s.customer_name_text, '') ILIKE $${idx})`
    );
  }

  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    conditions.push(`${businessDateExpr} >= $${values.length}::date`);
  }

  if (filters.dateTo) {
    values.push(filters.dateTo);
    conditions.push(`${businessDateExpr} <= $${values.length}::date`);
  }

  values.push(filters.limit || 100);

  return {
    whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
    limitRef: `$${values.length}`,
  };
}

async function findEligibleSales(filters = {}, executor = query) {
  const { whereClause, values, limitRef } = buildEligibleSalesWhereClause(filters);

  const result = await executor(
    `SELECT
       s.sale_id,
       s.location_id,
       s.sale_number,
       s.status,
       s.document_type,
       s.customer_id,
       s.customer_name_text,
       s.customer_doc_type,
       s.customer_doc_number,
       s.subtotal_amount,
       s.tax_amount,
       s.sale_discount_amount,
       s.total_amount,
       s.currency,
       s.confirmed_at,
       s.created_at,
       DATE(COALESCE(s.confirmed_at, s.created_at) AT TIME ZONE 'America/Lima') AS business_date,
       l.name AS location_name,
       u.full_name AS seller_name,
       cc.cash_closing_id,
       cc.status AS cash_status,
       sc.sale_cancellation_id,
       COALESCE(ex.confirmed_exchange_count, 0)::int AS confirmed_exchange_count
     FROM sales s
     INNER JOIN locations l ON l.location_id = s.location_id
     INNER JOIN users u ON u.user_id = s.seller_user_id
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
     ${whereClause}
     ORDER BY COALESCE(s.confirmed_at, s.created_at) DESC, s.created_at DESC
     LIMIT ${limitRef}`,
    values
  );

  return result.rows;
}

async function findSaleSummaryById(saleId, locationId = null, executor = query, options = {}) {
  const values = [saleId];
  let locationCondition = '';

  if (locationId) {
    values.push(locationId);
    locationCondition = ` AND s.location_id = $${values.length}`;
  }

  const lockClause = options.forUpdate ? ' FOR UPDATE OF s' : '';

  const result = await executor(
    `SELECT
       s.sale_id,
       s.location_id,
       s.seller_user_id,
       s.sale_number,
       s.status,
       s.document_type,
       s.customer_id,
       s.customer_name_text,
       s.customer_doc_type,
       s.customer_doc_number,
       s.customer_address_text,
       s.tax_rate,
       s.subtotal_amount,
       s.tax_amount,
       s.sale_discount_amount,
       s.total_amount,
       s.currency,
       s.notes,
       s.confirmed_at,
       s.cancelled_at,
       s.created_at,
       s.updated_at,
       DATE(COALESCE(s.confirmed_at, s.created_at) AT TIME ZONE 'America/Lima') AS business_date,
       l.name AS location_name,
       u.full_name AS seller_name,
       cc.cash_closing_id,
       cc.status AS cash_status,
       COALESCE(ex.confirmed_exchange_count, 0)::int AS confirmed_exchange_count,
       sc.sale_cancellation_id
     FROM sales s
     INNER JOIN locations l ON l.location_id = s.location_id
     INNER JOIN users u ON u.user_id = s.seller_user_id
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
     WHERE s.sale_id = $1
       ${locationCondition}${lockClause}`,
    values
  );

  return result.rows[0] || null;
}

async function findSaleDetailsBySaleId(saleId, executor = query) {
  const result = await executor(
    `SELECT
       sd.sale_detail_id,
       sd.sale_id,
       sd.variant_id,
       sd.quantity,
       sd.unit_price_list,
       sd.unit_price_final,
       sd.price_type_applied,
       sd.pricing_basis,
       sd.line_subtotal,
       sd.line_tax,
       sd.line_total,
       pv.style_id,
       pv.size_id,
       pv.color_id,
       pv.sku,
       ps.name AS style_name,
       ps.style_code,
       s.code AS size_code,
       s.name AS size_name,
       c.code AS color_code,
       c.name AS color_name,
       COALESCE(ex_qty.exchanged_qty, 0)::int AS exchanged_qty
     FROM sales_details sd
     INNER JOIN product_variants pv ON pv.variant_id = sd.variant_id
     INNER JOIN product_styles ps ON ps.style_id = pv.style_id
     INNER JOIN sizes s ON s.size_id = pv.size_id
     INNER JOIN colors c ON c.color_id = pv.color_id
     LEFT JOIN LATERAL (
       SELECT COALESCE(SUM(el.quantity), 0) AS exchanged_qty
       FROM exchange_lines el
       INNER JOIN exchanges e ON e.exchange_id = el.exchange_id
       WHERE el.sale_detail_id = sd.sale_detail_id
         AND el.direction = 'IN'
         AND e.status = 'confirmed'
     ) ex_qty ON TRUE
     WHERE sd.sale_id = $1
     ORDER BY sd.created_at ASC`,
    [saleId]
  );

  return result.rows;
}

async function findSalePaymentsBySaleId(saleId, executor = query) {
  const result = await executor(
    `SELECT
       payment_id,
       sale_id,
       method,
       amount,
       reference,
       paid_at
     FROM sales_payments
     WHERE sale_id = $1
     ORDER BY paid_at ASC`,
    [saleId]
  );

  return result.rows;
}

async function findPaymentReversalsBySaleId(saleId, executor = query) {
  const result = await executor(
    `SELECT
       spr.payment_reversal_id,
       spr.payment_id,
       spr.sale_id,
       spr.location_id,
       spr.method,
       spr.amount,
       spr.reason,
       spr.notes,
       spr.reversed_by,
       spr.reversed_at,
       spr.created_at,
       u.full_name AS reversed_by_name
     FROM sales_payment_reversals spr
     LEFT JOIN users u ON u.user_id = spr.reversed_by
     WHERE spr.sale_id = $1
     ORDER BY spr.reversed_at ASC, spr.created_at ASC`,
    [saleId]
  );

  return result.rows;
}

async function findSaleCancellationBySaleId(saleId, executor = query) {
  const result = await executor(
    `SELECT
       sc.sale_cancellation_id,
       sc.sale_id,
       sc.location_id,
       sc.status,
       sc.reason,
       sc.notes,
       sc.cancelled_by,
       sc.cancelled_at,
       sc.created_at,
       sc.updated_at,
       u.full_name AS cancelled_by_name
     FROM sale_cancellations sc
     LEFT JOIN users u ON u.user_id = sc.cancelled_by
     WHERE sc.sale_id = $1`,
    [saleId]
  );

  return result.rows[0] || null;
}

async function findExchangesBySaleId(saleId, executor = query) {
  const result = await executor(
    `SELECT
       e.exchange_id,
       e.exchange_number,
       e.sale_id,
       e.location_id,
       e.status,
       e.reason,
       e.notes,
       e.original_total,
       e.replacement_total,
       e.difference_amount,
       e.settlement_type,
       e.settlement_payment_id,
       e.created_by,
       e.confirmed_by,
       e.cancelled_by,
       e.created_at,
       e.confirmed_at,
       e.cancelled_at,
       e.updated_at,
       cu.full_name AS created_by_name,
       fu.full_name AS confirmed_by_name,
       xu.full_name AS cancelled_by_name
     FROM exchanges e
     LEFT JOIN users cu ON cu.user_id = e.created_by
     LEFT JOIN users fu ON fu.user_id = e.confirmed_by
     LEFT JOIN users xu ON xu.user_id = e.cancelled_by
     WHERE e.sale_id = $1
     ORDER BY COALESCE(e.confirmed_at, e.created_at) DESC, e.created_at DESC`,
    [saleId]
  );

  return result.rows;
}

async function findExchangeLinesBySaleId(saleId, executor = query) {
  const result = await executor(
    `SELECT
       el.exchange_line_id,
       el.exchange_id,
       el.direction,
       el.variant_id,
       el.quantity,
       el.unit_reference_price,
       el.unit_price_list,
       el.unit_price_final,
       el.line_subtotal,
       el.line_tax,
       el.line_total,
       el.price_source,
       el.notes,
       el.sale_detail_id,
       pv.sku,
       pv.style_id,
       pv.size_id,
       pv.color_id,
       ps.name AS style_name,
       ps.style_code,
       s.code AS size_code,
       s.name AS size_name,
       c.code AS color_code,
       c.name AS color_name
     FROM exchange_lines el
     INNER JOIN exchanges e ON e.exchange_id = el.exchange_id
     INNER JOIN product_variants pv ON pv.variant_id = el.variant_id
     INNER JOIN product_styles ps ON ps.style_id = pv.style_id
     INNER JOIN sizes s ON s.size_id = pv.size_id
     INNER JOIN colors c ON c.color_id = pv.color_id
     WHERE e.sale_id = $1
     ORDER BY e.created_at DESC, el.exchange_line_id ASC`,
    [saleId]
  );

  return result.rows;
}

async function findVariantById(variantId, executor = query) {
  const result = await executor(
    `SELECT
       pv.variant_id,
       pv.sku,
       pv.active,
       pv.style_id,
       pv.size_id,
       pv.color_id,
       ps.name AS style_name,
       ps.style_code,
       s.code AS size_code,
       s.name AS size_name,
       c.code AS color_code,
       c.name AS color_name
     FROM product_variants pv
     INNER JOIN product_styles ps ON ps.style_id = pv.style_id
     INNER JOIN sizes s ON s.size_id = pv.size_id
     INNER JOIN colors c ON c.color_id = pv.color_id
     WHERE pv.variant_id = $1`,
    [variantId]
  );

  return result.rows[0] || null;
}

async function getCurrentRetailPriceInTx(executor, styleId, sizeId) {
  const result = await executor(
    `SELECT get_current_style_size_price($1, $2, 'retail', CURRENT_DATE) AS price`,
    [styleId, sizeId]
  );

  return result.rows[0] ? result.rows[0].price : null;
}

async function getInventoryQtyInTx(executor, locationId, variantId, options = {}) {
  const lockClause = options.forUpdate ? ' FOR UPDATE' : '';
  const result = await executor(
    `SELECT qty
     FROM inventory
     WHERE location_id = $1
       AND variant_id = $2${lockClause}`,
    [locationId, variantId]
  );

  return result.rows[0] ? Number(result.rows[0].qty) : 0;
}

async function findCashClosingByLocationAndDate(locationId, businessDate, executor = query) {
  const result = await executor(
    `SELECT
       cash_closing_id,
       location_id,
       business_date,
       status,
       opened_by,
       closed_by,
       total_cash,
       total_yape,
       total_plin,
       total_transfer,
       total_all,
       notes,
       created_at,
       closed_at,
       updated_at
     FROM cash_closings
     WHERE location_id = $1
       AND business_date = $2`,
    [locationId, businessDate]
  );

  return result.rows[0] || null;
}

async function nextExchangeNumberInTx(executor) {
  const result = await executor(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(exchange_number FROM 4) AS INT)), 0) + 1 AS next_seq
     FROM exchanges
     WHERE exchange_number ~ '^EX-[0-9]{6}$'`
  );

  return `EX-${String(result.rows[0].next_seq || 1).padStart(6, '0')}`;
}

async function insertExchange(payload, executor = query) {
  const result = await executor(
    `INSERT INTO exchanges (
       exchange_number,
       sale_id,
       location_id,
       status,
       reason,
       notes,
       original_total,
       replacement_total,
       difference_amount,
       settlement_type,
       created_by,
       confirmed_by,
       confirmed_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
     RETURNING
       exchange_id,
       exchange_number,
       sale_id,
       location_id,
       status,
       reason,
       notes,
       original_total,
       replacement_total,
       difference_amount,
       settlement_type,
       settlement_payment_id,
       created_by,
       confirmed_by,
       cancelled_by,
       created_at,
       confirmed_at,
       cancelled_at,
       updated_at`,
    [
      payload.exchange_number,
      payload.sale_id,
      payload.location_id,
      payload.status,
      payload.reason,
      payload.notes,
      payload.original_total ?? 0,
      payload.replacement_total ?? 0,
      payload.difference_amount ?? 0,
      payload.settlement_type || 'none',
      payload.created_by,
      payload.confirmed_by,
    ]
  );

  return result.rows[0] || null;
}

async function insertExchangeLine(payload, executor = query) {
  const result = await executor(
    `INSERT INTO exchange_lines (
       exchange_id,
       direction,
       variant_id,
       quantity,
       unit_reference_price,
       unit_price_list,
       unit_price_final,
       line_subtotal,
       line_tax,
       line_total,
       price_source,
       notes,
       sale_detail_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING
       exchange_line_id,
       exchange_id,
       direction,
       variant_id,
       quantity,
       unit_reference_price,
       unit_price_list,
       unit_price_final,
       line_subtotal,
       line_tax,
       line_total,
       price_source,
       notes,
       sale_detail_id`,
    [
      payload.exchange_id,
      payload.direction,
      payload.variant_id,
      payload.quantity,
      payload.unit_reference_price,
      payload.unit_price_list ?? null,
      payload.unit_price_final ?? null,
      payload.line_subtotal ?? 0,
      payload.line_tax ?? 0,
      payload.line_total ?? 0,
      payload.price_source || null,
      payload.notes,
      payload.sale_detail_id || null,
    ]
  );

  return result.rows[0] || null;
}

async function updateExchangeSettlementPayment(exchangeId, paymentId, executor = query) {
  const result = await executor(
    `UPDATE exchanges
     SET
       settlement_payment_id = $2,
       updated_at = CURRENT_TIMESTAMP
     WHERE exchange_id = $1
     RETURNING
       exchange_id,
       settlement_payment_id`,
    [exchangeId, paymentId]
  );

  return result.rows[0] || null;
}

async function cancelSaleInTx(saleId, cancelledBy, executor = query) {
  const result = await executor(
    `UPDATE sales
     SET
       status = 'cancelled',
       cancelled_by = $2,
       cancelled_at = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP
     WHERE sale_id = $1
     RETURNING
       sale_id,
       status,
       cancelled_by,
       cancelled_at,
       updated_at`,
    [saleId, cancelledBy]
  );

  return result.rows[0] || null;
}

async function insertSaleCancellation(payload, executor = query) {
  const result = await executor(
    `INSERT INTO sale_cancellations (
       sale_id,
       location_id,
       status,
       reason,
       notes,
       cancelled_by
     ) VALUES ($1, $2, 'confirmed', $3, $4, $5)
     RETURNING
       sale_cancellation_id,
       sale_id,
       location_id,
       status,
       reason,
       notes,
       cancelled_by,
       cancelled_at,
       created_at,
       updated_at`,
    [
      payload.sale_id,
      payload.location_id,
      payload.reason,
      payload.notes,
      payload.cancelled_by,
    ]
  );

  return result.rows[0] || null;
}

async function insertPaymentReversal(payload, executor = query) {
  const result = await executor(
    `INSERT INTO sales_payment_reversals (
       payment_id,
       sale_id,
       location_id,
       method,
       amount,
       reason,
       notes,
       reversed_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING
       payment_reversal_id,
       payment_id,
       sale_id,
       location_id,
       method,
       amount,
       reason,
       notes,
       reversed_by,
       reversed_at,
       created_at,
       updated_at`,
    [
      payload.payment_id,
      payload.sale_id,
      payload.location_id,
      payload.method,
      payload.amount,
      payload.reason,
      payload.notes,
      payload.reversed_by,
    ]
  );

  return result.rows[0] || null;
}

module.exports = {
  findEligibleSales,
  findSaleSummaryById,
  findSaleDetailsBySaleId,
  findSalePaymentsBySaleId,
  findPaymentReversalsBySaleId,
  findSaleCancellationBySaleId,
  findExchangesBySaleId,
  findExchangeLinesBySaleId,
  findVariantById,
  getCurrentRetailPriceInTx,
  getInventoryQtyInTx,
  findCashClosingByLocationAndDate,
  nextExchangeNumberInTx,
  insertExchange,
  insertExchangeLine,
  updateExchangeSettlementPayment,
  cancelSaleInTx,
  insertSaleCancellation,
  insertPaymentReversal,
  upsertInventoryQty,
  insertStockMovement,
};
