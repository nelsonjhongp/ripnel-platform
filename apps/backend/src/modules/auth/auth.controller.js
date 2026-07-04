const { env } = require('../../config/env');
const { AppError } = require('../../shared/errors');
const { parseCookies } = require('../../shared/cookies');
const { verifyJwt } = require('../../shared/jwt');
const {
  loginWithUsernamePassword,
  getMe,
  changePassword,
  rotateRefreshSession,
  logoutSession,
} = require('./auth.service');
const { buildSessionCookie, buildRefreshCookie } = require('./session-cookie');

function getIp(req) {
  return req.ip || req.socket?.remoteAddress || null;
}

function readRefreshCookie(req) {
  const cookies = parseCookies(req.headers.cookie);
  const raw = cookies.ripnel_refresh;
  return raw ? decodeURIComponent(raw) : null;
}

async function login(req, res, next) {
  try {
    if (!env.jwtSecret) {
      throw new AppError('JWT_SECRET is not configured', 500);
    }

    const { username, password } = req.body || {};
    const { user, permissions, pair } = await loginWithUsernamePassword({
      username,
      password,
      ip: getIp(req),
    });

    res.setHeader('Set-Cookie', [
      buildSessionCookie({ token: pair.access }),
      buildRefreshCookie({ token: pair.refresh }),
    ]);
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
      jti: req.auth?.jti,
      currentPassword: req.body?.current_password,
      newPassword: req.body?.new_password,
      ip: getIp(req),
    });

    res.setHeader('Set-Cookie', [
      buildSessionCookie({ token: data.pair.access }),
      buildRefreshCookie({ token: data.pair.refresh }),
    ]);
    return res.status(200).json({ user: data.user, permissions: data.permissions });
  } catch (error) {
    return next(error);
  }
}

async function refresh(req, res, next) {
  try {
    if (!env.jwtSecret) {
      throw new AppError('JWT_SECRET is not configured', 500);
    }

    const rawRefresh = readRefreshCookie(req);
    const { pair } = await rotateRefreshSession({ rawRefresh, ip: getIp(req) });

    res.setHeader('Set-Cookie', [
      buildSessionCookie({ token: pair.access }),
      buildRefreshCookie({ token: pair.refresh }),
    ]);
    return res.status(200).json({ ok: true });
  } catch (error) {
    // Clear cookies on refresh failure so the client re-authenticates.
    res.setHeader('Set-Cookie', [
      buildSessionCookie({ clear: true }),
      buildRefreshCookie({ clear: true }),
    ]);
    return next(error);
  }
}

async function logout(req, res) {
  try {
    const rawRefresh = readRefreshCookie(req);
    // Best-effort access revocation: if the access cookie is still verifiable
    // we collect jti+sub to revoke; otherwise we only revoke refresh tokens.
    const cookies = parseCookies(req.headers.cookie);
    const accessCookie = cookies.ripnel_session ? decodeURIComponent(cookies.ripnel_session) : null;
    let authClaims = null;
    if (accessCookie && env.jwtSecret) {
      const result = verifyJwt(accessCookie, env.jwtSecret);
      if (result.ok) authClaims = result.payload;
    }
    await logoutSession({
      jti: authClaims?.jti,
      userId: authClaims?.sub,
      rawRefresh,
    });
  } catch {
    // best effort — clear cookies regardless
  }

  res.setHeader('Set-Cookie', [
    buildSessionCookie({ clear: true }),
    buildRefreshCookie({ clear: true }),
  ]);
  return res.status(204).send();
}

module.exports = {
  login,
  me,
  postChangePassword,
  refresh,
  logout,
};