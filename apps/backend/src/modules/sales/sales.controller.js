const {
  listSellableVariants,
  listSales,
  listReceiptQueue,
  getSale,
  createSale,
  retrySaleReceipt,
  processPendingReceiptQueue,
  getSalePdfLink,
  getSaleProformaPdf,
} = require('./sales.service');

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

async function getReceiptQueue(req, res, next) {
  try {
    const receipts = await listReceiptQueue({
      user_id: req.auth?.sub,
      queue_status: req.query.queue_status,
      limit: req.query.limit,
    });
    return res.json(receipts);
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

async function postRetrySaleReceipt(req, res, next) {
  try {
    const sale = await retrySaleReceipt({
      sale_id: req.params.saleId,
      user_id: req.auth?.sub,
    });
    return res.status(200).json(sale);
  } catch (error) {
    return next(error);
  }
}

async function postRetryPendingReceipts(req, res, next) {
  try {
    const result = await processPendingReceiptQueue({
      limit: req.body && req.body.limit,
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function getSalePdfFile(req, res, next) {
  try {
    const result = await getSalePdfLink({
      sale_id: req.params.saleId,
      user_id: req.auth?.sub,
      format: req.query.format,
    });

    return res.redirect(302, result.pdfUrl);
  } catch (error) {
    return next(error);
  }
}

async function getSaleProformaPdfFile(req, res, next) {
  try {
    const result = await getSaleProformaPdf({
      sale_id: req.params.saleId,
      user_id: req.auth?.sub,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${result.fileName}"`);
    return res.send(result.pdfBuffer);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getSellableVariants,
  getSales,
  getReceiptQueue,
  getSaleById,
  postSale,
  postRetrySaleReceipt,
  postRetryPendingReceipts,
  getSalePdfFile,
  getSaleProformaPdfFile,
};
