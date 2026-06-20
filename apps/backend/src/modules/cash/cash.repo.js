const { query } = require('../../shared/db');

function appendCashFilters(conditions, values, filters = {}, alias = 'cc') {
  if (filters.locationId) {
    values.push(filters.locationId);
    conditions.push(`${alias}.location_id = $${values.length}`);
  }

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`${alias}.status = $${values.length}`);
  }

  if (filters.startDate) {
    values.push(filters.startDate);
    conditions.push(`${alias}.business_date >= $${values.length}::date`);
  }

  if (filters.endDate) {
    values.push(filters.endDate);
    conditions.push(`${alias}.business_date <= $${values.length}::date`);
  }
}

function buildConsistencySelect(alias = 'cc') {
  return `
    COALESCE(sales_summary.sale_count, 0) AS sale_count,
    COALESCE(sales_summary.grand_total, 0)::numeric(12,2) AS grand_total,
    COALESCE(payment_summary.payment_total, 0)::numeric(12,2) AS payment_total,
    (COALESCE(sales_summary.grand_total, 0) - COALESCE(payment_summary.payment_total, 0))::numeric(12,2) AS difference,
    ABS(COALESCE(sales_summary.grand_total, 0) - COALESCE(payment_summary.payment_total, 0)) < 0.01 AS is_consistent
  `;
}

function buildConsistencyJoins(alias = 'cc') {
  return `
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) AS sale_count,
        COALESCE(SUM(s.total_amount), 0)::numeric(12,2) AS grand_total
      FROM sales s
      WHERE s.location_id = ${alias}.location_id
        AND s.status = 'confirmed'
        AND DATE(s.confirmed_at AT TIME ZONE 'America/Lima') = ${alias}.business_date
    ) sales_summary ON TRUE
    LEFT JOIN LATERAL (
      WITH payment_movements AS (
        SELECT sp.amount AS signed_amount
        FROM sales_payments sp
        INNER JOIN sales s ON s.sale_id = sp.sale_id
        WHERE s.location_id = ${alias}.location_id
          AND s.status = 'confirmed'
          AND DATE(s.confirmed_at AT TIME ZONE 'America/Lima') = ${alias}.business_date

        UNION ALL

        SELECT -spr.amount AS signed_amount
        FROM sales_payment_reversals spr
        WHERE spr.location_id = ${alias}.location_id
          AND DATE(spr.reversed_at AT TIME ZONE 'America/Lima') = ${alias}.business_date
      )
      SELECT COALESCE(SUM(signed_amount), 0)::numeric(12,2) AS payment_total
      FROM payment_movements
    ) payment_summary ON TRUE
  `;
}

function buildCashClosingProjection(alias = 'cc', includeConsistency = false) {
  return `
    ${alias}.cash_closing_id,
    ${alias}.location_id,
    ${alias}.business_date,
    ${alias}.status,
    ${alias}.opened_by,
    ${alias}.closed_by,
    ${alias}.total_cash,
    ${alias}.total_yape,
    ${alias}.total_plin,
    ${alias}.total_transfer,
    ${alias}.total_all,
    ${alias}.notes,
    ${alias}.created_at,
    ${alias}.closed_at,
    ${alias}.updated_at,
    l.name AS location_name,
    ou.full_name AS opened_by_name,
    cu.full_name AS closed_by_name
    ${includeConsistency ? `,${buildConsistencySelect(alias)}` : ''}
  `;
}

async function findCashClosingByLocationAndDate(locationId, dateFrom, dateToOrExecutor, executor) {
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
       ${buildCashClosingProjection('cc')}
     FROM cash_closings cc
     INNER JOIN locations l ON l.location_id = cc.location_id
     LEFT JOIN users ou ON ou.user_id = cc.opened_by
     LEFT JOIN users cu ON cu.user_id = cc.closed_by
     WHERE cc.location_id = $1 AND cc.business_date >= $2 AND cc.business_date <= $3`,
    [locationId, dateFrom, dateEnd]
  );
  return result.rows[0] || null;
}

async function findCashClosingById(cashClosingId) {
  const result = await query(
    `SELECT
       ${buildCashClosingProjection('cc', true)}
     FROM cash_closings cc
     INNER JOIN locations l ON l.location_id = cc.location_id
     LEFT JOIN users ou ON ou.user_id = cc.opened_by
     LEFT JOIN users cu ON cu.user_id = cc.closed_by
     ${buildConsistencyJoins('cc')}
     WHERE cc.cash_closing_id = $1`,
    [cashClosingId]
  );
  return result.rows[0] || null;
}

async function findAllCashClosings(filters = {}) {
  const conditions = [];
  const values = [];

  appendCashFilters(conditions, values, filters, 'cc');

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const limit = Math.min(
    Math.max(Number(filters.limit) || 20, 1),
    50,
  );
  const offset = Math.max(Number(filters.offset) || 0, 0);

  const countResult = await query(
    `SELECT COUNT(*)::int AS total_items
     FROM cash_closings cc
     ${whereClause}`,
    values,
  );
  const totalItems = countResult.rows[0]?.total_items || 0;

  const result = await query(
    `SELECT
       ${buildCashClosingProjection('cc', true)}
     FROM cash_closings cc
     INNER JOIN locations l ON l.location_id = cc.location_id
     LEFT JOIN users ou ON ou.user_id = cc.opened_by
     LEFT JOIN users cu ON cu.user_id = cc.closed_by
     ${buildConsistencyJoins('cc')}
     ${whereClause}
     ORDER BY cc.business_date DESC, cc.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    values
  );
  return { rows: result.rows, totalItems };
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

async function updateCashClosingReopen(cashClosingId, data) {
  const result = await query(
    `UPDATE cash_closings
     SET
       status = 'open',
       reopened_by = $2,
       reopened_at = NOW(),
       reopen_notes = $3
     WHERE cash_closing_id = $1
     RETURNING *`,
    [
      cashClosingId,
      data.reopened_by,
      data.reopen_notes || null,
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
          AND s.status = 'confirmed'
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

async function countSalesByLocationAndDate(locationId, dateFrom, dateToOrExecutor, executor) {
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
    `SELECT COUNT(*) AS sale_count, COALESCE(SUM(total_amount), 0) AS grand_total
     FROM sales
     WHERE location_id = $1
       AND status = 'confirmed'
       AND DATE(confirmed_at AT TIME ZONE 'America/Lima') >= $2::date
       AND DATE(confirmed_at AT TIME ZONE 'America/Lima') <= $3::date`,
    [locationId, dateFrom, dateEnd]
  );
  return result.rows[0];
}

async function countUnconfirmedSalesByLocationAndDate(locationId, businessDate, executor) {
  const exec = typeof executor === "function" ? executor : query;
  const result = await exec(
    `SELECT COUNT(*)::int AS unconfirmed_count
     FROM sales
     WHERE location_id = $1
       AND status != 'confirmed'
       AND DATE(created_at AT TIME ZONE 'America/Lima') = $2::date`,
    [locationId, businessDate]
  );
  return result.rows[0].unconfirmed_count;
}

async function getAdminCashSummary(filters = {}) {
  const conditions = [];
  const values = [];

  appendCashFilters(conditions, values, filters, 'cc');

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const statsResult = await query(
    `WITH filtered_closings AS (
       SELECT
         cc.cash_closing_id,
         cc.location_id,
         l.name AS location_name,
         cc.business_date,
         cc.status,
         COALESCE(cc.total_all, 0)::numeric(12,2) AS total_all
       FROM cash_closings cc
       INNER JOIN locations l ON l.location_id = cc.location_id
       ${whereClause}
     )
     SELECT
       COUNT(*) AS session_count,
       COUNT(*) FILTER (WHERE status = 'open') AS open_count,
       COUNT(*) FILTER (WHERE status = 'closed') AS closed_count,
       COUNT(DISTINCT location_id) FILTER (WHERE status = 'open') AS open_location_count,
       COALESCE(SUM(total_all), 0)::numeric(12,2) AS total_registered
     FROM filtered_closings`,
    values
  );

  const trendResult = await query(
    `WITH filtered_closings AS (
       SELECT
         cc.location_id,
         cc.business_date,
         cc.status,
         COALESCE(cc.total_all, 0)::numeric(12,2) AS total_all
       FROM cash_closings cc
       ${whereClause}
     )
     SELECT
       business_date,
       COUNT(*) AS session_count,
       COUNT(*) FILTER (WHERE status = 'open') AS open_count,
       COUNT(*) FILTER (WHERE status = 'closed') AS closed_count,
       COALESCE(SUM(total_all), 0)::numeric(12,2) AS total_registered
     FROM filtered_closings
     GROUP BY business_date
     ORDER BY business_date ASC`,
    values
  );

  const byLocationResult = await query(
    `WITH filtered_closings AS (
       SELECT
         cc.location_id,
         l.name AS location_name,
         cc.status,
         COALESCE(cc.total_all, 0)::numeric(12,2) AS total_all
       FROM cash_closings cc
       INNER JOIN locations l ON l.location_id = cc.location_id
       ${whereClause}
     )
     SELECT
       location_id,
       location_name,
       COUNT(*) AS session_count,
       COUNT(*) FILTER (WHERE status = 'open') AS open_count,
       COUNT(*) FILTER (WHERE status = 'closed') AS closed_count,
       COALESCE(SUM(total_all), 0)::numeric(12,2) AS total_registered
     FROM filtered_closings
     GROUP BY location_id, location_name
     ORDER BY total_registered DESC, location_name ASC
     LIMIT 12`,
    values
  );

  const openLocationsResult = await query(
    `WITH filtered_closings AS (
       SELECT
         cc.location_id,
         l.name AS location_name,
         cc.status
       FROM cash_closings cc
       INNER JOIN locations l ON l.location_id = cc.location_id
       ${whereClause}
     )
     SELECT
       location_id,
       location_name,
       COUNT(*) AS open_count
     FROM filtered_closings
     WHERE status = 'open'
     GROUP BY location_id, location_name
     ORDER BY open_count DESC, location_name ASC
     LIMIT 10`,
    values
  );

  const inconsistentResult = await query(
    `WITH filtered_closings AS (
       SELECT
         cc.cash_closing_id,
         cc.location_id,
         l.name AS location_name,
         cc.business_date,
         cc.status
       FROM cash_closings cc
       INNER JOIN locations l ON l.location_id = cc.location_id
       ${whereClause}
     )
     SELECT
       fc.cash_closing_id,
       fc.location_id,
       fc.location_name,
       fc.business_date,
       fc.status,
       ${buildConsistencySelect('fc')}
     FROM filtered_closings fc
     ${buildConsistencyJoins('fc')}
     WHERE ABS(COALESCE(sales_summary.grand_total, 0) - COALESCE(payment_summary.payment_total, 0)) >= 0.01
     ORDER BY fc.business_date DESC, fc.location_name ASC
     LIMIT 10`,
    values
  );

  return {
    stats: statsResult.rows[0] || null,
    trend: trendResult.rows,
    by_location: byLocationResult.rows,
    open_locations: openLocationsResult.rows,
    inconsistent_sessions: inconsistentResult.rows,
  };
}

async function findAdminCashSessions(filters = {}) {
  const conditions = [];
  const values = [];

  appendCashFilters(conditions, values, filters, 'cc');

  const page = Math.max(Number(filters.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(filters.pageSize || 20), 1), 50);
  const offset = (page - 1) * pageSize;

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  values.push(pageSize);
  const limitPlaceholder = `$${values.length}`;
  values.push(offset);
  const offsetPlaceholder = `$${values.length}`;

  const result = await query(
    `WITH filtered_closings AS (
       SELECT cc.*
       FROM cash_closings cc
       ${whereClause}
     ),
     paged_closings AS (
       SELECT *
       FROM filtered_closings
       ORDER BY business_date DESC, created_at DESC
       LIMIT ${limitPlaceholder}
       OFFSET ${offsetPlaceholder}
     )
     SELECT
       ${buildCashClosingProjection('pc', true)},
       (SELECT COUNT(*) FROM filtered_closings) AS total_items
     FROM paged_closings pc
     INNER JOIN locations l ON l.location_id = pc.location_id
     LEFT JOIN users ou ON ou.user_id = pc.opened_by
     LEFT JOIN users cu ON cu.user_id = pc.closed_by
     ${buildConsistencyJoins('pc')}
     ORDER BY pc.business_date DESC, pc.created_at DESC`,
    values
  );

  return {
    rows: result.rows,
    totalItems: Number(result.rows[0]?.total_items || 0),
    page,
    pageSize,
  };
}

module.exports = {
  findCashClosingByLocationAndDate,
  findCashClosingById,
  findAllCashClosings,
  insertCashClosing,
  updateCashClosingClose,
  updateCashClosingReopen,
  sumSalesPaymentsByLocationAndDate,
  countSalesByLocationAndDate,
  countUnconfirmedSalesByLocationAndDate,
  getAdminCashSummary,
  findAdminCashSessions,
};
