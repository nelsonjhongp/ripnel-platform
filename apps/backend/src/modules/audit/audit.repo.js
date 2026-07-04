const { query } = require('../../shared/db');

async function listAuditLogs({ tableName, actorUserId, operation, from, to, limit = 100, offset = 0 } = {}) {
  const conditions = [];
  const values = [];
  let paramCount = 0;

  if (tableName) {
    paramCount += 1;
    conditions.push(`table_name = $${paramCount}`);
    values.push(tableName);
  }

  if (operation) {
    paramCount += 1;
    conditions.push(`operation = $${paramCount}`);
    values.push(operation.toUpperCase());
  }

  if (actorUserId) {
    paramCount += 1;
    conditions.push(`actor_user_id = $${paramCount}::uuid`);
    values.push(actorUserId);
  }

  if (from) {
    paramCount += 1;
    conditions.push(`occurred_at >= $${paramCount}::timestamptz`);
    values.push(from);
  }

  if (to) {
    paramCount += 1;
    conditions.push(`occurred_at <= $${paramCount}::timestamptz`);
    values.push(to);
  }

  const where = conditions.length > 0 ? `where ${conditions.join(' and ')}` : '';

  paramCount += 1;
  const limitPlaceholder = `$${paramCount}`;
  paramCount += 1;
  const offsetPlaceholder = `$${paramCount}`;

  const sql = `
    select audit_id, table_name, operation, row_pk,
           old_data, new_data, actor_user_id, actor_role, occurred_at
    from audit_logs
    ${where}
    order by occurred_at desc
    limit ${limitPlaceholder} offset ${offsetPlaceholder}
  `;

  const result = await query(sql, [...values, Math.min(limit, 500), Math.max(offset, 0)]);
  return result.rows;
}

async function countAuditLogs({ tableName, actorUserId, operation, from, to } = {}) {
  const conditions = [];
  const values = [];
  let paramCount = 0;

  if (tableName) {
    paramCount += 1;
    conditions.push(`table_name = $${paramCount}`);
    values.push(tableName);
  }

  if (operation) {
    paramCount += 1;
    conditions.push(`operation = $${paramCount}`);
    values.push(operation.toUpperCase());
  }

  if (actorUserId) {
    paramCount += 1;
    conditions.push(`actor_user_id = $${paramCount}::uuid`);
    values.push(actorUserId);
  }

  if (from) {
    paramCount += 1;
    conditions.push(`occurred_at >= $${paramCount}::timestamptz`);
    values.push(from);
  }

  if (to) {
    paramCount += 1;
    conditions.push(`occurred_at <= $${paramCount}::timestamptz`);
    values.push(to);
  }

  const where = conditions.length > 0 ? `where ${conditions.join(' and ')}` : '';
  const sql = `select count(*)::int as total from audit_logs ${where}`;

  const result = await query(sql, values);
  return result.rows[0]?.total || 0;
}

module.exports = {
  listAuditLogs,
  countAuditLogs,
};