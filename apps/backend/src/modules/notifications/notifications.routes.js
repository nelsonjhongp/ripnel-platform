const express = require('express');
const { requireAuth } = require('../../middlewares/auth');
const { getTopbar, getAll } = require('./notifications.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/', getAll);
router.get('/topbar', getTopbar);

module.exports = router;
