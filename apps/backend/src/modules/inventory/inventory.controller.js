const {
  listInventory,
  listInventoryProductSummary,
  listInventoryLocationSummary,
  getInventoryStyleDetail,
  listKardex,
  listAdjustments,
  searchVariantsForAdjustment,
  getAdjustmentById,
  createAdjustment,
  confirmAdjustmentById,
  cancelAdjustmentById,
} = require('./inventory.service');

async function getInventory(req, res, next) {
  try {
    const inventory = await listInventory(req.query, req.auth);
    res.json({ ok: true, data: inventory });
  } catch (error) {
    next(error);
  }
}

async function getInventoryProductSummary(req, res, next) {
  try {
    const summary = await listInventoryProductSummary(req.query, req.auth);
    res.json({ ok: true, data: summary });
  } catch (error) {
    next(error);
  }
}

async function getInventoryLocationSummary(req, res, next) {
  try {
    const summary = await listInventoryLocationSummary(req.query, req.auth);
    res.json({ ok: true, data: summary });
  } catch (error) {
    next(error);
  }
}

async function getInventoryStyle(req, res, next) {
  try {
    const detail = await getInventoryStyleDetail(req.params.styleId, req.query, req.auth);
    res.json({ ok: true, data: detail });
  } catch (error) {
    next(error);
  }
}

async function getKardex(req, res, next) {
  try {
    const movements = await listKardex(req.query, req.auth);
    res.json({ ok: true, data: movements });
  } catch (error) {
    next(error);
  }
}

async function getAdjustments(req, res, next) {
  try {
    const adjustments = await listAdjustments(req.query, req.auth);
    res.json({ ok: true, data: adjustments });
  } catch (error) {
    next(error);
  }
}

async function getAdjustmentVariants(req, res, next) {
  try {
    const variants = await searchVariantsForAdjustment(req.query, req.auth);
    res.json({ ok: true, data: variants });
  } catch (error) {
    next(error);
  }
}

async function getAdjustment(req, res, next) {
  try {
    const adjustment = await getAdjustmentById(req.params.adjustmentId, req.auth);
    res.json({ ok: true, data: adjustment });
  } catch (error) {
    next(error);
  }
}

async function postAdjustment(req, res, next) {
  try {
    const adjustment = await createAdjustment(req.body, req.auth);
    res.status(201).json({ ok: true, data: adjustment });
  } catch (error) {
    next(error);
  }
}

async function postConfirmAdjustment(req, res, next) {
  try {
    const adjustment = await confirmAdjustmentById(req.params.adjustmentId, req.body, req.auth);
    res.json({ ok: true, data: adjustment });
  } catch (error) {
    next(error);
  }
}

async function postCancelAdjustment(req, res, next) {
  try {
    const adjustment = await cancelAdjustmentById(req.params.adjustmentId, req.body, req.auth);
    res.json({ ok: true, data: adjustment });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getInventory,
  getInventoryProductSummary,
  getInventoryLocationSummary,
  getInventoryStyle,
  getKardex,
  getAdjustments,
  getAdjustmentVariants,
  getAdjustment,
  postAdjustment,
  postConfirmAdjustment,
  postCancelAdjustment,
};
