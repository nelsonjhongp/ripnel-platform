const express = require('express');
const {
  getPrices,
  getPriceCoverageGaps,
  postPrice,
  patchPriceById,
} = require('./prices.controller');

const router = express.Router();

router.get('/', getPrices);
router.get('/coverage-gaps', getPriceCoverageGaps);
router.post('/', postPrice);
router.patch('/:priceId', patchPriceById);

module.exports = router;
