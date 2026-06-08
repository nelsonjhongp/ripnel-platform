const express = require('express');
const { requireAuth, requirePermission } = require('../../middlewares/auth');
const {
  getInventory,
  getInventoryProductSummary,
  getInventoryLocationSummary,
  getInventoryStyle,
  getKardex,
  getAdjustments,
  getAdjustmentVariants,
  getAdjustment,
  postAdjustment,
  postConfirmAdjustment,
  postCancelAdjustment,
} = require('./inventory.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/', requirePermission('inventory.view'), getInventory);
router.get('/summary/products', requirePermission('inventory.view'), getInventoryProductSummary);
router.get('/summary/locations', requirePermission('inventory.view'), getInventoryLocationSummary);
router.get('/styles/:styleId', requirePermission('inventory.view'), getInventoryStyle);
router.get('/kardex', requirePermission('inventory.view'), getKardex);
router.get('/adjustment-variants', requirePermission('inventory.adjust'), getAdjustmentVariants);
router.get('/adjustments', requirePermission('inventory.adjust'), getAdjustments);
router.get('/adjustments/:adjustmentId', requirePermission('inventory.adjust'), getAdjustment);
router.post('/adjustments', requirePermission('inventory.adjust'), postAdjustment);
router.post('/adjustments/:adjustmentId/confirm', requirePermission('inventory.adjust'), postConfirmAdjustment);
router.post('/adjustments/:adjustmentId/cancel', requirePermission('inventory.adjust'), postCancelAdjustment);

module.exports = router;
