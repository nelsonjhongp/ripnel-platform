const express = require('express');
const { requireAuth, requirePermission } = require('../../middlewares/auth');
const { getSellableVariants, getSales, getSaleById, postSale } = require('./sales.controller');

const router = express.Router();

router.use(requireAuth, requirePermission('sales.pos'));

router.get('/sellable-variants', getSellableVariants);
router.get('/', getSales);
router.get('/:saleId', getSaleById);
router.post('/', postSale);

module.exports = router;
