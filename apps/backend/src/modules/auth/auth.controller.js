const { env } = require('../../config/env');
const { AppError } = require('../../shared/errors');
const { signJwt } = require('../../shared/jwt');
const { loginWithUsernamePassword, getMe, changePassword } = require('./auth.service');

function buildCookie({ token }) {
  const isProd = env.nodeEnv === 'production';
  const parts = [
    `ripnel_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    // In production we need cookies to be sent on cross-site XHR/fetch requests
    // (frontend and backend live on different origins). Browsers require
    // `SameSite=None; Secure` for cross-site cookies. For local development
    // keep `Lax` to avoid exposing cookies unnecessarily.
    isProd ? 'SameSite=None' : 'SameSite=Lax',
    `Max-Age=${60 * 60 * 8}`,
  ];

  if (isProd) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

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

    res.setHeader('Set-Cookie', buildCookie({ token }));
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

    res.setHeader('Set-Cookie', buildCookie({ token }));
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

async function logout(_req, res) {
  res.setHeader(
    'Set-Cookie',
    'ripnel_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );
  return res.status(204).send();
}

module.exports = {
  login,
  me,
  postChangePassword,
  logout,
};

