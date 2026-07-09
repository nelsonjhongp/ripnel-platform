const { AppError } = require('../../shared/errors');
const { pool, attachActor } = require('../../shared/db');
const { round2 } = require('../../shared/numbers');
const { normalizeUuid } = require('../../shared/uuid');
const { resolveDashboardScope } = require('../dashboard/dashboard-scope');
const { renderProformaSalePdfBuffer } = require('./sales-proforma-pdf');
const { renderReceiptSalePdfBuffer } = require('./sales-receipt-pdf');
const {
  findSellableVariants,
  findActiveWholesaleMinQtyRule,
  findAllSales,
  findCustomerBiAnalytics,
  findSaleById,
  findSaleDetailsBySaleId,
  findSalePaymentsBySaleId,
  findCustomerById,
  findCustomerByInternalCode,
  findVariantById,
  getCurrentRetailPriceInTx,
  getCurrentWholesalePriceInTx,
  getInventoryQtyInTx,
  nextSaleNumberInTx,
  insertSale,
  insertSaleDetail,
  insertSalePayment,
  decrementInventoryInTx,
  insertStockMovementInTx,
} = require('./sales.repo');
const { findCashClosingByLocationAndDate } = require('../cash/cash.repo');
const { findActiveUserById } = require('../auth/auth.repo');
const { findDefaultLocationByUserId } = require('../users/users.repo');

const ALLOWED_DOCUMENT_TYPES = ['none', 'proforma', 'boleta', 'factura'];
const ALLOWED_PAYMENT_METHODS = ['cash', 'yape', 'plin', 'transfer'];
const GENERIC_COUNTER_CUSTOMER_CODE = 'SALE-CLI-001';

const TAX_RATE_BY_DOCUMENT = {
  none: 0,
  proforma: 0,
  boleta: 0.18,
  factura: 0.18,
};

function todayPeruDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

function normalizeText(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeDate(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function normalizePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeNonNegativeInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

function normalizeAmount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

function normalizePositiveAmount(value) {
  const parsed = normalizeAmount(value);
  if (parsed === null || parsed <= 0) return null;
  return parsed;
}

function normalizeDiscountMode(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  const lower = normalized.toLowerCase();
  return ['amount', 'percent'].includes(lower) ? lower : null;
}

function normalizePriceOverride(input) {
  if (input === undefined || input === null) {
    return null;
  }

  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new AppError('price_override debe ser un objeto', 400);
  }

  const unitPriceFinal = normalizeAmount(input.unit_price_final);
  const reason = normalizeText(input.reason);

  if (unitPriceFinal === null) {
    throw new AppError('price_override.unit_price_final debe ser un monto válido', 400);
  }

  if (!reason) {
    throw new AppError('price_override.reason es requerido', 400);
  }

  return {
    unit_price_final: unitPriceFinal,
    reason,
  };
}

function normalizeSaleDiscount(input) {
  if (input === undefined || input === null) {
    return null;
  }

  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new AppError('sale_discount debe ser un objeto', 400);
  }

  const mode = normalizeDiscountMode(input.mode);
  const value = normalizePositiveAmount(input.value);
  const reason = normalizeText(input.reason);

  if (!mode) {
    throw new AppError('sale_discount.mode debe ser amount o percent', 400);
  }

  if (value === null) {
    throw new AppError('sale_discount.value debe ser un monto positivo', 400);
  }

  if (!reason) {
    throw new AppError('sale_discount.reason es requerido', 400);
  }

  return {
    mode,
    value,
    reason,
  };
}

function computeSaleDiscountAmount(discount, subtotalAmount) {
  if (!discount) return 0;

  if (subtotalAmount <= 0) {
    throw new AppError('No se puede aplicar descuento a un subtotal vacío', 400);
  }

  if (discount.mode === 'percent') {
    if (discount.value > 100) {
      throw new AppError('sale_discount.value no puede exceder 100 en modo porcentaje', 400);
    }

    return round2((subtotalAmount * discount.value) / 100);
  }

  if (discount.value > subtotalAmount) {
    throw new AppError('sale_discount.value no puede exceder el subtotal', 400);
  }

  return round2(discount.value);
}

function allocateSaleDiscountAcrossItems(items, saleDiscountAmount) {
  if (!Array.isArray(items) || !items.length || saleDiscountAmount <= 0) {
    return items.map((item) => ({
      ...item,
      line_discount_amount: 0,
      line_subtotal: item.line_subtotal_before_discount,
    }));
  }

  const totalBase = round2(
    items.reduce(
      (accumulator, item) => accumulator + Number(item.line_subtotal_before_discount || 0),
      0
    )
  );

  let remainingDiscount = saleDiscountAmount;

  return items.map((item, index) => {
    const baseLineSubtotal = round2(Number(item.line_subtotal_before_discount || 0));
    const lineDiscount =
      index === items.length - 1
        ? remainingDiscount
        : round2((saleDiscountAmount * baseLineSubtotal) / totalBase);
    const cappedLineDiscount = Math.min(baseLineSubtotal, Math.max(lineDiscount, 0), remainingDiscount);

    remainingDiscount = round2(remainingDiscount - cappedLineDiscount);

    return {
      ...item,
      line_discount_amount: cappedLineDiscount,
      line_subtotal: round2(baseLineSubtotal - cappedLineDiscount),
    };
  });
}

function applyTaxesToComputedItems(items, taxRate) {
  const totalDocumentAmount = round2(
    items.reduce((accumulator, item) => accumulator + Number(item.line_subtotal || 0), 0)
  );
  const taxAmount =
    taxRate > 0
      ? round2(totalDocumentAmount - totalDocumentAmount / (1 + Number(taxRate || 0)))
      : 0;
  let remainingTax = taxAmount;

  const computedItems = items.map((item, index) => {
    const lineSubtotal = round2(Number(item.line_subtotal || 0));
    const lineTax =
      taxRate <= 0
        ? 0
        : index === items.length - 1
          ? remainingTax
          : round2(lineSubtotal - lineSubtotal / (1 + Number(taxRate || 0)));

    remainingTax = round2(remainingTax - lineTax);

    return {
      ...item,
      unit_price_final: round2(lineSubtotal / item.quantity),
      line_tax: lineTax,
      line_total: lineSubtotal,
    };
  });

  return {
    items: computedItems,
    subtotalAmount: totalDocumentAmount,
    taxAmount,
    totalAmount: totalDocumentAmount,
  };
}

function normalizeSalePayments(rawPayments, fallbackPaymentMethod, totalAmount) {
  if (rawPayments !== undefined && rawPayments !== null) {
    if (!Array.isArray(rawPayments) || !rawPayments.length) {
      throw new AppError('payments debe ser un array no vacío cuando se proporciona', 400);
    }

    const normalizedPayments = rawPayments.map((payment, index) => {
      const method = normalizeText(payment && payment.method);
      const amount = normalizePositiveAmount(payment && payment.amount);
      const reference = normalizeText(payment && payment.reference);

      if (!ALLOWED_PAYMENT_METHODS.includes(method)) {
        throw new AppError(`payments[${index}].method no es válido`, 400);
      }

      if (amount === null) {
        throw new AppError(`payments[${index}].amount debe ser un monto positivo`, 400);
      }

      return {
        method,
        amount,
        reference,
      };
    });

    const paymentTotal = round2(
      normalizedPayments.reduce((accumulator, payment) => accumulator + payment.amount, 0)
    );

    if (Math.abs(paymentTotal - totalAmount) >= 0.01) {
      throw new AppError('La suma de los pagos debe coincidir con el total de la venta', 400);
    }

    return normalizedPayments;
  }

  if (!ALLOWED_PAYMENT_METHODS.includes(fallbackPaymentMethod)) {
    throw new AppError('payment_method no válido', 400);
  }

  return [
    {
      method: fallbackPaymentMethod,
      amount: totalAmount,
      reference: null,
    },
  ];
}

function normalizeReceiptQueueLimit(value, fallback = 50) {
  const parsed = normalizePositiveInteger(value);
  if (!parsed) return fallback;
  return Math.min(parsed, 200);
}

function normalizeSalesPage(value) {
  const parsed = normalizePositiveInteger(value);
  return parsed || 1;
}

function normalizeSalesPageSize(value, fallback = 25) {
  const parsed = normalizePositiveInteger(value);
  if (!parsed) return fallback;
  return Math.min(parsed, 100);
}

function normalizeSalesOffset(value) {
  const parsed = normalizeNonNegativeInteger(value);
  return parsed === null ? 0 : parsed;
}

function normalizeSalesCursor(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  try {
    const raw = Buffer.from(normalized, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    const saleId = normalizeUuid(parsed && parsed.sale_id);
    const sortDate = normalizeText(parsed && parsed.sort_date);

    if (!saleId || !sortDate || Number.isNaN(Date.parse(sortDate))) {
      throw new Error('Payload de cursor no válido');
    }

    return {
      saleId,
      sortDate,
      raw: normalized,
    };
  } catch (error) {
    throw new AppError('Valor de cursor no válido', 400);
  }
}

function sumSaleItemQuantity(items = []) {
  return items.reduce((accumulator, item) => accumulator + Number(item.quantity || 0), 0);
}

function shouldApplyWholesaleRule(totalQuantity, wholesaleRule) {
  return Boolean(
    wholesaleRule &&
      Number.isInteger(Number(wholesaleRule.min_qty)) &&
      totalQuantity >= Number(wholesaleRule.min_qty)
  );
}

function buildCustomerName(customer) {
  return (
    normalizeText(customer.full_name) ||
    normalizeText(customer.business_name) ||
    normalizeText(customer.commercial_name) ||
    null
  );
}

async function resolveOperatingContext(userId) {
  const normalizedUserId = normalizeUuid(userId);

  if (!normalizedUserId) {
    throw new AppError('No autenticado', 401);
  }

  const user = await findActiveUserById(normalizedUserId);
  if (!user) {
    throw new AppError('No autenticado', 401);
  }

  const defaultLocation = await findDefaultLocationByUserId(normalizedUserId);
  if (!defaultLocation) {
    throw new AppError('El usuario no tiene una sede asignada por defecto', 409);
  }

  if (!defaultLocation.active) {
    throw new AppError('La sede por defecto está inactiva', 409);
  }

  return {
    user,
    location: defaultLocation,
  };
}

async function assertOpenCashForLocation(location, executor = null) {
  const businessDate = todayPeruDate();
  const cashClosing = await findCashClosingByLocationAndDate(
    location.location_id,
    businessDate,
    executor || undefined
  );

  if (!cashClosing) {
    throw new AppError(
      `No hay una caja abierta para ${location.name} en la fecha operativa de hoy. Abre caja antes de registrar ventas.`,
      409,
      { code: 'CASH_OPEN_REQUIRED' }
    );
  }

  if (cashClosing.status !== 'open') {
    throw new AppError(
      `La caja operativa de ${location.name} ya fue cerrada para hoy. No se pueden registrar más ventas en esa fecha operativa.`,
      409,
      { code: 'CASH_ALREADY_CLOSED_FOR_DATE' }
    );
  }

  return cashClosing;
}

async function resolveCustomerForSale(customerId) {
  if (customerId) {
    const customer = await findCustomerById(customerId);

    if (!customer) {
      throw new AppError('Cliente no encontrado', 404);
    }

    if (!customer.active) {
      throw new AppError('El cliente está inactivo', 409);
    }

    return customer;
  }

  const fallbackCustomer = await findCustomerByInternalCode(GENERIC_COUNTER_CUSTOMER_CODE);
  if (!fallbackCustomer) {
    throw new AppError('El cliente mostrador genérico no está configurado', 500);
  }

  if (!fallbackCustomer.active) {
    throw new AppError('El cliente mostrador genérico está inactivo', 500);
  }

  return fallbackCustomer;
}

function validateCustomerAgainstDocumentType(customer, documentType) {
  const customerName = buildCustomerName(customer);
  const customerDocType = String(customer.document_type || '').toLowerCase();

  if (documentType === 'boleta') {
    if (!customerName) {
      throw new AppError('El nombre del cliente es requerido para boleta', 400);
    }

    if (!['dni', 'ce'].includes(customerDocType)) {
      throw new AppError('Se requiere un cliente con DNI o CE para boleta', 400);
    }

    if (!normalizeText(customer.document_number)) {
      throw new AppError('El número de documento del cliente es requerido para boleta', 400);
    }

    if (
      customerDocType === 'ce' &&
      !/^\d{9}$/.test(String(customer.document_number || '').trim())
    ) {
      throw new AppError('El número de documento CE debe tener exactamente 9 dígitos para boleta', 400);
    }
  }

  if (documentType === 'factura') {
    if (!customerName) {
      throw new AppError('El nombre del cliente es requerido para factura', 400);
    }

    if (customerDocType !== 'ruc') {
      throw new AppError('Se requiere un cliente con RUC para factura', 400);
    }

    if (!normalizeText(customer.document_number)) {
      throw new AppError('El número de documento del cliente es requerido para factura', 400);
    }

    if (!normalizeText(customer.address)) {
      throw new AppError('La dirección del cliente es requerida para factura', 400);
    }
  }
}

async function getSaleByLocation(saleId, locationId) {
  const normalizedId = normalizeUuid(saleId);
  if (!normalizedId) throw new AppError('El id de venta es requerido', 400);

  const header = await findSaleById(normalizedId, locationId);
  if (!header) throw new AppError('Venta no encontrada', 404);

  const [details, payments] = await Promise.all([
    findSaleDetailsBySaleId(normalizedId),
    findSalePaymentsBySaleId(normalizedId),
  ]);

  return {
    ...header,
    details,
    payments,
  };
}

async function listSellableVariants(input = {}) {
  const q = normalizeText(input.q);
  const { location } = await resolveOperatingContext(input.user_id);

  return findSellableVariants(location.location_id, q);
}

async function getPosContext(input = {}) {
  const { user, location } = await resolveOperatingContext(input.user_id);
  const businessDate = todayPeruDate();
  const cashClosing = await findCashClosingByLocationAndDate(location.location_id, businessDate);
  const wholesaleRule = await findActiveWholesaleMinQtyRule();

  let cashStatus = 'missing';
  let saleEnabled = false;
  let message =
    'No hay una caja abierta para la sede operativa de hoy. Abre caja antes de registrar ventas.';

  if (cashClosing) {
    if (cashClosing.status === 'open') {
      cashStatus = 'open';
      saleEnabled = true;
      message = 'Caja operativa abierta. La sede ya puede registrar ventas.';
    } else if (cashClosing.status === 'closed') {
      cashStatus = 'closed';
      message =
        'La caja operativa de hoy ya fue cerrada para esta sede. No se pueden registrar mas ventas en esta fecha.';
    }
  }

  return {
    business_date: businessDate,
    location,
    user: {
      user_id: user.user_id,
      full_name: user.full_name,
      role_name: user.role_name,
    },
    cash: {
      status: cashStatus,
      sale_enabled: saleEnabled,
      cash_closing_id: cashClosing ? cashClosing.cash_closing_id : null,
      message,
    },
    pricing: {
      wholesale_min_qty_total: wholesaleRule ? Number(wholesaleRule.min_qty) : null,
      wholesale_rule_type: wholesaleRule ? wholesaleRule.rule_type : null,
    },
  };
}

async function listSales(input = {}) {
  const status = normalizeText(input.status);
  const q = normalizeText(input.q);
  const customerQ = normalizeText(input.customer_q);
  const userQ = normalizeText(input.user_q);
  const cashStatus = normalizeText(input.cash_status);
  const documentType = normalizeText(input.document_type);
  const dateFrom = normalizeDate(input.date_from);
  const dateTo = normalizeDate(input.date_to);
  const legacyLimit = normalizeSalesPageSize(input.limit, 25);
  const legacyOffset = normalizeSalesOffset(input.offset);
  const pageSize = normalizeSalesPageSize(input.page_size, legacyLimit);
  const page = input.page ? normalizeSalesPage(input.page) : Math.floor(legacyOffset / pageSize) + 1;
  const cursor = normalizeSalesCursor(input.cursor);
  const { location } = await resolveOperatingContext(input.user_id);
  const offset = (page - 1) * pageSize;
  const limit = pageSize;

  if (status && !['draft', 'confirmed', 'cancelled'].includes(status)) {
    throw new AppError('Valor de status no válido', 400);
  }

  if (cashStatus && !['open', 'closed', 'missing'].includes(cashStatus)) {
    throw new AppError('Valor de cash_status no válido', 400);
  }

  if (documentType && !ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
    throw new AppError('Valor de document_type no válido', 400);
  }

  if (input.date_from !== undefined && input.date_from !== null && !dateFrom) {
    throw new AppError('Valor de date_from no válido', 400);
  }

  if (input.date_to !== undefined && input.date_to !== null && !dateTo) {
    throw new AppError('Valor de date_to no válido', 400);
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new AppError('date_from no puede ser mayor que date_to', 400);
  }

  const salesPage = await findAllSales({
    status,
    q,
    customerQ,
    userQ,
    cashStatus,
    documentType,
    dateFrom,
    dateTo,
    page,
    pageSize,
    cursor,
    locationId: location.location_id,
    limit,
    offset,
  });

  return {
    items: salesPage.items,
    total:
      typeof salesPage.total === 'number'
        ? salesPage.total
        : salesPage.pagination?.total_count ?? salesPage.items.length,
    limit,
    offset,
    has_more:
      typeof salesPage.total === 'number'
        ? offset + salesPage.items.length < salesPage.total
        : Boolean(salesPage.pagination?.has_next),
    pagination: salesPage.pagination || {
      mode: 'page',
      cursor: null,
      next_cursor: null,
      page,
      page_size: pageSize,
      total_count: typeof salesPage.total === 'number' ? salesPage.total : salesPage.items.length,
      total_pages: 1,
      has_next: false,
      has_prev: page > 1,
    },
  };
}

async function getCustomerAnalytics(input = {}) {
  const dateFrom = normalizeDate(input.date_from);
  const dateTo = normalizeDate(input.date_to);
  const limit = normalizeReceiptQueueLimit(input.limit, 8);

  if (input.date_from !== undefined && input.date_from !== null && !dateFrom) {
    throw new AppError('Valor de date_from no válido', 400);
  }

  if (input.date_to !== undefined && input.date_to !== null && !dateTo) {
    throw new AppError('Valor de date_to no válido', 400);
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new AppError('date_from no puede ser mayor que date_to', 400);
  }

  const dashboardScope = await resolveDashboardScope({
    user_id: input.user_id,
    permissions: input.permissions,
    role_name: input.role_name,
    location_scope: input.location_scope,
    location_id: input.location_id,
  });

  return findCustomerBiAnalytics({
    locationIds: dashboardScope.activeLocationIds,
    dateFrom,
    dateTo,
    limit,
  });
}

async function getSale(input = {}) {
  const { location } = await resolveOperatingContext(input.user_id);
  return getSaleByLocation(input.sale_id, location.location_id);
}

async function createSale(input = {}) {
  const documentType = normalizeText(input.document_type) || 'none';
  const paymentMethod = normalizeText(input.payment_method) || 'cash';
  const notes = normalizeText(input.notes);
  const customerId = normalizeUuid(input.customer_id);
  const items = Array.isArray(input.items) ? input.items : [];
  const saleDiscount = normalizeSaleDiscount(input.sale_discount);

  if (input.customer_id !== undefined && input.customer_id !== null && !customerId) {
    throw new AppError('customer_id no válido', 400);
  }

  if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
    throw new AppError('document_type no válido', 400);
  }

  if (!items.length) {
    throw new AppError('Se requiere al menos un ítem', 400);
  }

  const { user, location } = await resolveOperatingContext(input.user_id);
  const customer = await resolveCustomerForSale(customerId);
  validateCustomerAgainstDocumentType(customer, documentType);

  const normalizedItems = [];
  const seenVariantIds = new Set();

  for (const item of items) {
    const variantId = normalizeUuid(item && item.variant_id);
    const qty = normalizePositiveInteger(item && item.quantity);

    if (!variantId) {
      throw new AppError('variant_id es requerido para cada ítem', 400);
    }

    if (!qty) {
      throw new AppError('quantity debe ser un entero positivo para cada ítem', 400);
    }

    if (seenVariantIds.has(variantId)) {
      throw new AppError('No se permiten variant_id duplicados en los ítems', 400);
    }

    const variant = await findVariantById(variantId);
    if (!variant) {
      throw new AppError(`Variante ${variantId} no encontrada`, 404);
    }

    if (!variant.active) {
      throw new AppError(`La variante ${variant.sku} está inactiva`, 400);
    }

    seenVariantIds.add(variantId);
    normalizedItems.push({
      variant_id: variant.variant_id,
      sku: variant.sku,
      style_id: variant.style_id,
      size_id: variant.size_id,
      quantity: qty,
      price_override: normalizePriceOverride(item && item.price_override),
    });
  }

  const client = await pool.connect();
  const totalQuantity = sumSaleItemQuantity(normalizedItems);

  try {
    await client.query('begin');
    await attachActor(client, { actorUserId: user.user_id, actorRole: user.role_name });
    const clientQuery = client.query.bind(client);
    await assertOpenCashForLocation(location, clientQuery);
    const wholesaleRule = await findActiveWholesaleMinQtyRule(clientQuery);
    const wholesaleApplies = shouldApplyWholesaleRule(totalQuantity, wholesaleRule);

    const confirmedAt = new Date().toISOString();
    const computedItems = [];
    let baseSubtotalAmount = 0;

    for (const item of normalizedItems) {
      const availableQty = await getInventoryQtyInTx(
        clientQuery,
        location.location_id,
        item.variant_id
      );

      if (availableQty < item.quantity) {
        throw new AppError(
          `Stock insuficiente para ${item.sku}: disponible ${availableQty}, solicitado ${item.quantity}`,
          409
        );
      }

      const resolvedRetailPrice = normalizeAmount(
        await getCurrentRetailPriceInTx(clientQuery, item.style_id, item.size_id)
      );

      if (resolvedRetailPrice === null) {
        throw new AppError(`No se encontró precio retail vigente para ${item.sku}`, 409);
      }

      const resolvedWholesalePrice = wholesaleApplies
        ? normalizeAmount(
            await getCurrentWholesalePriceInTx(clientQuery, item.style_id, item.size_id)
          )
        : null;
      const autoUnitPrice =
        wholesaleApplies && resolvedWholesalePrice !== null
          ? resolvedWholesalePrice
          : resolvedRetailPrice;
      const autoPriceType =
        wholesaleApplies && resolvedWholesalePrice !== null ? 'wholesale' : 'retail';
      const autoPricingRuleApplied =
        wholesaleApplies && resolvedWholesalePrice !== null
          ? wholesaleRule.rule_type
          : null;

      const unitPriceBeforeDiscount = item.price_override
        ? item.price_override.unit_price_final
        : autoUnitPrice;
      const lineSubtotalBeforeDiscount = round2(unitPriceBeforeDiscount * item.quantity);
      baseSubtotalAmount += lineSubtotalBeforeDiscount;

      computedItems.push({
        ...item,
        unit_price_list: autoUnitPrice,
        unit_price_final: unitPriceBeforeDiscount,
        price_type_applied: autoPriceType,
        pricing_basis: item.price_override ? 'manual_override' : 'auto',
        pricing_rule_applied: autoPricingRuleApplied,
        override_reason: item.price_override ? item.price_override.reason : null,
        overridden_by: item.price_override ? user.user_id : null,
        overridden_at: item.price_override ? confirmedAt : null,
        line_subtotal_before_discount: lineSubtotalBeforeDiscount,
      });
    }

    baseSubtotalAmount = round2(baseSubtotalAmount);

    const taxRate = TAX_RATE_BY_DOCUMENT[documentType];
    const saleDiscountAmount = computeSaleDiscountAmount(saleDiscount, baseSubtotalAmount);
    const discountedItems = allocateSaleDiscountAcrossItems(computedItems, saleDiscountAmount);
    const pricedSale = applyTaxesToComputedItems(discountedItems, taxRate);
    const subtotalAmount = pricedSale.subtotalAmount;
    const taxAmount = pricedSale.taxAmount;
    const totalAmount = pricedSale.totalAmount;

    if (totalAmount <= 0) {
      throw new AppError('El total final de la venta debe ser mayor a cero', 400);
    }

    const payments = normalizeSalePayments(input.payments, paymentMethod, totalAmount);
    const saleNumber = await nextSaleNumberInTx(clientQuery, documentType);

    const saleRow = await insertSale(clientQuery, {
      location_id: location.location_id,
      seller_user_id: user.user_id,
      customer_id: customer.customer_id,
      customer_name_text: buildCustomerName(customer),
      customer_doc_type: customer.document_type,
      customer_doc_number: normalizeText(customer.document_number),
      customer_address_text: normalizeText(customer.address),
      document_type: documentType,
      status: 'confirmed',
      notes,
      tax_rate: taxRate,
      subtotal_amount: subtotalAmount,
      sale_discount_amount: saleDiscountAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      sale_discount_reason: saleDiscountAmount > 0 && saleDiscount ? saleDiscount.reason : null,
      discounted_by: saleDiscountAmount > 0 ? user.user_id : null,
      discounted_at: saleDiscountAmount > 0 ? confirmedAt : null,
      sale_number: saleNumber,
      confirmed_at: confirmedAt,
      currency: 'PEN',
    });

    if (!saleRow) {
      throw new AppError('Conflicto de número de venta. Reintente la operación.', 409, {
        code: 'SALE_NUMBER_CONFLICT',
      });
    }

    const saleId = saleRow.sale_id;

    for (const item of pricedSale.items) {
      await insertSaleDetail(clientQuery, {
        sale_id: saleId,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price_list: item.unit_price_list,
        unit_price_final: item.unit_price_final,
        price_type_applied: item.price_type_applied,
        pricing_basis: item.pricing_basis,
        pricing_rule_applied: item.pricing_rule_applied || null,
        override_reason: item.override_reason,
        overridden_by: item.overridden_by,
        overridden_at: item.overridden_at,
        line_subtotal: item.line_subtotal,
        line_tax: item.line_tax,
        line_total: item.line_total,
      });

      await decrementInventoryInTx(clientQuery, location.location_id, item.variant_id, item.quantity);

      await insertStockMovementInTx(clientQuery, {
        location_id: location.location_id,
        variant_id: item.variant_id,
        movement_type: 'OUT',
        quantity: item.quantity,
        reason: `Venta ${saleNumber}`,
        reference_type: 'sale',
        reference_id: saleId,
        created_by: user.user_id,
      });
    }

    for (const payment of payments) {
      await insertSalePayment(clientQuery, {
        sale_id: saleId,
        method: payment.method,
        amount: payment.amount,
        reference: payment.reference,
      });
    }

    await client.query('commit');

    return getSaleByLocation(saleId, location.location_id);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function getSaleProformaPdf(input = {}) {
  const { location } = await resolveOperatingContext(input.user_id);
  const sale = await getSaleByLocation(input.sale_id, location.location_id);

  const label = sale.document_type === 'proforma' ? 'Proforma' : 'Comprobante';
  const pdfBuffer = await renderProformaSalePdfBuffer({ ...sale, _label: label });
  const fileNameBase = String(sale.sale_number || sale.sale_id || 'comprobante')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'comprobante';

  let customerEmail = null;
  if (sale.customer_email) {
    customerEmail = sale.customer_email;
  }

  return {
    fileName: `${fileNameBase}.pdf`,
    pdfBuffer,
    customerEmail,
    saleNumber: sale.sale_number,
  };
}

async function getSaleReceiptPdf(input = {}) {
  const { location } = await resolveOperatingContext(input.user_id);
  const sale = await getSaleByLocation(input.sale_id, location.location_id);

  if (sale.document_type !== 'boleta' && sale.document_type !== 'factura') {
    throw new AppError('Solo ventas con boleta o factura pueden descargarse desde este endpoint', 400);
  }

  const pdfBuffer = await renderReceiptSalePdfBuffer(sale);
  const fileNameBase = String(sale.sale_number || sale.sale_id || 'comprobante')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'comprobante';

  return {
    fileName: `${fileNameBase}.pdf`,
    pdfBuffer,
  };
}

module.exports = {
  getPosContext,
  listSellableVariants,
  listSales,
  getCustomerAnalytics,
  getSale,
  createSale,
  getSaleProformaPdf,
  getSaleReceiptPdf,
};
