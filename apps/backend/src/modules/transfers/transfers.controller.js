const {
  listTransfers,
  listPendingReceipts,
  getTransferById,
  createTransfer,
  shipTransferById,
  receiveTransferById,
} = require('./transfers.service');

async function getTransfers(req, res, next) {
  try {
    const transfers = await listTransfers(req.query);
    res.json({ ok: true, data: transfers });
  } catch (error) {
    next(error);
  }
}

async function getPendingReceipts(req, res, next) {
  try {
    const transfers = await listPendingReceipts();
    res.json({ ok: true, data: transfers });
  } catch (error) {
    next(error);
  }
}

async function getTransfer(req, res, next) {
  try {
    const transfer = await getTransferById(req.params.transferId);
    res.json({ ok: true, data: transfer });
  } catch (error) {
    next(error);
  }
}

async function postTransfer(req, res, next) {
  try {
    const transfer = await createTransfer(req.body);
    res.status(201).json({ ok: true, data: transfer });
  } catch (error) {
    next(error);
  }
}

async function postShipTransfer(req, res, next) {
  try {
    const transfer = await shipTransferById(req.params.transferId, req.body);
    res.json({ ok: true, data: transfer });
  } catch (error) {
    next(error);
  }
}

async function postReceiveTransfer(req, res, next) {
  try {
    const transfer = await receiveTransferById(req.params.transferId, req.body);
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
};
