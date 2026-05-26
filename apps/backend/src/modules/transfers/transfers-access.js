const { AppError } = require('../../shared/errors');

function hasPermission(permissions, permissionKey) {
  return (
    Array.isArray(permissions) &&
    (permissions.includes('admin.manage') || permissions.includes(permissionKey))
  );
}

function buildTransferCapabilities({ permissions } = {}) {
  const manage = hasPermission(permissions, 'transfers.manage');

  const requestCreate =
    manage || hasPermission(permissions, 'transfers.request.create');

  const requestViewOwn =
    manage || hasPermission(permissions, 'transfers.request.view_own') || requestCreate;

  const approve = manage || hasPermission(permissions, 'transfers.approve');

  const ship = manage || hasPermission(permissions, 'transfers.ship');

  const receive = manage || hasPermission(permissions, 'transfers.receive');

  const cancel = manage || hasPermission(permissions, 'transfers.cancel');

  return {
    manage,
    request_create: requestCreate,
    request_view_own: requestViewOwn,
    approve,
    ship,
    receive,
    cancel,
    visible: manage || requestCreate || requestViewOwn || approve || ship || receive || cancel,
  };
}

function requireTransferCapability(capabilityKey) {
  return function requireTransferCapabilityMiddleware(req, _res, next) {
    const capabilities = buildTransferCapabilities({
      permissions: req.auth?.permissions,
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
