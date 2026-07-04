const { query } = require('../../shared/db');

async function findAllUsers(executor = query) {
  const result = await executor(
    `select
       u.user_id,
       u.full_name,
       u.username,
       u.email,
       u.role_id,
       r.name as role_name,
       u.active,
       u.must_change_password,
       u.password_changed_at,
       u.created_at,
       u.updated_at
     from users u
     left join roles r on r.role_id = u.role_id
     order by u.active desc, u.full_name asc`
  );

  return result.rows;
}

async function findUserById(userId, executor = query) {
  const result = await executor(
    `select
       u.user_id,
       u.full_name,
       u.username,
       u.email,
       u.role_id,
       r.name as role_name,
       u.active,
       u.must_change_password,
       u.password_changed_at,
       u.created_at,
       u.updated_at
     from users u
     left join roles r on r.role_id = u.role_id
     where u.user_id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

async function findUserByEmail(email, executor = query) {
  const result = await executor(
    `select
       u.user_id,
       u.full_name,
       u.username,
       u.email,
       u.role_id,
       r.name as role_name,
       u.active,
       u.must_change_password,
       u.password_changed_at,
       u.created_at,
       u.updated_at
     from users u
     left join roles r on r.role_id = u.role_id
     where lower(u.email) = lower($1)`,
    [email]
  );

  return result.rows[0] || null;
}

async function insertUser(
  { full_name, username, email, temporary_password, role_id, active, must_change_password },
  executor = query
) {
  const result = await executor(
    `insert into users (
       full_name,
       username,
       email,
       password_hash,
       role_id,
       active,
       must_change_password
     )
     values ($1, $2, $3, crypt($4, gen_salt('bf', 10)), $5, $6, $7)
     returning
       user_id,
       full_name,
       username,
       email,
       role_id,
       active,
       must_change_password,
       password_changed_at,
       created_at,
       updated_at`,
    [full_name, username, email, temporary_password, role_id, active, must_change_password]
  );

  return result.rows[0] || null;
}

async function updateUser(
  { userId, full_name, username, email, role_id, active },
  executor = query
) {
  const result = await executor(
    `update users
     set
       full_name = $2,
       username = $3,
       email = $4,
       role_id = $5,
       active = $6,
       updated_at = current_timestamp
     where user_id = $1
     returning
       user_id,
       full_name,
       username,
       email,
       role_id,
       active,
       must_change_password,
       password_changed_at,
       created_at,
       updated_at`,
    [userId, full_name, username, email, role_id, active]
  );

  return result.rows[0] || null;
}

async function findLocationsByIds(locationIds, executor = query) {
  if (!locationIds.length) {
    return [];
  }

  const result = await executor(
    `select location_id, name, code, type, address, active
     from locations
     where location_id = any($1::uuid[])`,
    [locationIds]
  );

  return result.rows;
}

async function findUserLocationsByUserId(userId, executor = query) {
  const result = await executor(
    `select
       ul.user_id,
       ul.location_id,
       ul.is_default,
       ul.created_at,
       l.name,
       l.code,
       l.type,
       l.address,
       l.active
     from user_locations ul
     inner join locations l on l.location_id = ul.location_id
     where ul.user_id = $1
     order by ul.is_default desc, l.name asc`,
    [userId]
  );

  return result.rows;
}

async function findDefaultLocationByUserId(userId, executor = query) {
  const result = await executor(
    `select
       l.location_id,
       l.name,
       l.code,
       l.type,
       l.address,
       l.active
     from user_locations ul
     inner join locations l on l.location_id = ul.location_id
     where ul.user_id = $1
       and ul.is_default = true
     limit 1`,
    [userId]
  );

  return result.rows[0] || null;
}

async function replaceUserLocations(userId, assignments, executor = query) {
  await executor('delete from user_locations where user_id = $1', [userId]);

  for (const assignment of assignments) {
    await executor(
      `insert into user_locations (user_id, location_id, is_default)
       values ($1, $2, $3)`,
      [userId, assignment.location_id, assignment.is_default]
    );
  }
}

async function resetUserPassword(userId, temporaryPassword, executor = query) {
  const result = await executor(
    `update users
     set
       password_hash = crypt($2, gen_salt('bf')),
       must_change_password = true,
       password_changed_at = null,
       updated_at = current_timestamp
     where user_id = $1
     returning
       user_id,
       full_name,
       username,
       email,
       role_id,
       active,
       must_change_password,
       password_changed_at,
       created_at,
       updated_at`,
    [userId, temporaryPassword]
  );

  return result.rows[0] || null;
}

module.exports = {
  findAllUsers,
  findUserById,
  findUserByEmail,
  insertUser,
  updateUser,
  resetUserPassword,
  findLocationsByIds,
  findUserLocationsByUserId,
  findDefaultLocationByUserId,
  replaceUserLocations,
};
