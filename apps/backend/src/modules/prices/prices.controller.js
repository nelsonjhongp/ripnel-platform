const {
  listPrices,
  listPriceCatalog,
  listPriceCoverageGaps,
  getPriceWorkspace,
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

async function getPriceCatalog(req, res, next) {
  try {
    const catalog = await listPriceCatalog({
      userId: req.auth?.sub,
      locationId: req.query?.location_id,
      q: req.query?.q,
      coverage: req.query?.coverage,
      status: req.query?.status,
    });
    res.json({ ok: true, data: catalog });
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
    const styles = await listPriceCoverageGaps({
      userId: req.auth?.sub,
      locationId: req.query?.location_id,
    });
    res.json({ ok: true, data: styles });
  } catch (error) {
    next(error);
  }
}

async function getPriceWorkspaceByStyleId(req, res, next) {
  try {
    const workspace = await getPriceWorkspace(req.params.styleId);
    res.json({ ok: true, data: workspace });
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
  getPriceCatalog,
  getPriceCoverageGaps,
  getPriceWorkspaceByStyleId,
  postPrice,
  patchPriceById,
};
