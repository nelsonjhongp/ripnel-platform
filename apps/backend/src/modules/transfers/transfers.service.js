const { AppError } = require('../../shared/errors');
const { pool, attachActor } = require('../../shared/db');
const {
  findAllTransfers,
  findTransferHeaderById,
  findTransferHeaderByIdForUpdate,
  findTransferLinesByTransferId,
  findTransferRequestCandidateRows,
  insertTransfer,
  insertTransferLine,
  updateTransferLineShipment,
  updateTransferLineReceipt,
  markTransferApprovedIfRequested,
  markTransferShippedIfApproved,
  markTransferReceivedIfShipped,
  markTransferCancelledIfOpen,
} = require('./transfers.repo');
const {
  normalizeLocationIds,
  buildTransferPendingCounts,
  buildTransferPendingItems,
} = require('./transfers-inbox');
const {
  findLocationById,
  findVariantsByIds,
  findInventoryQtyByLocationAndVariant,
  upsertInventoryQty,
  insertStockMovement,
} = require('../inventory/inventory.repo');
const {
  findUserById,
  findUserLocationsByUserId,
  findDefaultLocationByUserId,
} = require('../users/users.repo');
const { buildTransferCapabilities } = require('./transfers-access');

const ALLOWED_TRANSFER_STATUSES = ['requested', 'approved', 'shipped', 'received', 'cancelled'];
const ALLOWED_TRANSFER_HISTORY_STATUSES = [...ALLOWED_TRANSFER_STATUSES, 'closed'];
const ALLOWED_TRANSFER_SCOPES = ['current', 'network'];
const TRANSFER_INBOX_QUEUES = [
  'open_for_store',
  'pending_approval',
  'pending_dispatch',
  'pending_receipts',
];

function normalizeUuid(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function normalizeText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function normalizePositiveInteger(value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function normalizeDate(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new AppError('Transfer date filter is invalid', 400);
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new AppError('Transfer date filter is invalid', 400);
  }

  return normalized;
}

function normalizeTransferScope(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return 'current';
  }

  if (!ALLOWED_TRANSFER_SCOPES.includes(normalized)) {
    throw new AppError('Transfer scope is invalid', 400);
  }

  return normalized;
}

function buildTransferNumber() {
  return `TR-${Date.now()}`;
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

function groupRequestCandidates(rows = []) {
  const grouped = new Map();

  for (const row of rows) {
    if (!grouped.has(row.variant_id)) {
      grouped.set(row.variant_id, {
        variant_id: row.variant_id,
        sku: row.sku,
        style_code: row.style_code,
        style_name: row.style_name,
        garment_type_name: row.garment_type_name || null,
        size_code: row.size_code,
        color_name: row.color_name,
        total_available: 0,
        candidate_sources: [],
      });
    }

    const current = grouped.get(row.variant_id);
    current.total_available += Number(row.qty_available || 0);
    current.candidate_sources.push({
      location_id: row.location_id,
      location_code: row.location_code,
      location_name: row.location_name,
      qty_available: Number(row.qty_available || 0),
    });
  }

  return [...grouped.values()];
}

async function resolveTransferActorContext(auth = {}) {
  const userId = normalizeUuid(auth.sub || auth.user_id);

  if (!userId) {
    throw new AppError('Not authenticated', 401, { code: 'AUTH_REQUIRED' });
  }

  const [user, defaultLocation, assignments] = await Promise.all([
    findUserById(userId),
    findDefaultLocationByUserId(userId),
    findUserLocationsByUserId(userId),
  ]);

  if (!user || user.active === false) {
    throw new AppError('Not authenticated', 401, { code: 'AUTH_REQUIRED' });
  }

  const locationIds = normalizeLocationIds(
    assignments.filter((assignment) => assignment.active).map((assignment) => assignment.location_id)
  );

  return {
    user_id: userId,
    role_name: auth.role_name || user.role_name || null,
    permissions: Array.isArray(auth.permissions) ? auth.permissions : [],
    default_location: defaultLocation || null,
    default_location_id: defaultLocation ? defaultLocation.location_id : null,
    location_ids: locationIds,
    capabilities: buildTransferCapabilities({
      permissions: Array.isArray(auth.permissions) ? auth.permissions : [],
      roleName: auth.role_name || user.role_name,
    }),
  };
}

function getActiveLocationId(actor) {
  return actor.default_location_id || actor.location_ids[0] || null;
}

function getActorCurrentLocationIds(actor) {
  const activeLocationId = getActiveLocationId(actor);
  return activeLocationId ? [activeLocationId] : normalizeLocationIds(actor.location_ids);
}

function getActorScope(actor, inputScope) {
  const requestedScope = normalizeTransferScope(inputScope);

  if (requestedScope === 'network' && actor.capabilities.manage) {
    return 'network';
  }

  return 'current';
}

function getActorScopeLocationIds(actor, scope) {
  if (scope === 'network') {
    const networkLocationIds = normalizeLocationIds(actor.location_ids);
    return networkLocationIds.length > 0 ? networkLocationIds : getActorCurrentLocationIds(actor);
  }

  return getActorCurrentLocationIds(actor);
}

function transferIntersectsLocationIds(transfer, locationIds) {
  const locationIdsSet = new Set(normalizeLocationIds(locationIds));
  return (
    locationIdsSet.has(transfer.from_location_id) || locationIdsSet.has(transfer.to_location_id)
  );
}

function canAccessTransferHeader(transfer, actor) {
  if (!transfer || !actor) {
    return false;
  }

  if (actor.capabilities.manage) {
    return true;
  }

  const locationIds = new Set(getActorCurrentLocationIds(actor));
  const isDestination = locationIds.has(transfer.to_location_id);
  const isSource = locationIds.has(transfer.from_location_id);

  return isDestination || isSource;
}

function getTransferScopeRole(transfer, actor) {
  const activeLocationId = getActiveLocationId(actor);

  if (activeLocationId && transfer.from_location_id === activeLocationId) {
    return 'source';
  }

  if (activeLocationId && transfer.to_location_id === activeLocationId) {
    return 'destination';
  }

  if (actor.capabilities.manage) {
    return 'network';
  }

  return 'observer';
}

function getTransferNextStep(status) {
  if (status === 'requested') return 'approval';
  if (status === 'approved') return 'dispatch';
  if (status === 'shipped') return 'receipt';
  if (status === 'received') return 'completed';
  return 'cancelled';
}

function buildTransferNextOwner(transfer, nextStep) {
  if (nextStep === 'approval' || nextStep === 'dispatch') {
    return {
      location_id: transfer.from_location_id,
      location_code: transfer.from_location_code,
      location_name: transfer.from_location_name,
      scope_role: 'source',
    };
  }

  if (nextStep === 'receipt') {
    return {
      location_id: transfer.to_location_id,
      location_code: transfer.to_location_code,
      location_name: transfer.to_location_name,
      scope_role: 'destination',
    };
  }

  return null;
}

function canActorApproveTransfer(transfer, actor) {
  if (transfer.status !== 'requested') {
    return false;
  }

  if (!actor.capabilities.approve) {
    return false;
  }

  const activeLocationId = getActiveLocationId(actor);
  return transfer.from_location_id === activeLocationId;
}

function canActorShipTransfer(transfer, actor) {
  if (transfer.status !== 'approved') {
    return false;
  }

  return actor.capabilities.ship && transfer.from_location_id === getActiveLocationId(actor);
}

function canActorReceiveTransfer(transfer, actor) {
  if (transfer.status !== 'shipped') {
    return false;
  }

  return actor.capabilities.receive && transfer.to_location_id === getActiveLocationId(actor);
}

function canActorCancelTransfer(transfer, actor) {
  if (!['requested', 'approved'].includes(transfer.status)) {
    return false;
  }

  if (actor.capabilities.manage) {
    return true;
  }

  const activeLocationId = getActiveLocationId(actor);
  const isDestination = transfer.to_location_id === activeLocationId;
  const isSource = transfer.from_location_id === activeLocationId;

  if (transfer.status === 'requested') {
    return actor.user_id === transfer.created_by || (isSource && actor.capabilities.cancel);
  }

  return isSource && actor.capabilities.cancel;
}

function buildTransferAvailableActions(transfer, actor) {
  return {
    approve: canActorApproveTransfer(transfer, actor),
    ship: canActorShipTransfer(transfer, actor),
    receive: canActorReceiveTransfer(transfer, actor),
    cancel: canActorCancelTransfer(transfer, actor),
  };
}

function buildTransferPrimaryAction(availableActions = {}) {
  if (availableActions.approve) return 'approve';
  if (availableActions.ship) return 'ship';
  if (availableActions.receive) return 'receive';
  if (availableActions.cancel) return 'cancel';
  return null;
}

function buildTransferActiveMessage(transfer, actor, availableActions, scopeRole, nextOwner) {
  if (transfer.status === 'requested') {
    if (availableActions.approve) {
      return 'Tu sede debe aprobar esta solicitud antes de despacharla.';
    }

    if (availableActions.cancel) {
      return 'Todavía puedes cancelar esta solicitud antes de que el origen la procese.';
    }

    if (scopeRole === 'destination') {
      return `Pendiente de validación en ${transfer.from_location_name}.`;
    }

    return nextOwner
      ? `Pendiente de validación en ${nextOwner.location_name}.`
      : 'Pendiente de validación del origen.';
  }

  if (transfer.status === 'approved') {
    if (availableActions.ship) {
      return 'La solicitud ya fue aprobada. Tu sede debe despachar el stock.';
    }

    if (availableActions.cancel) {
      return 'Todavía puedes cancelar esta transferencia antes de que salga del origen.';
    }

    if (scopeRole === 'destination') {
      return `Pendiente de despacho en ${transfer.from_location_name}.`;
    }

    return nextOwner
      ? `Pendiente de despacho en ${nextOwner.location_name}.`
      : 'Pendiente de despacho del origen.';
  }

  if (transfer.status === 'shipped') {
    if (availableActions.receive) {
      return 'La transferencia ya salió del origen. Tu sede debe confirmar la recepción.';
    }

    if (scopeRole === 'source') {
      return `Despachada desde ${transfer.from_location_name}. Esperando recepción en ${transfer.to_location_name}.`;
    }

    return `En tránsito hacia ${transfer.to_location_name}.`;
  }

  if (transfer.status === 'received') {
    return 'Flujo completado. El stock ya quedó registrado en destino.';
  }

  return 'Solicitud cancelada. El flujo ya no debe continuar.';
}

function buildTransferStateSummary(transfer, actor) {
  const nextStep = getTransferNextStep(transfer.status);
  const nextOwner = buildTransferNextOwner(transfer, nextStep);
  const scopeRole = getTransferScopeRole(transfer, actor);
  const availableActions = buildTransferAvailableActions(transfer, actor);

  return {
    scope_role: scopeRole,
    next_step: nextStep,
    next_owner: nextOwner,
    available_actions: availableActions,
    primary_action: buildTransferPrimaryAction(availableActions),
    active_message: buildTransferActiveMessage(
      transfer,
      actor,
      availableActions,
      scopeRole,
      nextOwner
    ),
  };
}

function enrichTransferRecord(transfer, actor) {
  return {
    ...transfer,
    ...buildTransferStateSummary(transfer, actor),
  };
}

async function getTransferById(transferId, auth = {}) {
  const actor = await resolveTransferActorContext(auth);
  const normalizedTransferId = normalizeUuid(transferId);

  if (!normalizedTransferId) {
    throw new AppError('Transfer id is required', 400);
  }

  const header = await findTransferHeaderById(normalizedTransferId);

  if (!header) {
    throw new AppError('Transfer not found', 404);
  }

  if (!canAccessTransferHeader(header, actor)) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  const lines = await findTransferLinesByTransferId(normalizedTransferId);

  return {
    ...enrichTransferRecord(header, actor),
    active_location: actor.default_location
      ? {
          location_id: actor.default_location.location_id,
          location_code: actor.default_location.code || null,
          location_name: actor.default_location.name,
          location_type: actor.default_location.type,
        }
      : null,
    lines,
  };
}

async function listTransfers(input = {}, auth = {}) {
  const actor = await resolveTransferActorContext(auth);
  const status = normalizeText(input.status);
  const dateFrom = normalizeDate(input.date_from);
  const dateTo = normalizeDate(input.date_to);

  if (status && !ALLOWED_TRANSFER_HISTORY_STATUSES.includes(status)) {
    throw new AppError('Transfer status is invalid', 400);
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new AppError('Transfer date range is invalid', 400);
  }

  const scope = getActorScope(actor, input.scope);
  const locationIds = getActorScopeLocationIds(actor, scope);
  const filters = {
    status: status && status !== 'closed' ? status : null,
    statusList: status === 'closed' ? ['received', 'cancelled'] : null,
    fromLocationId: normalizeUuid(input.from_location_id),
    toLocationId: normalizeUuid(input.to_location_id),
    query: normalizeText(input.query),
    dateFrom,
    dateTo,
    locationIds,
  };

  const transfers = await findAllTransfers(filters);

  return transfers
    .filter((transfer) => canAccessTransferHeader(transfer, actor))
    .map((transfer) => enrichTransferRecord(transfer, actor));
}

async function listTransferInbox(input = {}, auth = {}) {
  const actor = await resolveTransferActorContext(auth);
  const scope = getActorScope(actor, input.scope);
  const requestedQueue = normalizeText(input.queue);
  const locationIds = getActorScopeLocationIds(actor, scope);

  if (requestedQueue && !TRANSFER_INBOX_QUEUES.includes(requestedQueue)) {
    throw new AppError('Transfer inbox queue is invalid', 400);
  }

  const transfers = (await findAllTransfers({ locationIds }))
    .filter((transfer) => canAccessTransferHeader(transfer, actor))
    .map((transfer) => enrichTransferRecord(transfer, actor));

  const pendingItems = buildTransferPendingItems(transfers, locationIds, transfers.length || 0);
  const counts = buildTransferPendingCounts(transfers, locationIds);
  const allQueues = {
    open_for_store: pendingItems.filter((transfer) => transfer.pending_stage === 'open_for_store'),
    pending_approval: pendingItems.filter(
      (transfer) => transfer.pending_stage === 'pending_approval'
    ),
    pending_dispatch: pendingItems.filter(
      (transfer) => transfer.pending_stage === 'pending_dispatch'
    ),
    pending_receipts: pendingItems.filter(
      (transfer) => transfer.pending_stage === 'pending_receipts'
    ),
  };
  const queues = requestedQueue
    ? {
        open_for_store: requestedQueue === 'open_for_store' ? allQueues.open_for_store : [],
        pending_approval: requestedQueue === 'pending_approval' ? allQueues.pending_approval : [],
        pending_dispatch: requestedQueue === 'pending_dispatch' ? allQueues.pending_dispatch : [],
        pending_receipts: requestedQueue === 'pending_receipts' ? allQueues.pending_receipts : [],
      }
    : allQueues;

  return {
    context: {
      scope,
      can_view_network: actor.capabilities.manage,
      active_location: actor.default_location
        ? {
            location_id: actor.default_location.location_id,
            location_code: actor.default_location.code || null,
            location_name: actor.default_location.name,
            location_type: actor.default_location.type,
          }
        : null,
      location_ids: locationIds,
    },
    counts,
    totals: {
      active_total:
        counts.open_for_store_count +
        counts.pending_approval_count +
        counts.pending_dispatch_count +
        counts.pending_receipts_count,
    },
    queues,
  };
}

async function listPendingReceipts(auth = {}) {
  const inbox = await listTransferInbox({ scope: 'current' }, auth);
  return inbox.queues.pending_receipts;
}

async function listTransferRequestCandidates(input = {}, auth = {}) {
  const actor = await resolveTransferActorContext(auth);
  const query = normalizeText(input.query);
  const sourceLocationId = normalizeUuid(input.source_location_id);

  if (!actor.capabilities.request_create) {
    throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
  }

  if (!actor.default_location_id) {
    throw new AppError('Authenticated user has no default location assigned', 409, {
      code: 'DEFAULT_LOCATION_REQUIRED',
    });
  }

  const rows = await findTransferRequestCandidateRows({
    destinationLocationId: actor.default_location_id,
    searchQuery: query || '',
    sourceLocationId,
  });

  return groupRequestCandidates(rows);
}

async function createTransfer(input, auth = {}) {
  const actor = await resolveTransferActorContext(auth);
  const fromLocationId = normalizeUuid(input.from_location_id);
  const requestedToLocationId = normalizeUuid(input.to_location_id);
  const toLocationId = actor.capabilities.manage
    ? requestedToLocationId
    : actor.default_location_id;
  const notes = normalizeText(input.notes);
  const lines = Array.isArray(input.lines) ? input.lines : [];

  if (!actor.capabilities.manage && !actor.default_location_id) {
    throw new AppError('Authenticated user has no default location assigned', 409, {
      code: 'DEFAULT_LOCATION_REQUIRED',
    });
  }

  if (!fromLocationId || !toLocationId) {
    throw new AppError('Origin and destination locations are required', 400);
  }

  if (
    !actor.capabilities.manage &&
    requestedToLocationId &&
    requestedToLocationId !== actor.default_location_id
  ) {
    throw new AppError('Store requests must use the current default location as destination', 400);
  }

  if (fromLocationId === toLocationId) {
    throw new AppError('Origin and destination must be different', 400);
  }

  if (!lines.length) {
    throw new AppError('At least one transfer line is required', 400);
  }

  const normalizedLines = lines.map((line) => ({
    variant_id: normalizeUuid(line.variant_id),
    qty_requested: normalizePositiveInteger(line.qty_requested),
    notes: normalizeText(line.notes),
  }));

  if (normalizedLines.some((line) => !line.variant_id)) {
    throw new AppError('Transfer line variant is invalid', 400);
  }

  if (normalizedLines.some((line) => line.qty_requested === null)) {
    throw new AppError('Transfer line requested quantity is invalid', 400);
  }

  if (!ensureUniqueVariantIds(normalizedLines)) {
    throw new AppError('Transfer lines cannot contain duplicated variants', 400);
  }

  const [fromLocation, toLocation, variants] = await Promise.all([
    findLocationById(fromLocationId),
    findLocationById(toLocationId),
    findVariantsByIds(normalizedLines.map((line) => line.variant_id)),
  ]);

  if (!fromLocation || !toLocation) {
    throw new AppError('Transfer locations are invalid', 400);
  }

  if (variants.length !== normalizedLines.length) {
    throw new AppError('One or more variants are invalid', 400);
  }

  const client = await pool.connect();
  let createdTransferId = null;

  try {
    await client.query('begin');
    await attachActor(client, { actorUserId: actor.user_id, actorRole: actor.role_name });

    for (const line of normalizedLines) {
      const availableQty = await findInventoryQtyByLocationAndVariant(
        fromLocationId,
        line.variant_id,
        client.query.bind(client)
      );

      if (availableQty < Number(line.qty_requested)) {
        const variant = variants.find((candidate) => candidate.variant_id === line.variant_id);
        throw new AppError(
          `Stock insuficiente para ${variant?.sku || line.variant_id}. Actualiza la solicitud o ajusta cantidades.`,
          409,
          { code: 'TRANSFER_REQUEST_STOCK_CHANGED' }
        );
      }
    }

    const transfer = await insertTransfer(
      {
        transfer_number: buildTransferNumber(),
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        status: 'requested',
        notes,
        created_by: actor.user_id,
      },
      client.query.bind(client)
    );

    createdTransferId = transfer.transfer_id;

    for (const line of normalizedLines) {
      await insertTransferLine(
        {
          transfer_id: transfer.transfer_id,
          variant_id: line.variant_id,
          qty_requested: line.qty_requested,
          qty_shipped: 0,
          qty_received: 0,
          notes: line.notes,
        },
        client.query.bind(client)
      );
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');

    if (error.code === '23505') {
      throw new AppError('Transfer line variants must be unique', 409);
    }

    throw error;
  } finally {
    client.release();
  }

  return getTransferById(createdTransferId, auth);
}

async function shipTransferById(transferId, input = {}, auth = {}) {
  const actor = await resolveTransferActorContext(auth);
  const normalizedTransferId = normalizeUuid(transferId);

  if (!normalizedTransferId) {
    throw new AppError('Transfer id is required', 400);
  }

  const shippedBy = actor.user_id;
  const client = await pool.connect();

  try {
    await client.query('begin');
    await attachActor(client, { actorUserId: actor.user_id, actorRole: actor.role_name });

    const transfer = await findTransferHeaderByIdForUpdate(
      normalizedTransferId,
      client.query.bind(client)
    );

    if (!transfer) {
      throw new AppError('Transfer not found', 404);
    }

    if (!canAccessTransferHeader(transfer, actor)) {
      throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
    }

    if (transfer.status !== 'approved') {
      throw new AppError('Only approved transfers can be shipped', 400);
    }

    if (!canActorShipTransfer(transfer, actor)) {
      throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
    }

    const lines = await findTransferLinesByTransferId(
      normalizedTransferId,
      client.query.bind(client)
    );

    if (!lines.length) {
      throw new AppError('Transfer has no lines to ship', 400);
    }

    for (const line of lines) {
      const availableQty = await findInventoryQtyByLocationAndVariant(
        transfer.from_location_id,
        line.variant_id,
        client.query.bind(client)
      );

      if (availableQty < Number(line.qty_requested)) {
        throw new AppError(
          `Insufficient stock to ship ${line.sku} from ${transfer.from_location_code}`,
          409
        );
      }
    }

    for (const line of lines) {
      const shippedQty = Number(line.qty_requested);
      const currentQty = await findInventoryQtyByLocationAndVariant(
        transfer.from_location_id,
        line.variant_id,
        client.query.bind(client)
      );

      await updateTransferLineShipment(line.transfer_line_id, shippedQty, client.query.bind(client));

      await upsertInventoryQty(
        transfer.from_location_id,
        line.variant_id,
        currentQty - shippedQty,
        client.query.bind(client)
      );

      await insertStockMovement(
        {
          location_id: transfer.from_location_id,
          variant_id: line.variant_id,
          movement_type: 'OUT',
          quantity: shippedQty,
          reason: `Transfer ${transfer.transfer_number} shipped`,
          reference_type: 'transfer',
          reference_id: normalizedTransferId,
          reference_line_id: line.transfer_line_id,
          created_by: shippedBy,
        },
        client.query.bind(client)
      );
    }

    const shipped = await markTransferShippedIfApproved(
      normalizedTransferId,
      shippedBy,
      client.query.bind(client)
    );

    if (!shipped) {
      throw new AppError('Transfer status changed before shipment', 409, {
        code: 'TRANSFER_STATUS_CHANGED',
      });
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }

  return getTransferById(normalizedTransferId, auth);
}

async function receiveTransferById(transferId, input = {}, auth = {}) {
  const actor = await resolveTransferActorContext(auth);
  const normalizedTransferId = normalizeUuid(transferId);

  if (!normalizedTransferId) {
    throw new AppError('Transfer id is required', 400);
  }

  const receivedBy = actor.user_id;
  const client = await pool.connect();

  try {
    await client.query('begin');
    await attachActor(client, { actorUserId: actor.user_id, actorRole: actor.role_name });

    const transfer = await findTransferHeaderByIdForUpdate(
      normalizedTransferId,
      client.query.bind(client)
    );

    if (!transfer) {
      throw new AppError('Transfer not found', 404);
    }

    if (!canAccessTransferHeader(transfer, actor)) {
      throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
    }

    if (transfer.status !== 'shipped') {
      throw new AppError('Only shipped transfers can be received', 400);
    }

    if (!canActorReceiveTransfer(transfer, actor)) {
      throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
    }

    const lines = await findTransferLinesByTransferId(
      normalizedTransferId,
      client.query.bind(client)
    );

    if (!lines.length) {
      throw new AppError('Transfer has no lines to receive', 400);
    }

    if (lines.some((line) => Number(line.qty_shipped) <= 0)) {
      throw new AppError('Transfer has no shipped quantity to receive', 400);
    }

    for (const line of lines) {
      const receivedQty = Number(line.qty_shipped);
      const currentQty = await findInventoryQtyByLocationAndVariant(
        transfer.to_location_id,
        line.variant_id,
        client.query.bind(client)
      );

      await updateTransferLineReceipt(line.transfer_line_id, receivedQty, client.query.bind(client));

      await upsertInventoryQty(
        transfer.to_location_id,
        line.variant_id,
        currentQty + receivedQty,
        client.query.bind(client)
      );

      await insertStockMovement(
        {
          location_id: transfer.to_location_id,
          variant_id: line.variant_id,
          movement_type: 'IN',
          quantity: receivedQty,
          reason: `Transfer ${transfer.transfer_number} received`,
          reference_type: 'transfer',
          reference_id: normalizedTransferId,
          reference_line_id: line.transfer_line_id,
          created_by: receivedBy,
        },
        client.query.bind(client)
      );
    }

    const received = await markTransferReceivedIfShipped(
      normalizedTransferId,
      receivedBy,
      client.query.bind(client)
    );

    if (!received) {
      throw new AppError('Transfer status changed before receipt', 409, {
        code: 'TRANSFER_STATUS_CHANGED',
      });
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }

  return getTransferById(normalizedTransferId, auth);
}

async function cancelTransferById(transferId, input = {}, auth = {}) {
  const actor = await resolveTransferActorContext(auth);
  const normalizedTransferId = normalizeUuid(transferId);

  if (!normalizedTransferId) {
    throw new AppError('Transfer id is required', 400);
  }

  const client = await pool.connect();

  try {
    await client.query('begin');
    await attachActor(client, { actorUserId: actor.user_id, actorRole: actor.role_name });

    const transfer = await findTransferHeaderByIdForUpdate(
      normalizedTransferId,
      client.query.bind(client)
    );

    if (!transfer) {
      throw new AppError('Transfer not found', 404);
    }

    if (!canAccessTransferHeader(transfer, actor)) {
      throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
    }

    if (!['requested', 'approved'].includes(transfer.status)) {
      throw new AppError('Only requested or approved transfers can be cancelled', 400);
    }

    if (!canActorCancelTransfer(transfer, actor)) {
      throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
    }

    const cancelled = await markTransferCancelledIfOpen(
      normalizedTransferId,
      actor.user_id,
      client.query.bind(client)
    );

    if (!cancelled) {
      throw new AppError('Transfer status changed before cancellation', 409, {
        code: 'TRANSFER_STATUS_CHANGED',
      });
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }

  return getTransferById(normalizedTransferId, auth);
}

async function approveTransferById(transferId, input = {}, auth = {}) {
  const actor = await resolveTransferActorContext(auth);
  const normalizedTransferId = normalizeUuid(transferId);

  if (!normalizedTransferId) {
    throw new AppError('Transfer id is required', 400);
  }

  const client = await pool.connect();

  try {
    await client.query('begin');
    await attachActor(client, { actorUserId: actor.user_id, actorRole: actor.role_name });

    const transfer = await findTransferHeaderByIdForUpdate(
      normalizedTransferId,
      client.query.bind(client)
    );

    if (!transfer) {
      throw new AppError('Transfer not found', 404);
    }

    if (!canAccessTransferHeader(transfer, actor)) {
      throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
    }

    if (transfer.status !== 'requested') {
      throw new AppError('Only requested transfers can be approved', 400);
    }

    if (!canActorApproveTransfer(transfer, actor)) {
      throw new AppError('Forbidden', 403, { code: 'FORBIDDEN' });
    }

    const lines = await findTransferLinesByTransferId(
      normalizedTransferId,
      client.query.bind(client)
    );

    if (!lines.length) {
      throw new AppError('Transfer has no lines to approve', 400);
    }

    for (const line of lines) {
      const availableQty = await findInventoryQtyByLocationAndVariant(
        transfer.from_location_id,
        line.variant_id,
        client.query.bind(client)
      );

      if (availableQty < Number(line.qty_requested)) {
        throw new AppError(
          `Stock insuficiente para aprobar ${line.sku} desde ${transfer.from_location_code}`,
          409,
          { code: 'TRANSFER_APPROVAL_STOCK_CHANGED' }
        );
      }
    }

    const approved = await markTransferApprovedIfRequested(
      normalizedTransferId,
      actor.user_id,
      client.query.bind(client)
    );

    if (!approved) {
      throw new AppError('Transfer status changed before approval', 409, {
        code: 'TRANSFER_STATUS_CHANGED',
      });
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }

  return getTransferById(normalizedTransferId, auth);
}

module.exports = {
  listTransfers,
  listTransferInbox,
  listPendingReceipts,
  listTransferRequestCandidates,
  getTransferById,
  createTransfer,
  approveTransferById,
  shipTransferById,
  receiveTransferById,
  cancelTransferById,
};
