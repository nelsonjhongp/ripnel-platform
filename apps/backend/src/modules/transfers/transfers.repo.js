const { query } = require('../../shared/db');

function buildTransfersWhereClause(filters = {}) {
  const conditions = [];
  const values = [];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }

  if (filters.fromLocationId) {
    values.push(filters.fromLocationId);
    conditions.push(`from_location_id = $${values.length}`);
  }

  if (filters.toLocationId) {
    values.push(filters.toLocationId);
    conditions.push(`to_location_id = $${values.length}`);
  }

  if (filters.query) {
    values.push(`%${filters.query}%`);
    const index = values.length;
    conditions.push(
      `(
        coalesce(transfer_number, '') ilike $${index}
        or from_location_code ilike $${index}
        or from_location_name ilike $${index}
        or to_location_code ilike $${index}
        or to_location_name ilike $${index}
      )`
    );
  }

  return {
    whereClause: conditions.length ? `where ${conditions.join(' and ')}` : '',
    values,
  };
}

async function findAllTransfers(filters = {}) {
  const { whereClause, values } = buildTransfersWhereClause(filters);

  const result = await query(
    `with transfer_summary as (
       select
         st.transfer_id,
         st.transfer_number,
         st.from_location_id,
         lf.code as from_location_code,
         lf.name as from_location_name,
         st.to_location_id,
         lt.code as to_location_code,
         lt.name as to_location_name,
         st.status,
         st.notes,
         st.created_by,
         created_user.full_name as created_by_name,
         st.shipped_by,
         shipped_user.full_name as shipped_by_name,
         st.received_by,
         received_user.full_name as received_by_name,
         st.cancelled_by,
         cancelled_user.full_name as cancelled_by_name,
         st.created_at,
         st.shipped_at,
         st.received_at,
         st.cancelled_at,
         st.updated_at,
         count(stl.transfer_line_id)::int as line_count,
         coalesce(sum(stl.qty_requested), 0)::int as qty_requested_total,
         coalesce(sum(stl.qty_shipped), 0)::int as qty_shipped_total,
         coalesce(sum(stl.qty_received), 0)::int as qty_received_total
       from stock_transfers st
       inner join locations lf on lf.location_id = st.from_location_id
       inner join locations lt on lt.location_id = st.to_location_id
       left join users created_user on created_user.user_id = st.created_by
       left join users shipped_user on shipped_user.user_id = st.shipped_by
       left join users received_user on received_user.user_id = st.received_by
       left join users cancelled_user on cancelled_user.user_id = st.cancelled_by
       left join stock_transfer_lines stl on stl.transfer_id = st.transfer_id
       group by
         st.transfer_id,
         st.transfer_number,
         st.from_location_id,
         lf.code,
         lf.name,
         st.to_location_id,
         lt.code,
         lt.name,
         st.status,
         st.notes,
         st.created_by,
         created_user.full_name,
         st.shipped_by,
         shipped_user.full_name,
         st.received_by,
         received_user.full_name,
         st.cancelled_by,
         cancelled_user.full_name,
         st.created_at,
         st.shipped_at,
         st.received_at,
         st.cancelled_at,
         st.updated_at
     )
     select
       transfer_id,
       transfer_number,
       from_location_id,
       from_location_code,
       from_location_name,
       to_location_id,
       to_location_code,
       to_location_name,
       status,
       notes,
       created_by,
       created_by_name,
       shipped_by,
       shipped_by_name,
       received_by,
       received_by_name,
       cancelled_by,
       cancelled_by_name,
       created_at,
       shipped_at,
       received_at,
       cancelled_at,
       updated_at,
       line_count,
       qty_requested_total,
       qty_shipped_total,
       qty_received_total
     from transfer_summary
     ${whereClause}
     order by created_at desc, transfer_id desc`,
    values
  );

  return result.rows;
}

async function findTransferHeaderById(transferId, executor = query) {
  const result = await executor(
    `select
       st.transfer_id,
       st.transfer_number,
       st.from_location_id,
       lf.code as from_location_code,
       lf.name as from_location_name,
       st.to_location_id,
       lt.code as to_location_code,
       lt.name as to_location_name,
       st.status,
       st.notes,
       st.created_by,
       created_user.full_name as created_by_name,
       st.shipped_by,
       shipped_user.full_name as shipped_by_name,
       st.received_by,
       received_user.full_name as received_by_name,
       st.cancelled_by,
       cancelled_user.full_name as cancelled_by_name,
       st.created_at,
       st.shipped_at,
       st.received_at,
       st.cancelled_at,
       st.updated_at
     from stock_transfers st
     inner join locations lf on lf.location_id = st.from_location_id
     inner join locations lt on lt.location_id = st.to_location_id
     left join users created_user on created_user.user_id = st.created_by
     left join users shipped_user on shipped_user.user_id = st.shipped_by
     left join users received_user on received_user.user_id = st.received_by
     left join users cancelled_user on cancelled_user.user_id = st.cancelled_by
     where st.transfer_id = $1`,
    [transferId]
  );

  return result.rows[0] || null;
}

async function findTransferLinesByTransferId(transferId, executor = query) {
  const result = await executor(
    `select
       stl.transfer_line_id,
       stl.transfer_id,
       stl.variant_id,
       pv.sku,
       ps.style_code,
       ps.name as style_name,
       s.code as size_code,
       c.name as color_name,
       stl.qty_requested,
       stl.qty_shipped,
       stl.qty_received,
       stl.notes
     from stock_transfer_lines stl
     inner join product_variants pv on pv.variant_id = stl.variant_id
     inner join product_styles ps on ps.style_id = pv.style_id
     inner join sizes s on s.size_id = pv.size_id
     inner join colors c on c.color_id = pv.color_id
     where stl.transfer_id = $1
     order by ps.name asc, s.sort_order asc, c.name asc`,
    [transferId]
  );

  return result.rows;
}

async function findTransferRequestCandidateRows(
  { destinationLocationId, searchQuery, sourceLocationId = null, limit = 80 },
  executor = query
) {
  const values = [destinationLocationId, `%${searchQuery}%`];
  let sourceFilter = '';

  if (sourceLocationId) {
    values.push(sourceLocationId);
    sourceFilter = `and l.location_id = $${values.length}`;
  }

  values.push(limit);

  const result = await executor(
    `select
       l.location_id,
       l.code as location_code,
       l.name as location_name,
       pv.variant_id,
       pv.sku,
       ps.style_code,
       ps.name as style_name,
       gt.name as garment_type_name,
       s.code as size_code,
       c.name as color_name,
       i.qty::int as qty_available
     from inventory i
     inner join locations l on l.location_id = i.location_id
     inner join product_variants pv on pv.variant_id = i.variant_id
     inner join product_styles ps on ps.style_id = pv.style_id
     left join garment_types gt on gt.garment_type_id = ps.garment_type_id
     inner join sizes s on s.size_id = pv.size_id
     inner join colors c on c.color_id = pv.color_id
     where i.qty > 0
       and l.active = true
       and l.location_id <> $1
       and (
         pv.sku ilike $2
         or ps.style_code ilike $2
         or ps.name ilike $2
         or s.code ilike $2
         or c.name ilike $2
         or coalesce(gt.name, '') ilike $2
       )
       ${sourceFilter}
     order by
       ps.name asc,
       s.sort_order asc,
       c.name asc,
       i.qty desc,
       l.name asc
     limit $${values.length}`,
    values
  );

  return result.rows;
}

async function insertTransfer(payload, executor = query) {
  const result = await executor(
    `insert into stock_transfers (
       transfer_number,
       from_location_id,
       to_location_id,
       status,
       notes,
       created_by
     )
     values ($1, $2, $3, $4, $5, $6)
     returning
       transfer_id,
       transfer_number,
       from_location_id,
       to_location_id,
       status,
       notes,
       created_by,
       shipped_by,
       received_by,
       cancelled_by,
       created_at,
       shipped_at,
       received_at,
       cancelled_at,
       updated_at`,
    [
      payload.transfer_number,
      payload.from_location_id,
      payload.to_location_id,
      payload.status,
      payload.notes,
      payload.created_by,
    ]
  );

  return result.rows[0] || null;
}

async function insertTransferLine(payload, executor = query) {
  const result = await executor(
    `insert into stock_transfer_lines (
       transfer_id,
       variant_id,
       qty_requested,
       qty_shipped,
       qty_received,
       notes
     )
     values ($1, $2, $3, $4, $5, $6)
     returning
       transfer_line_id,
       transfer_id,
       variant_id,
       qty_requested,
       qty_shipped,
       qty_received,
       notes`,
    [
      payload.transfer_id,
      payload.variant_id,
      payload.qty_requested,
      payload.qty_shipped,
      payload.qty_received,
      payload.notes,
    ]
  );

  return result.rows[0] || null;
}

async function updateTransferLineShipment(transferLineId, qtyShipped, executor = query) {
  const result = await executor(
    `update stock_transfer_lines
     set qty_shipped = $2
     where transfer_line_id = $1
     returning
       transfer_line_id,
       transfer_id,
       variant_id,
       qty_requested,
       qty_shipped,
       qty_received,
       notes`,
    [transferLineId, qtyShipped]
  );

  return result.rows[0] || null;
}

async function updateTransferLineReceipt(transferLineId, qtyReceived, executor = query) {
  const result = await executor(
    `update stock_transfer_lines
     set qty_received = $2
     where transfer_line_id = $1
     returning
       transfer_line_id,
       transfer_id,
       variant_id,
       qty_requested,
       qty_shipped,
       qty_received,
       notes`,
    [transferLineId, qtyReceived]
  );

  return result.rows[0] || null;
}

async function markTransferShipped(transferId, shippedBy, executor = query) {
  const result = await executor(
    `update stock_transfers
     set
       status = 'shipped',
       shipped_by = $2,
       shipped_at = current_timestamp,
       updated_at = current_timestamp
     where transfer_id = $1
     returning
       transfer_id,
       transfer_number,
       from_location_id,
       to_location_id,
       status,
       notes,
       created_by,
       shipped_by,
       received_by,
       cancelled_by,
       created_at,
       shipped_at,
       received_at,
       cancelled_at,
       updated_at`,
    [transferId, shippedBy]
  );

  return result.rows[0] || null;
}

async function markTransferReceived(transferId, receivedBy, executor = query) {
  const result = await executor(
    `update stock_transfers
     set
       status = 'received',
       received_by = $2,
       received_at = current_timestamp,
       updated_at = current_timestamp
     where transfer_id = $1
     returning
       transfer_id,
       transfer_number,
       from_location_id,
       to_location_id,
       status,
       notes,
       created_by,
       shipped_by,
       received_by,
       cancelled_by,
       created_at,
       shipped_at,
       received_at,
       cancelled_at,
       updated_at`,
    [transferId, receivedBy]
  );

  return result.rows[0] || null;
}

async function markTransferCancelled(transferId, cancelledBy, executor = query) {
  const result = await executor(
    `update stock_transfers
     set
       status = 'cancelled',
       cancelled_by = $2,
       cancelled_at = current_timestamp,
       updated_at = current_timestamp
     where transfer_id = $1
     returning
       transfer_id,
       transfer_number,
       from_location_id,
       to_location_id,
       status,
       notes,
       created_by,
       shipped_by,
       received_by,
       cancelled_by,
       created_at,
       shipped_at,
       received_at,
       cancelled_at,
       updated_at`,
    [transferId, cancelledBy]
  );

  return result.rows[0] || null;
}

module.exports = {
  findAllTransfers,
  findTransferHeaderById,
  findTransferLinesByTransferId,
  findTransferRequestCandidateRows,
  insertTransfer,
  insertTransferLine,
  updateTransferLineShipment,
  updateTransferLineReceipt,
  markTransferShipped,
  markTransferReceived,
  markTransferCancelled,
};
