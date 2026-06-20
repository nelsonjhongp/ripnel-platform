const {
  openCash,
  reopenCash,
  closeCash,
  getCurrentCash,
  listCashClosings,
  getCashClosing,
  getCashAdminSummary,
  listCashAdminSessions,
} = require("./cash.service");

async function getCashClosings(req, res, next) {
  try {
    const result = await listCashClosings({
      user_id: req.auth?.sub,
      permissions: req.auth?.permissions,
      location_id: req.query.location_id,
      status: req.query.status,
      range: req.query.range,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      page: req.query.page,
      pageSize: req.query.pageSize,
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function getCashCurrent(req, res, next) {
  try {
    const result = await getCurrentCash({
      user_id: req.auth?.sub,
      permissions: req.auth?.permissions,
      location_id: req.query.location_id,
      business_date: req.query.business_date,
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function getCashClosingById(req, res, next) {
  try {
    const closing = await getCashClosing({
      cash_closing_id: req.params.id,
      user_id: req.auth?.sub,
      permissions: req.auth?.permissions,
    });
    return res.json(closing);
  } catch (error) {
    return next(error);
  }
}

async function getCashAdminSummaryController(req, res, next) {
  try {
    const summary = await getCashAdminSummary({
      user_id: req.auth?.sub,
      permissions: req.auth?.permissions,
      location_id: req.query.locationId || req.query.location_id,
      status: req.query.status,
      range: req.query.range,
      date_from: req.query.date_from || req.query.dateFrom,
      date_to: req.query.date_to || req.query.dateTo,
    });
    return res.json(summary);
  } catch (error) {
    return next(error);
  }
}

async function getCashAdminSessionsController(req, res, next) {
  try {
    const sessions = await listCashAdminSessions({
      user_id: req.auth?.sub,
      permissions: req.auth?.permissions,
      location_id: req.query.locationId || req.query.location_id,
      status: req.query.status,
      range: req.query.range,
      date_from: req.query.date_from || req.query.dateFrom,
      date_to: req.query.date_to || req.query.dateTo,
      page: req.query.page,
      page_size: req.query.pageSize || req.query.page_size,
    });
    return res.json(sessions);
  } catch (error) {
    return next(error);
  }
}

async function postOpenCash(req, res, next) {
  try {
    const closing = await openCash({
      ...(req.body || {}),
      user_id: req.auth?.sub,
      permissions: req.auth?.permissions,
    });
    return res.status(201).json(closing);
  } catch (error) {
    return next(error);
  }
}

async function patchCloseCash(req, res, next) {
  try {
    const closing = await closeCash({
      cash_closing_id: req.params.id,
      ...(req.body || {}),
      user_id: req.auth?.sub,
      permissions: req.auth?.permissions,
    });
    return res.json(closing);
  } catch (error) {
    return next(error);
  }
}

async function patchReopenCash(req, res, next) {
  try {
    const closing = await reopenCash({
      cash_closing_id: req.params.id,
      reopen_notes: req.body?.reopen_notes,
      user_id: req.auth?.sub,
      permissions: req.auth?.permissions,
    });
    return res.json(closing);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getCashClosings,
  getCashCurrent,
  getCashClosingById,
  getCashAdminSummaryController,
  getCashAdminSessionsController,
  postOpenCash,
  patchCloseCash,
  patchReopenCash,
};
