const { query } = require('../../shared/db');

async function findAllCatalogItems(config) {
  const result = await query(
    `select ${config.selectColumns.join(', ')}
     from ${config.table}
     order by active desc, ${config.orderBy}`
  );

  return result.rows;
}

async function insertCatalogItem(config, payload) {
  const columns = Object.keys(payload);
  const values = Object.values(payload);
  const placeholders = columns.map((_, index) => `$${index + 1}`);

  const result = await query(
    `insert into ${config.table} (${columns.join(', ')})
     values (${placeholders.join(', ')})
     returning ${config.selectColumns.join(', ')}`,
    values
  );

  return result.rows[0];
}

async function findCatalogItemById(config, itemId) {
  const result = await query(
    `select ${config.selectColumns.join(', ')}
     from ${config.table}
     where ${config.idField} = $1`,
    [itemId]
  );

  return result.rows[0] || null;
}

async function findCatalogCodesByPrefix(config, prefix) {
  if (!config.hasCode) {
    return [];
  }

  const result = await query(
    `select code
     from ${config.table}
     where code ilike $1`,
    [`${prefix}%`]
  );

  return result.rows.map((row) => row.code).filter(Boolean);
}

async function updateCatalogItem(config, itemId, payload) {
  const columns = Object.keys(payload);
  const values = Object.values(payload);
  const assignments = columns.map((column, index) => `${column} = $${index + 2}`);

  assignments.push(`updated_at = current_timestamp`);

  const result = await query(
    `update ${config.table}
     set ${assignments.join(', ')}
     where ${config.idField} = $1
     returning ${config.selectColumns.join(', ')}`,
    [itemId, ...values]
  );

  return result.rows[0] || null;
}

module.exports = {
  findAllCatalogItems,
  insertCatalogItem,
  findCatalogItemById,
  findCatalogCodesByPrefix,
  updateCatalogItem,
};
