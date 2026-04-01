const { query } = require('../../shared/db');

async function findActiveUserByUsername(username) {
  const result = await query(
    `
    select
      u.user_id,
      u.full_name,
      u.username,
      u.email,
      u.password_hash,
      u.role_id,
      r.name as role_name
    from users u
    left join roles r on r.role_id = u.role_id
    where u.username = $1
      and u.active = true
    limit 1
    `,
    [username]
  );

  return result.rows[0] || null;
}

async function listPermissionsByRoleId(roleId) {
  const result = await query(
    `
    select p.key
    from role_permissions rp
    join permissions p on p.permission_id = rp.permission_id
    where rp.role_id = $1
    order by p.key asc
    `,
    [roleId]
  );

  return result.rows.map((r) => r.key);
}

async function findActiveUserById(userId) {
  const result = await query(
    `
    select
      u.user_id,
      u.full_name,
      u.username,
      u.email,
      u.role_id,
      r.name as role_name
    from users u
    left join roles r on r.role_id = u.role_id
    where u.user_id = $1
      and u.active = true
    limit 1
    `,
    [userId]
  );

  return result.rows[0] || null;
}

module.exports = {
  findActiveUserByUsername,
  findActiveUserById,
  listPermissionsByRoleId,
};

