const { listRoles, listPermissions, createRole, patchRole } = require('./roles.service');

async function getRoles(req, res, next) {
  try {
    const roles = await listRoles();

    res.json({
      ok: true,
      data: roles,
    });
  } catch (error) {
    next(error);
  }
}

async function postRole(req, res, next) {
  try {
    const role = await createRole(req.body);

    res.status(201).json({
      ok: true,
      data: role,
    });
  } catch (error) {
    next(error);
  }
}

async function getPermissions(req, res, next) {
  try {
    const permissions = await listPermissions();

    res.json({
      ok: true,
      data: permissions,
    });
  } catch (error) {
    next(error);
  }
}

async function patchRoleById(req, res, next) {
  try {
    const role = await patchRole(req.params.roleId, req.body);

    res.json({
      ok: true,
      data: role,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getRoles,
  getPermissions,
  postRole,
  patchRoleById,
};
