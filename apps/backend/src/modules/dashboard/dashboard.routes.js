const express = require('express');
const { requireAuth } = require('../../middlewares/auth');
const { getOverview, getActivity, getDepartmentSales } = require('./dashboard.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/overview', getOverview);
router.get('/activity', getActivity);
router.get('/sales-by-department', getDepartmentSales);

module.exports = router;
