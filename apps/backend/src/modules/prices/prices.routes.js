const express = require('express');
const { getPrices, postPrice, patchPriceById } = require('./prices.controller');

const router = express.Router();

router.get('/', getPrices);
router.post('/', postPrice);
router.patch('/:priceId', patchPriceById);

module.exports = router;
