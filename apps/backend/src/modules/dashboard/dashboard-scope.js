const { AppError } = require('../../shared/errors');
const { normalizeUuid } = require('../../shared/uuid');
const { findActiveUserById } = require('../auth/auth.repo');
const { findDefaultLocationByUserId, findUserLocationsByUserId } = require('../users/users.repo');
const { findAllLocations } = require('../locations/locations.repo');

function hasPermission(permissions, permissionKey) {
  return (
    Array.isArray(permissions) &&
    (permissions.includes('admin.manage') || permissions.includes(permissionKey))
  );
}

function normalizeLocationScope(value) {
  if (value === 'all' || value === 'single') return value;
  return null;
}

function buildScopeLabel(scope, selectedLocation, availableLocations) {
  if (scope === 'single' && selectedLocation) {
    return selectedLocation.name;
  }

  if (scope === 'all') {
    return availableLocations.length > 1 ? 'Todas las sedes' : availableLocations[0]?.name || 'Sede activa';
  }

  return 'Sede activa';
}

async function resolveDashboardScope(input = {}) {
  const normalizedUserId = normalizeUuid(input.user_id);

  if (!normalizedUserId) {
    throw new AppError('Not authenticated', 401, { code: 'AUTH_REQUIRED' });
  }

  const user = await findActiveUserById(normalizedUserId);
  if (!user) {
    throw new AppError('Not authenticated', 401, { code: 'AUTH_REQUIRED' });
  }

  const permissions = Array.isArray(input.permissions) ? input.permissions : [];
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

  if (!defaultLocation.active) {
    throw new AppError('Default location is inactive', 409, {
      code: 'DEFAULT_LOCATION_INACTIVE',
    });
  }

  const assignedLocations = assignedRows.filter((row) => row.active !== false);
  const canViewGlobal = hasPermission(permissions, 'dashboard.global.view');
  const availableLocations = (canViewGlobal ? allLocations : assignedLocations).filter(
    (row) => row && row.active !== false
  );

  if (!availableLocations.length) {
    throw new AppError('No active locations are available for this dashboard', 409, {
      code: 'DASHBOARD_LOCATIONS_REQUIRED',
    });
  }

  const requestedScope = normalizeLocationScope(input.location_scope);
  const requestedLocationId = normalizeUuid(input.location_id);
  const availableLocationMap = new Map(
    availableLocations.map((location) => [location.location_id, location])
  );

  const defaultScope = canViewGlobal && availableLocations.length > 1 ? 'all' : 'single';

  if (requestedScope === 'all' && !canViewGlobal) {
    throw new AppError('Global dashboard scope is not available for this user', 403, {
      code: 'DASHBOARD_SCOPE_FORBIDDEN',
    });
  }

  const scope = requestedScope || defaultScope;

  let selectedLocation = null;

  if (requestedLocationId) {
    selectedLocation = availableLocationMap.get(requestedLocationId) || null;

    if (!selectedLocation) {
      throw new AppError('Selected location is not available for this dashboard', 403, {
        code: 'DASHBOARD_LOCATION_FORBIDDEN',
      });
    }
  }

  if (!selectedLocation) {
    selectedLocation =
      availableLocationMap.get(defaultLocation.location_id) || availableLocations[0] || defaultLocation;
  }

  const activeLocations =
    scope === 'all' && canViewGlobal ? availableLocations : [selectedLocation].filter(Boolean);

  return {
    user,
    defaultLocation,
    canViewGlobal,
    availableLocations: availableLocations.map((location) => ({
      location_id: location.location_id,
      name: location.name,
      code: location.code,
      type: location.type,
      active: location.active !== false,
      is_default: location.location_id === defaultLocation.location_id,
    })),
    scope,
    selectedLocation,
    activeLocationIds: activeLocations.map((location) => location.location_id),
    scopeLabel: buildScopeLabel(scope, selectedLocation, availableLocations),
  };
}

module.exports = {
  hasPermission,
  normalizeLocationScope,
  resolveDashboardScope,
};
