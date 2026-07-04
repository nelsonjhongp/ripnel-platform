const crypto = require('crypto');
const { AppError } = require('../../shared/errors');
const { query } = require('../../shared/db');
const { signJwt, generateJti, generateOpaqueToken, hashToken } = require('../../shared/jwt');
const {
  findActiveUserByUsername,
  findActiveUserById,
  findActiveUserWithPasswordById,
  listPermissionsByRoleId,
  updateUserPassword,
  insertRefreshToken,
  findActiveRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensByUser,
  insertRevokedAccess,
  isAccessRevoked,
  getFailedLoginState,
  registerFailedAttempt,
  lockAccount,
  clearFailedAttempts,
} = require('./auth.repo');
const { env } = require('../../config/env');

const ACCESS_TTL_SECONDS = 60 * 15; // 15 minutes
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const DUMMY_HASH = '$2a$10$abcdefghijklmnopqrstuv'; // constant-time-ish fallback

async function verifyPassword(password, passwordHash) {
  const verify = await query(
    `select (crypt($1, $2) = $2) as ok`,
    [password, passwordHash]
  );

  return Boolean(verify.rows?.[0]?.ok);
}

async function dummyVerify(password) {
  try {
    await query(`select (crypt($1, $2) = $2) as ok`, [password, DUMMY_HASH]);
  } catch {
    // ignore — the goal is just to spend similar time as a real verify
  }
  return false;
}

function buildAuthPayload(user, permissions) {
  return {
    user: {
      user_id: user.user_id,
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role_name,
      must_change_password: Boolean(user.must_change_password),
    },
    permissions,
  };
}

function validateNewPassword(newPassword) {
  if (String(newPassword || '').length < 10) {
    throw new AppError('New password must be at least 10 characters', 400);
  }

  if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    throw new AppError('New password must include at least one letter and one number', 400);
  }
}

function isAccountLocked(state) {
  return Boolean(state?.locked_until && new Date(state.locked_until) > new Date());
}

async function issueSessionPair({ user, permissions, ip }) {
  if (!env.jwtSecret) {
    throw new AppError('JWT_SECRET is not configured', 500, { code: 'CONFIG_ERROR' });
  }

  const jti = generateJti();
  const access = signJwt(
    {
      sub: user.user_id,
      role_id: user.role_id,
      role_name: user.role_name,
      permissions,
      must_change_password: Boolean(user.must_change_password),
      jti,
    },
    env.jwtSecret,
    { expiresInSeconds: ACCESS_TTL_SECONDS }
  );

  const rawRefresh = generateOpaqueToken(32);
  const tokenHash = hashToken(rawRefresh);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);

  await insertRefreshToken({
    userId: user.user_id,
    tokenHash,
    expiresAt,
    ip,
  });

  return {
    access,
    refresh: rawRefresh,
    accessExpiresInSeconds: ACCESS_TTL_SECONDS,
    refreshExpiresInSeconds: REFRESH_TTL_SECONDS,
  };
}

async function revokeActiveAccess({ jti, userId, accessExpiresInSeconds }) {
  if (!jti) return;
  const expiresAt = new Date(Date.now() + accessExpiresInSeconds * 1000);
  await insertRevokedAccess({ jti, userId, expiresAt });
}

async function rotateRefreshSession({ rawRefresh, ip }) {
  if (!rawRefresh) {
    throw new AppError('Refresh token is required', 401, { code: 'AUTH_REQUIRED' });
  }
  if (!env.jwtSecret) {
    throw new AppError('JWT_SECRET is not configured', 500, { code: 'CONFIG_ERROR' });
  }

  const tokenHash = hashToken(rawRefresh);
  const record = await findActiveRefreshToken(tokenHash);

  if (!record) {
    throw new AppError('Invalid refresh token', 401, { code: 'INVALID_REFRESH' });
  }

  if (record.revoked_at) {
    // Reuse of a consumed refresh token — possible token theft.
    // Revoke every active refresh token for this user as defense-in-depth.
    await revokeAllRefreshTokensByUser(record.user_id);
    throw new AppError('Refresh token reuse detected', 401, { code: 'REFRESH_REUSE' });
  }

  if (new Date(record.expires_at) <= new Date()) {
    throw new AppError('Refresh token expired', 401, { code: 'REFRESH_EXPIRED' });
  }

  // Consume the presented refresh token (rotation).
  await revokeRefreshToken(record.refresh_id);

  const user = await findActiveUserById(record.user_id);
  if (!user) {
    throw new AppError('Not authenticated', 401, { code: 'AUTH_REQUIRED' });
  }

  const permissions = user.role_id ? await listPermissionsByRoleId(user.role_id) : [];
  const pair = await issueSessionPair({ user, permissions, ip });

  return { pair, permissions, user };
}

async function loginWithUsernamePassword({ username, password, ip }) {
  const normalizedUsername = String(username || '').trim();
  const normalizedPassword = String(password || '');

  if (!normalizedUsername || !normalizedPassword) {
    throw new AppError('Username and password are required', 400);
  }

  const user = await findActiveUserByUsername(normalizedUsername);

  if (!user) {
    // spend similar time as a real verify to avoid trivial user enumeration
    await dummyVerify(normalizedPassword);
    throw new AppError('Invalid credentials', 401);
  }

  const lockState = await getFailedLoginState(user.user_id);
  if (isAccountLocked(lockState)) {
    throw new AppError('Account temporarily locked due to repeated failures', 423, {
      code: 'ACCOUNT_LOCKED',
    });
  }

  const ok = await verifyPassword(normalizedPassword, user.password_hash);

  if (!ok) {
    const after = await registerFailedAttempt(user.user_id);
    if (after && after.attempts >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      await lockAccount(user.user_id, lockUntil);
      throw new AppError('Account temporarily locked due to repeated failures', 423, {
        code: 'ACCOUNT_LOCKED',
      });
    }
    throw new AppError('Invalid credentials', 401);
  }

  await clearFailedAttempts(user.user_id);

  const permissions = user.role_id ? await listPermissionsByRoleId(user.role_id) : [];
  const pair = await issueSessionPair({ user, permissions, ip });
  return { user, permissions, pair };
}

async function getMe({ userId }) {
  const user = await findActiveUserById(userId);
  if (!user) {
    throw new AppError('Not authenticated', 401);
  }

  const permissions = user.role_id ? await listPermissionsByRoleId(user.role_id) : [];
  return buildAuthPayload(user, permissions);
}

async function changePassword({ userId, currentPassword, newPassword, jti, ip }) {
  const normalizedCurrentPassword = String(currentPassword || '');
  const normalizedNewPassword = String(newPassword || '');

  if (!normalizedCurrentPassword || !normalizedNewPassword) {
    throw new AppError('Current password and new password are required', 400);
  }

  validateNewPassword(normalizedNewPassword);

  const user = await findActiveUserWithPasswordById(userId);
  if (!user) {
    throw new AppError('Not authenticated', 401);
  }

  const currentPasswordOk = await verifyPassword(normalizedCurrentPassword, user.password_hash);
  if (!currentPasswordOk) {
    throw new AppError('Current password is invalid', 401);
  }

  const samePassword = await verifyPassword(normalizedNewPassword, user.password_hash);
  if (samePassword) {
    throw new AppError('New password must be different from current password', 400);
  }

  const updatedUser = await updateUserPassword(user.user_id, normalizedNewPassword);
  const permissions = updatedUser.role_id ? await listPermissionsByRoleId(updatedUser.role_id) : [];

  // Rotate sessions after a password change.
  if (jti) {
    await revokeActiveAccess({ jti, userId, accessExpiresInSeconds: ACCESS_TTL_SECONDS });
  }
  await revokeAllRefreshTokensByUser(user.user_id);
  const pair = await issueSessionPair({ user: { ...user, ...updatedUser }, permissions, ip });

  return { user: { ...user, ...updatedUser }, permissions, pair };
}

async function logoutSession({ jti, userId, rawRefresh }) {
  if (userId) {
    await revokeAllRefreshTokensByUser(userId);
  }
  if (jti && userId) {
    await revokeActiveAccess({ jti, userId, accessExpiresInSeconds: ACCESS_TTL_SECONDS });
  }
  if (rawRefresh) {
    const tokenHash = hashToken(rawRefresh);
    const record = await findActiveRefreshToken(tokenHash);
    if (record) {
      await revokeRefreshToken(record.refresh_id);
    }
  }
}

module.exports = {
  loginWithUsernamePassword,
  getMe,
  changePassword,
  issueSessionPair,
  rotateRefreshSession,
  logoutSession,
  revokeActiveAccess,
  isAccessRevoked,
  ACCESS_TTL_SECONDS,
  REFRESH_TTL_SECONDS,
  MAX_FAILED_ATTEMPTS,
  LOCK_DURATION_MS,
  validateNewPassword,
};

