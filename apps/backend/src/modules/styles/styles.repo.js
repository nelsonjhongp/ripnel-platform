const { query } = require('../../shared/db');

async function findAllStyles() {
  const result = await query(
    `select
       ps.style_id,
       ps.style_code,
       ps.name,
       ps.description,
       ps.active,
       ps.created_at,
       ps.updated_at,
       gt.garment_type_id,
       gt.code as garment_type_code,
       gt.name as garment_type_name,
       f.fabric_id,
       f.code as fabric_code,
       f.name as fabric_name,
       fd.fabric_detail_id,
       fd.name as fabric_detail_name,
       t.target_id,
       t.name as target_name,
       coalesce(array_agg(distinct s.code) filter (where s.code is not null), '{}') as size_codes,
       coalesce(array_agg(distinct s.name) filter (where s.name is not null), '{}') as size_names,
       coalesce(array_agg(distinct c.code) filter (where c.code is not null), '{}') as color_codes,
       coalesce(array_agg(distinct c.name) filter (where c.name is not null), '{}') as color_names
     from product_styles ps
     inner join garment_types gt on gt.garment_type_id = ps.garment_type_id
     left join fabrics f on f.fabric_id = ps.fabric_id
     left join fabric_details fd on fd.fabric_detail_id = ps.fabric_detail_id
     left join targets t on t.target_id = ps.target_id
     left join style_sizes ss on ss.style_id = ps.style_id
     left join sizes s on s.size_id = ss.size_id
     left join style_colors sc on sc.style_id = ps.style_id
     left join colors c on c.color_id = sc.color_id
     group by
       ps.style_id,
       gt.garment_type_id,
       gt.code,
       gt.name,
       f.fabric_id,
       f.code,
       f.name,
       fd.fabric_detail_id,
       fd.name,
       t.target_id,
       t.name
     order by ps.active desc, ps.created_at desc, ps.name asc`
  );

  return result.rows;
}

async function findStyleCodesByPrefix(prefix) {
  const result = await query(
    `select style_code
     from product_styles
     where style_code ilike $1`,
    [`${prefix}%`]
  );

  return result.rows.map((row) => row.style_code).filter(Boolean);
}

async function findGarmentTypeById(garmentTypeId) {
  const result = await query(
    `select garment_type_id, code, name
     from garment_types
     where garment_type_id = $1`,
    [garmentTypeId]
  );

  return result.rows[0] || null;
}

async function findTargetById(targetId) {
  const result = await query(
    `select target_id, name, active
     from targets
     where target_id = $1`,
    [targetId]
  );

  return result.rows[0] || null;
}

async function findFabricById(fabricId) {
  const result = await query(
    `select fabric_id, code, name
     from fabrics
     where fabric_id = $1`,
    [fabricId]
  );

  return result.rows[0] || null;
}

async function findStyleById(styleId) {
  const result = await query(
    `select
       ps.style_id,
       ps.style_code,
       ps.name,
       ps.description,
       ps.active,
       ps.created_at,
       ps.updated_at,
       gt.garment_type_id,
       gt.code as garment_type_code,
       gt.name as garment_type_name,
       f.fabric_id,
       f.code as fabric_code,
       f.name as fabric_name,
       fd.fabric_detail_id,
       fd.name as fabric_detail_name,
       t.target_id,
       t.name as target_name,
       coalesce(array_agg(distinct s.code) filter (where s.code is not null), '{}') as size_codes,
       coalesce(array_agg(distinct s.name) filter (where s.name is not null), '{}') as size_names,
       coalesce(array_agg(distinct c.code) filter (where c.code is not null), '{}') as color_codes,
       coalesce(array_agg(distinct c.name) filter (where c.name is not null), '{}') as color_names
     from product_styles ps
     inner join garment_types gt on gt.garment_type_id = ps.garment_type_id
     left join fabrics f on f.fabric_id = ps.fabric_id
     left join fabric_details fd on fd.fabric_detail_id = ps.fabric_detail_id
     left join targets t on t.target_id = ps.target_id
     left join style_sizes ss on ss.style_id = ps.style_id
     left join sizes s on s.size_id = ss.size_id
     left join style_colors sc on sc.style_id = ps.style_id
     left join colors c on c.color_id = sc.color_id
     where ps.style_id = $1
     group by
       ps.style_id,
       gt.garment_type_id,
       gt.code,
       gt.name,
       f.fabric_id,
       f.code,
       f.name,
       fd.fabric_detail_id,
       fd.name,
       t.target_id,
       t.name`,
    [styleId]
  );

  return result.rows[0] || null;
}

async function insertStyle(payload) {
  const result = await query(
    `insert into product_styles (
       garment_type_id,
       fabric_id,
       fabric_detail_id,
       target_id,
       style_code,
       name,
       description,
       active
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning style_id`,
    [
      payload.garment_type_id,
      payload.fabric_id,
      payload.fabric_detail_id,
      payload.target_id,
      payload.style_code,
      payload.name,
      payload.description,
      payload.active,
    ]
  );

  return result.rows[0]?.style_id || null;
}

async function countActiveVariantsByStyleId(styleId) {
  const result = await query(
    `select count(*)::int as total
     from product_variants
     where style_id = $1
       and active = true`,
    [styleId]
  );

  return result.rows[0]?.total || 0;
}

async function updateStyle(styleId, payload) {
  const result = await query(
    `update product_styles
     set
       name = $2,
       description = $3,
       target_id = $4,
       active = $5,
       updated_at = current_timestamp
     where style_id = $1
     returning style_id`,
    [
      styleId,
      payload.name,
      payload.description,
      payload.target_id,
      payload.active,
    ]
  );

  return result.rows[0]?.style_id || null;
}

module.exports = {
  findAllStyles,
  findStyleCodesByPrefix,
  findGarmentTypeById,
  findTargetById,
  findFabricById,
  findStyleById,
  insertStyle,
  countActiveVariantsByStyleId,
  updateStyle,
};
