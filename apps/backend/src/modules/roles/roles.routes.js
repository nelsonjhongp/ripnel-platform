const express = require('express');
const { requireAuth, requirePermission } = require('../../middlewares/auth');
const { getRoles, getPermissions, postRole, patchRoleById } = require('./roles.controller');

const router = express.Router();

router.use(requireAuth);
router.use(requirePermission('admin.manage'));

router.get('/', getRoles);
router.get('/permissions', getPermissions);
router.post('/', postRole);
router.patch('/:roleId', patchRoleById);

module.exports = router;
