const { AppError } = require('../../shared/errors');
const { pool } = require('../../shared/db');
const { listProducts } = require('../products/products.service');
const {
  findAllPrices,
  findPriceById,
  findStyleById,
  findSizeById,
  findConfiguredStyleSize,
  insertPrice,
  closePreviousPricesForNewStart,
  updatePrice,
} = require('./prices.repo');

const ALLOWED_PRICE_TYPES = ['retail', 'wholesale'];

function normalizeDate(dateValue) {
  if (!dateValue) {
    return null;
  }

  const normalized = String(dateValue).trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function isValidPriceType(priceType) {
  return ALLOWED_PRICE_TYPES.includes(priceType);
}

function coercePrice(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return null;
  }

  return numericValue;
}

async function listPrices(input = {}) {
  const styleId = input.style_id?.trim() || null;
  const priceType = input.price_type?.trim() || null;
  const active =
    typeof input.active === 'string'
      ? input.active === 'true'
      : typeof input.active === 'boolean'
        ? input.active
        : undefined;

  if (priceType && !isValidPriceType(priceType)) {
    throw new AppError('Price type is invalid', 400);
  }

  return findAllPrices({
    styleId,
    priceType,
    active,
  });
}

async function createPrice(input) {
  const styleId = input.style_id?.trim();
  const sizeId = input.size_id?.trim();
  const priceType = input.price_type?.trim();
  const price = coercePrice(input.price);
  const startDate = normalizeDate(input.start_date);
  const endDate = normalizeDate(input.end_date);
  const active = typeof input.active === 'boolean' ? input.active : true;

  if (!styleId) {
    throw new AppError('Style id is required', 400);
  }

  if (!sizeId) {
    throw new AppError('Size id is required', 400);
  }

  if (!priceType || !isValidPriceType(priceType)) {
    throw new AppError('Price type is invalid', 400);
  }

  if (price === null) {
    throw new AppError('Price is invalid', 400);
  }

  if (!startDate) {
    throw new AppError('Start date is invalid', 400);
  }

  if (input.end_date && !endDate) {
    throw new AppError('End date is invalid', 400);
  }

  if (endDate && endDate < startDate) {
    throw new AppError('End date cannot be before start date', 400);
  }

  const [style, size] = await Promise.all([
    findStyleById(styleId),
    findSizeById(sizeId),
  ]);

  if (!style) {
    throw new AppError('Style is invalid', 400);
  }

  if (!size) {
    throw new AppError('Size is invalid', 400);
  }

  const configuredStyleSize = await findConfiguredStyleSize(styleId, sizeId);

  if (!configuredStyleSize) {
    throw new AppError('Size is not configured for this style', 400);
  }

  const client = await pool.connect();

  try {
    await client.query('begin');

    await closePreviousPricesForNewStart(
      {
        styleId,
        sizeId,
        priceType,
        startDate,
      },
      client.query.bind(client)
    );

    const createdPrice = await insertPrice(
      {
        style_id: styleId,
        size_id: sizeId,
        price_type: priceType,
        price,
        start_date: startDate,
        end_date: endDate,
        active,
      },
      client.query.bind(client)
    );

    await client.query('commit');
    return createdPrice;
  } catch (error) {
    await client.query('rollback');

    if (error.code === '23503') {
      throw new AppError('Price relationships are invalid', 400);
    }

    if (error.code === '23505') {
      throw new AppError('Price already exists for this style, size, type and date', 409);
    }

    throw error;
  } finally {
    client.release();
  }
}

async function listPriceCoverageGaps() {
  const products = await listProducts();

  return products
    .filter(
      (product) =>
        product.missing_retail_size_count > 0 &&
        (product.active_variant_count > 0 || product.inventory_row_count > 0)
    )
    .sort((left, right) => {
      if (
        left.sizes_with_stock_without_retail_count !==
        right.sizes_with_stock_without_retail_count
      ) {
        return (
          right.sizes_with_stock_without_retail_count -
          left.sizes_with_stock_without_retail_count
        );
      }

      if (left.inventory_row_count !== right.inventory_row_count) {
        return right.inventory_row_count - left.inventory_row_count;
      }

      return String(left.name || '').localeCompare(String(right.name || ''), 'es');
    })
    .map((product) => ({
      style_id: product.style_id,
      style_code: product.style_code,
      style_name: product.name,
      variant_count: product.variant_count,
      inventory_row_count: product.inventory_row_count,
      price_row_count: product.retail_sizes_covered_count,
      configured_size_count: product.configured_size_count,
      retail_sizes_covered_count: product.retail_sizes_covered_count,
      missing_retail_size_count: product.missing_retail_size_count,
      sizes_with_stock_without_retail_count:
        product.sizes_with_stock_without_retail_count,
      total_stock_qty: product.total_stock_qty,
      status: product.status,
    }));
}

async function patchPrice(priceId, input) {
  const normalizedPriceId = String(priceId || '').trim();

  if (!normalizedPriceId) {
    throw new AppError('Price id is required', 400);
  }

  const blockedFields = ['style_id', 'size_id', 'price_type'];
  const hasBlockedFields = blockedFields.some((field) => field in input);

  if (hasBlockedFields) {
    throw new AppError('Price identity fields cannot be updated', 400);
  }

  const existingPrice = await findPriceById(normalizedPriceId);

  if (!existingPrice) {
    throw new AppError('Price not found', 404);
  }

  if (!('price' in input) && !('start_date' in input) && !('end_date' in input) && !('active' in input)) {
    throw new AppError('No editable fields were provided for price', 400);
  }

  const nextPrice = 'price' in input ? coercePrice(input.price) : Number(existingPrice.price);
  const nextStartDate =
    'start_date' in input ? normalizeDate(input.start_date) : normalizeDate(existingPrice.start_date);
  const nextEndDate =
    'end_date' in input
      ? normalizeDate(input.end_date)
      : normalizeDate(existingPrice.end_date);
  const nextActive = 'active' in input ? input.active : existingPrice.active;

  if (nextPrice === null) {
    throw new AppError('Price is invalid', 400);
  }

  if (!nextStartDate) {
    throw new AppError('Start date is invalid', 400);
  }

  if ('end_date' in input && input.end_date && !nextEndDate) {
    throw new AppError('End date is invalid', 400);
  }

  if (nextEndDate && nextEndDate < nextStartDate) {
    throw new AppError('End date cannot be before start date', 400);
  }

  if (typeof nextActive !== 'boolean') {
    throw new AppError('Price active state is invalid', 400);
  }

  try {
    await updatePrice(normalizedPriceId, {
      price: nextPrice,
      start_date: nextStartDate,
      end_date: nextEndDate,
      active: nextActive,
    });
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError('Price already exists for this style, size, type and date', 409);
    }

    throw error;
  }

  return findPriceById(normalizedPriceId);
}

module.exports = {
  listPrices,
  listPriceCoverageGaps,
  createPrice,
  patchPrice,
  ALLOWED_PRICE_TYPES,
};
