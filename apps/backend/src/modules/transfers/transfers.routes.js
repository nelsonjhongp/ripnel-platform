const express = require('express');
const { requireAuth } = require('../../middlewares/auth');
const {
  getTransfers,
  getTransferInbox,
  getPendingReceipts,
  getTransferRequestCandidates,
  getTransfer,
  postTransfer,
  postApproveTransfer,
  postShipTransfer,
  postReceiveTransfer,
  postCancelTransfer,
} = require('./transfers.controller');
const { requireTransferCapability } = require('./transfers-access');

const router = express.Router();

router.use(requireAuth);

router.get('/inbox', requireTransferCapability('visible'), getTransferInbox);
router.get('/', requireTransferCapability('visible'), getTransfers);
router.get('/pending-receipts', requireTransferCapability('receive'), getPendingReceipts);
router.get('/request-candidates', requireTransferCapability('request_create'), getTransferRequestCandidates);
router.get('/:transferId', requireTransferCapability('visible'), getTransfer);
router.post('/', requireTransferCapability('request_create'), postTransfer);
router.post('/:transferId/approve', requireTransferCapability('approve'), postApproveTransfer);
router.post('/:transferId/ship', requireTransferCapability('ship'), postShipTransfer);
router.post('/:transferId/receive', requireTransferCapability('receive'), postReceiveTransfer);
router.post('/:transferId/cancel', requireTransferCapability('visible'), postCancelTransfer);

module.exports = router;
