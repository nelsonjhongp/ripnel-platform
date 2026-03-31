const { query } = require('../../shared/db');

function buildInventoryWhereClause(filters = {}) {
  const conditions = [];
  const values = [];

  if (filters.locationId) {
    values.push(filters.locationId);
    conditions.push(`l.location_id = $${values.length}`);
  }

  if (filters.styleCode) {
    values.push(`%${filters.styleCode}%`);
    conditions.push(`ps.style_code ilike $${values.length}`);
  }

  if (filters.sku) {
    values.push(`%${filters.sku}%`);
    conditions.push(`pv.sku ilike $${values.length}`);
  }

  if (filters.query) {
    values.push(`%${filters.query}%`);
    const index = values.length;
    conditions.push(
      `(
        pv.sku ilike $${index}
        or ps.style_code ilike $${index}
        or ps.name ilike $${index}
        or gt.name ilike $${index}
        or l.name ilike $${index}
      )`
    );
  }

  return {
    whereClause: conditions.length ? `where ${conditions.join(' and ')}` : '',
    values,
  };
}

function buildKardexWhereClause(filters = {}) {
  const conditions = [];
  const values = [];

  if (filters.locationId) {
    values.push(filters.locationId);
    conditions.push(`location_id = $${values.length}`);
  }

  if (filters.variantId) {
    values.push(filters.variantId);
    conditions.push(`variant_id = $${values.length}`);
  }

  if (filters.movementType) {
    values.push(filters.movementType);
    conditions.push(`movement_type = $${values.length}`);
  }

  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    conditions.push(`created_at >= $${values.length}::timestamptz`);
  }

  if (filters.dateTo) {
    values.push(filters.dateTo);
    conditions.push(`created_at <= $${values.length}::timestamptz`);
  }

  if (filters.query) {
    values.push(`%${filters.query}%`);
    const index = values.length;
    conditions.push(
      `(
        sku ilike $${index}
        or style_code ilike $${index}
        or style_name ilike $${index}
        or coalesce(reason, '') ilike $${index}
        or coalesce(reference_type, '') ilike $${index}
        or location_name ilike $${index}
      )`
    );
  }

  return {
    whereClause: conditions.length ? `where ${conditions.join(' and ')}` : '',
    values,
  };
}

async function findAllInventory(filters = {}) {
  const { whereClause, values } = buildInventoryWhereClause(filters);

  const result = await query(
    `select
       l.location_id,
       l.code as location_code,
       l.name as location_name,
       pv.variant_id,
       pv.sku,
       ps.style_id,
       ps.style_code,
       ps.name as style_name,
       gt.name as garment_type_name,
       s.size_id,
       s.code as size_code,
       c.color_id,
       c.name as color_name,
       i.qty
     from inventory i
     inner join locations l on l.location_id = i.location_id
     inner join product_variants pv on pv.variant_id = i.variant_id
     inner join product_styles ps on ps.style_id = pv.style_id
     left join garment_types gt on gt.garment_type_id = ps.garment_type_id
     inner join sizes s on s.size_id = pv.size_id
     inner join colors c on c.color_id = pv.color_id
     ${whereClause}
     order by l.name asc, ps.name asc, s.sort_order asc, c.name asc`,
    values
  );

  return result.rows;
}

async function findAllKardex(filters = {}) {
  const { whereClause, values } = buildKardexWhereClause(filters);

  const result = await query(
    `with movements as (
       select
         sm.movement_id,
         sm.location_id,
         l.code as location_code,
         l.name as location_name,
         sm.variant_id,
         pv.sku,
         ps.style_code,
         ps.name as style_name,
         sm.movement_type,
         sm.quantity,
         case
           when sm.movement_type = 'IN' then sm.quantity
           when sm.movement_type = 'OUT' then -sm.quantity
           when sm.movement_type = 'ADJUST' then coalesce(ial.difference_qty, sm.quantity)
           else sm.quantity
         end as quantity_effect,
         sm.reason,
         sm.reference_type,
         sm.reference_id,
         sm.reference_line_id,
         sm.created_by,
         u.full_name as created_by_name,
         sm.created_at
       from stock_movements sm
       inner join locations l on l.location_id = sm.location_id
       inner join product_variants pv on pv.variant_id = sm.variant_id
       inner join product_styles ps on ps.style_id = pv.style_id
       left join users u on u.user_id = sm.created_by
       left join inventory_adjustment_lines ial
         on ial.adjustment_line_id = sm.reference_line_id
         and sm.reference_type = 'adjustment'
     ),
     ranked as (
       select
         movement_id,
         location_id,
         location_code,
         location_name,
         variant_id,
         sku,
         style_code,
         style_name,
         movement_type,
         quantity,
         quantity_effect,
         sum(quantity_effect) over (
           partition by location_id, variant_id
           order by created_at asc, movement_id asc
         )::int as balance_qty,
         reason,
         reference_type,
         reference_id,
         reference_line_id,
         created_by,
         created_by_name,
         created_at
       from movements
     )
     select
       movement_id,
       location_id,
       location_code,
       location_name,
       variant_id,
       sku,
       style_code,
       style_name,
       movement_type,
       quantity,
       quantity_effect,
       balance_qty,
       reason,
       reference_type,
       reference_id,
       reference_line_id,
       created_by,
       created_by_name,
       created_at
     from ranked
     ${whereClause}
     order by created_at desc, movement_id desc`,
    values
  );

  return result.rows;
}

async function findAllAdjustments() {
  const result = await query(
    `select
       ia.adjustment_id,
       ia.adjustment_number,
       ia.location_id,
       l.code as location_code,
       l.name as location_name,
       ia.status,
       ia.reason,
       ia.notes,
       ia.created_by,
       created_user.full_name as created_by_name,
       ia.confirmed_by,
       confirmed_user.full_name as confirmed_by_name,
       ia.cancelled_by,
       cancelled_user.full_name as cancelled_by_name,
       ia.created_at,
       ia.confirmed_at,
       ia.cancelled_at,
       ia.updated_at,
       count(ial.adjustment_line_id)::int as line_count
     from inventory_adjustments ia
     inner join locations l on l.location_id = ia.location_id
     left join users created_user on created_user.user_id = ia.created_by
     left join users confirmed_user on confirmed_user.user_id = ia.confirmed_by
     left join users cancelled_user on cancelled_user.user_id = ia.cancelled_by
     left join inventory_adjustment_lines ial on ial.adjustment_id = ia.adjustment_id
     group by
       ia.adjustment_id,
       ia.adjustment_number,
       ia.location_id,
       l.code,
       l.name,
       ia.status,
       ia.reason,
       ia.notes,
       ia.created_by,
       created_user.full_name,
       ia.confirmed_by,
       confirmed_user.full_name,
       ia.cancelled_by,
       cancelled_user.full_name,
       ia.created_at,
       ia.confirmed_at,
       ia.cancelled_at,
       ia.updated_at
     order by ia.created_at desc`,
    []
  );

  return result.rows;
}

async function findAdjustmentVariants(locationId, searchQuery, executor = query) {
  const result = await executor(
    `select
       pv.variant_id,
       pv.sku,
       ps.style_code,
       ps.name as style_name,
       s.code as size_code,
       c.name as color_name,
       coalesce(i.qty, 0)::int as system_qty
     from product_variants pv
     inner join product_styles ps on ps.style_id = pv.style_id
     inner join sizes s on s.size_id = pv.size_id
     inner join colors c on c.color_id = pv.color_id
     left join inventory i
       on i.variant_id = pv.variant_id
      and i.location_id = $1
     where (
       pv.sku ilike $2
       or ps.style_code ilike $2
       or ps.name ilike $2
       or s.code ilike $2
       or c.name ilike $2
     )
     order by ps.name asc, s.sort_order asc, c.name asc`,
    [locationId, `%${searchQuery}%`]
  );

  return result.rows;
}

async function findAdjustmentHeaderById(adjustmentId, executor = query) {
  const result = await executor(
    `select
       ia.adjustment_id,
       ia.adjustment_number,
       ia.location_id,
       l.code as location_code,
       l.name as location_name,
       ia.status,
       ia.reason,
       ia.notes,
       ia.created_by,
       created_user.full_name as created_by_name,
       ia.confirmed_by,
       confirmed_user.full_name as confirmed_by_name,
       ia.cancelled_by,
       cancelled_user.full_name as cancelled_by_name,
       ia.created_at,
       ia.confirmed_at,
       ia.cancelled_at,
       ia.updated_at
     from inventory_adjustments ia
     inner join locations l on l.location_id = ia.location_id
     left join users created_user on created_user.user_id = ia.created_by
     left join users confirmed_user on confirmed_user.user_id = ia.confirmed_by
     left join users cancelled_user on cancelled_user.user_id = ia.cancelled_by
     where ia.adjustment_id = $1`,
    [adjustmentId]
  );

  return result.rows[0] || null;
}

async function findAdjustmentLinesByAdjustmentId(adjustmentId, executor = query) {
  const result = await executor(
    `select
       ial.adjustment_line_id,
       ial.adjustment_id,
       ial.variant_id,
       pv.sku,
       ps.style_code,
       ps.name as style_name,
       s.code as size_code,
       c.name as color_name,
       ial.system_qty,
       ial.counted_qty,
       ial.difference_qty,
       ial.notes
     from inventory_adjustment_lines ial
     inner join product_variants pv on pv.variant_id = ial.variant_id
     inner join product_styles ps on ps.style_id = pv.style_id
     inner join sizes s on s.size_id = pv.size_id
     inner join colors c on c.color_id = pv.color_id
     where ial.adjustment_id = $1
     order by ps.name asc, s.sort_order asc, c.name asc`,
    [adjustmentId]
  );

  return result.rows;
}

async function findLocationById(locationId, executor = query) {
  const result = await executor(
    `select location_id, name, code
     from locations
     where location_id = $1`,
    [locationId]
  );

  return result.rows[0] || null;
}

async function findUserById(userId, executor = query) {
  const result = await executor(
    `select user_id, full_name
     from users
     where user_id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

async function findVariantsByIds(variantIds, executor = query) {
  if (!variantIds.length) {
    return [];
  }

  const result = await executor(
    `select
       pv.variant_id,
       pv.sku,
       ps.style_code,
       ps.name as style_name,
       s.code as size_code,
       c.name as color_name
     from product_variants pv
     inner join product_styles ps on ps.style_id = pv.style_id
     inner join sizes s on s.size_id = pv.size_id
     inner join colors c on c.color_id = pv.color_id
     where pv.variant_id = any($1::uuid[])`,
    [variantIds]
  );

  return result.rows;
}

async function findInventoryQtyByLocationAndVariant(locationId, variantId, executor = query) {
  const result = await executor(
    `select qty
     from inventory
     where location_id = $1
       and variant_id = $2`,
    [locationId, variantId]
  );

  return result.rows[0] ? Number(result.rows[0].qty) : 0;
}

async function insertAdjustment(payload, executor = query) {
  const result = await executor(
    `insert into inventory_adjustments (
       adjustment_number,
       location_id,
       status,
       reason,
       notes,
       created_by
     )
     values ($1, $2, $3, $4, $5, $6)
     returning
       adjustment_id,
       adjustment_number,
       location_id,
       status,
       reason,
       notes,
       created_by,
       confirmed_by,
       cancelled_by,
       created_at,
       confirmed_at,
       cancelled_at,
       updated_at`,
    [
      payload.adjustment_number,
      payload.location_id,
      payload.status,
      payload.reason,
      payload.notes,
      payload.created_by,
    ]
  );

  return result.rows[0] || null;
}

async function insertAdjustmentLine(payload, executor = query) {
  const result = await executor(
    `insert into inventory_adjustment_lines (
       adjustment_id,
       variant_id,
       system_qty,
       counted_qty,
       notes
     )
     values ($1, $2, $3, $4, $5)
     returning
       adjustment_line_id,
       adjustment_id,
       variant_id,
       system_qty,
       counted_qty,
       difference_qty,
       notes`,
    [
      payload.adjustment_id,
      payload.variant_id,
      payload.system_qty,
      payload.counted_qty,
      payload.notes,
    ]
  );

  return result.rows[0] || null;
}

async function confirmAdjustment(adjustmentId, confirmedBy, executor = query) {
  const result = await executor(
    `update inventory_adjustments
     set
       status = 'confirmed',
       confirmed_by = $2,
       confirmed_at = current_timestamp,
       updated_at = current_timestamp
     where adjustment_id = $1
     returning
       adjustment_id,
       adjustment_number,
       location_id,
       status,
       reason,
       notes,
       created_by,
       confirmed_by,
       cancelled_by,
       created_at,
       confirmed_at,
       cancelled_at,
       updated_at`,
    [adjustmentId, confirmedBy]
  );

  return result.rows[0] || null;
}

async function cancelAdjustment(adjustmentId, cancelledBy, executor = query) {
  const result = await executor(
    `update inventory_adjustments
     set
       status = 'cancelled',
       cancelled_by = $2,
       cancelled_at = current_timestamp,
       updated_at = current_timestamp
     where adjustment_id = $1
     returning
       adjustment_id,
       adjustment_number,
       location_id,
       status,
       reason,
       notes,
       created_by,
       confirmed_by,
       cancelled_by,
       created_at,
       confirmed_at,
       cancelled_at,
       updated_at`,
    [adjustmentId, cancelledBy]
  );

  return result.rows[0] || null;
}

async function upsertInventoryQty(locationId, variantId, qty, executor = query) {
  const result = await executor(
    `insert into inventory (location_id, variant_id, qty)
     values ($1, $2, $3)
     on conflict (location_id, variant_id)
     do update set qty = excluded.qty
     returning location_id, variant_id, qty`,
    [locationId, variantId, qty]
  );

  return result.rows[0] || null;
}

async function insertStockMovement(payload, executor = query) {
  const result = await executor(
    `insert into stock_movements (
       location_id,
       variant_id,
       movement_type,
       quantity,
       reason,
       reference_type,
       reference_id,
       reference_line_id,
       created_by
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     returning movement_id`,
    [
      payload.location_id,
      payload.variant_id,
      payload.movement_type,
      payload.quantity,
      payload.reason,
      payload.reference_type,
      payload.reference_id,
      payload.reference_line_id,
      payload.created_by,
    ]
  );

  return result.rows[0] || null;
}

module.exports = {
  findAllInventory,
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
};
