const { AppError } = require('../../shared/errors');
const { pool } = require('../../shared/db');
const { normalizeUuid } = require('../../shared/uuid');
const { findActiveUserById } = require('../auth/auth.repo');
const { findUserByEmail } = require('../users/users.repo');
const { findDefaultLocationByUserId, findUserLocationsByUserId } = require('../users/users.repo');
const { findAllLocations } = require('../locations/locations.repo');
const {
  findAllInventory,
  findInventoryProductSummary,
  countInventoryProductSummary,
  findInventoryLocationSummary,
  countInventoryLocationSummary,
  findInventoryStyleRows,
  findAllKardex,
  findAllAdjustments,
  findAdjustmentVariants,
  findAdjustmentHeaderById,
  findAdjustmentLinesByAdjustmentId,
  findLocationById,
  findUserById,
  findVariantsByIds,
  findInventoryQtyByLocationAndVariant,
  insertAdjustment,
  insertAdjustmentLine,
  confirmAdjustment,
  cancelAdjustment,
  upsertInventoryQty,
  insertStockMovement,
} = require('./inventory.repo');

const ALLOWED_MOVEMENT_TYPES = ['IN', 'OUT', 'ADJUST'];
const DEVELOPMENT_ACTOR_EMAIL = 'nelson@ripnel.com';
const LOW_STOCK_THRESHOLD = 3;

function normalizeText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeDateTime(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function normalizeNonNegativeInteger(value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function normalizePositiveInteger(value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

function buildAdjustmentNumber() {
  return `AJ-${Date.now()}`;
}

function normalizeStockStatus(value) {
  if (value === 'available' || value === 'low' || value === 'out' || value === 'incomplete') {
    return value;
  }

  return null;
}

function inferAdjustmentIntentType(reason) {
  return /apertura|inicial/i.test(String(reason || '')) ? 'opening' : 'adjustment';
}

function resolveMovementDirection(movementType) {
  if (movementType === 'IN') return 'entry';
  if (movementType === 'OUT') return 'exit';
  return 'adjustment';
}

function resolveDocumentFamily(referenceType) {
  if (
    referenceType === 'sale' ||
    referenceType === 'transfer' ||
    referenceType === 'exchange' ||
    referenceType === 'adjustment'
  ) {
    return referenceType;
  }

  return 'none';
}

function resolveSemanticOrigin(movement = {}) {
  const documentFamily = resolveDocumentFamily(movement.reference_type);
  const movementType = movement.movement_type;
  const intentType = inferAdjustmentIntentType(movement.reason);

  if (documentFamily === 'adjustment') {
    return intentType === 'opening' ? 'opening_confirmed' : 'adjustment_confirmed';
  }

  if (documentFamily === 'transfer') {
    if (movementType === 'OUT') return 'transfer_shipped';
    if (movementType === 'IN') return 'transfer_received';
  }

  if (documentFamily === 'exchange') {
    if (movementType === 'IN') return 'exchange_received';
    if (movementType === 'OUT') return 'exchange_delivered';
  }

  if (documentFamily === 'sale') {
    if (movementType === 'OUT') return 'sale_confirmed';
    if (movementType === 'IN') return 'sale_cancelled';
  }

  return 'unclassified';
}

function buildInventoryScopeMeta(scope, selectedLocationId = null) {
  return {
    available_locations: scope.availableLocations,
    selected_location_id:
      selectedLocationId ||
      (scope.availableLocations.length === 1 ? scope.availableLocations[0].location_id : null),
    can_view_all_locations: scope.canViewGlobal,
  };
}

function hasAdminInventoryScope(auth = {}) {
  return hasPermission(auth.permissions, 'admin.manage');
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

  if (!defaultLocation.active) {
    throw new AppError('Default location is inactive', 409, {
      code: 'DEFAULT_LOCATION_INACTIVE',
    });
  }

  const canViewGlobal = hasAdminInventoryScope(auth);
  const assignedLocations = assignedRows.filter((row) => row.active !== false);
  const availableLocations = (canViewGlobal ? allLocations : assignedLocations).filter(
    (location) => location && location.active !== false
  );

  if (!availableLocations.length) {
    throw new AppError('No active locations are available for inventory', 409, {
      code: 'INVENTORY_LOCATIONS_REQUIRED',
    });
  }

  const requestedLocationId = normalizeUuid(options.location_id || options.locationId);
  const availableLocationMap = new Map(
    availableLocations.map((location) => [location.location_id, location])
  );

  if (requestedLocationId && !availableLocationMap.has(requestedLocationId)) {
    throw new AppError('Selected location is not available for this inventory', 403, {
      code: 'INVENTORY_LOCATION_FORBIDDEN',
    });
  }

  const selectedLocation =
    (requestedLocationId && availableLocationMap.get(requestedLocationId)) ||
    availableLocationMap.get(defaultLocation.location_id) ||
    availableLocations[0] ||
    defaultLocation;

  const shouldRestrictToRequestedLocation = options.restrictToRequestedLocation !== false;
  const activeLocations = requestedLocationId && shouldRestrictToRequestedLocation
    ? [selectedLocation].filter(Boolean)
    : availableLocations;

  return {
    user,
    canViewGlobal,
    defaultLocation,
    selectedLocation,
    activeLocationIds: activeLocations.map((location) => location.location_id),
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

function resolveProductStatus(totalQty, threshold = LOW_STOCK_THRESHOLD, hasZeroVariant = false) {
  if (totalQty === 0) {
    return 'out';
  }

  if (hasZeroVariant) {
    return 'incomplete';
  }

  if (totalQty <= threshold) {
    return 'low';
  }

  return 'available';
}

function resolveLocationStatus(totalQty, threshold = LOW_STOCK_THRESHOLD) {
  return resolveProductStatus(totalQty, threshold);
}

function getProductStatusLabel(status) {
  if (status === 'out') return 'Sin stock';
  if (status === 'incomplete') return 'Stock incompleto';
  if (status === 'low') return 'Bajo stock';
  return 'Disponible';
}

function summarizeInventoryItems(items = [], threshold = LOW_STOCK_THRESHOLD) {
  const stockTotal = items.reduce((accumulator, item) => accumulator + Number(item.qty || 0), 0);
  const hasZeroVariant = stockTotal > 0 && items.some((item) => Number(item.qty || 0) === 0);
  const locationsWithStock = new Set(
    items.filter((item) => Number(item.qty || 0) > 0).map((item) => item.location_id)
  ).size;
  const availableSizes = new Set(
    items.filter((item) => Number(item.qty || 0) > 0).map((item) => item.size_id)
  ).size;
  const availableColors = new Set(
    items.filter((item) => Number(item.qty || 0) > 0).map((item) => item.color_id)
  ).size;
  const status = resolveProductStatus(stockTotal, threshold, hasZeroVariant);

  return {
    stock_total: stockTotal,
    locations_with_stock: locationsWithStock,
    sizes_available: availableSizes,
    colors_available: availableColors,
    status,
    status_label: getProductStatusLabel(status),
    low_stock_threshold: threshold,
  };
}

function getLocationSummaryLabel(status) {
  if (status === 'critical') return 'Crítico';
  if (status === 'attention') return 'Revisar';
  return 'Normal';
}

function hasPermission(permissions, permissionKey) {
  return (
    Array.isArray(permissions) &&
    (permissions.includes('admin.manage') || permissions.includes(permissionKey))
  );
}

function canManageInventoryAdjustments(auth = {}) {
  return hasPermission(auth.permissions, 'inventory.adjust');
}

function ensureUniqueVariantIds(lines) {
  const ids = new Set();

  for (const line of lines) {
    if (ids.has(line.variant_id)) {
      return false;
    }

    ids.add(line.variant_id);
  }

  return true;
}

async function resolveAdjustmentActorUserId(value, fieldLabel) {
  const normalizedUserId = normalizeUuid(value);

  if (normalizedUserId) {
    const user = await findUserById(normalizedUserId);

    if (!user) {
      throw new AppError(`${fieldLabel} user is invalid`, 400);
    }

    return user.user_id;
  }

  const fallbackUser = await findUserByEmail(DEVELOPMENT_ACTOR_EMAIL);

  if (!fallbackUser) {
    throw new AppError('Development adjustment actor is not available', 500);
  }

  return fallbackUser.user_id;
}

async function listInventory(input = {}, auth = {}) {
  if (!hasPermission(auth.permissions, 'inventory.view')) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  const filters = {
    locationId: normalizeUuid(input.location_id),
    query: normalizeText(input.query),
    styleCode: normalizeText(input.style_code),
    sku: normalizeText(input.sku),
  };

  if (input.location_id && !filters.locationId) {
    throw new AppError('Location id is invalid', 400);
  }

  return findAllInventory(filters);
}

async function listInventoryProductSummary(input = {}, auth = {}) {
  if (!hasPermission(auth.permissions, 'inventory.view')) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  const scope = await resolveInventoryScope(auth, input);
  const garmentType = normalizeText(input.garment_type);
  const status = normalizeStockStatus(normalizeText(input.status));
  const requestedLocationId = normalizeUuid(input.location_id);

  if (input.location_id && !requestedLocationId) {
    throw new AppError('Location id is invalid', 400);
  }

  const page = normalizePositiveInteger(input.page);
  const pageSize = normalizePositiveInteger(input.page_size);

  const repoFilters = {
    locationIds: scope.activeLocationIds,
    locationId: requestedLocationId,
    query: normalizeText(input.query),
    garmentType,
    status,
    lowStockThreshold: LOW_STOCK_THRESHOLD,
  };

  let rows;
  let total;

  if (page && pageSize) {
    const offset = (page - 1) * pageSize;
    rows = await findInventoryProductSummary({
      ...repoFilters,
      limit: pageSize,
      offset,
    });
    total = await countInventoryProductSummary(repoFilters);
  } else {
    rows = await findInventoryProductSummary(repoFilters);
    total = rows.length;
  }

  return {
    rows: rows.map((row) => ({
      style_id: row.style_id,
      style_code: row.style_code,
      style_name: row.style_name,
      garment_type_name: row.garment_type_name,
      stock_total: Number(row.total_qty || 0),
      sizes_count: Number(row.sizes_count || 0),
      colors_count: Number(row.colors_count || 0),
      locations_count: Number(row.locations_with_stock || 0),
      status: row.status,
      status_label: getProductStatusLabel(row.status),
    })),
    meta: {
      low_stock_threshold: LOW_STOCK_THRESHOLD,
      available_locations: scope.availableLocations,
      selected_location_id: requestedLocationId,
      can_view_all_locations: scope.canViewGlobal,
      scope_label: requestedLocationId
        ? `Stock en sede`
        : scope.availableLocations.length > 1
          ? 'Todas las sedes'
          : 'Stock en sede',
      ...(page && pageSize
        ? {
            total,
            page,
            page_size: pageSize,
            total_pages: Math.ceil(total / pageSize),
          }
        : {}),
    },
  };
}

async function listInventoryLocationSummary(input = {}, auth = {}) {
  if (!hasPermission(auth.permissions, 'inventory.view')) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  const scope = await resolveInventoryScope(auth, input);
  const status = normalizeStockStatus(normalizeText(input.status));
  const requestedLocationId = normalizeUuid(input.location_id);

  if (input.location_id && !requestedLocationId) {
    throw new AppError('Location id is invalid', 400);
  }

  const page = normalizePositiveInteger(input.page);
  const pageSize = normalizePositiveInteger(input.page_size);

  const repoFilters = {
    locationIds: scope.activeLocationIds,
    locationId: requestedLocationId,
    query: normalizeText(input.query),
    status,
    lowStockThreshold: LOW_STOCK_THRESHOLD,
  };

  let rows;
  let total;

  if (page && pageSize) {
    const offset = (page - 1) * pageSize;
    rows = await findInventoryLocationSummary({
      ...repoFilters,
      limit: pageSize,
      offset,
    });
    total = await countInventoryLocationSummary(repoFilters);
  } else {
    rows = await findInventoryLocationSummary(repoFilters);
    total = rows.length;
  }

  return {
    rows: rows.map((row) => ({
      location_id: row.location_id,
      location_name: row.location_name,
      stock_total: Number(row.stock_total || 0),
      products_count: Number(row.products_count || 0),
      low_stock_count: Number(row.low_stock_count || 0),
      out_of_stock_count: Number(row.out_of_stock_count || 0),
      status: row.status,
      status_label: getLocationSummaryLabel(row.status),
    })),
    meta: {
      low_stock_threshold: LOW_STOCK_THRESHOLD,
      available_locations: scope.availableLocations,
      can_view_all_locations: scope.canViewGlobal,
      ...(page && pageSize
        ? {
            total,
            page,
            page_size: pageSize,
            total_pages: Math.ceil(total / pageSize),
          }
        : {}),
    },
  };
}

function buildLocationTableRows(items, threshold) {
  const grouped = new Map();

  for (const item of items) {
    const current = grouped.get(item.location_id) || {
      location_id: item.location_id,
      location_name: item.location_name,
      location_code: item.location_code,
      stock_total: 0,
      variantIdsWithStock: new Set(),
      hasZeroVariant: false,
    };

    current.stock_total += Number(item.qty || 0);
    if (Number(item.qty || 0) > 0) {
      current.variantIdsWithStock.add(item.variant_id);
    }
    if (Number(item.qty || 0) === 0) {
      current.hasZeroVariant = true;
    }

    grouped.set(item.location_id, current);
  }

  return Array.from(grouped.values())
    .map((row) => {
      const status = resolveProductStatus(row.stock_total, threshold, row.hasZeroVariant);
      return {
        location_id: row.location_id,
        location_name: row.location_name,
        location_code: row.location_code,
        stock_total: row.stock_total,
        variants_with_stock: row.variantIdsWithStock.size,
        status,
        status_label: getProductStatusLabel(status),
      };
    })
    .sort((left, right) => left.location_name.localeCompare(right.location_name, 'es'));
}

function buildMatrix(items, selectedLocationId, threshold) {
  const selectedItems = items.filter((item) => item.location_id === selectedLocationId);
  const sizes = Array.from(
    new Map(
      selectedItems.map((item) => [
        item.size_id,
        {
          size_id: item.size_id,
          size_code: item.size_code,
          sort_order: Number(item.size_sort_order || 0),
        },
      ])
    ).values()
  ).sort((left, right) => left.sort_order - right.sort_order || left.size_code.localeCompare(right.size_code, 'es'));

  const colorMap = new Map();

  for (const item of selectedItems) {
    const current = colorMap.get(item.color_id) || {
      color_id: item.color_id,
      color_name: item.color_name,
      total_qty: 0,
      cells: new Map(),
    };

    current.total_qty += Number(item.qty || 0);
    current.cells.set(item.size_id, Number(item.qty || 0));
    colorMap.set(item.color_id, current);
  }

  const rows = Array.from(colorMap.values())
    .map((row) => {
      const hasZeroVariant = row.total_qty > 0 && sizes.some((size) => Number(row.cells.get(size.size_id) || 0) === 0);
      const status = resolveProductStatus(row.total_qty, threshold, hasZeroVariant);
      return {
        color_id: row.color_id,
        color_name: row.color_name,
        total_qty: row.total_qty,
        status,
        status_label: getProductStatusLabel(status),
        cells: sizes.map((size) => ({
          size_id: size.size_id,
          size_code: size.size_code,
          qty: Number(row.cells.get(size.size_id) || 0),
        })),
      };
    })
    .sort((left, right) => left.color_name.localeCompare(right.color_name, 'es'));

  return {
    selected_location_id: selectedLocationId,
    sizes: sizes.map((size) => ({
      size_id: size.size_id,
      size_code: size.size_code,
    })),
    rows,
  };
}

async function getInventoryStyleDetail(styleId, input = {}, auth = {}) {
  if (!hasPermission(auth.permissions, 'inventory.view')) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  const normalizedStyleId = normalizeUuid(styleId);

  if (!normalizedStyleId) {
    throw new AppError('Style id is invalid', 400);
  }

  const scope = await resolveInventoryScope(auth, { ...input, restrictToRequestedLocation: false });
  const requestedLocationId = normalizeUuid(input.location_id);

  if (input.location_id && !requestedLocationId) {
    throw new AppError('Location id is invalid', 400);
  }

  const items = await findInventoryStyleRows({
    locationIds: scope.activeLocationIds,
    styleId: normalizedStyleId,
  });

  if (!items.length) {
    throw new AppError('Style inventory not found', 404);
  }

  const styleItem = items[0];
  const detailLocationRows = buildLocationTableRows(items, LOW_STOCK_THRESHOLD);
  const preferredLocationId = requestedLocationId || scope.selectedLocation?.location_id || null;
  const selectedLocationId =
    detailLocationRows.find((location) => location.location_id === preferredLocationId)?.location_id ||
    detailLocationRows[0]?.location_id ||
    null;
  const scopedSummaryItems = selectedLocationId
    ? items.filter((item) => item.location_id === selectedLocationId)
    : items;
  const matrix = selectedLocationId
    ? buildMatrix(items, selectedLocationId, LOW_STOCK_THRESHOLD)
    : { selected_location_id: null, sizes: [], rows: [] };
  const summary = summarizeInventoryItems(scopedSummaryItems, LOW_STOCK_THRESHOLD);

  return {
    style: {
      style_id: styleItem.style_id,
      style_code: styleItem.style_code,
      style_name: styleItem.style_name,
      garment_type_name: styleItem.garment_type_name,
    },
    summary,
    locations: detailLocationRows,
    matrix,
    movements: {
      enabled: false,
      message: 'El historial de movimientos estará disponible próximamente.',
    },
    meta: {
      available_locations: scope.availableLocations,
      selected_location_id: selectedLocationId,
      can_view_all_locations: scope.canViewGlobal,
    },
  };
}

async function listKardex(input = {}, auth = {}) {
  if (!hasPermission(auth.permissions, 'inventory.view')) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  const movementType = normalizeText(input.movement_type);
  const referenceType = normalizeText(input.reference_type);
  const referenceId = normalizeUuid(input.reference_id);
  const requestedLocationId = normalizeUuid(input.location_id);

  if (input.location_id && !requestedLocationId) {
    throw new AppError('Location id is invalid', 400);
  }

  const scope = await resolveInventoryScope(auth, input);

  if (movementType && !ALLOWED_MOVEMENT_TYPES.includes(movementType)) {
    throw new AppError('Movement type is invalid', 400);
  }

  if (input.reference_id && !referenceId) {
    throw new AppError('Reference id is invalid', 400);
  }

  const filters = {
    locationIds: scope.activeLocationIds,
    locationId: requestedLocationId,
    variantId: normalizeUuid(input.variant_id),
    movementType,
    referenceType,
    referenceId,
    dateFrom: normalizeDateTime(input.date_from),
    dateTo: normalizeDateTime(input.date_to),
    query: normalizeText(input.query),
  };

  if (input.date_from && !filters.dateFrom) {
    throw new AppError('Date from is invalid', 400);
  }

  if (input.date_to && !filters.dateTo) {
    throw new AppError('Date to is invalid', 400);
  }

  const rows = await findAllKardex(filters);

  return {
    rows: rows.map((row) => ({
      ...row,
      movement_direction: resolveMovementDirection(row.movement_type),
      document_family: resolveDocumentFamily(row.reference_type),
      semantic_origin: resolveSemanticOrigin(row),
    })),
    meta: buildInventoryScopeMeta(scope, requestedLocationId),
  };
}

async function listAdjustments(input = {}, auth = {}) {
  if (!canManageInventoryAdjustments(auth)) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  const requestedLocationId = normalizeUuid(input.location_id);

  if (input.location_id && !requestedLocationId) {
    throw new AppError('Location id is invalid', 400);
  }

  const scope = await resolveInventoryScope(auth, input);
  const rows = await findAllAdjustments({
    locationIds: scope.activeLocationIds,
    locationId: requestedLocationId,
    status: normalizeText(input.status),
    query: normalizeText(input.query),
  });

  return {
    rows: rows.map((row) => ({
      ...row,
      line_count: Number(row.line_count || 0),
      intent_type: inferAdjustmentIntentType(row.reason),
    })),
    meta: buildInventoryScopeMeta(scope, requestedLocationId),
  };
}

async function searchVariantsForAdjustment(input = {}, auth = {}) {
  if (!canManageInventoryAdjustments(auth)) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  const locationId = normalizeUuid(input.location_id);
  const query = normalizeText(input.query);

  if (!locationId) {
    throw new AppError('Location id is required', 400);
  }

  const scope = await resolveInventoryScope(auth, { location_id: locationId });

  if (!query || query.length < 2) {
    return {
      rows: [],
      meta: buildInventoryScopeMeta(scope, locationId),
    };
  }

  const location = await findLocationById(locationId);

  if (!location) {
    throw new AppError('Location is invalid', 400);
  }

  const rows = await findAdjustmentVariants(locationId, query);

  return {
    rows,
    meta: buildInventoryScopeMeta(scope, locationId),
  };
}

async function getAdjustmentById(adjustmentId, auth = {}) {
  if (!canManageInventoryAdjustments(auth)) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  const normalizedAdjustmentId = normalizeUuid(adjustmentId);

  if (!normalizedAdjustmentId) {
    throw new AppError('Adjustment id is required', 400);
  }

  const header = await findAdjustmentHeaderById(normalizedAdjustmentId);

  if (!header) {
    throw new AppError('Adjustment not found', 404);
  }

  const scope = await resolveInventoryScope(auth, { location_id: header.location_id });
  const lines = await findAdjustmentLinesByAdjustmentId(normalizedAdjustmentId);

  return {
    adjustment: {
      ...header,
      intent_type: inferAdjustmentIntentType(header.reason),
      lines,
    },
    meta: buildInventoryScopeMeta(scope, header.location_id),
  };
}

async function createAdjustment(input, auth = {}) {
  if (!canManageInventoryAdjustments(auth)) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  const locationId = normalizeUuid(input.location_id);
  const createdBy = await resolveAdjustmentActorUserId(
    input.created_by || auth.sub || auth.user_id,
    'Created by'
  );
  const reason = normalizeText(input.reason);
  const notes = normalizeText(input.notes);
  const lines = Array.isArray(input.lines) ? input.lines : [];

  if (!locationId) {
    throw new AppError('Location id is required', 400);
  }

  await resolveInventoryScope(auth, { location_id: locationId });

  if (!lines.length) {
    throw new AppError('At least one adjustment line is required', 400);
  }

  const normalizedLines = lines.map((line) => ({
    variant_id: normalizeUuid(line.variant_id),
    counted_qty: normalizeNonNegativeInteger(line.counted_qty),
    notes: normalizeText(line.notes),
  }));

  if (normalizedLines.some((line) => !line.variant_id)) {
    throw new AppError('Adjustment line variant is invalid', 400);
  }

  if (normalizedLines.some((line) => line.counted_qty === null)) {
    throw new AppError('Adjustment line counted quantity is invalid', 400);
  }

  if (!ensureUniqueVariantIds(normalizedLines)) {
    throw new AppError('Adjustment lines cannot contain duplicated variants', 400);
  }

  const [location, createdByUser, variants] = await Promise.all([
    findLocationById(locationId),
    findUserById(createdBy),
    findVariantsByIds(normalizedLines.map((line) => line.variant_id)),
  ]);

  if (!location) {
    throw new AppError('Location is invalid', 400);
  }

  if (!createdByUser) {
    throw new AppError('Created by user is invalid', 400);
  }

  if (variants.length !== normalizedLines.length) {
    throw new AppError('One or more variants are invalid', 400);
  }

  const client = await pool.connect();
  let createdAdjustmentId = null;

  try {
    await client.query('begin');

    const adjustment = await insertAdjustment(
      {
        adjustment_number: buildAdjustmentNumber(),
        location_id: locationId,
        status: 'draft',
        reason,
        notes,
        created_by: createdBy,
      },
      client.query.bind(client)
    );

    createdAdjustmentId = adjustment.adjustment_id;

    for (const line of normalizedLines) {
      const systemQty = await findInventoryQtyByLocationAndVariant(
        locationId,
        line.variant_id,
        client.query.bind(client)
      );

      await insertAdjustmentLine(
        {
          adjustment_id: adjustment.adjustment_id,
          variant_id: line.variant_id,
          system_qty: systemQty,
          counted_qty: line.counted_qty,
          notes: line.notes,
        },
        client.query.bind(client)
      );
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');

    if (error.code === '23505') {
      throw new AppError('Adjustment line variants must be unique', 409);
    }

    throw error;
  } finally {
    client.release();
  }

  return getAdjustmentById(createdAdjustmentId, auth);
}

async function confirmAdjustmentById(adjustmentId, input = {}, auth = {}) {
  if (!canManageInventoryAdjustments(auth)) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  const normalizedAdjustmentId = normalizeUuid(adjustmentId);
  const confirmedBy = await resolveAdjustmentActorUserId(
    input.confirmed_by || auth.sub || auth.user_id,
    'Confirmed by'
  );

  if (!normalizedAdjustmentId) {
    throw new AppError('Adjustment id is required', 400);
  }

  const existingAdjustment = await findAdjustmentHeaderById(normalizedAdjustmentId);

  if (!existingAdjustment) {
    throw new AppError('Adjustment not found', 404);
  }

  await resolveInventoryScope(auth, { location_id: existingAdjustment.location_id });

  if (existingAdjustment.status !== 'draft') {
    throw new AppError('Only draft adjustments can be confirmed', 400);
  }

  const confirmedByUser = await findUserById(confirmedBy);

  if (!confirmedByUser) {
    throw new AppError('Confirmed by user is invalid', 400);
  }

  const lines = await findAdjustmentLinesByAdjustmentId(normalizedAdjustmentId);

  if (!lines.length) {
    throw new AppError('Adjustment has no lines to confirm', 400);
  }

  const client = await pool.connect();

  try {
    await client.query('begin');

    for (const line of lines) {
      const countedQty = Number(line.counted_qty);
      const differenceQty = Number(line.difference_qty);

      await upsertInventoryQty(
        existingAdjustment.location_id,
        line.variant_id,
        countedQty,
        client.query.bind(client)
      );

      if (differenceQty !== 0) {
        await insertStockMovement(
          {
            location_id: existingAdjustment.location_id,
            variant_id: line.variant_id,
            movement_type: 'ADJUST',
            quantity: Math.abs(differenceQty),
            reason: existingAdjustment.reason || 'Inventory adjustment confirmation',
            reference_type: 'adjustment',
            reference_id: normalizedAdjustmentId,
            reference_line_id: line.adjustment_line_id,
            created_by: confirmedBy || existingAdjustment.created_by,
          },
          client.query.bind(client)
        );
      }
    }

    await confirmAdjustment(
      normalizedAdjustmentId,
      confirmedBy || existingAdjustment.created_by,
      client.query.bind(client)
    );

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }

  return getAdjustmentById(normalizedAdjustmentId, auth);
}

async function cancelAdjustmentById(adjustmentId, input = {}, auth = {}) {
  if (!canManageInventoryAdjustments(auth)) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  const normalizedAdjustmentId = normalizeUuid(adjustmentId);
  const cancelledBy = await resolveAdjustmentActorUserId(
    input.cancelled_by || auth.sub || auth.user_id,
    'Cancelled by'
  );

  if (!normalizedAdjustmentId) {
    throw new AppError('Adjustment id is required', 400);
  }

  const existingAdjustment = await findAdjustmentHeaderById(normalizedAdjustmentId);

  if (!existingAdjustment) {
    throw new AppError('Adjustment not found', 404);
  }

  await resolveInventoryScope(auth, { location_id: existingAdjustment.location_id });

  if (existingAdjustment.status !== 'draft') {
    throw new AppError('Only draft adjustments can be cancelled', 400);
  }

  const cancelledByUser = await findUserById(cancelledBy);

  if (!cancelledByUser) {
    throw new AppError('Cancelled by user is invalid', 400);
  }

  await cancelAdjustment(normalizedAdjustmentId, cancelledBy);

  return getAdjustmentById(normalizedAdjustmentId, auth);
}

module.exports = {
  listInventory,
  listInventoryProductSummary,
  listInventoryLocationSummary,
  getInventoryStyleDetail,
  listKardex,
  listAdjustments,
  searchVariantsForAdjustment,
  getAdjustmentById,
  createAdjustment,
  confirmAdjustmentById,
  cancelAdjustmentById,
};
