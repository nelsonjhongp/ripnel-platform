const express = require('express');
const { requireAuth, requirePermission, requireSelfOrPermission } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');
const { createUser, patchUser, userAssignments } = require('../../shared/schemas');
const {
  getUsers,
  postUser,
  patchUserById,
  getUserLocationsByUserId,
  putUserLocationsByUserId,
} = require('./users.controller');

const router = express.Router();

router.get('/', requireAuth, requirePermission('admin.manage'), getUsers);
router.post('/', requireAuth, requirePermission('admin.manage'), validate(createUser), postUser);
router.get(
  '/:userId/locations',
  requireAuth,
  requireSelfOrPermission('admin.manage'),
  getUserLocationsByUserId
);
router.put(
  '/:userId/locations',
  requireAuth,
  requireSelfOrPermission('admin.manage'),
  validate(userAssignments),
  putUserLocationsByUserId
);
router.patch('/:userId', requireAuth, requirePermission('admin.manage'), validate(patchUser), patchUserById);

module.exports = router;
