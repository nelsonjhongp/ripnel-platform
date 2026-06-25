const express = require('express');
const { getRoles, getPermissions, postRole, patchRoleById } = require('./roles.controller');

const router = express.Router();

router.get('/', getRoles);
router.get('/permissions', getPermissions);
router.post('/', postRole);
router.patch('/:roleId', patchRoleById);

module.exports = router;
