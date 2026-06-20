function hasPermission(permissions, permissionKey) {
  return (
    Array.isArray(permissions) &&
    (permissions.includes("admin.manage") ||
      permissions.includes(permissionKey))
  );
}

function resolveCashCapabilities({ permissions } = {}) {
  const view = hasPermission(permissions, "cash.view");
  const operate = hasPermission(permissions, "cash.operate");
  const admin = hasPermission(permissions, "cash.admin.view");
  const reopen = hasPermission(permissions, "cash.admin.reopen");

  return {
    view,
    operate,
    admin,
    reopen,
    visible: view || operate || admin || reopen,
  };
}

module.exports = {
  hasPermission,
  resolveCashCapabilities,
};
