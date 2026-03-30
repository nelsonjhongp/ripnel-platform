const { AppError } = require('../../shared/errors');
const { findAllRoles, findRoleById, insertRole, updateRole } = require('./roles.repo');

function normalizeText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

async function listRoles() {
  return findAllRoles();
}

async function createRole(input = {}) {
  const name = normalizeText(input.name);
  const description = normalizeText(input.description);
  const active = typeof input.active === 'boolean' ? input.active : true;

  if (!name) {
    throw new AppError('Role name is required', 400);
  }

  if (typeof active !== 'boolean') {
    throw new AppError('Role active state is invalid', 400);
  }

  try {
    return await insertRole({
      name,
      description,
      active,
    });
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError('Role name already exists', 409);
    }

    throw error;
  }
}

async function patchRole(roleId, input = {}) {
  const normalizedRoleId = normalizeText(roleId);

  if (!normalizedRoleId) {
    throw new AppError('Role id is required', 400);
  }

  const existingRole = await findRoleById(normalizedRoleId);

  if (!existingRole) {
    throw new AppError('Role not found', 404);
  }

  if (!('name' in input) && !('description' in input) && !('active' in input)) {
    throw new AppError('No editable fields were provided for role', 400);
  }

  const name = 'name' in input ? normalizeText(input.name) : existingRole.name;
  const description =
    'description' in input ? normalizeText(input.description) : existingRole.description;
  const active = 'active' in input ? input.active : existingRole.active;

  if (!name) {
    throw new AppError('Role name is required', 400);
  }

  if (typeof active !== 'boolean') {
    throw new AppError('Role active state is invalid', 400);
  }

  try {
    return await updateRole({
      roleId: normalizedRoleId,
      name,
      description,
      active,
    });
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError('Role name already exists', 409);
    }

    throw error;
  }
}

module.exports = {
  listRoles,
  createRole,
  patchRole,
};
