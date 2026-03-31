const express = require('express');
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
router.get('/:userId/locations', getUserLocationsByUserId);
router.put('/:userId/locations', putUserLocationsByUserId);
router.patch('/:userId', patchUserById);

module.exports = router;
