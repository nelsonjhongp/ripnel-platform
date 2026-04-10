const express = require('express');
const { requireAuth, requireAnyRole } = require('../../middlewares/auth');
const {
  getCashClosings,
  getCashCurrent,
  getCashClosingById,
  postOpenCash,
  patchCloseCash,
} = require('./cash.controller');

const router = express.Router();

router.use(requireAuth, requireAnyRole(['ADMIN', 'CAJA']));

router.get('/', getCashClosings);
router.get('/current', getCashCurrent);
router.get('/:id', getCashClosingById);
router.post('/open', postOpenCash);
router.patch('/:id/close', patchCloseCash);

module.exports = router;
