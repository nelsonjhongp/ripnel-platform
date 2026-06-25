const express = require('express');
const {
  getLocations,
  postLocation,
  patchLocationById,
} = require('./locations.controller');

const router = express.Router();

router.get('/', getLocations);
router.post('/', postLocation);
router.patch('/:locationId', patchLocationById);

module.exports = router;
