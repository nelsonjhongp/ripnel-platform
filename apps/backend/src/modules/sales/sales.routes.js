const express = require('express');
const { requireAuth, requirePermission } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');
const { createSale } = require('../../shared/schemas');
const {
	getSalesPosContext,
	getSellableVariants,
	getSales,
	getCustomersAnalytics,
	getSaleById,
	postSale,
	getSaleProformaPdfFile,
} = require('./sales.controller');

const router = express.Router();

router.use(requireAuth, requirePermission('sales.pos'));

router.get('/context', getSalesPosContext);
router.get('/sellable-variants', getSellableVariants);
router.get('/analytics/customers', getCustomersAnalytics);
router.get('/', getSales);
router.get('/:saleId/proforma-pdf', getSaleProformaPdfFile);
router.get('/:saleId', getSaleById);
router.post('/', validate(createSale), postSale);

module.exports = router;
