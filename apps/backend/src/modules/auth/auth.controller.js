const { env } = require('../../config/env');
const { AppError } = require('../../shared/errors');
const { signJwt } = require('../../shared/jwt');
const { loginWithUsernamePassword, getMe, changePassword } = require('./auth.service');
const { buildSessionCookie } = require('./session-cookie');

async function login(req, res, next) {
  try {
    if (!env.jwtSecret) {
      throw new AppError('JWT_SECRET is not configured', 500);
    }

    const { username, password } = req.body || {};
    const { user, permissions } = await loginWithUsernamePassword({ username, password });

    const token = signJwt(
      {
        sub: user.user_id,
        role_id: user.role_id,
        role_name: user.role_name,
        permissions,
        must_change_password: user.must_change_password,
      },
      env.jwtSecret,
      { expiresInSeconds: 60 * 60 * 8 }
    );

    res.setHeader('Set-Cookie', buildSessionCookie({ token }));
    return res.status(200).json({ user, permissions });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const userId = req.auth?.sub;
    const data = await getMe({ userId });
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

async function postChangePassword(req, res, next) {
  try {
    if (!env.jwtSecret) {
      throw new AppError('JWT_SECRET is not configured', 500);
    }

    const data = await changePassword({
      userId: req.auth?.sub,
      currentPassword: req.body?.current_password,
      newPassword: req.body?.new_password,
    });

    const token = signJwt(
      {
        sub: data.user.user_id,
        role_id: data.user.role_id,
        role_name: data.user.role_name,
        permissions: data.permissions,
        must_change_password: data.user.must_change_password,
      },
      env.jwtSecret,
      { expiresInSeconds: 60 * 60 * 8 }
    );

    res.setHeader('Set-Cookie', buildSessionCookie({ token }));
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

async function logout(_req, res) {
  res.setHeader('Set-Cookie', buildSessionCookie({ clear: true }));
  return res.status(204).send();
}

module.exports = {
  login,
  me,
  postChangePassword,
  logout,
};

