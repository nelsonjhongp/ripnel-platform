const { listRoles } = require('./roles.service');

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

module.exports = {
  getRoles,
};
