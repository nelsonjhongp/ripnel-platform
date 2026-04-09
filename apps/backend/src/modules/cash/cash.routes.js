const express = require('express');
const { requireAuth, requireAnyPermission } = require('../../middlewares/auth');
const {
  getCashClosings,
  getCashCurrent,
  getCashClosingById,
  postOpenCash,
  patchCloseCash,
} = require('./cash.controller');

const router = express.Router();

router.use(requireAuth, requireAnyPermission(['sales.pos']));

router.get('/', getCashClosings);
router.get('/current', getCashCurrent);
router.get('/:id', getCashClosingById);
router.post('/open', postOpenCash);
router.patch('/:id/close', patchCloseCash);

module.exports = router;
