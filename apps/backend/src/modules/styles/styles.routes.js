const express = require('express');
const { getStyles, postStyle, patchStyleById } = require('./styles.controller');

const router = express.Router();

router.get('/', getStyles);
router.post('/', postStyle);
router.patch('/:styleId', patchStyleById);

module.exports = router;
