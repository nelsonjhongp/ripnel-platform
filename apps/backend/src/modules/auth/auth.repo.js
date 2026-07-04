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
      password_hash = crypt($2, gen_salt('bf', 10)),
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

// ---------------------------------------------------------------------------
// Refresh tokens
// ---------------------------------------------------------------------------

async function insertRefreshToken({ userId, tokenHash, expiresAt, ip }, executor = query) {
  await executor(
    `insert into refresh_tokens (user_id, token_hash, expires_at, created_by_ip)
     values ($1, $2, $3, $4)`,
    [userId, tokenHash, expiresAt, ip || null]
  );
}

async function findActiveRefreshToken(tokenHash, executor = query) {
  const result = await executor(
    `select refresh_id, user_id, expires_at, revoked_at, last_used_at
     from refresh_tokens
     where token_hash = $1
     limit 1`,
    [tokenHash]
  );
  return result.rows[0] || null;
}

async function revokeRefreshToken(refreshId, executor = query) {
  await executor(
    `update refresh_tokens set revoked_at = current_timestamp where refresh_id = $1`,
    [refreshId]
  );
}

async function touchRefreshToken(refreshId, executor = query) {
  await executor(
    `update refresh_tokens set last_used_at = current_timestamp where refresh_id = $1`,
    [refreshId]
  );
}

async function revokeAllRefreshTokensByUser(userId, executor = query) {
  await executor(
    `update refresh_tokens
       set revoked_at = current_timestamp
     where user_id = $1 and revoked_at is null`,
    [userId]
  );
}

// ---------------------------------------------------------------------------
// Access token revocation
// ---------------------------------------------------------------------------

async function insertRevokedAccess({ jti, userId, expiresAt }, executor = query) {
  await executor(
    `insert into revoked_access_tokens (jti, user_id, expires_at)
     values ($1, $2, $3)
     on conflict (jti) do nothing`,
    [jti, userId, expiresAt]
  );
}

async function isAccessRevoked(jti, executor = query) {
  const result = await executor(
    `select 1 from revoked_access_tokens where jti = $1`,
    [jti]
  );
  return result.rows.length > 0;
}

// ---------------------------------------------------------------------------
// Account lockout (Phase 1.4)
// ---------------------------------------------------------------------------

async function getFailedLoginState(userId, executor = query) {
  const result = await executor(
    `select attempts, locked_until from failed_login_attempts where user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function registerFailedAttempt(userId, executor = query) {
  await executor(
    `insert into failed_login_attempts (user_id, attempts, last_attempt_at)
     values ($1, 1, current_timestamp)
     on conflict (user_id) do update
       set attempts = failed_login_attempts.attempts + 1,
           last_attempt_at = current_timestamp
     returning attempts, locked_until`,
    [userId]
  );

  const after = await getFailedLoginState(userId, executor);
  return after;
}

async function lockAccount(userId, lockUntil, executor = query) {
  await executor(
    `update failed_login_attempts
        set locked_until = $2
      where user_id = $1`,
    [userId, lockUntil]
  );
}

async function clearFailedAttempts(userId, executor = query) {
  await executor(
    `insert into failed_login_attempts (user_id, attempts, locked_until)
     values ($1, 0, null)
     on conflict (user_id) do update
       set attempts = 0,
           locked_until = null,
           last_attempt_at = current_timestamp`,
    [userId]
  );
}

module.exports = {
  findActiveUserByUsername,
  findActiveUserById,
  findActiveUserWithPasswordById,
  listPermissionsByRoleId,
  updateUserPassword,
  insertRefreshToken,
  findActiveRefreshToken,
  revokeRefreshToken,
  touchRefreshToken,
  revokeAllRefreshTokensByUser,
  insertRevokedAccess,
  isAccessRevoked,
  getFailedLoginState,
  registerFailedAttempt,
  lockAccount,
  clearFailedAttempts,
};

