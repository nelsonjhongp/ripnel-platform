const {
  getDashboardOverview,
  getDashboardActivity,
  getSalesByDepartment,
  getCommercialActivity,
} = require('./dashboard.service');

async function getOverview(req, res, next) {
  try {
    const overview = await getDashboardOverview({
      user_id: req.auth?.sub,
      permissions: req.auth?.permissions,
      role_name: req.auth?.role_name,
      date_from: req.query.date_from || undefined,
      date_to: req.query.date_to || undefined,
      location_scope: req.query.location_scope || undefined,
      location_id: req.query.location_id || undefined,
    });

    return res.json(overview);
  } catch (error) {
    return next(error);
  }
}

async function getActivity(req, res, next) {
  try {
    const activity = await getDashboardActivity({
      user_id: req.auth?.sub,
      permissions: req.auth?.permissions,
      role_name: req.auth?.role_name,
    });

    return res.json(activity);
  } catch (error) {
    return next(error);
  }
}

async function getDepartmentSales(req, res, next) {
  try {
    const result = await getSalesByDepartment({
      user_id: req.auth?.sub,
      permissions: req.auth?.permissions,
      role_name: req.auth?.role_name,
      date_from: req.query.date_from || undefined,
      date_to: req.query.date_to || undefined,
      location_scope: req.query.location_scope || undefined,
      location_id: req.query.location_id || undefined,
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function getCommercialActivityController(req, res, next) {
  try {
    const result = await getCommercialActivity({
      user_id: req.auth?.sub,
      permissions: req.auth?.permissions,
      role_name: req.auth?.role_name,
      date_from: req.query.date_from || undefined,
      date_to: req.query.date_to || undefined,
      group: req.query.group || undefined,
      location_scope: req.query.location_scope || undefined,
      location_id: req.query.location_id || undefined,
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getOverview,
  getActivity,
  getDepartmentSales,
  getCommercialActivityController,
};
