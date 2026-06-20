const express = require('express');
const { requireAuth, requirePermission } = require('../../middlewares/auth');
const {
  getStyleVariantsConfig,
  putStyleVariantsConfig,
  postGenerateStyleVariants,
  patchVariantById,
} = require('./variants.controller');

const router = express.Router();

router.get('/styles/:styleId', requireAuth, requirePermission('products.manage'), getStyleVariantsConfig);
router.put('/styles/:styleId/config', requireAuth, requirePermission('products.manage'), putStyleVariantsConfig);
router.post('/styles/:styleId/generate', requireAuth, requirePermission('products.manage'), postGenerateStyleVariants);
router.patch('/:variantId', requireAuth, requirePermission('products.manage'), patchVariantById);

module.exports = router;
