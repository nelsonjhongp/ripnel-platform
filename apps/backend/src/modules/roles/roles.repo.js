const { query } = require('../../shared/db');

async function findAllRoles(executor = query) {
  const result = await executor(
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

async function findAllPermissions(executor = query) {
  const result = await executor(
    `select permission_id, key, description
     from permissions
     order by key asc`
  );

  return result.rows;
}

async function findPermissionsByKeys(permissionKeys, executor = query) {
  if (!permissionKeys.length) {
    return [];
  }

  const result = await executor(
    `select permission_id, key, description
     from permissions
     where key = any($1::text[])
     order by key asc`,
    [permissionKeys]
  );

  return result.rows;
}

async function findRolePermissionsByRoleIds(roleIds, executor = query) {
  if (!roleIds.length) {
    return [];
  }

  const result = await executor(
    `select
       rp.role_id,
       p.permission_id,
       p.key,
       p.description
     from role_permissions rp
     inner join permissions p on p.permission_id = rp.permission_id
     where rp.role_id = any($1::uuid[])
     order by rp.role_id asc, p.key asc`,
    [roleIds]
  );

  return result.rows;
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

async function replaceRolePermissions(roleId, permissionIds, executor = query) {
  await executor('delete from role_permissions where role_id = $1', [roleId]);

  if (!permissionIds.length) {
    return;
  }

  await executor(
    `insert into role_permissions (role_id, permission_id)
     select $1, unnest($2::uuid[])`,
    [roleId, permissionIds]
  );
}

module.exports = {
  findAllRoles,
  findRoleById,
  findAllPermissions,
  findPermissionsByKeys,
  findRolePermissionsByRoleIds,
  insertRole,
  updateRole,
  replaceRolePermissions,
};
