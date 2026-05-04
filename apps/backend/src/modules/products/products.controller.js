const { listProducts, getProductWorkspace } = require('./products.service');

async function getProducts(req, res, next) {
  try {
    const products = await listProducts({
      userId: req.auth?.sub,
      locationId: req.query?.location_id,
      page: req.query?.page,
      pageSize: req.query?.page_size,
      query: req.query?.q,
      filterMode: req.query?.filter_mode,
    });
    res.json({ ok: true, data: products });
  } catch (error) {
    next(error);
  }
}

async function getProductWorkspaceByStyleId(req, res, next) {
  try {
    const workspace = await getProductWorkspace(req.params.styleId);
    res.json({ ok: true, data: workspace });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProducts,
  getProductWorkspaceByStyleId,
};
