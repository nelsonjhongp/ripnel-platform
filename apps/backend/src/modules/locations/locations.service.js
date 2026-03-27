const { AppError } = require('../../shared/errors');
const {
  findAllLocations,
  insertLocation,
  findLocationById,
  findLocationCodesByPrefix,
  updateLocation,
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

async function patchLocation(locationId, input) {
  const normalizedLocationId = String(locationId || '').trim();

  if (!normalizedLocationId) {
    throw new AppError('Location id is required', 400);
  }

  if ('code' in input || 'type' in input) {
    throw new AppError('Location code and type cannot be updated', 400);
  }

  const existingLocation = await findLocationById(normalizedLocationId);

  if (!existingLocation) {
    throw new AppError('Location not found', 404);
  }

  if (!('name' in input) && !('address' in input) && !('active' in input)) {
    throw new AppError('No editable fields were provided for location', 400);
  }

  const name = 'name' in input ? input.name?.trim() : existingLocation.name;
  const address =
    'address' in input ? input.address?.trim() || null : existingLocation.address;
  const active = 'active' in input ? input.active : existingLocation.active;

  if (!name) {
    throw new AppError('Location name is required', 400);
  }

  if (typeof active !== 'boolean') {
    throw new AppError('Location active state is invalid', 400);
  }

  return updateLocation({
    locationId: normalizedLocationId,
    name,
    address,
    active,
  });
}

module.exports = {
  listLocations,
  createLocation,
  patchLocation,
  ALLOWED_LOCATION_TYPES,
};
