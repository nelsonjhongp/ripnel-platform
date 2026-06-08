function normalizeLocationIds(input) {
  const values = Array.isArray(input) ? input : input ? [input] : [];
  const unique = new Set();

  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized) {
      unique.add(normalized);
    }
  }

  return [...unique];
}

function matchesLocation(locationId, locationIdsSet) {
  return Boolean(locationId) && locationIdsSet.has(locationId);
}

function resolveTransferPendingStage(transfer, locationIds) {
  const locationIdsSet = new Set(normalizeLocationIds(locationIds));
  const isSource = matchesLocation(transfer.from_location_id, locationIdsSet);
  const isDestination = matchesLocation(transfer.to_location_id, locationIdsSet);

  if (isSource && transfer.status === "requested") {
    return "pending_approval";
  }

  if (isSource && transfer.status === "approved") {
    return "pending_dispatch";
  }

  if (isDestination && transfer.status === "shipped") {
    return "pending_receipts";
  }

  if (isDestination && ["requested", "approved"].includes(transfer.status)) {
    return "open_for_store";
  }

  return null;
}

function resolveTransferPendingTimestamp(transfer, pendingStage) {
  if (pendingStage === "pending_dispatch") {
    return transfer.approved_at || transfer.updated_at || transfer.created_at;
  }

  if (pendingStage === "pending_receipts") {
    return transfer.shipped_at || transfer.updated_at || transfer.created_at;
  }

  return transfer.updated_at || transfer.created_at;
}

function buildTransferPendingCounts(rows, locationIds) {
  const counts = {
    open_for_store_count: 0,
    pending_approval_count: 0,
    pending_dispatch_count: 0,
    pending_receipts_count: 0,
  };

  for (const row of rows || []) {
    const pendingStage = resolveTransferPendingStage(row, locationIds);

    if (pendingStage === "open_for_store") {
      counts.open_for_store_count += 1;
    } else if (pendingStage === "pending_approval") {
      counts.pending_approval_count += 1;
    } else if (pendingStage === "pending_dispatch") {
      counts.pending_dispatch_count += 1;
    } else if (pendingStage === "pending_receipts") {
      counts.pending_receipts_count += 1;
    }
  }

  return counts;
}

function buildTransferPendingItems(rows, locationIds, limit = 5) {
  return (rows || [])
    .map((row) => {
      const pendingStage = resolveTransferPendingStage(row, locationIds);

      if (!pendingStage) {
        return null;
      }

      return {
        ...row,
        pending_stage: pendingStage,
        happened_at: resolveTransferPendingTimestamp(row, pendingStage),
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = new Date(left.happened_at || left.updated_at || left.created_at).getTime();
      const rightTime = new Date(right.happened_at || right.updated_at || right.created_at).getTime();
      return rightTime - leftTime;
    })
    .slice(0, limit);
}

module.exports = {
  normalizeLocationIds,
  resolveTransferPendingStage,
  resolveTransferPendingTimestamp,
  buildTransferPendingCounts,
  buildTransferPendingItems,
};
