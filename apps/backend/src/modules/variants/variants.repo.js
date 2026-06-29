const { pool, query } = require('../../shared/db');

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
       gt.name as garment_type_name
     from product_styles ps
     inner join garment_types gt on gt.garment_type_id = ps.garment_type_id
     where ps.style_id = $1`,
    [styleId]
  );

  return result.rows[0] || null;
}

async function findConfiguredSizes(styleId) {
  const result = await query(
    `select
       s.size_id,
       s.code,
       s.name,
       s.sort_order,
       s.active
     from style_sizes ss
     inner join sizes s on s.size_id = ss.size_id
     where ss.style_id = $1
     order by s.sort_order asc, s.name asc`,
    [styleId]
  );

  return result.rows;
}

async function findConfiguredColors(styleId) {
  const result = await query(
    `select
       c.color_id,
       c.code,
       c.name,
       c.hex,
       c.active
     from style_colors sc
     inner join colors c on c.color_id = sc.color_id
     where sc.style_id = $1
     order by c.name asc`,
    [styleId]
  );

  return result.rows;
}

async function findVariantsByStyleId(styleId) {
  const result = await query(
    `select
       pv.variant_id,
       pv.style_id,
       pv.size_id,
       s.code as size_code,
       s.name as size_name,
       pv.color_id,
       c.code as color_code,
       c.name as color_name,
       c.hex as color_hex,
       pv.sku,
       pv.barcode,
       pv.active,
       pv.created_at,
       pv.updated_at
     from product_variants pv
     inner join sizes s on s.size_id = pv.size_id
     inner join colors c on c.color_id = pv.color_id
     where pv.style_id = $1
     order by s.sort_order asc, s.name asc, c.name asc`,
    [styleId]
  );

  return result.rows;
}

async function findVariantById(variantId) {
  const result = await query(
    `select
       pv.variant_id,
       pv.style_id,
       ps.style_code,
       ps.name as style_name,
       pv.size_id,
       s.code as size_code,
       s.name as size_name,
       pv.color_id,
       c.code as color_code,
       c.name as color_name,
       c.hex as color_hex,
       pv.sku,
       pv.barcode,
       pv.active,
       pv.created_at,
       pv.updated_at
     from product_variants pv
     inner join product_styles ps on ps.style_id = pv.style_id
     inner join sizes s on s.size_id = pv.size_id
     inner join colors c on c.color_id = pv.color_id
     where pv.variant_id = $1`,
    [variantId]
  );

  return result.rows[0] || null;
}

async function findSizesByIds(sizeIds) {
  const result = await query(
    `select size_id, code, name, sort_order, active
     from sizes
     where size_id = any($1::uuid[])
     order by sort_order asc, name asc`,
    [sizeIds]
  );

  return result.rows;
}

async function findColorsByIds(colorIds) {
  const result = await query(
    `select color_id, code, name, hex, active
     from colors
     where color_id = any($1::uuid[])
     order by name asc`,
    [colorIds]
  );

  return result.rows;
}

async function findColorByCode(code) {
  const result = await query(
    `select color_id, code, name, hex, active
     from colors
     where code = $1`,
    [code]
  );

  return result.rows[0] || null;
}

async function replaceStyleConfig({ styleId, sizeIds, colorIds }) {
  const client = await pool.connect();

  try {
    await client.query('begin');

    await client.query(`delete from style_sizes where style_id = $1`, [styleId]);
    await client.query(`delete from style_colors where style_id = $1`, [styleId]);

    for (const sizeId of sizeIds) {
      await client.query(
        `insert into style_sizes (style_id, size_id)
         values ($1, $2)`,
        [styleId, sizeId]
      );
    }

    for (const colorId of colorIds) {
      await client.query(
        `insert into style_colors (style_id, color_id)
         values ($1, $2)`,
        [styleId, colorId]
      );
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function insertVariants(variants) {
  if (!variants.length) {
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('begin');

    for (const variant of variants) {
      await client.query(
        `insert into product_variants (
           style_id,
           size_id,
           color_id,
           sku,
           barcode,
           active
         )
         values ($1, $2, $3, $4, $5, $6)
         on conflict (style_id, size_id, color_id) do nothing`,
        [
          variant.style_id,
          variant.size_id,
          variant.color_id,
          variant.sku,
          variant.barcode || null,
          variant.active,
        ]
      );
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function updateVariantActive(variantId, active) {
  const result = await query(
    `update product_variants
     set
       active = $2,
       updated_at = current_timestamp
     where variant_id = $1
     returning variant_id`,
    [variantId, active]
  );

  return result.rows[0]?.variant_id || null;
}

module.exports = {
  findStyleById,
  findConfiguredSizes,
  findConfiguredColors,
  findVariantsByStyleId,
  findVariantById,
  findSizesByIds,
  findColorsByIds,
  findColorByCode,
  replaceStyleConfig,
  insertVariants,
  updateVariantActive,
};
