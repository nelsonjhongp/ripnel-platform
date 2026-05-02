const { AppError } = require('../../shared/errors');
const {
  findActiveUserByUsername,
  findActiveUserById,
  findActiveUserWithPasswordById,
  listPermissionsByRoleId,
  updateUserPassword,
} = require('./auth.repo');
const { query } = require('../../shared/db');

async function verifyPassword(password, passwordHash) {
  const verify = await query(
    `select (crypt($1, $2) = $2) as ok`,
    [password, passwordHash]
  );

  return Boolean(verify.rows?.[0]?.ok);
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

  const ok = await verifyPassword(normalizedPassword, user.password_hash);
  if (!ok) {
    throw new AppError('Invalid credentials', 401);
  }

  const permissions = user.role_id ? await listPermissionsByRoleId(user.role_id) : [];
  return buildAuthPayload(user, permissions);
}

async function getMe({ userId }) {
  const user = await findActiveUserById(userId);
  if (!user) {
    throw new AppError('Not authenticated', 401);
  }

  const permissions = user.role_id ? await listPermissionsByRoleId(user.role_id) : [];
  return buildAuthPayload(user, permissions);
}

async function changePassword({ userId, currentPassword, newPassword }) {
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
  return buildAuthPayload({ ...user, ...updatedUser }, permissions);
}

module.exports = {
  loginWithUsernamePassword,
  getMe,
  changePassword,
};

