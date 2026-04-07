const { listSellableVariants, listSales, getSale, createSale } = require('./sales.service');

async function getSellableVariants(req, res, next) {
  try {
    const variants = await listSellableVariants({
      location_id: req.query.location_id,
      q: req.query.q,
    });
    return res.json(variants);
  } catch (error) {
    return next(error);
  }
}

async function getSales(req, res, next) {
  try {
    const sales = await listSales({
      status: req.query.status,
      q: req.query.q,
      location_id: req.query.location_id,
    });
    return res.json(sales);
  } catch (error) {
    return next(error);
  }
}

async function getSaleById(req, res, next) {
  try {
    const sale = await getSale(req.params.saleId);
    return res.json(sale);
  } catch (error) {
    return next(error);
  }
}

async function postSale(req, res, next) {
  try {
    const sale = await createSale(req.body);
    return res.status(201).json(sale);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getSellableVariants,
  getSales,
  getSaleById,
  postSale,
};
