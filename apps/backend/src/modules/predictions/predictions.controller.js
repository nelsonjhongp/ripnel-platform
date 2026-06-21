const { getStockRiskPredictions } = require('./predictions.service');

async function getStockRisk(req, res, next) {
  try {
    const result = await getStockRiskPredictions(req.query, req.auth);
    res.json({ ok: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStockRisk,
};
