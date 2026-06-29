const { AppError } = require('../../shared/errors');
const {
  findAllStyles,
  findStyleCodesByPrefix,
  findGarmentTypeById,
  findStyleById,
  insertStyle,
  countActiveVariantsByStyleId,
  updateStyle,
} = require('./styles.repo');
const {
  buildStyleCodeBase,
  buildUniqueStyleCode,
  normalizeStyleComparableText,
} = require('./styles-code');

const STYLE_CODE_MAX_LENGTH = 30;
const STYLE_DESCRIPTION_MAX_LENGTH = 240;

function normalizeStyleDescription(value) {
  const description = value?.trim() || null;

  if (description && description.length > STYLE_DESCRIPTION_MAX_LENGTH) {
    throw new AppError(
      `Style description cannot exceed ${STYLE_DESCRIPTION_MAX_LENGTH} characters`,
      400
    );
  }

  return description;
}

function findDuplicateStyleByCommercialName(styles, name, excludeStyleId = null) {
  const normalizedName = normalizeStyleComparableText(name);

  if (!normalizedName) {
    return null;
  }

  return (
    styles.find((style) => {
      if (excludeStyleId && style.style_id === excludeStyleId) {
        return false;
      }

      return normalizeStyleComparableText(style.name) === normalizedName;
    }) || null
  );
}

async function listStyles() {
  return findAllStyles();
}

async function createStyle(input) {
  const garmentTypeId = input.garment_type_id?.trim();
  const name = input.name?.trim();
  const description = normalizeStyleDescription(input.description);
  const active = typeof input.active === 'boolean' ? input.active : true;

  if (!garmentTypeId) {
    throw new AppError('Garment type is required', 400);
  }

  if (!name) {
    throw new AppError('Style name is required', 400);
  }

  const garmentType = await findGarmentTypeById(garmentTypeId);

  if (!garmentType) {
    throw new AppError('Garment type is invalid', 400);
  }

  const existingStyles = await findAllStyles();
  const duplicateStyle = findDuplicateStyleByCommercialName(existingStyles, name);

  if (duplicateStyle) {
    throw new AppError('Style already exists', 409);
  }

  const baseCode = buildStyleCodeBase({
    garmentTypeCode: garmentType.code,
    name,
    maxLength: STYLE_CODE_MAX_LENGTH,
  });
  const existingCodes = baseCode ? await findStyleCodesByPrefix(baseCode) : [];
  const styleCode = buildUniqueStyleCode(
    baseCode || garmentType.code || name,
    existingCodes,
    STYLE_CODE_MAX_LENGTH
  );

  try {
    await insertStyle({
      garment_type_id: garmentTypeId,
      style_code: styleCode,
      name,
      description,
      active,
    });
  } catch (error) {
    if (error.code === '23503') {
      throw new AppError('Style relationships are invalid', 400);
    }

    if (error.code === '23505') {
      throw new AppError('Style already exists', 409);
    }

    throw error;
  }

  const styles = await findAllStyles();
  return styles.find((style) => style.style_code === styleCode) || null;
}

async function patchStyle(styleId, input) {
  const normalizedStyleId = String(styleId || '').trim();

  if (!normalizedStyleId) {
    throw new AppError('Style id is required', 400);
  }

  const blockedFields = ['style_code', 'garment_type_id', 'fabric_id', 'fabric_detail_id', 'target_id'];
  const hasBlockedFields = blockedFields.some((field) => field in input);

  if (hasBlockedFields) {
    throw new AppError('Style identity fields cannot be updated', 400);
  }

  const existingStyle = await findStyleById(normalizedStyleId);

  if (!existingStyle) {
    throw new AppError('Style not found', 404);
  }

  if (!('name' in input) && !('description' in input) && !('active' in input)) {
    throw new AppError('No editable fields were provided for style', 400);
  }

  const name = 'name' in input ? input.name?.trim() : existingStyle.name;
  const description =
    'description' in input
      ? normalizeStyleDescription(input.description)
      : existingStyle.description;
  const active = 'active' in input ? input.active : existingStyle.active;

  if (!name) {
    throw new AppError('Style name is required', 400);
  }

  const existingStyles = await findAllStyles();
  const duplicateStyle = findDuplicateStyleByCommercialName(
    existingStyles,
    name,
    normalizedStyleId
  );

  if (duplicateStyle) {
    throw new AppError('Style already exists', 409);
  }

  if (typeof active !== 'boolean') {
    throw new AppError('Style active state is invalid', 400);
  }

  if (!active && existingStyle.active) {
    const activeVariantsCount = await countActiveVariantsByStyleId(normalizedStyleId);

    if (activeVariantsCount > 0) {
      throw new AppError(
        'Cannot deactivate a style while it still has active variants',
        409
      );
    }
  }

  try {
    await updateStyle(normalizedStyleId, {
      name,
      description,
      active,
    });
  } catch (error) {
    if (error.code === '23503') {
      throw new AppError('Style relationships are invalid', 400);
    }

    if (error.code === '23505') {
      throw new AppError('Style already exists', 409);
    }

    throw error;
  }

  return findStyleById(normalizedStyleId);
}

module.exports = {
  listStyles,
  createStyle,
  patchStyle,
};
