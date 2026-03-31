const express = require('express');
const { getRoles, postRole, patchRoleById } = require('./roles.controller');

const router = express.Router();

router.get('/', getRoles);
router.post('/', postRole);
router.patch('/:roleId', patchRoleById);

module.exports = router;
