const { query } = require('../../shared/db');

async function findSellableVariants(locationId, searchQuery) {
  const values = [locationId];
  let searchCondition = '';

  if (searchQuery) {
    values.push(`%${searchQuery}%`);
    const idx = values.length;
    searchCondition = `AND (
      pv.sku ILIKE $${idx}
      OR ps.name ILIKE $${idx}
      OR ps.style_code ILIKE $${idx}
      OR s.code ILIKE $${idx}
      OR c.code ILIKE $${idx}
    )`;
  }

  const result = await query(
    `SELECT
       pv.variant_id,
       pv.sku,
       ps.name AS style_name,
       ps.style_code,
       s.code AS size_code,
       s.name AS size_name,
       c.code AS color_code,
       c.name AS color_name,
       i.qty AS stock,
       COALESCE(ssp.price, 0) AS retail_price
     FROM product_variants pv
     INNER JOIN product_styles ps ON ps.style_id = pv.style_id
     INNER JOIN sizes s ON s.size_id = pv.size_id
     INNER JOIN colors c ON c.color_id = pv.color_id
     INNER JOIN inventory i ON i.variant_id = pv.variant_id AND i.location_id = $1
     LEFT JOIN style_size_prices ssp
       ON ssp.style_id = pv.style_id
       AND ssp.size_id = pv.size_id
       AND ssp.price_type = 'retail'
       AND ssp.active = true
       AND (ssp.end_date IS NULL OR ssp.end_date >= CURRENT_DATE)
     WHERE COALESCE(pv.active, true) = true
       AND i.qty > 0
       ${searchCondition}
     ORDER BY ps.name, s.sort_order, s.code, c.code
     LIMIT 100`,
    values
  );

  return result.rows;
}

async function findAllSales(filters = {}) {
  const conditions = [];
  const values = [];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`s.status = $${values.length}`);
  }

  if (filters.locationId) {
    values.push(filters.locationId);
    conditions.push(`s.location_id = $${values.length}`);
  }

  if (filters.q) {
    values.push(`%${filters.q}%`);
    const idx = values.length;
    conditions.push(`(s.sale_number ILIKE $${idx} OR s.customer_name_text ILIKE $${idx})`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT
       s.sale_id,
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
       l.name AS location_name,
       u.full_name AS seller_name
     FROM sales s
     INNER JOIN locations l ON l.location_id = s.location_id
     INNER JOIN users u ON u.user_id = s.seller_user_id
     ${whereClause}
     ORDER BY s.created_at DESC
     LIMIT 200`,
    values
  );

  return result.rows;
}

async function findSaleById(saleId) {
  const result = await query(
    `SELECT
       s.sale_id,
       s.sale_number,
       s.status,
       s.document_type,
       s.customer_id,
       s.customer_name_text,
       s.customer_doc_type,
       s.customer_doc_number,
       s.customer_address_text,
       s.subtotal_amount,
       s.tax_amount,
       s.tax_rate,
       s.sale_discount_amount,
       s.total_amount,
       s.currency,
       s.notes,
       s.confirmed_at,
       s.created_at,
       s.updated_at,
       l.name AS location_name,
       u.full_name AS seller_name
     FROM sales s
     INNER JOIN locations l ON l.location_id = s.location_id
     INNER JOIN users u ON u.user_id = s.seller_user_id
     WHERE s.sale_id = $1`,
    [saleId]
  );

  return result.rows[0] || null;
}

async function findSaleDetailsBySaleId(saleId) {
  const result = await query(
    `SELECT
       sd.sale_detail_id,
       sd.variant_id,
       pv.sku,
       ps.name AS style_name,
       ps.style_code,
       s.code AS size_code,
       s.name AS size_name,
       c.code AS color_code,
       c.name AS color_name,
       sd.quantity,
       sd.unit_price_list,
       sd.unit_price_final,
       sd.price_type_applied,
       sd.line_subtotal,
       sd.line_tax,
       sd.line_total
     FROM sales_details sd
     INNER JOIN product_variants pv ON pv.variant_id = sd.variant_id
     INNER JOIN product_styles ps ON ps.style_id = pv.style_id
     INNER JOIN sizes s ON s.size_id = pv.size_id
     INNER JOIN colors c ON c.color_id = pv.color_id
     WHERE sd.sale_id = $1
     ORDER BY sd.created_at`,
    [saleId]
  );

  return result.rows;
}

async function findSalePaymentsBySaleId(saleId) {
  const result = await query(
    `SELECT payment_id, method, amount, reference, paid_at
     FROM sales_payments
     WHERE sale_id = $1
     ORDER BY paid_at`,
    [saleId]
  );

  return result.rows;
}

async function findLocationById(locationId) {
  const result = await query(
    `SELECT location_id, name FROM locations WHERE location_id = $1`,
    [locationId]
  );

  return result.rows[0] || null;
}

async function findVariantById(variantId) {
  const result = await query(
    `SELECT
       pv.variant_id,
       pv.sku,
      pv.active,
       pv.style_id,
       pv.size_id,
       ps.name AS style_name,
       s.code AS size_code
     FROM product_variants pv
     INNER JOIN product_styles ps ON ps.style_id = pv.style_id
     INNER JOIN sizes s ON s.size_id = pv.size_id
     WHERE pv.variant_id = $1`,
    [variantId]
  );

  return result.rows[0] || null;
}

async function getInventoryQtyInTx(clientQuery, locationId, variantId) {
  const result = await clientQuery(
    `SELECT qty FROM inventory WHERE location_id = $1 AND variant_id = $2 FOR UPDATE`,
    [locationId, variantId]
  );

  return result.rows[0] ? result.rows[0].qty : 0;
}

async function nextSaleNumberInTx(clientQuery, documentType) {
  const prefixMap = { proforma: 'P', boleta: 'B', factura: 'F', none: 'N' };
  const prefix = prefixMap[documentType] || 'N';

  const result = await clientQuery(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(sale_number FROM 3) AS INT)), 0) + 1 AS next_seq
     FROM sales
     WHERE sale_number LIKE $1`,
    [`${prefix}-%`]
  );

  const seq = result.rows[0].next_seq;
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

async function insertSale(clientQuery, saleData) {
  const result = await clientQuery(
    `INSERT INTO sales (
       location_id, seller_user_id, customer_id,
       customer_name_text, customer_doc_type, customer_doc_number, customer_address_text,
       document_type, status, notes,
       tax_rate, subtotal_amount, sale_discount_amount, tax_amount, total_amount,
       sale_number, confirmed_at, currency
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
     )
     RETURNING sale_id`,
    [
      saleData.location_id,
      saleData.seller_user_id,
      saleData.customer_id,
      saleData.customer_name_text,
      saleData.customer_doc_type,
      saleData.customer_doc_number,
      saleData.customer_address_text,
      saleData.document_type,
      saleData.status,
      saleData.notes,
      saleData.tax_rate,
      saleData.subtotal_amount,
      saleData.sale_discount_amount,
      saleData.tax_amount,
      saleData.total_amount,
      saleData.sale_number,
      saleData.confirmed_at,
      saleData.currency,
    ]
  );

  return result.rows[0];
}

async function insertSaleDetail(clientQuery, detailData) {
  const result = await clientQuery(
    `INSERT INTO sales_details (
       sale_id, variant_id, quantity,
       unit_price_list, unit_price_final,
       price_type_applied, pricing_basis,
       line_subtotal, line_tax, line_total
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING sale_detail_id`,
    [
      detailData.sale_id,
      detailData.variant_id,
      detailData.quantity,
      detailData.unit_price_list,
      detailData.unit_price_final,
      detailData.price_type_applied,
      detailData.pricing_basis,
      detailData.line_subtotal,
      detailData.line_tax,
      detailData.line_total,
    ]
  );

  return result.rows[0];
}

async function insertSalePayment(clientQuery, paymentData) {
  const result = await clientQuery(
    `INSERT INTO sales_payments (sale_id, method, amount, reference)
     VALUES ($1, $2, $3, $4)
     RETURNING payment_id`,
    [paymentData.sale_id, paymentData.method, paymentData.amount, paymentData.reference]
  );

  return result.rows[0];
}

async function decrementInventoryInTx(clientQuery, locationId, variantId, qty) {
  await clientQuery(
    `UPDATE inventory SET qty = qty - $3 WHERE location_id = $1 AND variant_id = $2`,
    [locationId, variantId, qty]
  );
}

async function insertStockMovementInTx(clientQuery, movementData) {
  await clientQuery(
    `INSERT INTO stock_movements (
       location_id, variant_id, movement_type, quantity,
       reason, reference_type, reference_id, created_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      movementData.location_id,
      movementData.variant_id,
      movementData.movement_type,
      movementData.quantity,
      movementData.reason,
      movementData.reference_type,
      movementData.reference_id,
      movementData.created_by,
    ]
  );
}

module.exports = {
  findSellableVariants,
  findAllSales,
  findSaleById,
  findSaleDetailsBySaleId,
  findSalePaymentsBySaleId,
  findLocationById,
  findVariantById,
  getInventoryQtyInTx,
  nextSaleNumberInTx,
  insertSale,
  insertSaleDetail,
  insertSalePayment,
  decrementInventoryInTx,
  insertStockMovementInTx,
};
