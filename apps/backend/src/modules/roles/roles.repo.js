const { query } = require('../../shared/db');

async function findAllRoles() {
  const result = await query(
    `select role_id, name, description, active, created_at, updated_at
     from roles
     order by active desc, name asc`
  );

  return result.rows;
}

async function findRoleById(roleId, executor = query) {
  const result = await executor(
    `select role_id, name, description, active, created_at, updated_at
     from roles
     where role_id = $1`,
    [roleId]
  );

  return result.rows[0] || null;
}

async function insertRole({ name, description, active }, executor = query) {
  const result = await executor(
    `insert into roles (name, description, active)
     values ($1, $2, $3)
     returning role_id, name, description, active, created_at, updated_at`,
    [name, description, active]
  );

  return result.rows[0] || null;
}

async function updateRole({ roleId, name, description, active }, executor = query) {
  const result = await executor(
    `update roles
     set
       name = $2,
       description = $3,
       active = $4,
       updated_at = current_timestamp
     where role_id = $1
     returning role_id, name, description, active, created_at, updated_at`,
    [roleId, name, description, active]
  );

  return result.rows[0] || null;
}

module.exports = {
  findAllRoles,
  findRoleById,
  insertRole,
  updateRole,
};
