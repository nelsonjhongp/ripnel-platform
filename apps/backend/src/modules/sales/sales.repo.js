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
       pv.style_id,
       pv.variant_id,
       pv.sku,
       ps.name AS style_name,
       ps.style_code,
       pv.size_id,
       s.code AS size_code,
       s.name AS size_name,
       s.sort_order AS size_sort_order,
       pv.color_id,
       c.code AS color_code,
       c.name AS color_name,
       i.qty AS stock,
       get_current_style_size_price(pv.style_id, pv.size_id, 'retail', CURRENT_DATE) AS retail_price,
       get_current_style_size_price(pv.style_id, pv.size_id, 'wholesale', CURRENT_DATE) AS wholesale_price
     FROM product_variants pv
     INNER JOIN product_styles ps ON ps.style_id = pv.style_id
     INNER JOIN sizes s ON s.size_id = pv.size_id
     INNER JOIN colors c ON c.color_id = pv.color_id
     INNER JOIN inventory i ON i.variant_id = pv.variant_id AND i.location_id = $1
     WHERE COALESCE(pv.active, true) = true
       AND i.qty > 0
       ${searchCondition}
     ORDER BY ps.name, s.sort_order, s.code, c.code
     LIMIT 100`,
    values
  );

  return result.rows;
}

async function findActiveWholesaleMinQtyRule(executor = query) {
  const result = await executor(
    `SELECT rule_type, min_qty
     FROM pricing_rules
     WHERE rule_type = 'WHOLESALE_MIN_QTY_TOTAL'
       AND active = TRUE
       AND valid_from <= CURRENT_DATE
       AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
     ORDER BY valid_from DESC, updated_at DESC
     LIMIT 1`
  );

  return result.rows[0] || null;
}

async function findAllSales(filters = {}) {
  const conditions = [];
  const values = [];
  const page = Number.isInteger(filters.page) && filters.page > 0 ? filters.page : 1;
  const pageSize = Number.isInteger(filters.pageSize) && filters.pageSize > 0 ? filters.pageSize : 25;
  const offset = (page - 1) * pageSize;
  const sortExpr = `COALESCE(s.confirmed_at, s.created_at)`;
  const businessDateExpr = `DATE(${sortExpr} AT TIME ZONE 'America/Lima')`;
  const cursor = filters.cursor || null;
  const useCursorMode = Boolean(cursor && cursor.saleId && cursor.sortDate);

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
    conditions.push(`s.sale_number ILIKE $${idx}`);
  }

  if (filters.customerQ) {
    values.push(`%${filters.customerQ}%`);
    const idx = values.length;
    conditions.push(`(
      s.customer_name_text ILIKE $${idx}
      OR s.customer_doc_number ILIKE $${idx}
    )`);
  }

  if (filters.userQ) {
    values.push(`%${filters.userQ}%`);
    const idx = values.length;
    conditions.push(`u.full_name ILIKE $${idx}`);
  }

  if (filters.cashStatus) {
    if (filters.cashStatus === 'missing') {
      conditions.push(`cc.cash_closing_id IS NULL`);
    } else {
      values.push(filters.cashStatus);
      conditions.push(`cc.status = $${values.length}`);
    }
  }

  if (filters.documentType) {
    values.push(filters.documentType);
    conditions.push(`s.document_type = $${values.length}`);
  }

  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    conditions.push(`${businessDateExpr} >= $${values.length}::date`);
  }

  if (filters.dateTo) {
    values.push(filters.dateTo);
    conditions.push(`${businessDateExpr} <= $${values.length}::date`);
  }

  if (useCursorMode) {
    values.push(cursor.sortDate);
    values.push(cursor.saleId);
    conditions.push(`(${sortExpr}, s.sale_id) < ($${values.length - 1}::timestamptz, $${values.length}::uuid)`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const fromClause = `FROM sales s
     INNER JOIN locations l ON l.location_id = s.location_id
     INNER JOIN users u ON u.user_id = s.seller_user_id
     LEFT JOIN cash_closings cc
       ON cc.location_id = s.location_id
      AND cc.business_date = ${businessDateExpr}`;

  let totalCount = null;
  let rowsValues = values;
  let limitRef = '';
  let offsetClause = '';

  if (useCursorMode) {
    rowsValues = [...values, pageSize + 1];
    limitRef = `$${rowsValues.length}`;
  } else {
    const countResult = await query(
      `SELECT COUNT(DISTINCT s.sale_id)::int AS total_count
       ${fromClause}
       ${whereClause}`,
      values
    );
    totalCount = Number(countResult.rows[0] && countResult.rows[0].total_count) || 0;
    rowsValues = [...values, pageSize, offset];
    limitRef = `$${rowsValues.length - 1}`;
    const offsetRef = `$${rowsValues.length}`;
    offsetClause = `OFFSET ${offsetRef}`;
  }

  const result = await query(
    `SELECT
       s.sale_id,
       s.sale_number,
       s.location_id,
       s.seller_user_id,
       s.status,
       s.document_type,
       s.customer_id,
       s.customer_name_text,
       s.customer_doc_type,
       s.customer_doc_number,
       s.subtotal_amount,
       s.tax_amount,
       s.sale_discount_amount,
       s.sale_discount_reason,
       s.discounted_at,
       s.total_amount,
       s.currency,
       s.confirmed_at,
       s.created_at,
      ${sortExpr} AS sort_cursor_at,
       l.name AS location_name,
       u.full_name AS seller_name,
       cc.cash_closing_id,
       cc.status AS cash_closing_status
     ${fromClause}
     ${whereClause}
     ORDER BY ${sortExpr} DESC, s.sale_id DESC
     LIMIT ${limitRef}
     ${offsetClause}`,
    rowsValues
  );

  const rows = [...result.rows];
  let hasNext = false;
  let nextCursor = null;

  if (useCursorMode && rows.length > pageSize) {
    hasNext = true;
    rows.splice(pageSize);
  }

  if (useCursorMode && rows.length > 0) {
    const last = rows[rows.length - 1];
    const sortDate = last && last.sort_cursor_at ? new Date(last.sort_cursor_at).toISOString() : null;

    if (sortDate && last.sale_id) {
      nextCursor = Buffer.from(
        JSON.stringify({
          sale_id: last.sale_id,
          sort_date: sortDate,
        })
      ).toString('base64url');
    }
  }

  const cleanedRows = rows.map((row) => {
    const nextRow = { ...row };
    delete nextRow.sort_cursor_at;
    return nextRow;
  });

  if (useCursorMode) {
    return {
      items: cleanedRows,
      pagination: {
        mode: 'cursor',
        cursor: cursor.raw,
        next_cursor: hasNext ? nextCursor : null,
        page: null,
        page_size: pageSize,
        total_count: null,
        total_pages: null,
        has_next: hasNext,
        has_prev: Boolean(cursor.raw),
      },
    };
  }

  const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 1;

  return {
    items: cleanedRows,
    pagination: {
      mode: 'page',
      cursor: null,
      next_cursor: null,
      page,
      page_size: pageSize,
      total_count: totalCount,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
  };
}

async function findCustomerBiAnalytics(filters = {}) {
  const values = [];
  const conditions = [`s.status = 'confirmed'`];
  const sortExpr = `COALESCE(s.confirmed_at, s.created_at)`;
  const businessDateExpr = `DATE(${sortExpr} AT TIME ZONE 'America/Lima')`;

  if (Array.isArray(filters.locationIds) && filters.locationIds.length > 0) {
    values.push(filters.locationIds);
    conditions.push(`s.location_id = ANY($${values.length}::uuid[])`);
  } else if (filters.locationId) {
    values.push(filters.locationId);
    conditions.push(`s.location_id = $${values.length}`);
  }

  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    conditions.push(`${businessDateExpr} >= $${values.length}::date`);
  }

  if (filters.dateTo) {
    values.push(filters.dateTo);
    conditions.push(`${businessDateExpr} <= $${values.length}::date`);
  }

  const limit = Number.isInteger(filters.limit) && filters.limit > 0 ? Math.min(filters.limit, 12) : 8;
  const limitRef = `$${values.length + 1}`;
  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const topCustomersQuery = `
    WITH filtered_sales AS (
      SELECT
        s.sale_id,
        COALESCE(NULLIF(TRIM(s.customer_name_text), ''), 'Cliente general') AS customer_name,
        COALESCE(s.total_amount, 0) AS total_amount
      FROM sales s
      ${whereClause}
    )
    SELECT
      customer_name,
      COUNT(*)::int AS sale_count,
      ROUND(SUM(total_amount)::numeric, 2) AS total_amount
    FROM filtered_sales
    GROUP BY customer_name
    ORDER BY total_amount DESC, sale_count DESC, customer_name ASC
    LIMIT ${limitRef}`;

  const topProductsQuery = `
    WITH filtered_sales AS (
      SELECT s.sale_id
      FROM sales s
      ${whereClause}
    )
    SELECT
      COALESCE(NULLIF(TRIM(ps.name), ''), 'Producto sin nombre') AS product_name,
      COALESCE(NULLIF(TRIM(ps.style_code), ''), '-') AS style_code,
      SUM(sd.quantity)::int AS qty_sold,
      ROUND(SUM(sd.line_total)::numeric, 2) AS total_amount
    FROM filtered_sales fs
    INNER JOIN sales_details sd ON sd.sale_id = fs.sale_id
    INNER JOIN product_variants pv ON pv.variant_id = sd.variant_id
    INNER JOIN product_styles ps ON ps.style_id = pv.style_id
    GROUP BY product_name, style_code
    ORDER BY qty_sold DESC, total_amount DESC, product_name ASC
    LIMIT ${limitRef}`;

  const byDocumentTypeQuery = `
    WITH filtered_sales AS (
      SELECT
        s.document_type,
        COALESCE(s.total_amount, 0) AS total_amount
      FROM sales s
      ${whereClause}
    )
    SELECT
      document_type,
      COUNT(*)::int AS sale_count,
      ROUND(SUM(total_amount)::numeric, 2) AS total_amount
    FROM filtered_sales
    GROUP BY document_type
    ORDER BY sale_count DESC, total_amount DESC`;

  const byWeekdayQuery = `
    WITH filtered_sales AS (
      SELECT
        EXTRACT(ISODOW FROM ${sortExpr})::int AS weekday_number,
        COALESCE(s.total_amount, 0) AS total_amount
      FROM sales s
      ${whereClause}
    )
    SELECT
      weekday_number,
      COUNT(*)::int AS sale_count,
      ROUND(SUM(total_amount)::numeric, 2) AS total_amount
    FROM filtered_sales
    GROUP BY weekday_number
    ORDER BY weekday_number ASC`;

  const queryValues = [...values, limit];

  const [topCustomers, topProducts, byDocumentType, byWeekday] = await Promise.all([
    query(topCustomersQuery, queryValues),
    query(topProductsQuery, queryValues),
    query(byDocumentTypeQuery, values),
    query(byWeekdayQuery, values),
  ]);

  return {
    top_customers: topCustomers.rows,
    top_products: topProducts.rows,
    by_document_type: byDocumentType.rows,
    by_weekday: byWeekday.rows,
  };
}

async function findSaleById(saleId, locationId = null) {
  const values = [saleId];
  let locationCondition = '';

  if (locationId) {
    values.push(locationId);
    locationCondition = ` AND s.location_id = $${values.length}`;
  }

   const result = await query(
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
       s.customer_address_text,
       c.email AS customer_email,
       s.subtotal_amount,
       s.tax_amount,
       s.tax_rate,
       s.sale_discount_amount,
       s.sale_discount_reason,
       s.discounted_by,
       s.discounted_at,
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
     LEFT JOIN customers c ON c.customer_id = s.customer_id
     WHERE s.sale_id = $1
       ${locationCondition}`,
    values
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
       sd.pricing_basis,
       sd.pricing_rule_applied,
       sd.override_reason,
       sd.overridden_by,
       sd.overridden_at,
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

async function findCustomerById(customerId) {
  const result = await query(
    `SELECT
       customer_id,
       internal_code,
       document_type,
       document_number,
       full_name,
       business_name,
       commercial_name,
       address,
       active
     FROM customers
     WHERE customer_id = $1`,
    [customerId]
  );

  return result.rows[0] || null;
}

async function findCustomerByInternalCode(internalCode) {
  const result = await query(
    `SELECT
       customer_id,
       internal_code,
       document_type,
       document_number,
       full_name,
       business_name,
       commercial_name,
       address,
       active
     FROM customers
     WHERE internal_code = $1
     LIMIT 1`,
    [internalCode]
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

async function getCurrentRetailPriceInTx(clientQuery, styleId, sizeId) {
  const result = await clientQuery(
    `SELECT get_current_style_size_price($1, $2, 'retail', CURRENT_DATE) AS price`,
    [styleId, sizeId]
  );

  return result.rows[0] ? result.rows[0].price : null;
}

async function getCurrentWholesalePriceInTx(clientQuery, styleId, sizeId) {
  const result = await clientQuery(
    `SELECT get_current_style_size_price($1, $2, 'wholesale', CURRENT_DATE) AS price`,
    [styleId, sizeId]
  );

  return result.rows[0] ? result.rows[0].price : null;
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

  await clientQuery('SELECT pg_advisory_xact_lock(hashtext($1))', [`saleseq:${prefix}`]);

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
       sale_discount_reason, discounted_by, discounted_at,
       sale_number, confirmed_at, currency
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
     )
     ON CONFLICT (sale_number) DO NOTHING
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
      saleData.sale_discount_reason || null,
      saleData.discounted_by || null,
      saleData.discounted_at || null,
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
       price_type_applied, pricing_basis, pricing_rule_applied,
       override_reason, overridden_by, overridden_at,
       line_subtotal, line_tax, line_total
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING sale_detail_id`,
    [
      detailData.sale_id,
      detailData.variant_id,
      detailData.quantity,
      detailData.unit_price_list,
      detailData.unit_price_final,
      detailData.price_type_applied,
      detailData.pricing_basis,
      detailData.pricing_rule_applied || null,
      detailData.override_reason || null,
      detailData.overridden_by || null,
      detailData.overridden_at || null,
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

async function findVariantsByIds(variantIds) {
  const result = await query(
    `SELECT
       pv.variant_id, pv.sku, pv.active, pv.style_id, pv.size_id,
       ps.name AS style_name, s.code AS size_code
     FROM product_variants pv
     INNER JOIN product_styles ps ON ps.style_id = pv.style_id
     INNER JOIN sizes s ON s.size_id = pv.size_id
     WHERE pv.variant_id = ANY($1::uuid[])`,
    [variantIds]
  );
  return result.rows;
}

async function getInventoryQtysInTx(clientQuery, locationId, variantIds) {
  const result = await clientQuery(
    `SELECT variant_id, qty FROM inventory
     WHERE location_id = $1 AND variant_id = ANY($2::uuid[])
     FOR UPDATE`,
    [locationId, variantIds]
  );
  const map = {};
  for (const row of result.rows) {
    map[row.variant_id] = row.qty;
  }
  return map;
}

async function getCurrentPricesInTx(clientQuery, items) {
  const placeholders = items.map((_, i) => {
    const base = i * 3;
    return `($${base + 1}::uuid, $${base + 2}::uuid, $${base + 3}::uuid)`;
  }).join(', ');
  const values = items.flatMap(item => [item.variant_id, item.style_id, item.size_id]);

  const result = await clientQuery(
    `SELECT
       v.variant_id,
       get_current_style_size_price(v.style_id, v.size_id, 'retail', CURRENT_DATE) AS retail_price,
       get_current_style_size_price(v.style_id, v.size_id, 'wholesale', CURRENT_DATE) AS wholesale_price
     FROM (VALUES ${placeholders}) AS v(variant_id, style_id, size_id)`,
    values
  );
  const map = {};
  for (const row of result.rows) {
    map[row.variant_id] = { retail_price: row.retail_price, wholesale_price: row.wholesale_price };
  }
  return map;
}

async function insertSaleDetails(clientQuery, details) {
  if (details.length === 0) return [];
  const fields = 14;
  const placeholders = details.map((_, i) => {
    const base = i * fields;
    const cols = [];
    for (let j = 0; j < fields; j++) {
      cols.push(`$${base + j + 1}`);
    }
    return `(${cols.join(', ')})`;
  }).join(', ');
  const values = details.flatMap(d => [
    d.sale_id, d.variant_id, d.quantity,
    d.unit_price_list, d.unit_price_final,
    d.price_type_applied, d.pricing_basis, d.pricing_rule_applied || null,
    d.override_reason || null, d.overridden_by || null, d.overridden_at || null,
    d.line_subtotal, d.line_tax, d.line_total,
  ]);
  const result = await clientQuery(
    `INSERT INTO sales_details (
       sale_id, variant_id, quantity,
       unit_price_list, unit_price_final,
       price_type_applied, pricing_basis, pricing_rule_applied,
       override_reason, overridden_by, overridden_at,
       line_subtotal, line_tax, line_total
     ) VALUES ${placeholders}
     RETURNING sale_detail_id`,
    values
  );
  return result.rows;
}

async function decrementInventoryBatch(clientQuery, locationId, items) {
  if (items.length === 0) return;
  const placeholders = items.map((_, i) => {
    const base = i * 2;
    return `($${base + 2}::uuid, $${base + 3}::int)`;
  }).join(', ');
  const values = [locationId, ...items.flatMap(item => [item.variant_id, item.quantity])];
  await clientQuery(
    `UPDATE inventory
     SET qty = qty - v.qty
     FROM (VALUES ${placeholders}) AS v(variant_id, qty)
     WHERE inventory.location_id = $1 AND inventory.variant_id = v.variant_id`,
    values
  );
}

async function insertStockMovements(clientQuery, movements) {
  if (movements.length === 0) return;
  const fields = 8;
  const placeholders = movements.map((_, i) => {
    const base = i * fields;
    const cols = [];
    for (let j = 0; j < fields; j++) {
      cols.push(`$${base + j + 1}`);
    }
    return `(${cols.join(', ')})`;
  }).join(', ');
  const values = movements.flatMap(m => [
    m.location_id, m.variant_id, m.movement_type, m.quantity,
    m.reason, m.reference_type, m.reference_id, m.created_by,
  ]);
  await clientQuery(
    `INSERT INTO stock_movements (
       location_id, variant_id, movement_type, quantity,
       reason, reference_type, reference_id, created_by
     ) VALUES ${placeholders}`,
    values
  );
}

module.exports = {
  findSellableVariants,
  findActiveWholesaleMinQtyRule,
  findAllSales,
  findCustomerBiAnalytics,
  findSaleById,
  findSaleDetailsBySaleId,
  findSalePaymentsBySaleId,
  findLocationById,
  findCustomerById,
  findCustomerByInternalCode,
  findVariantById,
  findVariantsByIds,
  getCurrentRetailPriceInTx,
  getCurrentWholesalePriceInTx,
  getCurrentPricesInTx,
  getInventoryQtyInTx,
  getInventoryQtysInTx,
  nextSaleNumberInTx,
  insertSale,
  insertSaleDetail,
  insertSaleDetails,
  insertSalePayment,
  decrementInventoryInTx,
  decrementInventoryBatch,
  insertStockMovementInTx,
  insertStockMovements,
};
