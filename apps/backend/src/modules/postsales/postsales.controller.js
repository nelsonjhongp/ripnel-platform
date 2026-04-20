const {
  listEligiblePostsales,
  getPostsaleContext,
  createSimpleExchange,
  cancelSale,
} = require('./postsales.service');

async function getEligiblePostsales(req, res, next) {
  try {
    const result = await listEligiblePostsales({
      user_id: req.auth?.sub,
      q: req.query.q,
      status: req.query.status,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      limit: req.query.limit,
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function getPostsaleById(req, res, next) {
  try {
    const result = await getPostsaleContext({
      sale_id: req.params.saleId,
      user_id: req.auth?.sub,
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function postSimpleExchange(req, res, next) {
  try {
    const result = await createSimpleExchange({
      sale_id: req.params.saleId,
      ...(req.body || {}),
      user_id: req.auth?.sub,
    });

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

async function postCancelSale(req, res, next) {
  try {
    const result = await cancelSale({
      sale_id: req.params.saleId,
      ...(req.body || {}),
      user_id: req.auth?.sub,
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getEligiblePostsales,
  getPostsaleById,
  postSimpleExchange,
  postCancelSale,
};
