const express = require('express');
const { requireAuth, requirePermission } = require('../../middlewares/auth');
const { getStyles, postStyle, patchStyleById } = require('./styles.controller');

const router = express.Router();

router.get('/', requireAuth, requirePermission('products.manage'), getStyles);
router.post('/', requireAuth, requirePermission('products.manage'), postStyle);
router.patch('/:styleId', requireAuth, requirePermission('products.manage'), patchStyleById);

module.exports = router;
