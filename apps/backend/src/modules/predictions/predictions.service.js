const { AppError } = require('../../shared/errors');
const { findDefaultLocationByUserId, findUserLocationsByUserId } = require('../users/users.repo');
const { findAllLocations } = require('../locations/locations.repo');
const { findActiveUserById } = require('../auth/auth.repo');
const { findStockRiskPredictions } = require('./predictions.repo');

function hasPermission(permissions, permissionKey) {
  return (
    Array.isArray(permissions) &&
    (permissions.includes('admin.manage') || permissions.includes(permissionKey))
  );
}

function normalizeUuid(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)
    ? normalized
    : null;
}

function normalizePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return parsed;
}

async function resolveInventoryScope(auth = {}, options = {}) {
  const normalizedUserId = normalizeUuid(auth.sub || auth.user_id);
  if (!normalizedUserId) {
    throw new AppError('Not authenticated', 401, { code: 'AUTH_REQUIRED' });
  }

  const user = await findActiveUserById(normalizedUserId);
  if (!user) {
    throw new AppError('Not authenticated', 401, { code: 'AUTH_REQUIRED' });
  }

  const [defaultLocation, assignedRows, allLocations] = await Promise.all([
    findDefaultLocationByUserId(normalizedUserId),
    findUserLocationsByUserId(normalizedUserId),
    findAllLocations(),
  ]);

  if (!defaultLocation) {
    throw new AppError('Authenticated user has no default location assigned', 409, {
      code: 'DEFAULT_LOCATION_REQUIRED',
    });
  }

  const canViewGlobal = hasPermission(auth.permissions, 'admin.manage');
  const assignedLocations = assignedRows.filter((row) => row.active !== false);
  const availableLocations = (canViewGlobal ? allLocations : assignedLocations).filter(
    (location) => location && location.active !== false
  );

  if (!availableLocations.length) {
    throw new AppError('No active locations are available', 409, {
      code: 'LOCATIONS_REQUIRED',
    });
  }

  const requestedLocationId = normalizeUuid(options.location_id || options.locationId);
  const availableLocationMap = new Map(
    availableLocations.map((location) => [location.location_id, location])
  );

  if (requestedLocationId && !availableLocationMap.has(requestedLocationId)) {
    throw new AppError('Selected location is not available', 403, {
      code: 'LOCATION_FORBIDDEN',
    });
  }

  const selectedLocation =
    (requestedLocationId && availableLocationMap.get(requestedLocationId)) ||
    availableLocationMap.get(defaultLocation.location_id) ||
    availableLocations[0];

  return {
    user,
    canViewGlobal,
    defaultLocation,
    selectedLocation,
    activeLocationIds: availableLocations.map((location) => location.location_id),
    availableLocations: availableLocations.map((location) => ({
      location_id: location.location_id,
      name: location.name,
      code: location.code,
      type: location.type,
      active: location.active !== false,
      is_default: location.location_id === defaultLocation.location_id,
    })),
  };
}

async function getStockRiskPredictions(input = {}, auth = {}) {
  if (!hasPermission(auth.permissions, 'inventory.view')) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  const scope = await resolveInventoryScope(auth, input);
  const requestedLocationId = normalizeUuid(input.location_id);

  if (input.location_id && !requestedLocationId) {
    throw new AppError('Location id is invalid', 400);
  }

  const lookbackDays = normalizePositiveInteger(input.lookback_days) || 30;
  const thresholdDays = normalizePositiveInteger(input.threshold_days) || 30;

  const locationIds = requestedLocationId ? [requestedLocationId] : scope.activeLocationIds;

  const rows = await findStockRiskPredictions(locationIds, lookbackDays, thresholdDays);

  return {
    rows: rows.map((row) => ({
      variant_id: row.variant_id,
      sku: row.sku,
      style_name: row.style_name,
      style_code: row.style_code,
      size_code: row.size_code,
      color_code: row.color_code,
      current_stock: Number(row.current_stock || 0),
      daily_consumption: Number(row.daily_consumption || 0),
      days_remaining: row.days_remaining != null ? Number(row.days_remaining) : null,
      risk_level: row.risk_level,
    })),
    meta: {
      lookback_days: lookbackDays,
      threshold_days: thresholdDays,
      location_count: locationIds.length,
      available_locations: scope.availableLocations,
      selected_location_id: requestedLocationId || null,
    },
  };
}

module.exports = {
  getStockRiskPredictions,
};
