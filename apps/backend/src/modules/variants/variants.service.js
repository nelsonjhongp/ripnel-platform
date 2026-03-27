const { AppError } = require('../../shared/errors');
const {
  findStyleById,
  findConfiguredSizes,
  findConfiguredColors,
  findVariantsByStyleId,
  findVariantById,
  findSizesByIds,
  findColorsByIds,
  findColorByCode,
  replaceStyleConfig,
  insertVariants,
  updateVariantActive,
} = require('./variants.repo');
const { buildVariantSku } = require('./variants-sku');

function normalizeIdArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
}

async function getStyleOrThrow(styleId) {
  const normalizedStyleId = String(styleId || '').trim();

  if (!normalizedStyleId) {
    throw new AppError('Style id is required', 400);
  }

  const style = await findStyleById(normalizedStyleId);

  if (!style) {
    throw new AppError('Style not found', 404);
  }

  return style;
}

async function buildStyleVariantsSnapshot(styleId) {
  const style = await getStyleOrThrow(styleId);
  const configuredSizes = await findConfiguredSizes(style.style_id);
  const configuredColors = await findConfiguredColors(style.style_id);
  const variants = await findVariantsByStyleId(style.style_id);
  const totalPossible = configuredSizes.length * configuredColors.length;

  return {
    style,
    configured_sizes: configuredSizes,
    configured_colors: configuredColors,
    variants,
    summary: {
      total_possible: totalPossible,
      existing_count: variants.length,
      missing_count: Math.max(0, totalPossible - variants.length),
    },
  };
}

async function getStyleVariants(styleId) {
  return buildStyleVariantsSnapshot(styleId);
}

async function updateStyleConfig(styleId, input) {
  const style = await getStyleOrThrow(styleId);
  const sizeIds = normalizeIdArray(input.size_ids);
  let colorIds = normalizeIdArray(input.color_ids);

  if (!sizeIds.length) {
    throw new AppError('At least one size is required', 400);
  }

  const sizes = await findSizesByIds(sizeIds);

  if (sizes.length !== sizeIds.length) {
    throw new AppError('One or more sizes are invalid', 400);
  }

  if (!colorIds.length) {
    const defaultColor = await findColorByCode('UNICO');

    if (!defaultColor) {
      throw new AppError('Default color UNICO is not configured', 500);
    }

    colorIds = [defaultColor.color_id];
  }

  const colors = await findColorsByIds(colorIds);

  if (colors.length !== colorIds.length) {
    throw new AppError('One or more colors are invalid', 400);
  }

  const existingVariants = await findVariantsByStyleId(style.style_id);
  const allowedSizeIds = new Set(sizeIds);
  const allowedColorIds = new Set(colorIds);
  const hasOutOfConfigVariants = existingVariants.some(
    (variant) =>
      !allowedSizeIds.has(String(variant.size_id)) ||
      !allowedColorIds.has(String(variant.color_id))
  );

  if (hasOutOfConfigVariants) {
    throw new AppError(
      'Cannot remove sizes or colors already used by existing variants',
      409
    );
  }

  try {
    await replaceStyleConfig({
      styleId: style.style_id,
      sizeIds,
      colorIds,
    });
  } catch (error) {
    if (error.code === '23503') {
      throw new AppError('Variant configuration relationships are invalid', 400);
    }

    throw error;
  }

  return buildStyleVariantsSnapshot(style.style_id);
}

async function generateStyleVariants(styleId) {
  const snapshot = await buildStyleVariantsSnapshot(styleId);
  const { style, configured_sizes: configuredSizes, configured_colors: configuredColors } = snapshot;

  if (!style.style_code) {
    throw new AppError('Style code is required before generating variants', 409);
  }

  if (!configuredSizes.length) {
    throw new AppError('Configure at least one size before generating variants', 400);
  }

  if (!configuredColors.length) {
    throw new AppError('Configure at least one color before generating variants', 400);
  }

  const existingKeys = new Set(
    snapshot.variants.map((variant) => `${variant.size_id}:${variant.color_id}`)
  );
  const variantsToInsert = [];

  for (const size of configuredSizes) {
    for (const color of configuredColors) {
      const combinationKey = `${size.size_id}:${color.color_id}`;

      if (existingKeys.has(combinationKey)) {
        continue;
      }

      variantsToInsert.push({
        style_id: style.style_id,
        size_id: size.size_id,
        color_id: color.color_id,
        sku: buildVariantSku({
          styleCode: style.style_code,
          sizeCode: size.code,
          colorCode: color.code,
        }),
        barcode: null,
        active: true,
      });
    }
  }

  try {
    await insertVariants(variantsToInsert);
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError('One or more variants already exist', 409);
    }

    throw error;
  }

  const refreshedSnapshot = await buildStyleVariantsSnapshot(style.style_id);

  return {
    created_count: variantsToInsert.length,
    existing_count: snapshot.variants.length,
    total_possible: refreshedSnapshot.summary.total_possible,
    variants: refreshedSnapshot.variants,
    summary: refreshedSnapshot.summary,
  };
}

async function patchVariant(variantId, input) {
  const normalizedVariantId = String(variantId || '').trim();

  if (!normalizedVariantId) {
    throw new AppError('Variant id is required', 400);
  }

  const blockedFields = ['style_id', 'size_id', 'color_id', 'sku', 'barcode'];
  const hasBlockedFields = blockedFields.some((field) => field in input);

  if (hasBlockedFields) {
    throw new AppError('Variant identity fields cannot be updated', 400);
  }

  if (!('active' in input)) {
    throw new AppError('No editable fields were provided for variant', 400);
  }

  if (typeof input.active !== 'boolean') {
    throw new AppError('Variant active state is invalid', 400);
  }

  const existingVariant = await findVariantById(normalizedVariantId);

  if (!existingVariant) {
    throw new AppError('Variant not found', 404);
  }

  await updateVariantActive(normalizedVariantId, input.active);

  return findVariantById(normalizedVariantId);
}

module.exports = {
  getStyleVariants,
  updateStyleConfig,
  generateStyleVariants,
  patchVariant,
};
