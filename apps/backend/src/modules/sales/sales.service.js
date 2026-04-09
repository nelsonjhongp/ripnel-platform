const { AppError } = require('../../shared/errors');
const { pool } = require('../../shared/db');
const {
  findSellableVariants,
  findAllSales,
  findSaleById,
  findSaleDetailsBySaleId,
  findSalePaymentsBySaleId,
  findCustomerById,
  findCustomerByInternalCode,
  findVariantById,
  getCurrentRetailPriceInTx,
  getInventoryQtyInTx,
  nextSaleNumberInTx,
  insertSale,
  insertSaleDetail,
  insertSalePayment,
  decrementInventoryInTx,
  insertStockMovementInTx,
} = require('./sales.repo');
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

function normalizePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeAmount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

function round2(value) {
  return Math.round(value * 100) / 100;
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

  if (documentType === 'boleta') {
    if (!customerName) {
      throw new AppError('Customer name is required for boleta', 400);
    }

    if (customer.document_type !== 'dni') {
      throw new AppError('A customer with DNI is required for boleta', 400);
    }

    if (!normalizeText(customer.document_number)) {
      throw new AppError('Customer document number is required for boleta', 400);
    }
  }

  if (documentType === 'factura') {
    if (!customerName) {
      throw new AppError('Customer name is required for factura', 400);
    }

    if (customer.document_type !== 'ruc') {
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

  return { ...header, details, payments };
}

async function listSellableVariants(input = {}) {
  const q = normalizeText(input.q);
  const { location } = await resolveOperatingContext(input.user_id);

  return findSellableVariants(location.location_id, q);
}

async function listSales(input = {}) {
  const status = normalizeText(input.status);
  const q = normalizeText(input.q);
  const { location } = await resolveOperatingContext(input.user_id);

  if (status && !['draft', 'confirmed', 'cancelled'].includes(status)) {
    throw new AppError('Invalid status value', 400);
  }

  return findAllSales({ status, q, locationId: location.location_id });
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

  if (input.customer_id !== undefined && input.customer_id !== null && !customerId) {
    throw new AppError('Invalid customer_id', 400);
  }

  if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
    throw new AppError('Invalid document_type', 400);
  }

  if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
    throw new AppError('Invalid payment_method', 400);
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
    });
  }

  const client = await pool.connect();

  try {
    await client.query('begin');
    const clientQuery = client.query.bind(client);

    const computedItems = [];
    let subtotalAmount = 0;

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

      const resolvedPrice = normalizeAmount(
        await getCurrentRetailPriceInTx(clientQuery, item.style_id, item.size_id)
      );

      if (resolvedPrice === null) {
        throw new AppError(`No current retail price found for ${item.sku}`, 409);
      }

      const lineSubtotal = round2(resolvedPrice * item.quantity);
      subtotalAmount += lineSubtotal;

      computedItems.push({
        ...item,
        unit_price_list: resolvedPrice,
        unit_price_final: resolvedPrice,
        price_type_applied: 'retail',
        lineSubtotal,
      });
    }

    subtotalAmount = round2(subtotalAmount);

    const taxRate = TAX_RATE_BY_DOCUMENT[documentType];
    const saleDiscountAmount = 0;
    const taxAmount = round2(subtotalAmount * taxRate);
    const totalAmount = round2(subtotalAmount + taxAmount - saleDiscountAmount);

    const saleNumber = await nextSaleNumberInTx(clientQuery, documentType);
    const confirmedAt = new Date().toISOString();

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
      sale_number: saleNumber,
      confirmed_at: confirmedAt,
      currency: 'PEN',
    });

    const saleId = saleRow.sale_id;

    for (const item of computedItems) {
      const lineTax = round2(item.lineSubtotal * taxRate);
      const lineTotal = round2(item.lineSubtotal + lineTax);

      await insertSaleDetail(clientQuery, {
        sale_id: saleId,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price_list: item.unit_price_list,
        unit_price_final: item.unit_price_final,
        price_type_applied: item.price_type_applied,
        pricing_basis: 'auto',
        line_subtotal: item.lineSubtotal,
        line_tax: lineTax,
        line_total: lineTotal,
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

    await insertSalePayment(clientQuery, {
      sale_id: saleId,
      method: paymentMethod,
      amount: totalAmount,
      reference: null,
    });

    await client.query('commit');

    return getSaleByLocation(saleId, location.location_id);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  listSellableVariants,
  listSales,
  getSale,
  createSale,
};
