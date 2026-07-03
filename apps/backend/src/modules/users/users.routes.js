const express = require('express');
const { requireAuth, requirePermission, requireSelfOrPermission } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');
const { createUser, patchUser, resetUserPassword: resetUserPasswordSchema } = require('../../shared/schemas');
const {
  getUsers,
  postUser,
  patchUserById,
  getUserLocationsByUserId,
  putUserLocationsByUserId,
  resetUserPassword,
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
  putUserLocationsByUserId
);
router.patch('/:userId', requireAuth, requirePermission('admin.manage'), validate(patchUser), patchUserById);
router.post(
  '/:userId/reset-password',
  requireAuth,
  requirePermission('admin.manage'),
  validate(resetUserPasswordSchema),
  resetUserPassword
);

module.exports = router;
