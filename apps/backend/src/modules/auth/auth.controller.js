const { env } = require('../../config/env');
const { AppError } = require('../../shared/errors');
const { signJwt } = require('../../shared/jwt');
const { loginWithUsernamePassword, getMe } = require('./auth.service');

function buildCookie({ token }) {
  const isProd = env.nodeEnv === 'production';
  const parts = [
    `ripnel_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
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
  logout,
};

