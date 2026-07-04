const express = require('express');
const rateLimit = require('express-rate-limit');
const { login, me, postChangePassword, refresh, logout } = require('./auth.controller');
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

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    message: 'Too many refresh attempts, please log in again',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    message: 'Too many attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

router.post('/login', loginLimiter, requireTrustedOriginMiddleware, validate(loginSchema), login);
router.post('/refresh', refreshLimiter, requireTrustedOriginMiddleware, refresh);
router.get('/me', requireAuth, me);
router.post(
  '/change-password',
  requireAuth,
  requireTrustedOriginMiddleware,
  sensitiveLimiter,
  validate(changePasswordSchema),
  postChangePassword
);
router.post('/logout', requireTrustedOriginMiddleware, logout);

module.exports = router;