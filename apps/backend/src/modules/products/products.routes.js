const express = require('express');
const {
  getProducts,
  getProductWorkspaceByStyleId,
} = require('./products.controller');

const router = express.Router();

router.get('/', getProducts);
router.get('/:styleId/workspace', getProductWorkspaceByStyleId);

module.exports = router;
