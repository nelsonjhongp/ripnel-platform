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
      u.must_change_password,
      u.password_changed_at,
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
      u.must_change_password,
      u.password_changed_at,
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

async function findActiveUserWithPasswordById(userId) {
  const result = await query(
    `
    select
      u.user_id,
      u.full_name,
      u.username,
      u.email,
      u.password_hash,
      u.role_id,
      u.must_change_password,
      u.password_changed_at,
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

async function updateUserPassword(userId, newPassword) {
  const result = await query(
    `
    update users
    set
      password_hash = crypt($2, gen_salt('bf')),
      must_change_password = false,
      password_changed_at = current_timestamp,
      updated_at = current_timestamp
    where user_id = $1
    returning
      user_id,
      full_name,
      username,
      email,
      role_id,
      must_change_password,
      password_changed_at
    `,
    [userId, newPassword]
  );

  return result.rows[0] || null;
}

module.exports = {
  findActiveUserByUsername,
  findActiveUserById,
  findActiveUserWithPasswordById,
  listPermissionsByRoleId,
  updateUserPassword,
};

