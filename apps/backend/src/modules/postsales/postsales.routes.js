const express = require('express');
const { requireAuth, requirePermission } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');
const { createExchange, cancelSale } = require('../../shared/schemas');
const {
  getEligiblePostsales,
  getPostsaleById,
  postSimpleExchange,
  postCancelSale,
} = require('./postsales.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/eligible', requirePermission('sales.postsale.view'), getEligiblePostsales);
router.get('/:saleId', requirePermission('sales.postsale.view'), getPostsaleById);
router.post('/:saleId/exchanges', requirePermission('sales.postsale.exchange'), validate(createExchange), postSimpleExchange);
router.post('/:saleId/cancel', requirePermission('sales.postsale.cancel'), validate(cancelSale), postCancelSale);

module.exports = router;
