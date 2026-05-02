const express = require('express');
const { requireAuth, requirePermission, requireSelfOrPermission } = require('../../middlewares/auth');
const {
  getUsers,
  postUser,
  patchUserById,
  getUserLocationsByUserId,
  putUserLocationsByUserId,
} = require('./users.controller');

const router = express.Router();

router.get('/', requireAuth, requirePermission('admin.manage'), getUsers);
router.post('/', requireAuth, requirePermission('admin.manage'), postUser);
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
router.patch('/:userId', requireAuth, requirePermission('admin.manage'), patchUserById);

module.exports = router;
