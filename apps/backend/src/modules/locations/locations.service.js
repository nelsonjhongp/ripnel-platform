const { AppError } = require('../../shared/errors');
const {
  findAllLocations,
  insertLocation,
  findLocationCodesByPrefix,
} = require('./locations.repo');
const {
  formatManualLocationCode,
  buildLocationCodeBase,
  buildUniqueLocationCode,
} = require('./locations-code');

const ALLOWED_LOCATION_TYPES = ['store', 'warehouse', 'workshop', 'third_party'];

async function listLocations() {
  return findAllLocations();
}

async function createLocation(input) {
  const name = input.name?.trim();
  const manualCode = input.code?.trim() ? formatManualLocationCode(input.code) : null;
  const type = input.type?.trim();
  const address = input.address?.trim() || null;
  const active = typeof input.active === 'boolean' ? input.active : true;

  if (!name) {
    throw new AppError('Location name is required', 400);
  }

  if (!type || !ALLOWED_LOCATION_TYPES.includes(type)) {
    throw new AppError('Location type is invalid', 400);
  }

  const baseCode = manualCode || buildLocationCodeBase(name, type);
  const existingCodes = await findLocationCodesByPrefix(baseCode);
  const code = manualCode || buildUniqueLocationCode(baseCode, existingCodes);

  try {
    return await insertLocation({
      name,
      code,
      type,
      address,
      active,
    });
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError('Location code already exists', 409);
    }

    throw error;
  }
}

module.exports = {
  listLocations,
  createLocation,
  ALLOWED_LOCATION_TYPES,
};
