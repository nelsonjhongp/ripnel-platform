const express = require('express');
const rateLimit = require('express-rate-limit');
const { login, me, postChangePassword, logout } = require('./auth.controller');
const { requireAuth, requireTrustedOriginMiddleware } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');
const { login: loginSchema, changePassword: changePasswordSchema } = require('../../shared/schemas');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    message: 'Too many login attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

router.post('/login', loginLimiter, validate(loginSchema), login);
router.get('/me', requireAuth, me);
router.post('/change-password', requireAuth, requireTrustedOriginMiddleware, validate(changePasswordSchema), postChangePassword);
router.post('/logout', requireTrustedOriginMiddleware, logout);

module.exports = router;

