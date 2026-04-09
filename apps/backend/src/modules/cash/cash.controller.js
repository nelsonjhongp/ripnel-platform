const {
  openCash,
  closeCash,
  getCurrentCash,
  listCashClosings,
  getCashClosing,
} = require('./cash.service');

async function getCashClosings(req, res, next) {
  try {
    const closings = await listCashClosings({
      user_id: req.auth?.sub,
      location_id: req.query.location_id,
      status: req.query.status,
    });
    return res.json(closings);
  } catch (error) {
    return next(error);
  }
}

async function getCashCurrent(req, res, next) {
  try {
    const result = await getCurrentCash({
      user_id: req.auth?.sub,
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
    });
    return res.json(closing);
  } catch (error) {
    return next(error);
  }
}

async function postOpenCash(req, res, next) {
  try {
    const closing = await openCash({
      ...(req.body || {}),
      user_id: req.auth?.sub,
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
  postOpenCash,
  patchCloseCash,
};
