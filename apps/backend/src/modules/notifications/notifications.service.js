const { pool } = require("../../shared/db");
const { AppError } = require("../../shared/errors");
const { findActiveUserById } = require("../auth/auth.repo");
const { findDefaultLocationByUserId } = require("../users/users.repo");
const {
  findCashClosingByLocationAndDate,
  countSalesByLocationAndDate,
} = require("../cash/cash.repo");
const { resolveCashCapabilities } = require("../cash/cash-access");
const {
  findPaymentTotalsByLocationAndDate,
  findPendingTransfersCounts,
  findPendingTransfersItems,
  findCriticalInventoryCounts,
  findCriticalInventoryItems,
} = require("../dashboard/dashboard.repo");
const { buildTransferCapabilities } = require("../transfers/transfers-access");

const LOW_STOCK_THRESHOLD = 3;
const MAX_VISIBLE_ITEMS = 6;

function todayPeruDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}

function normalizeUuid(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return null;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalized,
  )
    ? normalized
    : null;
}

function hasPermission(permissions, permissionKey) {
  return (
    Array.isArray(permissions) &&
    (permissions.includes("admin.manage") ||
      permissions.includes(permissionKey))
  );
}

function normalizeTransferCapabilities(rawCapabilities = {}) {
  return {
    manage: Boolean(rawCapabilities.manage),
    request_create: Boolean(rawCapabilities.request_create),
    request_view_own: Boolean(rawCapabilities.request_view_own),
    approve: Boolean(rawCapabilities.approve),
    ship: Boolean(rawCapabilities.ship),
    receive: Boolean(rawCapabilities.receive),
    cancel: Boolean(rawCapabilities.cancel),
    visible: Boolean(rawCapabilities.visible),
  };
}

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function buildPaymentTotals(rows) {
  const totals = { cash: 0, yape: 0, plin: 0, transfer: 0 };

  for (const row of rows || []) {
    if (row.method in totals) {
      totals[row.method] = round2(row.total);
    }
  }

  return {
    ...totals,
    all: round2(totals.cash + totals.yape + totals.plin + totals.transfer),
  };
}

function buildCashConsistency(paymentTotals, salesRow) {
  const salesTotal = round2(salesRow && salesRow.grand_total);
  const paymentTotal = round2(paymentTotals.all);
  const difference = round2(salesTotal - paymentTotal);

  return {
    sales_total: salesTotal,
    payment_total: paymentTotal,
    difference,
    is_consistent: Math.abs(difference) < 0.01,
  };
}

async function resolveNotificationsContext(userId) {
  const normalizedUserId = normalizeUuid(userId);

  if (!normalizedUserId) {
    throw new AppError("Not authenticated", 401, { code: "AUTH_REQUIRED" });
  }

  const user = await findActiveUserById(normalizedUserId);
  if (!user) {
    throw new AppError("Not authenticated", 401, { code: "AUTH_REQUIRED" });
  }

  const location = await findDefaultLocationByUserId(normalizedUserId);
  if (!location) {
    throw new AppError(
      "Authenticated user has no default location assigned",
      409,
      {
        code: "DEFAULT_LOCATION_REQUIRED",
      },
    );
  }

  if (!location.active) {
    throw new AppError("Default location is inactive", 409, {
      code: "DEFAULT_LOCATION_INACTIVE",
    });
  }

  return { user, location };
}

function buildNotification({
  id,
  module,
  kind,
  severity,
  title,
  description,
  href,
  actionLabel,
  location,
  createdAt,
}) {
  return {
    id,
    module,
    kind,
    severity,
    title,
    description,
    href,
    action_label: actionLabel,
    location_scope: {
      location_id: location.location_id,
      name: location.name,
      code: location.code || null,
      type: location.type,
    },
    created_at: createdAt,
  };
}

function buildCashNotifications({
  enabled,
  location,
  businessDate,
  generatedAt,
  cashClosing,
  consistency,
}) {
  if (!enabled) return [];

  const notifications = [];

  if (!cashClosing) {
    notifications.push(
      buildNotification({
        id: `cash_missing:${location.location_id}:${businessDate}`,
        module: "cash",
        kind: "cash_missing",
        severity: "warning",
        title: "Caja del dia sin apertura",
        description: `La sede ${location.name} todavía no abrió caja para ${businessDate}.`,
        href: "/caja",
        actionLabel: "Abrir caja",
        location,
        createdAt: generatedAt,
      }),
    );
  }

  if (cashClosing && consistency && !consistency.is_consistent) {
    notifications.push(
      buildNotification({
        id: `cash_difference:${location.location_id}:${businessDate}`,
        module: "cash",
        kind: "cash_difference",
        severity: "danger",
        title: "Diferencia entre ventas y pagos",
        description: `Hay una diferencia de S/. ${consistency.difference.toFixed(
          2,
        )} que requiere revisión antes del cierre.`,
        href: "/caja",
        actionLabel: "Revisar caja",
        location,
        createdAt:
          cashClosing.updated_at || cashClosing.created_at || generatedAt,
      }),
    );
  }

  return notifications;
}

function resolveLatestTransferTimestamp(items, stage, generatedAt) {
  const candidate = (items || []).find((item) => item.pending_stage === stage);
  return (
    candidate?.shipped_at ||
    candidate?.approved_at ||
    candidate?.created_at ||
    candidate?.updated_at ||
    generatedAt
  );
}

function buildTransferNotifications({
  capabilities,
  location,
  generatedAt,
  transferCounts,
  transferItems,
}) {
  if (!capabilities?.visible || !transferCounts) return [];

  const notifications = [];
  const pendingApprovalCount = Number(
    transferCounts.pending_approval_count || 0,
  );
  const pendingDispatchCount = Number(
    transferCounts.pending_dispatch_count || 0,
  );
  const pendingReceiptsCount = Number(
    transferCounts.pending_receipts_count || 0,
  );

  if (capabilities.approve && pendingApprovalCount > 0) {
    notifications.push(
      buildNotification({
        id: `pending_approval:${location.location_id}`,
        module: "transfers",
        kind: "pending_approval",
        severity: "warning",
        title: "Solicitudes pendientes por aprobar",
        description: `${pendingApprovalCount} solicitud(es) siguen esperando validación desde ${location.name}.`,
        href: "/transferencias/listado-de-transferencias",
        actionLabel: "Aprobar",
        location,
        createdAt: resolveLatestTransferTimestamp(
          transferItems,
          "approval",
          generatedAt,
        ),
      }),
    );
  }

  if (capabilities.ship && pendingDispatchCount > 0) {
    notifications.push(
      buildNotification({
        id: `pending_dispatch:${location.location_id}`,
        module: "transfers",
        kind: "pending_dispatch",
        severity: "warning",
        title: "Reposiciones pendientes por despachar",
        description: `${pendingDispatchCount} transferencia(s) aprobadas aún no salen de ${location.name}.`,
        href: "/transferencias/listado-de-transferencias",
        actionLabel: "Despachar",
        location,
        createdAt: resolveLatestTransferTimestamp(
          transferItems,
          "dispatch",
          generatedAt,
        ),
      }),
    );
  }

  if (capabilities.receive && pendingReceiptsCount > 0) {
    notifications.push(
      buildNotification({
        id: `pending_receipts:${location.location_id}`,
        module: "transfers",
        kind: "pending_receipts",
        severity: "warning",
        title: "Recepciones pendientes en tienda",
        description: `${pendingReceiptsCount} transferencia(s) siguen en tránsito hacia ${location.name}.`,
        href: "/transferencias/recepciones-pendientes",
        actionLabel: "Recepcionar",
        location,
        createdAt: resolveLatestTransferTimestamp(
          transferItems,
          "receipt",
          generatedAt,
        ),
      }),
    );
  }

  return notifications;
}

function buildInventoryNotifications({
  enabled,
  location,
  generatedAt,
  inventoryCounts,
  inventoryItems,
}) {
  if (!enabled || !inventoryCounts) return [];

  const zeroStockCount = Number(inventoryCounts.zero_stock_count || 0);
  const lowStockCount = Number(inventoryCounts.low_stock_count || 0);
  const criticalItems = inventoryItems || [];
  const primaryItem = criticalItems[0];
  const primaryItemLabel = primaryItem
    ? `${primaryItem.style_name} ${primaryItem.size_code}/${primaryItem.color_code}`.trim()
    : null;
  const notifications = [];

  if (zeroStockCount > 0) {
    notifications.push(
      buildNotification({
        id: `zero_stock:${location.location_id}`,
        module: "inventory",
        kind: "zero_stock",
        severity: "danger",
        title: "Variantes sin stock",
        description: primaryItemLabel
          ? `${zeroStockCount} variante(s) están en cero. Prioriza ${primaryItemLabel}.`
          : `${zeroStockCount} variante(s) están en cero en la sede activa.`,
        href: "/inventario?status=sin-stock",
        actionLabel: "Ver inventario",
        location,
        createdAt: generatedAt,
      }),
    );
  }

  if (lowStockCount > 0) {
    notifications.push(
      buildNotification({
        id: `low_stock:${location.location_id}`,
        module: "inventory",
        kind: "low_stock",
        severity: "warning",
        title: "Stock bajo mínimo",
        description: `${lowStockCount} variante(s) están por debajo del umbral de ${LOW_STOCK_THRESHOLD} unidades.`,
        href: "/inventario?status=stock-bajo",
        actionLabel: "Revisar stock",
        location,
        createdAt: generatedAt,
      }),
    );
  }

  return notifications;
}

function sortNotifications(items) {
  const severityWeight = { danger: 0, warning: 1, default: 2 };
  const kindWeight = {
    cash_difference: 0,
    cash_missing: 1,
    pending_approval: 2,
    pending_dispatch: 3,
    pending_receipts: 4,
    zero_stock: 5,
    low_stock: 6,
  };

  return [...items].sort((left, right) => {
    const severityDiff =
      (severityWeight[left.severity] ?? 99) -
      (severityWeight[right.severity] ?? 99);
    if (severityDiff !== 0) return severityDiff;

    const kindDiff =
      (kindWeight[left.kind] ?? 99) - (kindWeight[right.kind] ?? 99);
    if (kindDiff !== 0) return kindDiff;

    return (
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    );
  });
}

function buildSummary(items) {
  return {
    total: items.length,
    danger_count: items.filter((item) => item.severity === "danger").length,
    warning_count: items.filter((item) => item.severity === "warning").length,
    default_count: items.filter((item) => item.severity === "default").length,
  };
}

async function getTopbarNotifications(input = {}) {
  const { user, location } = await resolveNotificationsContext(input.user_id);
  const permissions = Array.isArray(input.permissions) ? input.permissions : [];
  const roleName = input.role_name || user.role_name || null;
  const businessDate = todayPeruDate();
  const generatedAt = new Date().toISOString();

  const transferCapabilities = normalizeTransferCapabilities(
    buildTransferCapabilities({ permissions, roleName }),
  );
  const cashCapabilities = resolveCashCapabilities({ permissions });

  const capabilities = {
    cash: cashCapabilities.visible,
    inventory: hasPermission(permissions, "inventory.view"),
    transfers: transferCapabilities,
  };

  const client = await pool.connect();
  let cashClosing = null;
  let salesRow = null;
  let paymentRows = [];
  let transferCounts = null;
  let transferItems = [];
  let inventoryCounts = null;
  let inventoryItems = [];

  try {
    const executor = client.query.bind(client);

    if (capabilities.cash) {
      cashClosing = await findCashClosingByLocationAndDate(
        location.location_id,
        businessDate,
        executor,
      );
      salesRow = await countSalesByLocationAndDate(
        location.location_id,
        businessDate,
        executor,
      );
      paymentRows = await findPaymentTotalsByLocationAndDate(
        location.location_id,
        businessDate,
        executor,
      );
    }

    if (capabilities.transfers.visible) {
      transferCounts = await findPendingTransfersCounts(
        location.location_id,
        executor,
      );
      transferItems = await findPendingTransfersItems(
        location.location_id,
        3,
        executor,
      );
    }

    if (capabilities.inventory) {
      inventoryCounts = await findCriticalInventoryCounts(
        location.location_id,
        LOW_STOCK_THRESHOLD,
        executor,
      );
      inventoryItems = await findCriticalInventoryItems(
        location.location_id,
        LOW_STOCK_THRESHOLD,
        3,
        executor,
      );
    }
  } finally {
    client.release();
  }

  const paymentTotals = buildPaymentTotals(paymentRows);
  const cashConsistency = capabilities.cash
    ? buildCashConsistency(paymentTotals, salesRow || {})
    : null;

  const items = sortNotifications([
    ...buildCashNotifications({
      enabled: capabilities.cash,
      location,
      businessDate,
      generatedAt,
      cashClosing,
      consistency: cashConsistency,
    }),
    ...buildTransferNotifications({
      capabilities: capabilities.transfers,
      location,
      generatedAt,
      transferCounts,
      transferItems,
    }),
    ...buildInventoryNotifications({
      enabled: capabilities.inventory,
      location,
      generatedAt,
      inventoryCounts,
      inventoryItems,
    }),
  ]).slice(0, MAX_VISIBLE_ITEMS);

  return {
    context: {
      generated_at: generatedAt,
      business_date: businessDate,
      location: {
        location_id: location.location_id,
        name: location.name,
        code: location.code || null,
        type: location.type,
      },
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        role_name: roleName,
      },
    },
    summary: buildSummary(items),
    items,
  };
}

module.exports = {
  getTopbarNotifications,
};
