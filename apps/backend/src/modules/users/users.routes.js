const express = require('express');
const { requireAuth, requireSelfOrPermission } = require('../../middlewares/auth');
const {
  getUsers,
  postUser,
  patchUserById,
  getUserLocationsByUserId,
  putUserLocationsByUserId,
} = require('./users.controller');

const router = express.Router();

router.get('/', getUsers);
router.post('/', postUser);
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
router.patch('/:userId', patchUserById);

module.exports = router;
