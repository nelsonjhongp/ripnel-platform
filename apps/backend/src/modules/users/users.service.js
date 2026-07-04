const crypto = require('crypto');
const { pool, attachActor } = require('../../shared/db');
const { AppError } = require('../../shared/errors');
const { findRoleById } = require('../roles/roles.repo');
const {
  findAllUsers,
  findUserById,
  insertUser,
  updateUser,
  findLocationsByIds,
  findUserLocationsByUserId,
  replaceUserLocations,
} = require('./users.repo');

function normalizeUuid(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function normalizeText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeEmail(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  return normalized.toLowerCase();
}

function normalizeUsername(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  return normalized.toLowerCase();
}

function buildTemporaryPassword(username) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const passwordLength = 14;
  let password = '';

  for (let index = 0; index < passwordLength; index += 1) {
    password += alphabet[crypto.randomInt(alphabet.length)];
  }

  return password;
}

function buildUserConflictError(error) {
  if (error.code !== '23505') {
    return null;
  }

  if (error.constraint === 'uq_users_username' || String(error.detail || '').includes('(username)')) {
    return new AppError('User username already exists', 409);
  }

  if (String(error.detail || '').includes('(email)')) {
    return new AppError('User email already exists', 409);
  }

  return new AppError('User data already exists', 409);
}

function normalizeAssignments(input) {
  if (!Array.isArray(input)) {
    return null;
  }

  return input.map((assignment) => ({
    location_id: normalizeUuid(assignment && assignment.location_id),
    is_default: Boolean(assignment && assignment.is_default),
  }));
}

async function listUsers() {
  return findAllUsers();
}

async function createUser(input = {}, { actorUserId = null, actorRole = null } = {}) {
  const fullName = normalizeText(input.full_name);
  const username = normalizeUsername(input.username);
  const email = normalizeEmail(input.email);
  const roleId =
    input.role_id === null || input.role_id === undefined
      ? null
      : normalizeUuid(input.role_id);
  const active = typeof input.active === 'boolean' ? input.active : true;
  const assignments = normalizeAssignments(input.assignments);

  if (!fullName) {
    throw new AppError('User full_name is required', 400);
  }

  if (!username) {
    throw new AppError('User username is required', 400);
  }

  if (!roleId) {
    throw new AppError('User role_id is required', 400);
  }

  if (typeof active !== 'boolean') {
    throw new AppError('User active state is invalid', 400);
  }

  if (!assignments) {
    throw new AppError('Assignments must be an array', 400);
  }

  if (assignments.length === 0) {
    throw new AppError('At least one location assignment is required', 400);
  }

  if (assignments.some((assignment) => !assignment.location_id)) {
    throw new AppError('Each assignment requires a valid location_id', 400);
  }

  const uniqueIds = new Set(assignments.map((assignment) => assignment.location_id));

  if (uniqueIds.size !== assignments.length) {
    throw new AppError('Assignments cannot contain duplicated locations', 400);
  }

  const defaultCount = assignments.filter((assignment) => assignment.is_default).length;

  if (defaultCount !== 1) {
    throw new AppError('Exactly one default location is required', 400);
  }

  const role = await findRoleById(roleId);

  if (!role) {
    throw new AppError('User role_id is invalid', 400);
  }

  const locations = await findLocationsByIds(Array.from(uniqueIds));

  if (locations.length !== uniqueIds.size) {
    throw new AppError('One or more locations are invalid', 400);
  }

  const client = await pool.connect();
  const temporaryPassword = buildTemporaryPassword(username);

  try {
    await client.query('begin');
    await attachActor(client, { actorUserId, actorRole });
    const executor = client.query.bind(client);

    const createdUser = await insertUser(
      {
        full_name: fullName,
        username,
        email,
        temporary_password: temporaryPassword,
        role_id: roleId,
        active,
        must_change_password: true,
      },
      executor
    );

    await replaceUserLocations(createdUser.user_id, assignments, executor);
    await client.query('commit');

    return {
      ...createdUser,
      temporary_password: temporaryPassword,
    };
  } catch (error) {
    await client.query('rollback');
    const conflictError = buildUserConflictError(error);
    if (conflictError) {
      throw conflictError;
    }

    throw error;
  } finally {
    client.release();
  }
}

async function patchUser(userId, input = {}, { actorUserId = null, actorRole = null } = {}) {
  const normalizedUserId = normalizeUuid(userId);

  if (!normalizedUserId) {
    throw new AppError('User id is required', 400);
  }

  const existingUser = await findUserById(normalizedUserId);

  if (!existingUser) {
    throw new AppError('User not found', 404);
  }

  if (
    !('full_name' in input) &&
    !('username' in input) &&
    !('email' in input) &&
    !('role_id' in input) &&
    !('active' in input)
  ) {
    throw new AppError('No editable fields were provided for user', 400);
  }

  const fullName = 'full_name' in input ? normalizeText(input.full_name) : existingUser.full_name;
  const username = 'username' in input ? normalizeUsername(input.username) : existingUser.username;
  const email = 'email' in input ? normalizeEmail(input.email) : existingUser.email;
  const roleId =
    'role_id' in input
      ? input.role_id === null
        ? null
        : normalizeUuid(input.role_id)
      : existingUser.role_id;
  const active = 'active' in input ? input.active : existingUser.active;

  if (!fullName) {
    throw new AppError('User full_name is required', 400);
  }

  if (!username) {
    throw new AppError('User username is required', 400);
  }

  if ('role_id' in input && input.role_id !== null && !roleId) {
    throw new AppError('User role_id is invalid', 400);
  }

  if (typeof active !== 'boolean') {
    throw new AppError('User active state is invalid', 400);
  }

  if (roleId) {
    const role = await findRoleById(roleId);

    if (!role) {
      throw new AppError('User role_id is invalid', 400);
    }
  }

  try {
    return await updateUser(
      {
        userId: normalizedUserId,
        full_name: fullName,
        username,
        email,
        role_id: roleId,
        active,
      }
    );
  } catch (error) {
    const conflictError = buildUserConflictError(error);
    if (conflictError) {
      throw conflictError;
    }

    throw error;
  }
}

function buildUserLocationsPayload(user, assignments) {
  const defaultAssignment = assignments.find((assignment) => assignment.is_default) || null;

  return {
    user: {
      user_id: user.user_id,
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      role_id: user.role_id,
      active: user.active,
      must_change_password: user.must_change_password,
    },
    default_location_id: defaultAssignment ? defaultAssignment.location_id : null,
    assignments: assignments.map((assignment) => ({
      location_id: assignment.location_id,
      is_default: assignment.is_default,
      location: {
        location_id: assignment.location_id,
        name: assignment.name,
        code: assignment.code,
        type: assignment.type,
        address: assignment.address,
        active: assignment.active,
      },
    })),
  };
}

async function getUserLocations(userId) {
  const normalizedUserId = normalizeUuid(userId);

  if (!normalizedUserId) {
    throw new AppError('User id is required', 400);
  }

  const user = await findUserById(normalizedUserId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const assignments = await findUserLocationsByUserId(normalizedUserId);

  return buildUserLocationsPayload(user, assignments);
}

async function updateUserLocations(userId, input = {}, { actorUserId = null, actorRole = null } = {}) {
  const normalizedUserId = normalizeUuid(userId);
  const assignments = normalizeAssignments(input.assignments);

  if (!normalizedUserId) {
    throw new AppError('User id is required', 400);
  }

  if (!assignments) {
    throw new AppError('Assignments must be an array', 400);
  }

  const user = await findUserById(normalizedUserId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (assignments.some((assignment) => !assignment.location_id)) {
    throw new AppError('Each assignment requires a valid location_id', 400);
  }

  const uniqueIds = new Set(assignments.map((assignment) => assignment.location_id));

  if (uniqueIds.size !== assignments.length) {
    throw new AppError('Assignments cannot contain duplicated locations', 400);
  }

  const defaultCount = assignments.filter((assignment) => assignment.is_default).length;

  if (defaultCount > 1) {
    throw new AppError('Only one default location is allowed per user', 400);
  }

  if (assignments.length > 0 && defaultCount !== 1) {
    throw new AppError('A default location is required when assignments are provided', 400);
  }

  const locations = await findLocationsByIds(Array.from(uniqueIds));

  if (locations.length !== uniqueIds.size) {
    throw new AppError('One or more locations are invalid', 400);
  }

  const client = await pool.connect();

  try {
    await client.query('begin');
    await attachActor(client, { actorUserId, actorRole });
    await replaceUserLocations(normalizedUserId, assignments, client.query.bind(client));
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }

  return getUserLocations(normalizedUserId);
}

module.exports = {
  listUsers,
  createUser,
  patchUser,
  getUserLocations,
  updateUserLocations,
};
