const {
  listTransfers,
  listPendingReceipts,
  getTransferById,
  createTransfer,
  shipTransferById,
  receiveTransferById,
  cancelTransferById,
} = require('./transfers.service');

async function getTransfers(req, res, next) {
  try {
    const transfers = await listTransfers(req.query, req.auth);
    res.json({ ok: true, data: transfers });
  } catch (error) {
    next(error);
  }
}

async function getPendingReceipts(req, res, next) {
  try {
    const transfers = await listPendingReceipts(req.auth);
    res.json({ ok: true, data: transfers });
  } catch (error) {
    next(error);
  }
}

async function getTransfer(req, res, next) {
  try {
    const transfer = await getTransferById(req.params.transferId, req.auth);
    res.json({ ok: true, data: transfer });
  } catch (error) {
    next(error);
  }
}

async function postTransfer(req, res, next) {
  try {
    const transfer = await createTransfer(req.body, req.auth);
    res.status(201).json({ ok: true, data: transfer });
  } catch (error) {
    next(error);
  }
}

async function postShipTransfer(req, res, next) {
  try {
    const transfer = await shipTransferById(req.params.transferId, req.body, req.auth);
    res.json({ ok: true, data: transfer });
  } catch (error) {
    next(error);
  }
}

async function postReceiveTransfer(req, res, next) {
  try {
    const transfer = await receiveTransferById(req.params.transferId, req.body, req.auth);
    res.json({ ok: true, data: transfer });
  } catch (error) {
    next(error);
  }
}

async function postCancelTransfer(req, res, next) {
  try {
    const transfer = await cancelTransferById(req.params.transferId, req.body, req.auth);
    res.json({ ok: true, data: transfer });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTransfers,
  getPendingReceipts,
  getTransfer,
  postTransfer,
  postShipTransfer,
  postReceiveTransfer,
  postCancelTransfer,
};
