const express = require('express');
const {
  getStyleVariantsConfig,
  putStyleVariantsConfig,
  postGenerateStyleVariants,
  patchVariantById,
} = require('./variants.controller');

const router = express.Router();

router.get('/styles/:styleId', getStyleVariantsConfig);
router.put('/styles/:styleId/config', putStyleVariantsConfig);
router.post('/styles/:styleId/generate', postGenerateStyleVariants);
router.patch('/:variantId', patchVariantById);

module.exports = router;
