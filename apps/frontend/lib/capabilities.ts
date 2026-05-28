function hasPermission(permissions: string[], permissionKey: string) {
  return (
    permissions.includes("admin.manage") || permissions.includes(permissionKey)
  );
}

export function resolveCashCapabilities({
  permissions,
}: {
  permissions: string[];
}) {
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

export function resolveTransferCapabilities({
  permissions,
}: {
  permissions: string[];
  roleName?: string | null;
}) {
  const manage = hasPermission(permissions, "transfers.manage");

  const requestCreate =
    manage || hasPermission(permissions, "transfers.request.create");

  const requestViewOwn =
    manage ||
    hasPermission(permissions, "transfers.request.view_own") ||
    requestCreate;

  const approve = manage || hasPermission(permissions, "transfers.approve");

  const ship = manage || hasPermission(permissions, "transfers.ship");

  const receive = manage || hasPermission(permissions, "transfers.receive");

  const cancel = manage || hasPermission(permissions, "transfers.cancel");

  return {
    manage,
    requestCreate,
    requestViewOwn,
    approve,
    ship,
    receive,
    cancel,
    visible:
      manage ||
      requestCreate ||
      requestViewOwn ||
      approve ||
      ship ||
      receive ||
      cancel,
  };
}
