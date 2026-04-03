const { pool } = require('../../shared/db');
const { AppError } = require('../../shared/errors');
const {
  findAllRoles,
  findRoleById,
  findAllPermissions,
  findPermissionsByKeys,
  findRolePermissionsByRoleIds,
  insertRole,
  updateRole,
  replaceRolePermissions,
} = require('./roles.repo');

function normalizeText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function normalizePermissionKeys(value) {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new AppError('Role permission_keys must be an array', 400);
  }

  const normalizedKeys = value.map((permissionKey) => normalizeText(permissionKey));

  if (normalizedKeys.some((permissionKey) => !permissionKey)) {
    throw new AppError('Role permission_keys contains invalid values', 400);
  }

  return Array.from(new Set(normalizedKeys));
}

function buildPermissionsMap(permissionRows) {
  const permissionsByRoleId = new Map();

  for (const permissionRow of permissionRows) {
    const permissions = permissionsByRoleId.get(permissionRow.role_id) || [];
    permissions.push({
      permission_id: permissionRow.permission_id,
      key: permissionRow.key,
      description: permissionRow.description,
    });
    permissionsByRoleId.set(permissionRow.role_id, permissions);
  }

  return permissionsByRoleId;
}

async function hydrateRolesWithPermissions(roles, executor) {
  if (!roles.length) {
    return [];
  }

  const permissionRows = await findRolePermissionsByRoleIds(
    roles.map((role) => role.role_id),
    executor
  );
  const permissionsByRoleId = buildPermissionsMap(permissionRows);

  return roles.map((role) => ({
    ...role,
    permissions: permissionsByRoleId.get(role.role_id) || [],
  }));
}

async function getRoleWithPermissions(roleId, executor) {
  const role = await findRoleById(roleId, executor);

  if (!role) {
    return null;
  }

  const [roleWithPermissions] = await hydrateRolesWithPermissions([role], executor);
  return roleWithPermissions;
}

async function validatePermissionKeys(permissionKeys, executor) {
  if (!permissionKeys.length) {
    return [];
  }

  const permissions = await findPermissionsByKeys(permissionKeys, executor);

  if (permissions.length !== permissionKeys.length) {
    const foundKeys = new Set(permissions.map((permission) => permission.key));
    const missingKeys = permissionKeys.filter((permissionKey) => !foundKeys.has(permissionKey));
    throw new AppError(`Unknown permission keys: ${missingKeys.join(', ')}`, 400);
  }

  return permissions;
}

async function listRoles() {
  const roles = await findAllRoles();
  return hydrateRolesWithPermissions(roles);
}

async function listPermissions() {
  return findAllPermissions();
}

async function createRole(input = {}) {
  const name = normalizeText(input.name);
  const description = normalizeText(input.description);
  const active = typeof input.active === 'boolean' ? input.active : true;
  const permissionKeys = normalizePermissionKeys(input.permission_keys) || [];

  if (!name) {
    throw new AppError('Role name is required', 400);
  }

  if (typeof active !== 'boolean') {
    throw new AppError('Role active state is invalid', 400);
  }

  const client = await pool.connect();

  try {
    await client.query('begin');

    const permissions = await validatePermissionKeys(permissionKeys, client.query.bind(client));
    const role = await insertRole(
      {
        name,
        description,
        active,
      },
      client.query.bind(client)
    );

    await replaceRolePermissions(
      role.role_id,
      permissions.map((permission) => permission.permission_id),
      client.query.bind(client)
    );

    await client.query('commit');
    return getRoleWithPermissions(role.role_id);
  } catch (error) {
    await client.query('rollback');
    if (error.code === '23505') {
      throw new AppError('Role name already exists', 409);
    }

    throw error;
  } finally {
    client.release();
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

  if (
    !('name' in input) &&
    !('description' in input) &&
    !('active' in input) &&
    !('permission_keys' in input)
  ) {
    throw new AppError('No editable fields were provided for role', 400);
  }

  const name = 'name' in input ? normalizeText(input.name) : existingRole.name;
  const description =
    'description' in input ? normalizeText(input.description) : existingRole.description;
  const active = 'active' in input ? input.active : existingRole.active;
  const permissionKeys = normalizePermissionKeys(input.permission_keys);

  if (!name) {
    throw new AppError('Role name is required', 400);
  }

  if (typeof active !== 'boolean') {
    throw new AppError('Role active state is invalid', 400);
  }

  const client = await pool.connect();

  try {
    await client.query('begin');

    const permissions =
      permissionKeys === undefined
        ? null
        : await validatePermissionKeys(permissionKeys, client.query.bind(client));

    await updateRole(
      {
        roleId: normalizedRoleId,
        name,
        description,
        active,
      },
      client.query.bind(client)
    );

    if (permissions) {
      await replaceRolePermissions(
        normalizedRoleId,
        permissions.map((permission) => permission.permission_id),
        client.query.bind(client)
      );
    }

    await client.query('commit');
    return getRoleWithPermissions(normalizedRoleId);
  } catch (error) {
    await client.query('rollback');
    if (error.code === '23505') {
      throw new AppError('Role name already exists', 409);
    }

    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  listRoles,
  listPermissions,
  createRole,
  patchRole,
};
