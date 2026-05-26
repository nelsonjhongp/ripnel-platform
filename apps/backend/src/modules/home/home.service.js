const { AppError } = require('../../shared/errors');
const { findActiveUserById } = require('../auth/auth.repo');
const {
  findUserLocationsByUserId,
  findDefaultLocationByUserId,
} = require('../users/users.repo');
const { findCashClosingByLocationAndDate, countSalesByLocationAndDate } = require('../cash/cash.repo');
const {
  findPaymentTotalsByLocationAndDate,
  findCriticalInventoryCounts,
  findCriticalInventoryItems,
} = require('../dashboard/dashboard.repo');
const {
  findPersonalSalesSummary,
  findLastPersonalSale,
  findAssignedNetworkSummary,
  findTransferRequestCounts,
  findTransferRequestItems,
} = require('./home.repo');
const { buildTransferCapabilities } = require('../transfers/transfers-access');

const LOW_STOCK_THRESHOLD = 3;

function todayPeruDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

function weekStartPeruDate(dateString) {
  const referenceDate = new Date(`${dateString}T00:00:00-05:00`);
  const day = referenceDate.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  referenceDate.setUTCDate(referenceDate.getUTCDate() - diff);
  return referenceDate.toISOString().slice(0, 10);
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
  return ['ADMIN', 'CAJA'].includes(String(roleName || '').toUpperCase());
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

async function resolveHomeContext(userId) {
  const normalizedUserId = normalizeUuid(userId);

  if (!normalizedUserId) {
    throw new AppError('Not authenticated', 401, { code: 'AUTH_REQUIRED' });
  }

  const user = await findActiveUserById(normalizedUserId);
  if (!user) {
    throw new AppError('Not authenticated', 401, { code: 'AUTH_REQUIRED' });
  }

  const [defaultLocation, assignments] = await Promise.all([
    findDefaultLocationByUserId(normalizedUserId),
    findUserLocationsByUserId(normalizedUserId),
  ]);

  if (!defaultLocation) {
    throw new AppError('Authenticated user has no default location assigned', 409, {
      code: 'DEFAULT_LOCATION_REQUIRED',
    });
  }

  if (!defaultLocation.active) {
    throw new AppError('Default location is inactive', 409, {
      code: 'DEFAULT_LOCATION_INACTIVE',
    });
  }

  const assignedLocationIds = assignments
    .filter((assignment) => assignment.active)
    .map((assignment) => assignment.location_id);

  return {
    user,
    defaultLocation,
    assignedLocationIds,
  };
}

function buildHero({
  user,
  defaultLocation,
  salesCapability,
  cashVisible,
  cashClosing,
  cashConsistency,
  transferCounts,
  transferCapabilities,
  inventoryCounts,
}) {
  const firstName = String(user.full_name || '').trim().split(/\s+/)[0] || user.full_name;

  if (cashVisible && !cashClosing) {
    return {
      eyebrow: defaultLocation.name,
      title: `Buen inicio, ${firstName}`,
      description: 'Tu sede aún no tiene caja abierta para la fecha de negocio. Conviene resolverlo antes de usar los totales del día.',
      tone: 'warning',
      cta: {
        label: 'Abrir caja',
        href: '/caja',
      },
    };
  }

  if (transferCapabilities.request_create && Number(transferCounts?.open_for_store_count || 0) > 0) {
    return {
      eyebrow: defaultLocation.name,
      title: `Hola, ${firstName}`,
      description: 'Tienes solicitudes abiertas para tu tienda. Desde aquí puedes seguir lo pendiente y pedir reposición cuando haga falta.',
      tone: 'default',
      cta: {
        label: 'Ver solicitudes',
        href: '/transferencias/listado-de-transferencias',
      },
    };
  }

  if (
    transferCapabilities.request_create &&
    Number(inventoryCounts?.zero_stock_count || 0) > 0
  ) {
    return {
      eyebrow: defaultLocation.name,
      title: `Hola, ${firstName}`,
      description: 'Hay variantes en cero en tu sede. Si otra tienda puede abastecerte, lo más útil ahora es lanzar una solicitud de productos.',
      tone: 'warning',
      cta: {
        label: 'Solicitar reposición',
        href: '/transferencias/solicitar-productos',
      },
    };
  }

  if (cashVisible && cashConsistency && !cashConsistency.is_consistent) {
    return {
      eyebrow: defaultLocation.name,
      title: `Buen inicio, ${firstName}`,
      description: 'La caja del día tiene una diferencia entre ventas y pagos. Vale la pena revisarla antes de cerrar la jornada.',
      tone: 'warning',
      cta: {
        label: 'Revisar caja',
        href: '/caja',
      },
    };
  }

  if (salesCapability) {
    return {
      eyebrow: defaultLocation.name,
      title: `Hola, ${firstName}`,
      description: 'Tu inicio prioriza ventas, solicitudes entre tiendas y seguimiento operativo de la sede activa.',
      tone: 'default',
      cta: {
        label: 'Nueva venta',
        href: '/ventas',
      },
    };
  }

  return {
    eyebrow: defaultLocation.name,
    title: `Hola, ${firstName}`,
    description: 'Este inicio resume lo más importante de tu operación actual según la sede activa y lo que realmente puedes gestionar.',
    tone: 'default',
    cta: null,
  };
}

function buildQuickActions({
  salesCapability,
  inventoryCapability,
  adminCapability,
  cashVisible,
  transferCapabilities,
}) {
  const actions = [];

  if (salesCapability) {
    actions.push({
      key: 'new-sale',
      label: 'Nueva venta',
      href: '/ventas',
      description: 'Registrar una venta desde la sede activa.',
      tone: 'primary',
    });
    actions.push({
      key: 'sales-history',
      label: 'Ventas',
      href: '/ventas/historial',
      description: 'Seguir ventas confirmadas y su detalle.',
      tone: 'default',
    });
  }

  if (transferCapabilities.request_create) {
    actions.push({
      key: 'request-products',
      label: 'Solicitar reposición',
      href: '/transferencias/solicitar-productos',
      description: 'Pedir reposición a otra tienda cercana.',
      tone: 'primary',
    });
  }

  if (transferCapabilities.visible) {
    actions.push({
      key: 'transfer-tracking',
      label: 'Seguimiento',
      href: '/transferencias/listado-de-transferencias',
      description: 'Ver solicitudes, despachos y recepciones.',
      tone: 'default',
    });
  }

  if (transferCapabilities.receive) {
    actions.push({
      key: 'receipts',
      label: 'Recepciones',
      href: '/transferencias/recepciones-pendientes',
      description: 'Confirmar ingresos pendientes en tu sede.',
      tone: 'default',
    });
  }

  if (cashVisible) {
    actions.push({
      key: 'cash',
      label: 'Caja',
      href: '/caja',
      description: 'Abrir, revisar o cerrar caja.',
      tone: 'default',
    });
  }

  if (inventoryCapability) {
    actions.push({
      key: 'inventory',
      label: 'Stock actual',
      href: '/inventario',
      description: 'Revisar stock y quiebres de la sede.',
      tone: 'default',
    });
  }

  if (adminCapability) {
    actions.push({
      key: 'bi',
      label: 'BI',
      href: '/bi',
      description: 'Abrir la capa analítica y seguimiento global.',
      tone: 'default',
    });
  }

  return actions.slice(0, 6);
}

function buildPriorities({
  cashVisible,
  cashClosing,
  cashConsistency,
  transferCounts,
  inventoryCounts,
  transferCapabilities,
}) {
  const priorities = [];

  if (cashVisible && !cashClosing) {
    priorities.push({
      key: 'cash-open',
      title: 'Abrir caja',
      description: 'La sede activa aún no tiene caja abierta para la fecha de negocio.',
      href: '/caja',
      tone: 'warning',
    });
  }

  if (transferCapabilities.receive && Number(transferCounts?.pending_receive_count || 0) > 0) {
    priorities.push({
      key: 'transfer-receive',
      title: 'Recepcionar transferencias',
      description: `${transferCounts.pending_receive_count} transferencia(s) siguen enviadas hacia tu tienda.`,
      href: '/transferencias/recepciones-pendientes',
      tone: 'warning',
    });
  }

  if (transferCapabilities.approve && Number(transferCounts?.pending_approval_count || 0) > 0) {
    priorities.push({
      key: 'transfer-approve',
      title: 'Aprobar solicitudes',
      description: `${transferCounts.pending_approval_count} solicitud(es) esperan validación del origen.`,
      href: '/transferencias/listado-de-transferencias',
      tone: 'default',
    });
  }

  if (transferCapabilities.ship && Number(transferCounts?.pending_ship_count || 0) > 0) {
    priorities.push({
      key: 'transfer-ship',
      title: 'Despachar reposiciones',
      description: `${transferCounts.pending_ship_count} solicitud(es) ya aprobadas siguen pendientes por despachar.`,
      href: '/transferencias/listado-de-transferencias',
      tone: 'warning',
    });
  }

  if (transferCapabilities.request_create && Number(inventoryCounts?.zero_stock_count || 0) > 0) {
    priorities.push({
      key: 'request-replenishment',
      title: 'Solicitar reposición',
      description: `${inventoryCounts.zero_stock_count} variante(s) quedaron en cero en la sede activa.`,
      href: '/transferencias/solicitar-productos',
      tone: 'warning',
    });
  }

  if (cashVisible && cashConsistency && !cashConsistency.is_consistent) {
    priorities.push({
      key: 'cash-difference',
      title: 'Revisar diferencia de caja',
      description: `Hay una diferencia de S/. ${cashConsistency.difference.toFixed(2)} entre ventas y pagos del día.`,
      href: '/caja',
      tone: 'warning',
    });
  }

  if (Number(inventoryCounts?.low_stock_count || 0) > 0) {
    priorities.push({
      key: 'low-stock',
      title: 'Stock bajo mínimo',
      description: `${inventoryCounts.low_stock_count} variante(s) están por debajo del umbral de reposición.`,
      href: '/inventario',
      tone: 'default',
    });
  }

  return priorities.slice(0, 4);
}

function buildTransferItems(rows, locationId) {
  return (rows || []).map((row) => {
    let flow = 'request';
    let title = 'Solicitud abierta';
    let href = '/transferencias/listado-de-transferencias';

    if (row.status === 'shipped' && row.to_location_id === locationId) {
      flow = 'receive';
      title = 'Recepción pendiente';
      href = '/transferencias/recepciones-pendientes';
    } else if (row.status === 'requested' && row.from_location_id === locationId) {
      flow = 'approve';
      title = 'Pendiente por aprobar';
    } else if (row.status === 'approved' && row.from_location_id === locationId) {
      flow = 'ship';
      title = 'Pendiente por despachar';
    }

    return {
      transfer_id: row.transfer_id,
      transfer_number: row.transfer_number,
      title,
      flow,
      status: row.status,
      from_location_name: row.from_location_name,
      from_location_code: row.from_location_code,
      to_location_name: row.to_location_name,
      to_location_code: row.to_location_code,
      qty_requested_total: Number(row.qty_requested_total || 0),
      qty_shipped_total: Number(row.qty_shipped_total || 0),
      happened_at: row.shipped_at || row.updated_at || row.created_at,
      href,
    };
  });
}

async function getHomeOverview(input = {}) {
  const { user, defaultLocation, assignedLocationIds } = await resolveHomeContext(input.user_id);
  const permissions = Array.isArray(input.permissions) ? input.permissions : [];
  const roleName = input.role_name || user.role_name || null;
  const businessDate = todayPeruDate();
  const weekStartDate = weekStartPeruDate(businessDate);
  const salesCapability = hasPermission(permissions, 'sales.pos');
  const inventoryCapability = hasPermission(permissions, 'inventory.view');
  const adminCapability = hasPermission(permissions, 'admin.manage');
  const cashVisible = canViewCash(roleName);
  const transferCapabilities = normalizeTransferCapabilities(
    buildTransferCapabilities({ permissions, roleName })
  );

  const [
    personalSalesSummary,
    lastPersonalSale,
    cashClosing,
    cashSalesRow,
    cashPaymentRows,
    inventoryCounts,
    inventoryItems,
    transferCounts,
    transferItems,
    assignedNetworkSummary,
  ] = await Promise.all([
    salesCapability
      ? findPersonalSalesSummary(defaultLocation.location_id, user.user_id, businessDate, weekStartDate)
      : null,
    salesCapability ? findLastPersonalSale(defaultLocation.location_id, user.user_id) : null,
    cashVisible ? findCashClosingByLocationAndDate(defaultLocation.location_id, businessDate) : null,
    cashVisible ? countSalesByLocationAndDate(defaultLocation.location_id, businessDate) : null,
    cashVisible ? findPaymentTotalsByLocationAndDate(defaultLocation.location_id, businessDate) : [],
    inventoryCapability
      ? findCriticalInventoryCounts(defaultLocation.location_id, LOW_STOCK_THRESHOLD)
      : null,
    inventoryCapability
      ? findCriticalInventoryItems(defaultLocation.location_id, LOW_STOCK_THRESHOLD, 4)
      : [],
    transferCapabilities.visible ? findTransferRequestCounts(defaultLocation.location_id) : null,
    transferCapabilities.visible ? findTransferRequestItems(defaultLocation.location_id, 5) : [],
    adminCapability ? findAssignedNetworkSummary(assignedLocationIds, businessDate) : null,
  ]);

  const paymentTotals = buildPaymentTotals(cashPaymentRows);
  const cashConsistency = cashVisible ? buildCashConsistency(paymentTotals, cashSalesRow || {}) : null;
  const hero = buildHero({
    user,
    defaultLocation,
    salesCapability,
    cashVisible,
    cashClosing,
    cashConsistency,
    transferCounts,
    transferCapabilities,
    inventoryCounts,
  });

  const kpis = [
    salesCapability
      ? {
          key: 'sales-today',
          label: 'Ventas de hoy',
          value: Number(personalSalesSummary?.sales_today_count || 0),
          meta: `S/. ${round2(personalSalesSummary?.sales_today_total).toFixed(2)}`,
          scope: 'personal',
          tone: 'default',
          href: '/ventas/historial',
        }
      : null,
    salesCapability
      ? {
          key: 'sales-week',
          label: 'Ventas de la semana',
          value: Number(personalSalesSummary?.sales_week_count || 0),
          meta: `S/. ${round2(personalSalesSummary?.sales_week_total).toFixed(2)}`,
          scope: 'personal',
          tone: 'default',
          href: '/ventas/historial',
        }
      : null,
    transferCapabilities.request_create || transferCapabilities.request_view_own
      ? {
          key: 'open-requests',
          label: 'Solicitudes abiertas',
          value: Number(transferCounts?.open_for_store_count || 0),
          meta: 'Por mi tienda',
          scope: 'location',
          tone: 'default',
          href: '/transferencias/listado-de-transferencias',
        }
      : null,
    transferCapabilities.receive
      ? {
          key: 'pending-receive',
          label: 'Por recibir',
          value: Number(transferCounts?.pending_receive_count || 0),
          meta: 'En tránsito hacia mi sede',
          scope: 'location',
          tone: 'warning',
          href: '/transferencias/recepciones-pendientes',
        }
      : null,
    cashVisible
      ? {
          key: 'cash-state',
          label: 'Caja del día',
          value: cashClosing ? (cashClosing.status === 'open' ? 'Abierta' : 'Cerrada') : 'Sin apertura',
          meta: `S/. ${round2(cashConsistency?.payment_total).toFixed(2)} en pagos`,
          scope: 'location',
          tone: cashClosing ? 'default' : 'warning',
          href: '/caja',
        }
      : null,
    inventoryCapability
      ? {
          key: 'critical-stock',
          label: 'Stock crítico',
          value: Number(inventoryCounts?.zero_stock_count || 0) + Number(inventoryCounts?.low_stock_count || 0),
          meta: `${Number(inventoryCounts?.zero_stock_count || 0)} en cero`,
          scope: 'location',
          tone: Number(inventoryCounts?.zero_stock_count || 0) > 0 ? 'warning' : 'default',
          href: '/inventario',
        }
      : null,
    adminCapability
      ? {
          key: 'assigned-sales',
          label: 'Ventas de hoy',
          value: Number(assignedNetworkSummary?.sales_today_count || 0),
          meta: `S/. ${round2(assignedNetworkSummary?.sales_today_total).toFixed(2)}`,
          scope: 'assigned_network',
          tone: 'default',
          href: '/panel',
        }
      : null,
    adminCapability
      ? {
          key: 'assigned-users',
          label: 'Usuarios activos',
          value: Number(assignedNetworkSummary?.active_user_count || 0),
          meta: `${Number(assignedNetworkSummary?.active_location_count || 0)} sede(s) asignadas`,
          scope: 'assigned_network',
          tone: 'default',
          href: '/administracion/roles&usuarios',
        }
      : null,
  ].filter(Boolean).slice(0, 4);

  return {
    context: {
      generated_at: new Date().toISOString(),
      business_date: businessDate,
      location: defaultLocation,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        role_name: roleName,
      },
    },
    capabilities: {
      sales: salesCapability,
      cash: cashVisible,
      inventory: inventoryCapability,
      admin: adminCapability,
      transfers: transferCapabilities,
    },
    hero,
    kpis,
    priorities: buildPriorities({
      cashVisible,
      cashClosing,
      cashConsistency,
      transferCounts,
      inventoryCounts,
      transferCapabilities,
    }),
    quick_actions: buildQuickActions({
      salesCapability,
      inventoryCapability,
      adminCapability,
      cashVisible,
      transferCapabilities,
    }),
    sections: {
      transfer_requests: transferCapabilities.visible
        ? {
            visible: true,
            counts: {
              open_for_store_count: Number(transferCounts?.open_for_store_count || 0),
              pending_approval_count: Number(transferCounts?.pending_approval_count || 0),
              pending_ship_count: Number(transferCounts?.pending_ship_count || 0),
              pending_receive_count: Number(transferCounts?.pending_receive_count || 0),
            },
            latest: buildTransferItems(transferItems, defaultLocation.location_id),
            primary_action: transferCapabilities.request_create
              ? {
                  label: 'Solicitar reposición',
                  href: '/transferencias/solicitar-productos',
                }
              : null,
          }
        : null,
      cash: cashVisible
        ? {
            visible: true,
            closing: cashClosing,
            consistency: cashConsistency,
          }
        : null,
      inventory: inventoryCapability
        ? {
            visible: true,
            low_stock_threshold: LOW_STOCK_THRESHOLD,
            zero_stock_count: Number(inventoryCounts?.zero_stock_count || 0),
            low_stock_count: Number(inventoryCounts?.low_stock_count || 0),
            critical_variants: inventoryItems,
          }
        : null,
      admin: adminCapability
        ? {
            visible: true,
            active_user_count: Number(assignedNetworkSummary?.active_user_count || 0),
            active_location_count: Number(assignedNetworkSummary?.active_location_count || 0),
            sales_today_count: Number(assignedNetworkSummary?.sales_today_count || 0),
            sales_today_total: round2(assignedNetworkSummary?.sales_today_total),
            pending_requests_count: Number(assignedNetworkSummary?.pending_requests_count || 0),
          }
        : null,
      personal_sales: salesCapability
        ? {
            visible: true,
            today: {
              sale_count: Number(personalSalesSummary?.sales_today_count || 0),
              total_amount: round2(personalSalesSummary?.sales_today_total),
            },
            week: {
              sale_count: Number(personalSalesSummary?.sales_week_count || 0),
              total_amount: round2(personalSalesSummary?.sales_week_total),
            },
            last_sale: lastPersonalSale
              ? {
                  sale_id: lastPersonalSale.sale_id,
                  sale_number: lastPersonalSale.sale_number,
                  customer_name_text: lastPersonalSale.customer_name_text,
                  total_amount: round2(lastPersonalSale.total_amount),
                  currency: lastPersonalSale.currency,
                  confirmed_at: lastPersonalSale.confirmed_at,
                }
              : null,
          }
        : null,
    },
  };
}

module.exports = {
  getHomeOverview,
};
