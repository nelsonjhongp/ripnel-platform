const { getHomeOverview } = require('./home.service');

async function getOverview(req, res, next) {
  try {
    const overview = await getHomeOverview({
      user_id: req.auth?.sub,
      permissions: req.auth?.permissions,
      role_name: req.auth?.role_name,
    });

    return res.json(overview);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getOverview,
};
