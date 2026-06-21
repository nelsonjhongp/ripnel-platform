const express = require('express');
const { requireAuth, requirePermission } = require('../../middlewares/auth');
const {
  getLocations,
  postLocation,
  patchLocationById,
} = require('./locations.controller');

const router = express.Router();

router.use(requireAuth);
router.use(requirePermission('admin.manage'));

router.get('/', getLocations);
router.post('/', postLocation);
router.patch('/:locationId', patchLocationById);

module.exports = router;
