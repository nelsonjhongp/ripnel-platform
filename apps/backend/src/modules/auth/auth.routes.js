const express = require('express');
const { login, me, postChangePassword, logout } = require('./auth.controller');
const { requireAuth, requireTrustedOriginMiddleware } = require('../../middlewares/auth');

const router = express.Router();

router.post('/login', login);
router.get('/me', requireAuth, me);
router.post('/change-password', requireAuth, requireTrustedOriginMiddleware, postChangePassword);
router.post('/logout', requireTrustedOriginMiddleware, logout);

module.exports = router;

