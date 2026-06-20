const { getTopbarNotifications } = require('./notifications.service');

async function getTopbar(req, res, next) {
  try {
    const payload = await getTopbarNotifications({
      user_id: req.auth?.sub,
      permissions: req.auth?.permissions,
      role_name: req.auth?.role_name,
    });

    return res.json(payload);
  } catch (error) {
    return next(error);
  }
}

async function getAll(req, res, next) {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 50, 100));

    const payload = await getTopbarNotifications({
      user_id: req.auth?.sub,
      permissions: req.auth?.permissions,
      role_name: req.auth?.role_name,
      max_items: limit,
    });

    return res.json(payload);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getTopbar,
  getAll,
};
