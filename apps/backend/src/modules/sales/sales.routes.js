const express = require('express');
const { requireAuth, requirePermission } = require('../../middlewares/auth');
const {
	getSalesPosContext,
	getSellableVariants,
	getSales,
	getReceiptQueue,
	getSaleById,
	postSale,
	postRetrySaleReceipt,
	postRetryPendingReceipts,
	getSalePdfFile,
	getSaleProformaPdfFile,
} = require('./sales.controller');

const router = express.Router();

router.use(requireAuth, requirePermission('sales.pos'));

router.get('/context', getSalesPosContext);
router.get('/sellable-variants', getSellableVariants);
router.get('/receipts/queue', getReceiptQueue);
router.post('/receipts/retry-pending', postRetryPendingReceipts);
router.get('/', getSales);
router.get('/:saleId/proforma-pdf', getSaleProformaPdfFile);
router.get('/:saleId/pdf', getSalePdfFile);
router.post('/:saleId/retry-receipt', postRetrySaleReceipt);
router.get('/:saleId', getSaleById);
router.post('/', postSale);

module.exports = router;
