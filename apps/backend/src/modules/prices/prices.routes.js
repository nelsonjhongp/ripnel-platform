const express = require('express');
const { requireAuth } = require('../../middlewares/auth');
const {
  getPrices,
  getPriceCatalog,
  getPriceCoverageGaps,
  getPriceWorkspaceByStyleId,
  postPrice,
  patchPriceById,
} = require('./prices.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/catalog', getPriceCatalog);
router.get('/workspace/:styleId', getPriceWorkspaceByStyleId);
router.get('/', getPrices);
router.get('/coverage-gaps', getPriceCoverageGaps);
router.post('/', postPrice);
router.patch('/:priceId', patchPriceById);

module.exports = router;
