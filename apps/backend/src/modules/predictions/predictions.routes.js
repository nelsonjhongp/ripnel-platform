const express = require('express');
const { requireAuth, requirePermission } = require('../../middlewares/auth');
const { getStockRisk } = require('./predictions.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/stock-risk', requirePermission('inventory.view'), getStockRisk);

module.exports = router;
