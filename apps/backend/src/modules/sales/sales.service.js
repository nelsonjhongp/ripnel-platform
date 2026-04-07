const { AppError } = require('../../shared/errors');
const { pool } = require('../../shared/db');
const {
  findSellableVariants,
  findAllSales,
  findSaleById,
  findSaleDetailsBySaleId,
  findSalePaymentsBySaleId,
  findLocationById,
  findVariantById,
  getInventoryQtyInTx,
  nextSaleNumberInTx,
  insertSale,
  insertSaleDetail,
  insertSalePayment,
  decrementInventoryInTx,
  insertStockMovementInTx,
} = require('./sales.repo');
const { findUserById, findUserByEmail } = require('../users/users.repo');

const ALLOWED_DOCUMENT_TYPES = ['none', 'proforma', 'boleta', 'factura'];
const ALLOWED_PAYMENT_METHODS = ['cash', 'yape', 'plin', 'transfer'];
const ALLOWED_CUSTOMER_DOC_TYPES = ['none', 'dni', 'ruc', 'ce', 'passport'];
const DEVELOPMENT_ACTOR_EMAIL = 'nelson@ripnel.com';

const TAX_RATE_BY_DOCUMENT = {
  none: 0,
  proforma: 0,
  boleta: 0.18,
  factura: 0.18,
};

function normalizeUuid(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
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

async function resolveSellerUserId(userId) {
  const normalizedId = normalizeUuid(userId);

  if (normalizedId) {
    const user = await findUserById(normalizedId);
    if (!user) throw new AppError('Seller user not found', 400);
    return user.user_id;
  }

  const fallback = await findUserByEmail(DEVELOPMENT_ACTOR_EMAIL);
  if (!fallback) throw new AppError('Default seller user is not configured', 500);
  return fallback.user_id;
}

async function listSellableVariants(input = {}) {
  const locationId = normalizeUuid(input.location_id);
  const q = normalizeText(input.q);

  if (!locationId) {
    throw new AppError('location_id is required', 400);
  }

  const location = await findLocationById(locationId);
  if (!location) {
    throw new AppError('Location not found', 404);
  }

  return findSellableVariants(locationId, q);
}

async function listSales(input = {}) {
  const status = normalizeText(input.status);
  const q = normalizeText(input.q);
  const locationId = normalizeUuid(input.location_id);

  if (status && !['draft', 'confirmed', 'cancelled'].includes(status)) {
    throw new AppError('Invalid status value', 400);
  }

  return findAllSales({ status, q, locationId });
}

async function getSale(saleId) {
  const normalizedId = normalizeUuid(saleId);
  if (!normalizedId) throw new AppError('Sale id is required', 400);

  const header = await findSaleById(normalizedId);
  if (!header) throw new AppError('Sale not found', 404);

  const [details, payments] = await Promise.all([
    findSaleDetailsBySaleId(normalizedId),
    findSalePaymentsBySaleId(normalizedId),
  ]);

  return { ...header, details, payments };
}

async function createSale(input) {
  const locationId = normalizeUuid(input.location_id);
  const sellerUserId = normalizeUuid(input.seller_user_id);
  const customerId = normalizeUuid(input.customer_id);
  const customerNameText = normalizeText(input.customer_name_text);
  const customerDocType = normalizeText(input.customer_doc_type) || 'none';
  const customerDocNumber = normalizeText(input.customer_doc_number);
  const customerAddressText = normalizeText(input.customer_address_text);
  const documentType = normalizeText(input.document_type) || 'none';
  const paymentMethod = normalizeText(input.payment_method) || 'cash';
  const notes = normalizeText(input.notes);
  const items = Array.isArray(input.items) ? input.items : [];

  if (!locationId) throw new AppError('location_id is required', 400);
  if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) throw new AppError('Invalid document_type', 400);
  if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) throw new AppError('Invalid payment_method', 400);
  if (!ALLOWED_CUSTOMER_DOC_TYPES.includes(customerDocType)) throw new AppError('Invalid customer_doc_type', 400);
  if (!items.length) throw new AppError('At least one item is required', 400);

  if (documentType === 'boleta') {
    if (!customerNameText) throw new AppError('Customer name is required for boleta', 400);
    if (customerDocType !== 'dni') throw new AppError('DNI document type is required for boleta', 400);
    if (!customerDocNumber) throw new AppError('Customer document number is required for boleta', 400);
  }

  if (documentType === 'factura') {
    if (!customerNameText) throw new AppError('Customer name is required for factura', 400);
    if (customerDocType !== 'ruc') throw new AppError('RUC document type is required for factura', 400);
    if (!customerDocNumber) throw new AppError('Customer document number is required for factura', 400);
    if (!customerAddressText) throw new AppError('Customer address is required for factura', 400);
  }

  const location = await findLocationById(locationId);
  if (!location) throw new AppError('Location not found', 404);

  const resolvedSellerUserId = await resolveSellerUserId(sellerUserId);
  const taxRate = TAX_RATE_BY_DOCUMENT[documentType];

  const normalizedItems = [];
  const seenVariantIds = new Set();

  for (const item of items) {
    const variantId = normalizeUuid(item.variant_id);
    const qty = normalizePositiveInteger(item.quantity);
    const unitPriceFinal = normalizeAmount(item.unit_price_final ?? item.unit_price_list);
    const unitPriceList = normalizeAmount(item.unit_price_list ?? item.unit_price_final);
    const priceTypeApplied = normalizeText(item.price_type_applied) || 'retail';

    if (!variantId) throw new AppError('variant_id is required for each item', 400);
    if (!qty) throw new AppError('quantity must be a positive integer for each item', 400);
    if (unitPriceFinal === null) throw new AppError('unit_price_final must be a non-negative number', 400);
    if (!['retail', 'wholesale'].includes(priceTypeApplied)) throw new AppError('Invalid price_type_applied', 400);
    if (seenVariantIds.has(variantId)) throw new AppError('Duplicate variant_id in items is not allowed', 400);
    seenVariantIds.add(variantId);

    const variant = await findVariantById(variantId);
    if (!variant) throw new AppError(`Variant ${variantId} not found`, 404);
    if (!variant.active) throw new AppError(`Variant ${variant.sku} is inactive`, 400);

    normalizedItems.push({
      variant_id: variantId,
      sku: variant.sku,
      quantity: qty,
      unit_price_list: unitPriceList ?? unitPriceFinal,
      unit_price_final: unitPriceFinal,
      price_type_applied: priceTypeApplied,
    });
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const clientQuery = client.query.bind(client);

    for (const item of normalizedItems) {
      const availableQty = await getInventoryQtyInTx(clientQuery, locationId, item.variant_id);
      if (availableQty < item.quantity) {
        throw new AppError(
          `Insufficient stock for ${item.sku}: available ${availableQty}, requested ${item.quantity}`,
          409
        );
      }
    }

    let subtotalAmount = 0;
    const computedItems = normalizedItems.map((item) => {
      const lineSubtotal = round2(item.unit_price_final * item.quantity);
      subtotalAmount += lineSubtotal;
      return { ...item, lineSubtotal };
    });

    subtotalAmount = round2(subtotalAmount);
    const saleDiscountAmount = 0;
    const taxAmount = round2(subtotalAmount * taxRate);
    const totalAmount = round2(subtotalAmount + taxAmount - saleDiscountAmount);

    const saleNumber = await nextSaleNumberInTx(clientQuery, documentType);
    const confirmedAt = new Date().toISOString();

    const saleRow = await insertSale(clientQuery, {
      location_id: locationId,
      seller_user_id: resolvedSellerUserId,
      customer_id: customerId,
      customer_name_text: customerNameText,
      customer_doc_type: customerDocType,
      customer_doc_number: customerDocNumber,
      customer_address_text: customerAddressText,
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

      await decrementInventoryInTx(clientQuery, locationId, item.variant_id, item.quantity);

      await insertStockMovementInTx(clientQuery, {
        location_id: locationId,
        variant_id: item.variant_id,
        movement_type: 'OUT',
        quantity: item.quantity,
        reason: `Venta ${saleNumber}`,
        reference_type: 'sale',
        reference_id: saleId,
        created_by: resolvedSellerUserId,
      });
    }

    await insertSalePayment(clientQuery, {
      sale_id: saleId,
      method: paymentMethod,
      amount: totalAmount,
      reference: null,
    });

    await client.query('commit');

    return getSale(saleId);
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
