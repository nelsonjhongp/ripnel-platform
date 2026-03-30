const {
  listInventory,
  listKardex,
  listAdjustments,
  getAdjustmentById,
  createAdjustment,
  confirmAdjustmentById,
} = require('./inventory.service');

async function getInventory(req, res, next) {
  try {
    const inventory = await listInventory(req.query);
    res.json({ ok: true, data: inventory });
  } catch (error) {
    next(error);
  }
}

async function getKardex(req, res, next) {
  try {
    const movements = await listKardex(req.query);
    res.json({ ok: true, data: movements });
  } catch (error) {
    next(error);
  }
}

async function getAdjustments(req, res, next) {
  try {
    const adjustments = await listAdjustments();
    res.json({ ok: true, data: adjustments });
  } catch (error) {
    next(error);
  }
}

async function getAdjustment(req, res, next) {
  try {
    const adjustment = await getAdjustmentById(req.params.adjustmentId);
    res.json({ ok: true, data: adjustment });
  } catch (error) {
    next(error);
  }
}

async function postAdjustment(req, res, next) {
  try {
    const adjustment = await createAdjustment(req.body);
    res.status(201).json({ ok: true, data: adjustment });
  } catch (error) {
    next(error);
  }
}

async function postConfirmAdjustment(req, res, next) {
  try {
    const adjustment = await confirmAdjustmentById(req.params.adjustmentId, req.body);
    res.json({ ok: true, data: adjustment });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getInventory,
  getKardex,
  getAdjustments,
  getAdjustment,
  postAdjustment,
  postConfirmAdjustment,
};
