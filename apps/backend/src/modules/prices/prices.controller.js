const {
  listPrices,
  listPriceCoverageGaps,
  createPrice,
  patchPrice,
} = require('./prices.service');

async function getPrices(req, res, next) {
  try {
    const prices = await listPrices(req.query);
    res.json({ ok: true, data: prices });
  } catch (error) {
    next(error);
  }
}

async function postPrice(req, res, next) {
  try {
    const price = await createPrice(req.body);
    res.status(201).json({ ok: true, data: price });
  } catch (error) {
    next(error);
  }
}

async function getPriceCoverageGaps(req, res, next) {
  try {
    const styles = await listPriceCoverageGaps();
    res.json({ ok: true, data: styles });
  } catch (error) {
    next(error);
  }
}

async function patchPriceById(req, res, next) {
  try {
    const price = await patchPrice(req.params.priceId, req.body);
    res.json({ ok: true, data: price });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPrices,
  getPriceCoverageGaps,
  postPrice,
  patchPriceById,
};
