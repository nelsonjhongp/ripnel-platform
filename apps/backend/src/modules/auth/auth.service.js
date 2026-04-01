const { AppError } = require('../../shared/errors');
const {
  findActiveUserByUsername,
  findActiveUserById,
  listPermissionsByRoleId,
} = require('./auth.repo');
const { query } = require('../../shared/db');

async function loginWithUsernamePassword({ username, password }) {
  const normalizedUsername = String(username || '').trim();
  const normalizedPassword = String(password || '');

  if (!normalizedUsername || !normalizedPassword) {
    throw new AppError('Username and password are required', 400);
  }

  const user = await findActiveUserByUsername(normalizedUsername);
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Verify password using pgcrypto crypt() so we avoid Node hashing deps.
  const verify = await query(
    `select (crypt($1, $2) = $2) as ok`,
    [normalizedPassword, user.password_hash]
  );

  const ok = Boolean(verify.rows?.[0]?.ok);
  if (!ok) {
    throw new AppError('Invalid credentials', 401);
  }

  const permissions = user.role_id ? await listPermissionsByRoleId(user.role_id) : [];

  return {
    user: {
      user_id: user.user_id,
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role_name,
    },
    permissions,
  };
}

async function getMe({ userId }) {
  const user = await findActiveUserById(userId);
  if (!user) {
    throw new AppError('Not authenticated', 401);
  }

  const permissions = user.role_id ? await listPermissionsByRoleId(user.role_id) : [];

  return {
    user: {
      user_id: user.user_id,
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role_name,
    },
    permissions,
  };
}

module.exports = {
  loginWithUsernamePassword,
  getMe,
};

