const { listSellableVariants, listSales, getSale, createSale } = require('./sales.service');

async function getSellableVariants(req, res, next) {
  try {
    const variants = await listSellableVariants({
      user_id: req.auth?.sub,
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
      user_id: req.auth?.sub,
      status: req.query.status,
      q: req.query.q,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
    });
    return res.json(sales);
  } catch (error) {
    return next(error);
  }
}

async function getSaleById(req, res, next) {
  try {
    const sale = await getSale({
      sale_id: req.params.saleId,
      user_id: req.auth?.sub,
    });
    return res.json(sale);
  } catch (error) {
    return next(error);
  }
}

async function postSale(req, res, next) {
  try {
    const sale = await createSale({
      user_id: req.auth?.sub,
      ...(req.body || {}),
    });
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
