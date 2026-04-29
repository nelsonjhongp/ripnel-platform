const express = require('express');
const { requireAuth } = require('../../middlewares/auth');
const { getOverview } = require('./home.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/overview', getOverview);

module.exports = router;
