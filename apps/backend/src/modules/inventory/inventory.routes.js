const express = require('express');
const {
  getInventory,
  getKardex,
  getAdjustments,
  getAdjustment,
  postAdjustment,
  postConfirmAdjustment,
} = require('./inventory.controller');

const router = express.Router();

router.get('/', getInventory);
router.get('/kardex', getKardex);
router.get('/adjustments', getAdjustments);
router.get('/adjustments/:adjustmentId', getAdjustment);
router.post('/adjustments', postAdjustment);
router.post('/adjustments/:adjustmentId/confirm', postConfirmAdjustment);

module.exports = router;
