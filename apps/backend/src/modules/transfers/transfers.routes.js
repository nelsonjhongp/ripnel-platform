const express = require('express');
const {
  getTransfers,
  getPendingReceipts,
  getTransfer,
  postTransfer,
  postShipTransfer,
  postReceiveTransfer,
} = require('./transfers.controller');

const router = express.Router();

router.get('/', getTransfers);
router.get('/pending-receipts', getPendingReceipts);
router.get('/:transferId', getTransfer);
router.post('/', postTransfer);
router.post('/:transferId/ship', postShipTransfer);
router.post('/:transferId/receive', postReceiveTransfer);

module.exports = router;
