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

  return {
    view,
    operate,
    admin,
    visible: view || operate || admin,
  };
}

module.exports = {
  hasPermission,
  resolveCashCapabilities,
};
