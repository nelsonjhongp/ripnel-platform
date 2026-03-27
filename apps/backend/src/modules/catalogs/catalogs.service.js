const { AppError } = require('../../shared/errors');
const { getCatalogConfig } = require('./catalogs.config');
const {
  findAllCatalogItems,
  insertCatalogItem,
  findCatalogItemById,
  findCatalogCodesByPrefix,
  updateCatalogItem,
} = require('./catalogs.repo');
const {
  formatManualCatalogCode,
  buildCatalogCodeBase,
  buildUniqueCatalogCode,
} = require('./catalogs-code');

const CODE_MAX_LENGTH = 10;

function normalizeBoolean(value, defaultValue = true) {
  return typeof value === 'boolean' ? value : defaultValue;
}

function normalizeOptionalText(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalNumber(value, defaultValue = 0) {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new AppError('Numeric value is invalid', 400);
  }

  return parsed;
}

function normalizeHex(value) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    throw new AppError('Color hex is invalid', 400);
  }

  return trimmed.toUpperCase();
}

async function listCatalogItems(catalogKey) {
  const config = getCatalogConfig(catalogKey);

  if (!config) {
    throw new AppError('Catalog is invalid', 404);
  }

  return findAllCatalogItems(config);
}

function normalizeCatalogPayload(config, input) {
  const name = input.name?.trim();
  const active = normalizeBoolean(input.active, true);

  if (!name) {
    throw new AppError(`${config.label} name is required`, 400);
  }

  if (config.key === 'sizes') {
    return {
      name,
      code: input.code?.trim() ? formatManualCatalogCode(input.code, CODE_MAX_LENGTH) : null,
      sort_order: normalizeOptionalNumber(input.sort_order, 0),
      description: normalizeOptionalText(input.description),
      active,
    };
  }

  if (config.key === 'colors') {
    return {
      name,
      code: input.code?.trim() ? formatManualCatalogCode(input.code, CODE_MAX_LENGTH) : null,
      hex: normalizeHex(input.hex),
      active,
    };
  }

  if (config.hasCode) {
    return {
      name,
      code: input.code?.trim() ? formatManualCatalogCode(input.code, CODE_MAX_LENGTH) : null,
      active,
    };
  }

  return {
    name,
    active,
  };
}

async function createCatalogItem(catalogKey, input) {
  const config = getCatalogConfig(catalogKey);

  if (!config) {
    throw new AppError('Catalog is invalid', 404);
  }

  const payload = normalizeCatalogPayload(config, input);

  if (config.hasCode && !payload.code) {
    const baseCode = buildCatalogCodeBase(payload.name, CODE_MAX_LENGTH);
    const existingCodes = baseCode
      ? await findCatalogCodesByPrefix(config, baseCode)
      : [];
    payload.code = baseCode
      ? buildUniqueCatalogCode(baseCode, existingCodes, CODE_MAX_LENGTH)
      : null;
  }

  try {
    return await insertCatalogItem(config, payload);
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError(`${config.label} already exists`, 409);
    }

    throw error;
  }
}

function normalizeCatalogPatchPayload(config, existingItem, input) {
  const restrictedFields = ['code'];
  const hasRestrictedFields = restrictedFields.some((field) => field in input);

  if (hasRestrictedFields) {
    throw new AppError(`${config.label} code cannot be updated`, 400);
  }

  const payload = {};

  if (config.editableFields.includes('name') && 'name' in input) {
    const name = input.name?.trim();

    if (!name) {
      throw new AppError(`${config.label} name is required`, 400);
    }

    payload.name = name;
  }

  if (config.editableFields.includes('sort_order') && 'sort_order' in input) {
    payload.sort_order = normalizeOptionalNumber(input.sort_order, existingItem.sort_order || 0);
  }

  if (config.editableFields.includes('description') && 'description' in input) {
    payload.description = normalizeOptionalText(input.description);
  }

  if (config.editableFields.includes('hex') && 'hex' in input) {
    payload.hex = normalizeHex(input.hex);
  }

  if (config.editableFields.includes('active') && 'active' in input) {
    if (typeof input.active !== 'boolean') {
      throw new AppError(`${config.label} active state is invalid`, 400);
    }

    payload.active = input.active;
  }

  if (!Object.keys(payload).length) {
    throw new AppError(`No editable fields were provided for ${config.label}`, 400);
  }

  return payload;
}

async function updateCatalogItemById(catalogKey, itemId, input) {
  const config = getCatalogConfig(catalogKey);

  if (!config) {
    throw new AppError('Catalog is invalid', 404);
  }

  const normalizedItemId = String(itemId || '').trim();

  if (!normalizedItemId) {
    throw new AppError(`${config.label} id is required`, 400);
  }

  const existingItem = await findCatalogItemById(config, normalizedItemId);

  if (!existingItem) {
    throw new AppError(`${config.label} not found`, 404);
  }

  const payload = normalizeCatalogPatchPayload(config, existingItem, input);

  try {
    return await updateCatalogItem(config, normalizedItemId, payload);
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError(`${config.label} already exists`, 409);
    }

    throw error;
  }
}

module.exports = {
  listCatalogItems,
  createCatalogItem,
  updateCatalogItemById,
};
