const express = require('express');
const { requireAuth, requirePermission } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');
const { createSale } = require('../../shared/schemas');
const {
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
} = require('./sales.controller');

const router = express.Router();

router.use(requireAuth, requirePermission('sales.pos'));

router.get('/context', getSalesPosContext);
router.get('/sellable-variants', getSellableVariants);
router.get('/receipts/queue', getReceiptQueue);
router.post('/receipts/retry-pending', postRetryPendingReceipts);
router.get('/analytics/customers', getCustomersAnalytics);
router.get('/', getSales);
router.get('/:saleId/proforma-pdf', getSaleProformaPdfFile);
router.get('/:saleId/pdf', getSalePdfFile);
router.post('/:saleId/retry-receipt', postRetrySaleReceipt);
router.get('/:saleId', getSaleById);
router.post('/', validate(createSale), postSale);

module.exports = router;
