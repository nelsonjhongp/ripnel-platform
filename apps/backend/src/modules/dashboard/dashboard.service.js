const { AppError } = require('../../shared/errors');
const { pool } = require('../../shared/db');
const { findActiveUserById } = require('../auth/auth.repo');
const { findDefaultLocationByUserId, findUserLocationsByUserId } = require('../users/users.repo');
const {
  findCashClosingByLocationAndDate,
  countSalesByLocationAndDate,
} = require('../cash/cash.repo');
const {
  findCommercialActivityByTimeSlot,
  findCommercialActivityByDay,
  findSalesHeadlineByLocationAndDate,
  findPaymentTotalsByLocationAndDate,
  findPostsalesWindowCounts,
  findPostsalesWindowItems,
  findPendingTransfersCounts,
  findPendingTransfersItems,
  findCriticalInventoryCounts,
  findCriticalInventoryItems,
  findRecentSalesEvents,
  findRecentPostsaleEvents,
  findRecentTransferEvents,
  findRecentAdjustmentEvents,
  findRecentCashEvents,
  findSalesByDepartment,
} = require('./dashboard.repo');
const { buildTransferCapabilities } = require('../transfers/transfers-access');

const LOW_STOCK_THRESHOLD = 3;
const POSTSALE_LOOKBACK_DAYS = 14;
const TODAY_SLOT_COLUMNS = Array.from({ length: 12 }, (_, index) => {
  const startHour = index * 2;
  const endHour = startHour + 1;
  const key = `slot_${String(startHour).padStart(2, '0')}`;

  return {
    key,
    label: `${String(startHour).padStart(2, '0')}:00-${String(endHour).padStart(2, '0')}:59`,
    short_label: `${String(startHour).padStart(2, '0')}-${String(endHour).padStart(2, '0')}`,
    slot_index: index,
  };
});
function todayPeruDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function shiftIsoDate(dateString, deltaDays) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

function buildPreviousPeriodRange(dateFrom, dateTo) {
  const start = new Date(`${dateFrom}T00:00:00.000Z`);
  const end = new Date(`${dateTo}T00:00:00.000Z`);
  const spanDays = Math.max(1, Math.round((end - start) / 86400000) + 1);

  return {
    date_from: shiftIsoDate(dateFrom, -spanDays),
    date_to: shiftIsoDate(dateTo, -spanDays),
    span_days: spanDays,
  };
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

function formatTransferStatusLabel(status) {
  if (status === 'requested') return 'Solicitada';
  if (status === 'approved') return 'Aprobada';
  if (status === 'shipped') return 'Despachada';
  if (status === 'received') return 'Recepcionada';
  if (status === 'cancelled') return 'Cancelada';
  return 'Transferencia';
}

function normalizeActivityGroup(group) {
  if (group === 'today' || group === 'daily') return group;
  return 'daily';
}

function enumerateDateRange(dateFrom, dateTo) {
  const dates = [];
  const cursor = new Date(`${dateFrom}T00:00:00.000Z`);
  const end = new Date(`${dateTo}T00:00:00.000Z`);

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function buildDailyColumns(dateFrom, dateTo) {
  const shortFormatter = new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const longFormatter = new Intl.DateTimeFormat('es-PE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

  return enumerateDateRange(dateFrom, dateTo).map((isoDate) => {
    const date = new Date(`${isoDate}T00:00:00.000Z`);

    return {
      key: isoDate,
      label: longFormatter.format(date),
      short_label: shortFormatter.format(date).replace('.', ''),
    };
  });
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
  const transferCapabilities = normalizeTransferCapabilities(
    buildTransferCapabilities({ permissions, roleName })
  );

  return {
    sales: salesOrCashVisible,
    cash: canViewCash(roleName),
    postsales: hasPermission(permissions, 'sales.postsale.view'),
    inventory: hasPermission(permissions, 'inventory.view'),
    transfers: transferCapabilities.visible,
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
      href: '/transferencias/listado-de-transferencias',
      description: 'Aprobar, despachar y recepcionar solicitudes entre sedes.',
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
  const counterpart = isInbound ? event.from_location_name : event.to_location_name;
  const statusLabel = formatTransferStatusLabel(event.status);
  let title = `Transferencia ${event.transfer_number || ''}`.trim();
  let subtitle = `${counterpart} · ${statusLabel}`;

  if (event.status === 'requested') {
    title = `Solicitud ${event.transfer_number || ''}`.trim();
    subtitle = isInbound
      ? `${counterpart} atiende tu pedido · ${statusLabel}`
      : `${counterpart} pide reposicion · ${statusLabel}`;
  } else if (event.status === 'approved') {
    title = `Aprobacion ${event.transfer_number || ''}`.trim();
    subtitle = isInbound
      ? `${counterpart} preparo el despacho · ${statusLabel}`
      : `${counterpart} espera envio · ${statusLabel}`;
  } else if (event.status === 'shipped') {
    title = `${isInbound ? 'Recepcion en camino' : 'Despacho'} ${event.transfer_number || ''}`.trim();
    subtitle = `${counterpart} · ${statusLabel}`;
  } else if (event.status === 'received') {
    title = `Recepcion ${event.transfer_number || ''}`.trim();
    subtitle = `${counterpart} · ${statusLabel}`;
  } else if (event.status === 'cancelled') {
    title = `Transferencia cancelada ${event.transfer_number || ''}`.trim();
    subtitle = `${counterpart} · ${statusLabel}`;
  }

  return {
    id: `transfer:${event.transfer_id}`,
    type: 'transfer',
    occurred_at: event.occurred_at,
    title,
    subtitle,
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

async function resolveCommercialLocations(userId) {
  const rows = await findUserLocationsByUserId(userId);
  const activeRows = rows.filter((row) => row.active !== false);

  return activeRows.map((row) => ({
    location_id: row.location_id,
    name: row.name,
    code: row.code,
    type: row.type,
    is_default: row.is_default === true,
  }));
}

async function getDashboardOverview(input = {}) {
  const { user, location } = await resolveDashboardContext(input.user_id);
  const permissions = Array.isArray(input.permissions) ? input.permissions : [];
  const roleName = input.role_name || user.role_name || null;
  const businessDate = todayPeruDate();
  const dateFrom = input.date_from || businessDate;
  const dateTo = input.date_to || businessDate;
  const previousRange = buildPreviousPeriodRange(dateFrom, dateTo);
  const sections = buildSections({ permissions, roleName });

  const needsSalesAggregates = sections.sales || sections.cash;
  const client = await pool.connect();
  let salesHeadline = null;
  let paymentRows = [];
  let currentCashClosing = null;
  let salesRow = null;
  let previousSalesHeadline = null;
  let previousPaymentRows = [];
  let previousSalesRow = null;
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
      previousSalesHeadline = await findSalesHeadlineByLocationAndDate(
        location.location_id,
        previousRange.date_from,
        previousRange.date_to,
        executor
      );
      previousPaymentRows = await findPaymentTotalsByLocationAndDate(
        location.location_id,
        previousRange.date_from,
        previousRange.date_to,
        executor
      );
      previousSalesRow = await countSalesByLocationAndDate(
        location.location_id,
        previousRange.date_from,
        previousRange.date_to,
        executor
      );
    }

    if (sections.cash) {
      currentCashClosing = await findCashClosingByLocationAndDate(location.location_id, dateFrom, dateTo, executor);
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
  const previousPaymentTotals = buildPaymentTotals(previousPaymentRows);
  const previousSalesConsistency = buildConsistency(previousPaymentTotals, previousSalesRow || {});
  const saleCountCurrent = Number((salesHeadline && salesHeadline.sale_count) || 0);
  const saleCountPrevious = Number((previousSalesHeadline && previousSalesHeadline.sale_count) || 0);
  const totalAmountCurrent = round2(salesHeadline && salesHeadline.total_amount);
  const totalAmountPrevious = round2(previousSalesHeadline && previousSalesHeadline.total_amount);
  const avgTicketCurrent = saleCountCurrent > 0 ? round2(totalAmountCurrent / saleCountCurrent) : 0;
  const avgTicketPrevious =
    saleCountPrevious > 0 ? round2(totalAmountPrevious / saleCountPrevious) : 0;

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
          sale_count: saleCountCurrent,
          total_amount: totalAmountCurrent,
          last_confirmed_at: salesHeadline && salesHeadline.last_confirmed_at,
          by_method: paymentTotals,
          comparisons: {
            sale_count: buildMetricComparison(saleCountCurrent, saleCountPrevious),
            total_amount: buildMetricComparison(totalAmountCurrent, totalAmountPrevious),
            avg_ticket: buildMetricComparison(avgTicketCurrent, avgTicketPrevious),
          },
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
            comparisons: {
              payment_total: buildMetricComparison(
                salesConsistency.payment_total,
                previousSalesConsistency.payment_total
              ),
            },
          },
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
          pending_approval_count: Number(
            (transferCounts && transferCounts.pending_approval_count) || 0
          ),
          pending_dispatch_count: Number(
            (transferCounts && transferCounts.pending_dispatch_count) || 0
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

async function getCommercialActivity(input = {}) {
  const { user, location } = await resolveDashboardContext(input.user_id);
  const permissions = Array.isArray(input.permissions) ? input.permissions : [];
  const roleName = input.role_name || user.role_name || null;
  const sections = buildSections({ permissions, roleName });
  const group = normalizeActivityGroup(input.group);
  const dateFrom = input.date_from || todayPeruDate();
  const dateTo = input.date_to || todayPeruDate();
  const visible = sections.sales;
  const dailyColumns = buildDailyColumns(dateFrom, dateTo);

  if (!visible) {
    return {
      visible: false,
      context: {
        date_from: dateFrom,
        date_to: dateTo,
        group,
        default_metric: 'amount',
        active_location_id: location.location_id,
      },
      rows: [],
      columns: group === 'today' ? TODAY_SLOT_COLUMNS : dailyColumns,
      cells: [],
    };
  }

  const assignedLocations = await resolveCommercialLocations(user.user_id);
  if (assignedLocations.length === 0) {
    return {
      visible: false,
      context: {
        date_from: dateFrom,
        date_to: dateTo,
        group,
        default_metric: 'amount',
        active_location_id: location.location_id,
      },
      rows: [],
      columns: group === 'today' ? TODAY_SLOT_COLUMNS : dailyColumns,
      cells: [],
    };
  }

  const locationIds = assignedLocations.map((entry) => entry.location_id);
  const rawRows =
    group === 'today'
      ? await findCommercialActivityByTimeSlot(locationIds, dateFrom, dateTo)
      : await findCommercialActivityByDay(locationIds, dateFrom, dateTo);
  const aggregateMap = new Map();

  for (const row of rawRows) {
    const key =
      group === 'today'
        ? TODAY_SLOT_COLUMNS[Number(row.slot_index || 0)]?.key || 'slot_00'
        : row.business_date;
    const existing = aggregateMap.get(key) || {
      sale_count: 0,
      total_amount: 0,
    };

    existing.sale_count += Number(row.sale_count || 0);
    existing.total_amount = round2(existing.total_amount + Number(row.total_amount || 0));
    aggregateMap.set(key, existing);
  }

  const columns = group === 'today' ? TODAY_SLOT_COLUMNS : dailyColumns;
  const cells = columns
    .map((column) => {
      const aggregated = aggregateMap.get(column.key);
      if (!aggregated) return null;

      return {
        location_id: 'all_locations',
        column_key: column.key,
        sale_count: Number(aggregated.sale_count || 0),
        total_amount: round2(aggregated.total_amount),
        avg_ticket:
          Number(aggregated.sale_count || 0) > 0
            ? round2(Number(aggregated.total_amount || 0) / Number(aggregated.sale_count || 0))
            : 0,
      };
    })
    .filter(Boolean);

  return {
    visible: true,
    context: {
      date_from: dateFrom,
      date_to: dateTo,
      group,
      default_metric: 'amount',
      active_location_id: location.location_id,
    },
    rows: [
      {
        location_id: 'all_locations',
        name: 'Ventas generales',
        code: null,
        type: 'aggregate',
        is_default: true,
      },
    ],
    columns,
    cells,
  };
}

function buildMetricComparison(currentValue, previousValue) {
  const current = round2(currentValue);
  const previous =
    previousValue == null || Number.isNaN(Number(previousValue)) ? null : round2(previousValue);

  if (previous == null) {
    return {
      current,
      previous: null,
      delta: null,
      delta_pct: null,
      direction: 'neutral',
      valid: false,
    };
  }

  const delta = round2(current - previous);
  const deltaPct =
    Math.abs(previous) < 0.01 ? null : round2((delta / previous) * 100);

  return {
    current,
    previous,
    delta,
    delta_pct: deltaPct,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral',
    valid: true,
  };
}

async function getDashboardActivity(input = {}) {
  const { user, location } = await resolveDashboardContext(input.user_id);
  const permissions = Array.isArray(input.permissions) ? input.permissions : [];
  const roleName = input.role_name || user.role_name || null;
  const sections = buildSections({ permissions, roleName });

  const client = await pool.connect();
  let salesEvents = [];
  let postsaleEvents = [];
  let transferEvents = [];
  let adjustmentEvents = [];
  let cashEvents = [];

  try {
    const executor = client.query.bind(client);

    salesEvents = sections.sales
      ? await findRecentSalesEvents(location.location_id, 5, executor)
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
  getCommercialActivity,
};
