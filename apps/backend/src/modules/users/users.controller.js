const {
  listUsers,
  createUser,
  patchUser,
  resetUserPass,
  getUserLocations,
  updateUserLocations,
} = require('./users.service');

async function getUsers(req, res, next) {
  try {
    const users = await listUsers();
    res.json({ ok: true, data: users });
  } catch (error) {
    next(error);
  }
}

function actorFrom(req) {
  return { actorUserId: req.auth?.sub || null, actorRole: req.auth?.role_name || null };
}

async function postUser(req, res, next) {
  try {
    const user = await createUser(req.body, actorFrom(req));
    res.status(201).json({ ok: true, data: user });
  } catch (error) {
    next(error);
  }
}

async function patchUserById(req, res, next) {
  try {
    const user = await patchUser(req.params.userId, req.body, actorFrom(req));
    res.json({ ok: true, data: user });
  } catch (error) {
    next(error);
  }
}

async function getUserLocationsByUserId(req, res, next) {
  try {
    const payload = await getUserLocations(req.params.userId);
    res.json({ ok: true, data: payload });
  } catch (error) {
    next(error);
  }
}

async function putUserLocationsByUserId(req, res, next) {
  try {
    const payload = await updateUserLocations(req.params.userId, req.body, actorFrom(req));
    res.json({ ok: true, data: payload });
  } catch (error) {
    next(error);
  }
}

async function resetUserPassword(req, res, next) {
  try {
    const user = await resetUserPass(req.params.userId);
    res.json({ ok: true, data: user });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUsers,
  postUser,
  patchUserById,
  getUserLocationsByUserId,
  putUserLocationsByUserId,
  resetUserPassword,
};
