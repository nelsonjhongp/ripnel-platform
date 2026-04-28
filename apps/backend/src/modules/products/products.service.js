const { AppError } = require('../../shared/errors');
const {
  findProductSummaries,
  findProductSummaryById,
  findProductWorkspaceSizes,
  findProductWorkspaceColors,
} = require('./products.repo');

function normalizeCount(value) {
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function normalizeAmount(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function resolveProductStatus(summary) {
  if (!summary.active) {
    return 'inactive';
  }

  if (summary.configured_size_count === 0 || summary.configured_color_count === 0) {
    return 'draft';
  }

  if (summary.variant_count < summary.expected_variant_count) {
    return 'pending_variants';
  }

  if (summary.retail_sizes_covered_count < summary.configured_size_count) {
    return 'pending_prices';
  }

  if (summary.total_stock_qty <= 0) {
    return 'ready_no_stock';
  }

  return 'ready';
}

function resolveNextStep(status) {
  if (status === 'draft') {
    return {
      key: 'configure_variants',
      label: 'Configurar tallas y colores',
    };
  }

  if (status === 'pending_variants') {
    return {
      key: 'generate_variants',
      label: 'Generar variantes faltantes',
    };
  }

  if (status === 'pending_prices') {
    return {
      key: 'assign_prices',
      label: 'Asignar precios retail',
    };
  }

  if (status === 'ready_no_stock') {
    return {
      key: 'load_stock',
      label: 'Cargar stock',
    };
  }

  if (status === 'inactive') {
    return {
      key: 'review_status',
      label: 'Revisar estado',
    };
  }

  return {
    key: 'manage_product',
    label: 'Gestionar producto',
  };
}

function decorateProductSummary(row) {
  const configuredSizeCount = normalizeCount(row.configured_size_count);
  const configuredColorCount = normalizeCount(row.configured_color_count);
  const variantCount = normalizeCount(row.variant_count);
  const activeVariantCount = normalizeCount(row.active_variant_count);
  const inventoryRowCount = normalizeCount(row.inventory_row_count);
  const stockedVariantCount = normalizeCount(row.stocked_variant_count);
  const totalStockQty = normalizeCount(row.total_stock_qty);
  const retailSizesCoveredCount = normalizeCount(row.retail_sizes_covered_count);
  const wholesaleSizesCoveredCount = normalizeCount(row.wholesale_sizes_covered_count);
  const sizesWithStockWithoutRetailCount = normalizeCount(
    row.sizes_with_stock_without_retail_count
  );
  const expectedVariantCount =
    configuredSizeCount > 0 && configuredColorCount > 0
      ? configuredSizeCount * configuredColorCount
      : 0;
  const missingRetailSizeCount = Math.max(0, configuredSizeCount - retailSizesCoveredCount);
  const missingWholesaleSizeCount = Math.max(
    0,
    configuredSizeCount - wholesaleSizesCoveredCount
  );
  const warnings = {
    missing_wholesale_prices:
      row.active === true &&
      configuredSizeCount > 0 &&
      missingWholesaleSizeCount > 0,
    stock_without_retail_price:
      row.active === true && sizesWithStockWithoutRetailCount > 0,
  };

  const summary = {
    style_id: row.style_id,
    style_code: row.style_code,
    name: row.name,
    description: row.description,
    active: row.active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    garment_type_name: row.garment_type_name,
    fabric_name: row.fabric_name,
    fabric_detail_name: row.fabric_detail_name,
    target_name: row.target_name,
    size_codes: Array.isArray(row.size_codes)
      ? row.size_codes.map((value) => String(value)).filter(Boolean)
      : [],
    configured_size_count: configuredSizeCount,
    configured_color_count: configuredColorCount,
    expected_variant_count: expectedVariantCount,
    variant_count: variantCount,
    active_variant_count: activeVariantCount,
    inventory_row_count: inventoryRowCount,
    stocked_variant_count: stockedVariantCount,
    total_stock_qty: totalStockQty,
    retail_sizes_covered_count: retailSizesCoveredCount,
    wholesale_sizes_covered_count: wholesaleSizesCoveredCount,
    missing_retail_size_count: missingRetailSizeCount,
    missing_wholesale_size_count: missingWholesaleSizeCount,
    sizes_with_stock_without_retail_count: sizesWithStockWithoutRetailCount,
    warnings,
  };

  const status = resolveProductStatus(summary);
  const nextStep = resolveNextStep(status);

  return {
    ...summary,
    status,
    next_step: nextStep.key,
    next_step_label: nextStep.label,
  };
}

function mapWorkspaceSize(row) {
  return {
    size_id: row.size_id,
    code: row.code,
    name: row.name,
    sort_order: normalizeCount(row.sort_order),
    active: row.active,
    has_current_retail_price: row.has_current_retail_price === true,
    has_current_wholesale_price: row.has_current_wholesale_price === true,
    retail_price_count: normalizeCount(row.retail_price_count),
    wholesale_price_count: normalizeCount(row.wholesale_price_count),
    current_retail_price: normalizeAmount(row.current_retail_price),
    current_wholesale_price: normalizeAmount(row.current_wholesale_price),
    stock_qty: normalizeCount(row.stock_qty),
    has_stock: row.has_stock === true,
  };
}

async function listProducts() {
  const rows = await findProductSummaries();
  return rows.map(decorateProductSummary);
}

async function getProductWorkspace(styleId) {
  const normalizedStyleId = String(styleId || '').trim();

  if (!normalizedStyleId) {
    throw new AppError('Style id is required', 400);
  }

  const summaryRow = await findProductSummaryById(normalizedStyleId);

  if (!summaryRow) {
    throw new AppError('Product not found', 404);
  }

  const [configuredSizes, configuredColors] = await Promise.all([
    findProductWorkspaceSizes(normalizedStyleId),
    findProductWorkspaceColors(normalizedStyleId),
  ]);

  return {
    product: decorateProductSummary(summaryRow),
    configured_sizes: configuredSizes.map(mapWorkspaceSize),
    configured_colors: configuredColors,
  };
}

module.exports = {
  listProducts,
  getProductWorkspace,
};
