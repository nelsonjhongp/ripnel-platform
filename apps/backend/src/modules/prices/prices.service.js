const { AppError } = require('../../shared/errors');
const { pool } = require('../../shared/db');
const {
  getProductWorkspace,
  listProductSnapshots,
} = require('../products/products.service');
const { listPricingRules } = require('./pricing-rules.service');
const {
  findAllPrices,
  findPriceById,
  findPriceWorkspaceRowsByStyleId,
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

function normalizeCoverageFilter(value) {
  const normalized = String(value || 'all').trim().toLowerCase();

  if (
    normalized === 'missing_retail' ||
    normalized === 'missing_wholesale' ||
    normalized === 'stock_without_retail'
  ) {
    return normalized;
  }

  return 'all';
}

function normalizeStatusFilter(value) {
  const normalized = String(value || 'all').trim().toLowerCase();
  const allowed = new Set([
    'all',
    'inactive',
    'draft',
    'pending_variants',
    'pending_prices',
    'ready_no_stock',
    'ready',
  ]);

  return allowed.has(normalized) ? normalized : 'all';
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
  const search = input.q?.trim() || null;
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
    search,
  });
}

function mapPriceCatalogRow(product) {
  return {
    style_id: product.style_id,
    style_code: product.style_code,
    style_name: product.name,
    active: product.active,
    garment_type_name: product.garment_type_name,
    fabric_name: product.fabric_name,
    target_name: product.target_name,
    size_codes: product.size_codes,
    configured_size_count: product.configured_size_count,
    configured_color_count: product.configured_color_count,
    variant_count: product.variant_count,
    active_variant_count: product.active_variant_count,
    inventory_row_count: product.inventory_row_count,
    total_stock_qty: product.total_stock_qty,
    retail_sizes_covered_count: product.retail_sizes_covered_count,
    wholesale_sizes_covered_count: product.wholesale_sizes_covered_count,
    missing_retail_size_count: product.missing_retail_size_count,
    missing_wholesale_size_count: product.missing_wholesale_size_count,
    sizes_with_stock_without_retail_count: product.sizes_with_stock_without_retail_count,
    status: product.status,
    next_step_label: product.next_step_label,
    warnings: product.warnings,
  };
}

async function listPriceCatalog(input = {}) {
  const coverage = normalizeCoverageFilter(input.coverage);
  const status = normalizeStatusFilter(input.status);
  const searchQuery = input.q?.trim() || null;
  const snapshot = await listProductSnapshots({
    userId: input.userId,
    locationId: input.locationId,
    query: searchQuery,
  });

  return snapshot.items
    .filter((product) => {
      if (status !== 'all' && product.status !== status) {
        return false;
      }

      if (coverage === 'missing_retail') {
        return product.missing_retail_size_count > 0;
      }

      if (coverage === 'missing_wholesale') {
        return product.missing_wholesale_size_count > 0;
      }

      if (coverage === 'stock_without_retail') {
        return product.sizes_with_stock_without_retail_count > 0;
      }

      return true;
    })
    .map(mapPriceCatalogRow);
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

async function listPriceCoverageGaps(input = {}) {
  const snapshot = await listProductSnapshots({
    userId: input.userId,
    locationId: input.locationId,
  });
  const products = snapshot.items;

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

async function getPriceWorkspace(styleId) {
  const normalizedStyleId = String(styleId || '').trim();

  if (!normalizedStyleId) {
    throw new AppError('Style id is required', 400);
  }

  const [workspace, priceRows, pricingRules] = await Promise.all([
    getProductWorkspace(normalizedStyleId),
    findPriceWorkspaceRowsByStyleId(normalizedStyleId),
    listPricingRules(),
  ]);

  return {
    product: workspace.product,
    configured_sizes: workspace.configured_sizes,
    configured_colors: workspace.configured_colors,
    price_rows: priceRows,
    pricing_rules: pricingRules,
  };
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
  listPriceCatalog,
  listPriceCoverageGaps,
  getPriceWorkspace,
  createPrice,
  patchPrice,
  ALLOWED_PRICE_TYPES,
};
