const express = require('express');
const { requireAuth } = require('../../middlewares/auth');
const {
  getProducts,
  getProductWorkspaceByStyleId,
} = require('./products.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/', getProducts);
router.get('/:styleId/workspace', getProductWorkspaceByStyleId);

module.exports = router;
