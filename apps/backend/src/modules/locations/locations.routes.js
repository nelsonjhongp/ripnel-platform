const express = require('express');
const { getLocations, postLocation } = require('./locations.controller');

const router = express.Router();

router.get('/', getLocations);
router.post('/', postLocation);

module.exports = router;
