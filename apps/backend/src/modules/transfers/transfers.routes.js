const express = require('express');
const {
  getTransfers,
  getPendingReceipts,
  getTransfer,
  postTransfer,
  postShipTransfer,
  postReceiveTransfer,
  postCancelTransfer,
} = require('./transfers.controller');

const router = express.Router();

router.get('/', getTransfers);
router.get('/pending-receipts', getPendingReceipts);
router.get('/:transferId', getTransfer);
router.post('/', postTransfer);
router.post('/:transferId/ship', postShipTransfer);
router.post('/:transferId/receive', postReceiveTransfer);
router.post('/:transferId/cancel', postCancelTransfer);

module.exports = router;
