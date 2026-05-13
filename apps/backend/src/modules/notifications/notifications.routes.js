const express = require('express');
const { requireAuth } = require('../../middlewares/auth');
const { getTopbar } = require('./notifications.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/topbar', getTopbar);

module.exports = router;
