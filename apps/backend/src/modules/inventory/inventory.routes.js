const express = require('express');
const {
  getInventory,
  getKardex,
  getAdjustments,
  getAdjustmentVariants,
  getAdjustment,
  postAdjustment,
  postConfirmAdjustment,
  postCancelAdjustment,
} = require('./inventory.controller');

const router = express.Router();

router.get('/', getInventory);
router.get('/kardex', getKardex);
router.get('/adjustment-variants', getAdjustmentVariants);
router.get('/adjustments', getAdjustments);
router.get('/adjustments/:adjustmentId', getAdjustment);
router.post('/adjustments', postAdjustment);
router.post('/adjustments/:adjustmentId/confirm', postConfirmAdjustment);
router.post('/adjustments/:adjustmentId/cancel', postCancelAdjustment);

module.exports = router;
