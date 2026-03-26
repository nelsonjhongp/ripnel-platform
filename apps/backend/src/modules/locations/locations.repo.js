const { query } = require('../../shared/db');

async function findAllLocations() {
  const result = await query(
    `select location_id, name, code, type, address, active, created_at, updated_at
     from locations
     order by active desc, type asc, name asc`
  );

  return result.rows;
}

async function insertLocation({ name, code, type, address, active }) {
  const result = await query(
    `insert into locations (name, code, type, address, active)
     values ($1, $2, $3, $4, $5)
     returning location_id, name, code, type, address, active, created_at, updated_at`,
    [name, code, type, address, active]
  );

  return result.rows[0];
}

async function findLocationCodesByPrefix(prefix) {
  const result = await query(
    `select code
     from locations
     where code ilike $1`,
    [`${prefix}%`]
  );

  return result.rows.map((row) => row.code).filter(Boolean);
}

module.exports = {
  findAllLocations,
  insertLocation,
  findLocationCodesByPrefix,
};
