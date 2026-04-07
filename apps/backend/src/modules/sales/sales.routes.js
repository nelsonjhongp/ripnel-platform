const express = require('express');
const { getSellableVariants, getSales, getSaleById, postSale } = require('./sales.controller');

const router = express.Router();

router.get('/sellable-variants', getSellableVariants);
router.get('/', getSales);
router.get('/:saleId', getSaleById);
router.post('/', postSale);

module.exports = router;
