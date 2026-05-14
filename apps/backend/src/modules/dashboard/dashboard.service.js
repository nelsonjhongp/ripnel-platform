const { AppError } = require('../../shared/errors');
const { pool } = require('../../shared/db');
const { findActiveUserById } = require('../auth/auth.repo');
const { findDefaultLocationByUserId } = require('../users/users.repo');
const {
  findCashClosingByLocationAndDate,
  countSalesByLocationAndDate,
} = require('../cash/cash.repo');
const {
  findSalesHeadlineByLocationAndDate,
  findPaymentTotalsByLocationAndDate,
  findReceiptQueueCounts,
  findReceiptQueueItems,
  findPostsalesWindowCounts,
  findPostsalesWindowItems,
  findPendingTransfersCounts,
  findPendingTransfersItems,
  findCriticalInventoryCounts,
  findCriticalInventoryItems,
  findRecentSalesEvents,
  findRecentReceiptEvents,
  findRecentPostsaleEvents,
  findRecentTransferEvents,
  findRecentAdjustmentEvents,
  findRecentCashEvents,
  findSalesByDepartment,
} = require('./dashboard.repo');

const LOW_STOCK_THRESHOLD = 3;
const POSTSALE_LOOKBACK_DAYS = 14;

function todayPeruDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function normalizeUuid(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalized
  )
    ? normalized
    : null;
}

function hasPermission(permissions, permissionKey) {
  return (
    Array.isArray(permissions) &&
    (permissions.includes('admin.manage') || permissions.includes(permissionKey))
  );
}

function canViewCash(roleName) {
  return ['ADMIN', 'CAJA'].includes(String(roleName || ''));
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

function buildConsistency(paymentTotals, salesRow) {
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

function buildSections({ permissions, roleName }) {
  const salesOrCashVisible = hasPermission(permissions, 'sales.pos') || canViewCash(roleName);

  return {
    sales: salesOrCashVisible,
    cash: canViewCash(roleName),
    receipts: hasPermission(permissions, 'sales.pos'),
    postsales: hasPermission(permissions, 'sales.postsale.view'),
    inventory: hasPermission(permissions, 'inventory.view'),
    transfers: hasPermission(permissions, 'transfers.manage'),
  };
}

function buildShortcuts(sections, cashClosing) {
  const shortcuts = [];

  if (sections.sales) {
    shortcuts.push({
      key: 'new-sale',
      label: 'Nueva venta',
      href: '/ventas',
      description: 'Registrar una nueva venta en la sede activa.',
    });
    shortcuts.push({
      key: 'sales-history',
      label: 'Historial',
      href: '/ventas/historial',
      description: 'Revisar ventas confirmadas y su detalle.',
    });
  }

  if (sections.cash) {
    shortcuts.push({
      key: 'cash',
      label: cashClosing ? 'Caja del dia' : 'Abrir caja',
      href: '/caja',
      description: cashClosing
        ? 'Ver el estado de caja y la consistencia del dia.'
        : 'Abrir la caja de la sede activa.',
    });
  }

  if (sections.postsales) {
    shortcuts.push({
      key: 'postsales',
      label: 'Postventa',
      href: '/postventa',
      description: 'Resolver cambios y anulaciones controladas.',
    });
  }

  if (sections.inventory) {
    shortcuts.push({
      key: 'inventory',
      label: 'Inventario',
      href: '/inventario',
      description: 'Revisar stock actual y variantes criticas.',
    });
  }

  if (sections.transfers) {
    shortcuts.push({
      key: 'transfers',
      label: 'Transferencias',
      href: '/transferencias/recepciones-pendientes',
      description: 'Atender recepciones pendientes de la sede.',
    });
  }

  shortcuts.push({
    key: 'bi',
    label: 'BI',
    href: '/bi',
    description: 'Abrir la capa analitica y dashboards Power BI.',
  });

  return shortcuts;
}

function mapSalesEvent(event) {
  return {
    id: `sale:${event.sale_id}`,
    type: 'sale',
    occurred_at: event.occurred_at,
    title: `Venta confirmada ${event.sale_number || ''}`.trim(),
    subtitle: `${event.customer_name_text || 'Cliente general'} · S/. ${Number(
      event.total_amount || 0
    ).toFixed(2)} · ${event.document_type}`,
    status: 'confirmed',
    href: `/ventas/${event.sale_id}`,
  };
}

function mapReceiptEvent(event) {
  return {
    id: `receipt:${event.sale_id}:${event.queue_status}`,
    type: 'receipt',
    occurred_at: event.occurred_at,
    title: `Comprobante ${event.queue_status}`,
    subtitle: `${event.sale_number || 'Sin correlativo'} · ${
      event.customer_name_text || 'Cliente general'
    }${event.sunat_message ? ` · ${event.sunat_message}` : ''}`,
    status: event.queue_status,
    href: `/ventas/${event.sale_id}`,
  };
}

function mapPostsaleEvent(event) {
  const title =
    event.event_type === 'exchange'
      ? `Cambio confirmado ${event.sale_number || ''}`.trim()
      : `Venta anulada ${event.sale_number || ''}`.trim();

  return {
    id: `postsale:${event.event_type}:${event.event_id}`,
    type: 'postsale',
    occurred_at: event.occurred_at,
    title,
    subtitle: `${event.customer_name_text || 'Cliente general'}${
      event.reason ? ` · ${event.reason}` : ''
    }`,
    status: event.status,
    href: `/postventa/${event.sale_id}`,
  };
}

function mapTransferEvent(event, locationId) {
  const isInbound = event.to_location_id === locationId;
  const directionLabel = isInbound ? 'Recepcion' : 'Salida';
  const counterpart = isInbound ? event.from_location_name : event.to_location_name;

  return {
    id: `transfer:${event.transfer_id}`,
    type: 'transfer',
    occurred_at: event.occurred_at,
    title: `${directionLabel} ${event.transfer_number || ''}`.trim(),
    subtitle: `${counterpart} · ${event.status}`,
    status: event.status,
    href: `/transferencias/${event.transfer_id}`,
  };
}

function mapAdjustmentEvent(event) {
  return {
    id: `adjustment:${event.adjustment_id}`,
    type: 'adjustment',
    occurred_at: event.occurred_at,
    title: `Ajuste ${event.adjustment_number || ''}`.trim(),
    subtitle: `${event.status}${event.reason ? ` · ${event.reason}` : ''}`,
    status: event.status,
    href: '/inventario/ajustes',
  };
}

function mapCashEvent(event) {
  return {
    id: `cash:${event.cash_closing_id}`,
    type: 'cash',
    occurred_at: event.occurred_at,
    title: `Caja ${event.status === 'closed' ? 'cerrada' : 'abierta'}`,
    subtitle: `${event.business_date} · S/. ${Number(event.total_all || 0).toFixed(2)}`,
    status: event.status,
    href: '/caja',
  };
}

async function resolveDashboardContext(userId) {
  const normalizedUserId = normalizeUuid(userId);

  if (!normalizedUserId) {
    throw new AppError('Not authenticated', 401, { code: 'AUTH_REQUIRED' });
  }

  const user = await findActiveUserById(normalizedUserId);
  if (!user) {
    throw new AppError('Not authenticated', 401, { code: 'AUTH_REQUIRED' });
  }

  const location = await findDefaultLocationByUserId(normalizedUserId);
  if (!location) {
    throw new AppError('Authenticated user has no default location assigned', 409, {
      code: 'DEFAULT_LOCATION_REQUIRED',
    });
  }

  if (!location.active) {
    throw new AppError('Default location is inactive', 409, {
      code: 'DEFAULT_LOCATION_INACTIVE',
    });
  }

  return { user, location };
}

async function getDashboardOverview(input = {}) {
  const { user, location } = await resolveDashboardContext(input.user_id);
  const permissions = Array.isArray(input.permissions) ? input.permissions : [];
  const roleName = input.role_name || user.role_name || null;
  const businessDate = todayPeruDate();
  const dateFrom = input.date_from || businessDate;
  const dateTo = input.date_to || businessDate;
  const sections = buildSections({ permissions, roleName });

  const needsSalesAggregates = sections.sales || sections.cash;
  const client = await pool.connect();
  let salesHeadline = null;
  let paymentRows = [];
  let currentCashClosing = null;
  let salesRow = null;
  let receiptCounts = null;
  let receiptItems = [];
  let postsalesCounts = null;
  let postsalesItems = [];
  let transferCounts = null;
  let transferItems = [];
  let inventoryCounts = null;
  let inventoryItems = [];

  try {
    const executor = client.query.bind(client);

    if (needsSalesAggregates) {
      salesHeadline = await findSalesHeadlineByLocationAndDate(location.location_id, dateFrom, dateTo, executor);
      paymentRows = await findPaymentTotalsByLocationAndDate(location.location_id, dateFrom, dateTo, executor);
      salesRow = await countSalesByLocationAndDate(location.location_id, dateFrom, dateTo, executor);
    }

    if (sections.cash) {
      currentCashClosing = await findCashClosingByLocationAndDate(location.location_id, dateFrom, dateTo, executor);
    }

    if (sections.receipts) {
      receiptCounts = await findReceiptQueueCounts(location.location_id, executor);
      receiptItems = await findReceiptQueueItems(location.location_id, 5, executor);
    }

    if (sections.postsales) {
      postsalesCounts = await findPostsalesWindowCounts(
        location.location_id,
        businessDate,
        POSTSALE_LOOKBACK_DAYS,
        executor
      );
      postsalesItems = await findPostsalesWindowItems(
        location.location_id,
        businessDate,
        POSTSALE_LOOKBACK_DAYS,
        5,
        executor
      );
    }

    if (sections.transfers) {
      transferCounts = await findPendingTransfersCounts(location.location_id, executor);
      transferItems = await findPendingTransfersItems(location.location_id, 5, executor);
    }

    if (sections.inventory) {
      inventoryCounts = await findCriticalInventoryCounts(location.location_id, LOW_STOCK_THRESHOLD, executor);
      inventoryItems = await findCriticalInventoryItems(location.location_id, LOW_STOCK_THRESHOLD, 6, executor);
    }
  } finally {
    client.release();
  }

  const paymentTotals = buildPaymentTotals(paymentRows);
  const salesConsistency = buildConsistency(paymentTotals, salesRow || {});

  return {
    context: {
      generated_at: new Date().toISOString(),
      business_date: dateTo,
      date_from: dateFrom,
      location,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        role_name: roleName,
      },
    },
    sections,
    sales_today: sections.sales
      ? {
          visible: true,
          sale_count: Number((salesHeadline && salesHeadline.sale_count) || 0),
          total_amount: round2(salesHeadline && salesHeadline.total_amount),
          last_confirmed_at: salesHeadline && salesHeadline.last_confirmed_at,
          by_method: paymentTotals,
        }
      : { visible: false },
    cash: sections.cash
      ? {
          visible: true,
          closing: currentCashClosing,
          sales_summary: {
            sale_count: Number((salesRow && salesRow.sale_count) || 0),
            grand_total: round2(salesRow && salesRow.grand_total),
            by_method: paymentTotals,
            consistency: salesConsistency,
          },
        }
      : { visible: false },
    receipts_queue: sections.receipts
      ? {
          visible: true,
          open_count: Number((receiptCounts && receiptCounts.open_count) || 0),
          missing_count: Number((receiptCounts && receiptCounts.missing_count) || 0),
          pending_count: Number((receiptCounts && receiptCounts.pending_count) || 0),
          error_count: Number((receiptCounts && receiptCounts.error_count) || 0),
          latest: receiptItems,
        }
      : { visible: false },
    postsales: sections.postsales
      ? {
          visible: true,
          recent_window_days: POSTSALE_LOOKBACK_DAYS,
          total_recent_confirmed: Number(
            (postsalesCounts && postsalesCounts.total_recent_confirmed) || 0
          ),
          eligible_exchange_count: Number(
            (postsalesCounts && postsalesCounts.eligible_exchange_count) || 0
          ),
          eligible_cancel_count: Number(
            (postsalesCounts && postsalesCounts.eligible_cancel_count) || 0
          ),
          blocked_cancel_count: Number(
            (postsalesCounts && postsalesCounts.blocked_cancel_count) || 0
          ),
          latest: postsalesItems,
        }
      : { visible: false },
    transfers: sections.transfers
      ? {
          visible: true,
          pending_receipts_count: Number(
            (transferCounts && transferCounts.pending_receipts_count) || 0
          ),
          draft_outgoing_count: Number(
            (transferCounts && transferCounts.draft_outgoing_count) || 0
          ),
          latest: transferItems,
        }
      : { visible: false },
    inventory: sections.inventory
      ? {
          visible: true,
          low_stock_threshold: LOW_STOCK_THRESHOLD,
          zero_stock_count: Number((inventoryCounts && inventoryCounts.zero_stock_count) || 0),
          low_stock_count: Number((inventoryCounts && inventoryCounts.low_stock_count) || 0),
          critical_variants: inventoryItems,
        }
      : { visible: false },
    shortcuts: buildShortcuts(sections, currentCashClosing),
  };
}

async function getSalesByDepartment(input = {}) {
  const { user, location } = await resolveDashboardContext(input.user_id);
  const dateFrom = input.date_from || todayPeruDate();
  const dateTo = input.date_to || todayPeruDate();

  const rows = await findSalesByDepartment(location.location_id, dateFrom, dateTo);

  return {
    context: {
      location_id: location.location_id,
      date_from: dateFrom,
      date_to: dateTo,
    },
    departments: rows.map((r) => ({
      name: r.department,
      sale_count: Number(r.sale_count || 0),
      total_amount: round2(r.total_amount),
    })),
  };
}

async function getDashboardActivity(input = {}) {
  const { user, location } = await resolveDashboardContext(input.user_id);
  const permissions = Array.isArray(input.permissions) ? input.permissions : [];
  const roleName = input.role_name || user.role_name || null;
  const sections = buildSections({ permissions, roleName });

  const client = await pool.connect();
  let salesEvents = [];
  let receiptEvents = [];
  let postsaleEvents = [];
  let transferEvents = [];
  let adjustmentEvents = [];
  let cashEvents = [];

  try {
    const executor = client.query.bind(client);

    salesEvents = sections.sales
      ? await findRecentSalesEvents(location.location_id, 5, executor)
      : [];
    receiptEvents = sections.receipts
      ? await findRecentReceiptEvents(location.location_id, 5, executor)
      : [];
    postsaleEvents = sections.postsales
      ? await findRecentPostsaleEvents(location.location_id, 5, executor)
      : [];
    transferEvents = sections.transfers
      ? await findRecentTransferEvents(location.location_id, 5, executor)
      : [];
    adjustmentEvents = sections.inventory
      ? await findRecentAdjustmentEvents(location.location_id, 5, executor)
      : [];
    cashEvents = sections.cash
      ? await findRecentCashEvents(location.location_id, 5, executor)
      : [];
  } finally {
    client.release();
  }

  const items = [
    ...salesEvents.map(mapSalesEvent),
    ...receiptEvents.map(mapReceiptEvent),
    ...postsaleEvents.map(mapPostsaleEvent),
    ...transferEvents.map((event) => mapTransferEvent(event, location.location_id)),
    ...adjustmentEvents.map(mapAdjustmentEvent),
    ...cashEvents.map(mapCashEvent),
  ]
    .filter((item) => item.occurred_at)
    .sort((left, right) => new Date(right.occurred_at) - new Date(left.occurred_at))
    .slice(0, 12);

  return {
    context: {
      location_id: location.location_id,
      business_date: todayPeruDate(),
    },
    items,
  };
}

module.exports = {
  getDashboardOverview,
  getDashboardActivity,
  getSalesByDepartment,
};
