const { AppError } = require('../../shared/errors');

function hasPermission(permissions, permissionKey) {
  return (
    Array.isArray(permissions) &&
    (permissions.includes('admin.manage') || permissions.includes(permissionKey))
  );
}

function normalizeRoleName(roleName) {
  return String(roleName || '').trim().toUpperCase();
}

function buildTransferCapabilities({ permissions, roleName } = {}) {
  const normalizedRoleName = normalizeRoleName(roleName);
  const manage = hasPermission(permissions, 'transfers.manage');

  const requestCreate =
    manage ||
    hasPermission(permissions, 'transfers.request.create') ||
    ['TIENDA', 'VENTAS'].includes(normalizedRoleName);

  const requestViewOwn =
    manage ||
    hasPermission(permissions, 'transfers.request.view_own') ||
    requestCreate;

  const ship =
    manage ||
    hasPermission(permissions, 'transfers.ship') ||
    ['ALMACEN', 'TIENDA'].includes(normalizedRoleName);

  const receive =
    manage ||
    hasPermission(permissions, 'transfers.receive') ||
    ['ALMACEN', 'TIENDA'].includes(normalizedRoleName);

  return {
    manage,
    request_create: requestCreate,
    request_view_own: requestViewOwn,
    ship,
    receive,
    visible: manage || requestCreate || requestViewOwn || ship || receive,
  };
}

function requireTransferCapability(capabilityKey) {
  return function requireTransferCapabilityMiddleware(req, _res, next) {
    const capabilities = buildTransferCapabilities({
      permissions: req.auth?.permissions,
      roleName: req.auth?.role_name,
    });

    if (capabilities[capabilityKey]) {
      return next();
    }

    return next(new AppError('Forbidden', 403, { code: 'FORBIDDEN' }));
  };
}

module.exports = {
  buildTransferCapabilities,
  requireTransferCapability,
};
