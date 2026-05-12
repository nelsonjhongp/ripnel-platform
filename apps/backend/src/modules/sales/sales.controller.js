const {
  getPosContext,
  listSellableVariants,
  listSales,
  listReceiptQueue,
  getCustomerAnalytics,
  getSale,
  createSale,
  retrySaleReceipt,
  processPendingReceiptQueue,
  getSalePdfLink,
  getSaleProformaPdf,
} = require('./sales.service');

async function getSalesPosContext(req, res, next) {
  try {
    const context = await getPosContext({
      user_id: req.auth?.sub,
    });
    return res.json(context);
  } catch (error) {
    return next(error);
  }
}

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
      customer_q: req.query.customer_q,
      user_q: req.query.user_q,
      cash_status: req.query.cash_status,
      document_type: req.query.document_type,
      receipt_status: req.query.receipt_status,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      limit: req.query.limit,
      offset: req.query.offset,
      page: req.query.page,
      page_size: req.query.page_size,
      cursor: req.query.cursor,
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

async function getCustomersAnalytics(req, res, next) {
  try {
    const analytics = await getCustomerAnalytics({
      user_id: req.auth?.sub,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      limit: req.query.limit,
    });
    return res.json(analytics);
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
  getSalesPosContext,
  getSellableVariants,
  getSales,
  getReceiptQueue,
  getCustomersAnalytics,
  getSaleById,
  postSale,
  postRetrySaleReceipt,
  postRetryPendingReceipts,
  getSalePdfFile,
  getSaleProformaPdfFile,
};
