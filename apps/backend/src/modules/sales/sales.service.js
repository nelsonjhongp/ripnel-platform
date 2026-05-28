const { AppError } = require('../../shared/errors');
const { pool } = require('../../shared/db');
const { resolveDashboardScope } = require('../dashboard/dashboard-scope');
const { renderProformaSalePdfBuffer } = require('./sales-proforma-pdf');
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

function normalizeUuid(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalized
  )
    ? normalized
    : null;
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
    throw new AppError('price_override must be an object', 400);
  }

  const unitPriceFinal = normalizeAmount(input.unit_price_final);
  const reason = normalizeText(input.reason);

  if (unitPriceFinal === null) {
    throw new AppError('price_override.unit_price_final must be a valid amount', 400);
  }

  if (!reason) {
    throw new AppError('price_override.reason is required', 400);
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
    throw new AppError('sale_discount must be an object', 400);
  }

  const mode = normalizeDiscountMode(input.mode);
  const value = normalizePositiveAmount(input.value);
  const reason = normalizeText(input.reason);

  if (!mode) {
    throw new AppError('sale_discount.mode must be amount or percent', 400);
  }

  if (value === null) {
    throw new AppError('sale_discount.value must be a positive amount', 400);
  }

  if (!reason) {
    throw new AppError('sale_discount.reason is required', 400);
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
    throw new AppError('A discount cannot be applied to an empty subtotal', 400);
  }

  if (discount.mode === 'percent') {
    if (discount.value > 100) {
      throw new AppError('sale_discount.value cannot exceed 100 when mode is percent', 400);
    }

    return round2((subtotalAmount * discount.value) / 100);
  }

  if (discount.value > subtotalAmount) {
    throw new AppError('sale_discount.value cannot exceed subtotal amount', 400);
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
      throw new AppError('payments must be a non-empty array when provided', 400);
    }

    const normalizedPayments = rawPayments.map((payment, index) => {
      const method = normalizeText(payment && payment.method);
      const amount = normalizePositiveAmount(payment && payment.amount);
      const reference = normalizeText(payment && payment.reference);

      if (!ALLOWED_PAYMENT_METHODS.includes(method)) {
        throw new AppError(`payments[${index}].method is invalid`, 400);
      }

      if (amount === null) {
        throw new AppError(`payments[${index}].amount must be a positive amount`, 400);
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
      throw new AppError('The sum of payments must match the sale total amount', 400);
    }

    return normalizedPayments;
  }

  if (!ALLOWED_PAYMENT_METHODS.includes(fallbackPaymentMethod)) {
    throw new AppError('Invalid payment_method', 400);
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
      throw new Error('Invalid cursor payload');
    }

    return {
      saleId,
      sortDate,
      raw: normalized,
    };
  } catch (error) {
    throw new AppError('Invalid cursor value', 400);
  }
}

function round2(value) {
  return Math.round(value * 100) / 100;
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
    throw new AppError('Not authenticated', 401);
  }

  const user = await findActiveUserById(normalizedUserId);
  if (!user) {
    throw new AppError('Not authenticated', 401);
  }

  const defaultLocation = await findDefaultLocationByUserId(normalizedUserId);
  if (!defaultLocation) {
    throw new AppError('Authenticated user has no default location assigned', 409);
  }

  if (!defaultLocation.active) {
    throw new AppError('Default location is inactive', 409);
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
      throw new AppError('Customer not found', 404);
    }

    if (!customer.active) {
      throw new AppError('Customer is inactive', 409);
    }

    return customer;
  }

  const fallbackCustomer = await findCustomerByInternalCode(GENERIC_COUNTER_CUSTOMER_CODE);
  if (!fallbackCustomer) {
    throw new AppError('Generic counter customer is not configured', 500);
  }

  if (!fallbackCustomer.active) {
    throw new AppError('Generic counter customer is inactive', 500);
  }

  return fallbackCustomer;
}

function validateCustomerAgainstDocumentType(customer, documentType) {
  const customerName = buildCustomerName(customer);
  const customerDocType = String(customer.document_type || '').toLowerCase();

  if (documentType === 'boleta') {
    if (!customerName) {
      throw new AppError('Customer name is required for boleta', 400);
    }

    if (!['dni', 'ce'].includes(customerDocType)) {
      throw new AppError('A customer with DNI or CE is required for boleta', 400);
    }

    if (!normalizeText(customer.document_number)) {
      throw new AppError('Customer document number is required for boleta', 400);
    }

    if (
      customerDocType === 'ce' &&
      !/^\d{9}$/.test(String(customer.document_number || '').trim())
    ) {
      throw new AppError('CE document number must have exactly 9 digits for boleta', 400);
    }
  }

  if (documentType === 'factura') {
    if (!customerName) {
      throw new AppError('Customer name is required for factura', 400);
    }

    if (customerDocType !== 'ruc') {
      throw new AppError('A customer with RUC is required for factura', 400);
    }

    if (!normalizeText(customer.document_number)) {
      throw new AppError('Customer document number is required for factura', 400);
    }

    if (!normalizeText(customer.address)) {
      throw new AppError('Customer address is required for factura', 400);
    }
  }
}

async function getSaleByLocation(saleId, locationId) {
  const normalizedId = normalizeUuid(saleId);
  if (!normalizedId) throw new AppError('Sale id is required', 400);

  const header = await findSaleById(normalizedId, locationId);
  if (!header) throw new AppError('Sale not found', 404);

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
    throw new AppError('Invalid status value', 400);
  }

  if (cashStatus && !['open', 'closed', 'missing'].includes(cashStatus)) {
    throw new AppError('Invalid cash_status value', 400);
  }

  if (documentType && !ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
    throw new AppError('Invalid document_type value', 400);
  }

  if (input.date_from !== undefined && input.date_from !== null && !dateFrom) {
    throw new AppError('Invalid date_from value', 400);
  }

  if (input.date_to !== undefined && input.date_to !== null && !dateTo) {
    throw new AppError('Invalid date_to value', 400);
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new AppError('date_from cannot be greater than date_to', 400);
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
    throw new AppError('Invalid date_from value', 400);
  }

  if (input.date_to !== undefined && input.date_to !== null && !dateTo) {
    throw new AppError('Invalid date_to value', 400);
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new AppError('date_from cannot be greater than date_to', 400);
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
    throw new AppError('Invalid customer_id', 400);
  }

  if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
    throw new AppError('Invalid document_type', 400);
  }

  if (!items.length) {
    throw new AppError('At least one item is required', 400);
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
      throw new AppError('variant_id is required for each item', 400);
    }

    if (!qty) {
      throw new AppError('quantity must be a positive integer for each item', 400);
    }

    if (seenVariantIds.has(variantId)) {
      throw new AppError('Duplicate variant_id in items is not allowed', 400);
    }

    const variant = await findVariantById(variantId);
    if (!variant) {
      throw new AppError(`Variant ${variantId} not found`, 404);
    }

    if (!variant.active) {
      throw new AppError(`Variant ${variant.sku} is inactive`, 400);
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
          `Insufficient stock for ${item.sku}: available ${availableQty}, requested ${item.quantity}`,
          409
        );
      }

      const resolvedRetailPrice = normalizeAmount(
        await getCurrentRetailPriceInTx(clientQuery, item.style_id, item.size_id)
      );

      if (resolvedRetailPrice === null) {
        throw new AppError(`No current retail price found for ${item.sku}`, 409);
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
      throw new AppError('The final sale total must be greater than zero', 400);
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

  if (sale.document_type !== 'proforma') {
    throw new AppError('Only proforma sales can be downloaded from this endpoint', 400);
  }

  const pdfBuffer = await renderProformaSalePdfBuffer(sale);
  const fileNameBase = String(sale.sale_number || sale.sale_id || 'proforma')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'proforma';

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
};
