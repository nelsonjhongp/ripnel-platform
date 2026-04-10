const { env } = require('../config/env');
const { AppError } = require('../shared/errors');
const { parseCookies } = require('../shared/cookies');
const { verifyJwt } = require('../shared/jwt');

function requireAuth(req, _res, next) {
  if (!env.jwtSecret) {
    return next(new AppError('JWT_SECRET is not configured', 500, { code: 'CONFIG_ERROR' }));
  }

  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.ripnel_session;

  if (!token) {
    return next(new AppError('Not authenticated', 401, { code: 'AUTH_REQUIRED' }));
  }

  const result = verifyJwt(token, env.jwtSecret);
  if (!result.ok) {
    if (result.reason === 'expired') {
      return next(new AppError('Session expired', 401, { code: 'SESSION_EXPIRED' }));
    }

    return next(new AppError('Invalid session', 401, { code: 'INVALID_SESSION' }));
  }

  req.auth = result.payload;
  return next();
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
  requirePermission,
  requireAnyPermission,
  requireAnyRole,
  requireSelfOrPermission,
};

