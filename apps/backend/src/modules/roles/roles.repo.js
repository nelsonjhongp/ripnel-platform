const { query } = require('../../shared/db');

async function findAllRoles() {
  const result = await query(
    `select role_id, name, description, active, created_at, updated_at
     from roles
     order by active desc, name asc`
  );

  return result.rows;
}

module.exports = {
  findAllRoles,
};
