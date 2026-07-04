const { env } = require('../config/env');
const { AppError } = require('../shared/errors');
const { parseCookies } = require('../shared/cookies');
const { verifyJwt } = require('../shared/jwt');
const {
  isAccessRevoked,
  rotateRefreshSession,
} = require('../modules/auth/auth.service');
const {
  buildSessionCookie,
  buildRefreshCookie,
} = require('../modules/auth/session-cookie');

const PASSWORD_CHANGE_ALLOWED_PATHS = [
  ['GET', '/api/auth/me'],
  ['POST', '/api/auth/change-password'],
  ['POST', '/api/auth/logout'],
  ['POST', '/api/auth/refresh'],
];

function normalizeOrigin(value) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch (error) {
    return String(value).replace(/\/+$/, '');
  }
}

function isPrivateIpv4(hostname) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname || '')) {
    return false;
  }

  const [a, b] = hostname.split('.').map(Number);

  return (
    a === 10 ||
    a === 127 ||
    (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31)
  );
}

function isAllowedDevOrigin(origin) {
  try {
    const { hostname } = new URL(origin);
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }
    return isPrivateIpv4(hostname);
  } catch (error) {
    return false;
  }
}

function getTrustedOrigins() {
  const origins = new Set();
  const wildcardHostPatterns = [];

  const configuredFrontendOrigin = normalizeOrigin(env.frontendUrl);
  if (configuredFrontendOrigin) {
    origins.add(configuredFrontendOrigin);
  }

  for (const part of String(process.env.ALLOWED_ORIGINS || '').split(',')) {
    const trimmed = String(part || '').trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.includes('*')) {
      wildcardHostPatterns.push(trimmed.replace(/^\*\./, '').toLowerCase());
      continue;
    }

    const normalized = normalizeOrigin(trimmed);
    if (normalized) {
      origins.add(normalized);
    }
  }

  return {
    origins,
    wildcardHostPatterns,
  };
}

function isTrustedOrigin(originValue) {
  const normalizedOrigin = normalizeOrigin(originValue);
  if (!normalizedOrigin) {
    return false;
  }

  if (env.nodeEnv !== 'production' && isAllowedDevOrigin(normalizedOrigin)) {
    return true;
  }

  const { origins, wildcardHostPatterns } = getTrustedOrigins();
  if (origins.has(normalizedOrigin)) {
    return true;
  }

  try {
    const hostname = new URL(normalizedOrigin).hostname.toLowerCase();
    return wildcardHostPatterns.some((pattern) => hostname === pattern || hostname.endsWith(`.${pattern}`));
  } catch (error) {
    return false;
  }
}

function requireTrustedOrigin(req) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return;
  }

  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;
  const candidate = originHeader || refererHeader;

  if (!candidate) {
    if (env.nodeEnv === 'production') {
      throw new AppError('Missing trusted origin for authenticated request', 403, {
        code: 'CSRF_ORIGIN_REQUIRED',
      });
    }
    return;
  }

  if (!isTrustedOrigin(candidate)) {
    throw new AppError('Cross-site request blocked', 403, {
      code: 'CSRF_ORIGIN_DENIED',
    });
  }
}

function requireTrustedOriginMiddleware(req, _res, next) {
  try {
    requireTrustedOrigin(req);
    return next();
  } catch (error) {
    return next(error);
  }
}

function applyMustChangePasswordGate(req) {
  if (!req.auth?.must_change_password) return;

  const allowed = PASSWORD_CHANGE_ALLOWED_PATHS.some(
    ([method, path]) => req.method === method && req.originalUrl.split('?')[0] === path
  );

  if (!allowed) {
    throw new AppError('Password change required', 403, { code: 'PASSWORD_CHANGE_REQUIRED' });
  }
}

async function requireAuth(req, res, next) {
  if (!env.jwtSecret) {
    return next(new AppError('JWT_SECRET is not configured', 500, { code: 'CONFIG_ERROR' }));
  }

  try {
    requireTrustedOrigin(req);

    const cookies = parseCookies(req.headers.cookie);
    const accessCookie = cookies.ripnel_session
      ? decodeURIComponent(cookies.ripnel_session)
      : null;

    if (accessCookie) {
      const result = verifyJwt(accessCookie, env.jwtSecret);
      if (result.ok) {
        if (result.payload?.jti && (await isAccessRevoked(result.payload.jti))) {
          return next(
            new AppError('Session revoked', 401, { code: 'SESSION_REVOKED' })
          );
        }
        req.auth = result.payload;
        applyMustChangePasswordGate(req);
        return next();
      }
      if (result.reason !== 'expired') {
        return next(new AppError('Invalid session', 401, { code: 'INVALID_SESSION' }));
      }
    }

    // Access missing or expired — attempt transparent refresh.
    const rawRefresh = cookies.ripnel_refresh
      ? decodeURIComponent(cookies.ripnel_refresh)
      : null;

    if (rawRefresh) {
      try {
        const { pair, permissions, user } = await rotateRefreshSession({
          rawRefresh,
          ip: req.ip || req.socket?.remoteAddress || null,
        });
        res.setHeader('Set-Cookie', [
          buildSessionCookie({ token: pair.access }),
          buildRefreshCookie({ token: pair.refresh }),
        ]);
        req.auth = {
          sub: user.user_id,
          role_id: user.role_id,
          role_name: user.role_name,
          permissions,
          must_change_password: Boolean(user.must_change_password),
        };
        applyMustChangePasswordGate(req);
        return next();
      } catch (refreshError) {
        // Refresh invalid — clear both cookies and force re-login.
        res.setHeader('Set-Cookie', [
          buildSessionCookie({ clear: true }),
          buildRefreshCookie({ clear: true }),
        ]);
        if (refreshError instanceof AppError) {
          return next(refreshError);
        }
        return next(new AppError('Session expired', 401, { code: 'SESSION_EXPIRED' }));
      }
    }

    return next(new AppError('Not authenticated', 401, { code: 'AUTH_REQUIRED' }));
  } catch (error) {
    return next(error);
  }
}

function requirePermission(permissionKey) {
  return function requirePermissionMiddleware(req, _res, next) {
    const permissions = req.auth?.permissions;
    if (
      Array.isArray(permissions) &&
      (permissions.includes('admin.manage') || permissions.includes(permissionKey))
    ) {
      return next();
    }

    return next(new AppError('Forbidden', 403, { code: 'FORBIDDEN' }));
  };
}

function requireAnyPermission(permissionKeys) {
  return function requireAnyPermissionMiddleware(req, _res, next) {
    const permissions = req.auth?.permissions;

    if (
      Array.isArray(permissions) &&
      (permissions.includes('admin.manage') ||
        (Array.isArray(permissionKeys) &&
          permissionKeys.some((permissionKey) => permissions.includes(permissionKey))))
    ) {
      return next();
    }

    return next(new AppError('Forbidden', 403, { code: 'FORBIDDEN' }));
  };
}

function requireAnyRole(roleNames) {
  return function requireAnyRoleMiddleware(req, _res, next) {
    const roleName = req.auth?.role_name;

    if (
      roleName &&
      Array.isArray(roleNames) &&
      roleNames.includes(roleName)
    ) {
      return next();
    }

    return next(new AppError('Forbidden', 403, { code: 'FORBIDDEN_ROLE' }));
  };
}

function requireSelfOrPermission(permissionKey, paramName = 'userId') {
  return function requireSelfOrPermissionMiddleware(req, _res, next) {
    const authenticatedUserId = req.auth?.sub;
    const targetUserId = req.params?.[paramName];
    const permissions = req.auth?.permissions;

    if (authenticatedUserId && targetUserId && authenticatedUserId === targetUserId) {
      return next();
    }

    if (
      Array.isArray(permissions) &&
      (permissions.includes('admin.manage') || permissions.includes(permissionKey))
    ) {
      return next();
    }

    return next(new AppError('Forbidden', 403, { code: 'FORBIDDEN' }));
  };
}

module.exports = {
  requireAuth,
  requireTrustedOriginMiddleware,
  requirePermission,
  requireAnyPermission,
  requireAnyRole,
  requireSelfOrPermission,
};

