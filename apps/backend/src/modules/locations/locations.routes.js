const express = require('express');
const { requireAuth, requirePermission } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');
const { createLocation, patchLocation } = require('../../shared/schemas');
const {
  getLocations,
  postLocation,
  patchLocationById,
} = require('./locations.controller');

const router = express.Router();

router.get('/', requireAuth, getLocations);
router.post('/', requireAuth, requirePermission('admin.manage'), validate(createLocation), postLocation);
router.patch('/:locationId', requireAuth, requirePermission('admin.manage'), validate(patchLocation), patchLocationById);

module.exports = router;
