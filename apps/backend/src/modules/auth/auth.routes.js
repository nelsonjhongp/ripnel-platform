const express = require('express');
const { login, me, logout } = require('./auth.controller');
const { requireAuth } = require('../../middlewares/auth');

const router = express.Router();

router.post('/login', login);
router.get('/me', requireAuth, me);
router.post('/logout', requireAuth, logout);

module.exports = router;

