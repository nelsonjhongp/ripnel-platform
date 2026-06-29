const { query } = require('../../shared/db');

async function findProductSummaries(filters = {}) {
  const values = [];
  const conditions = [];
  let locationRef = null;

  if (filters.styleId) {
    values.push(filters.styleId);
    conditions.push(`ps.style_id = $${values.length}`);
  }

  if (filters.query) {
    values.push(`%${filters.query}%`);
    const searchRef = `$${values.length}`;
    conditions.push(`(
      ps.name ilike ${searchRef}
      or ps.style_code ilike ${searchRef}
      or gt.name ilike ${searchRef}
    )`);
  }

  if (filters.locationId) {
    values.push(filters.locationId);
    locationRef = `$${values.length}`;
  }

  const styleWhereClause = conditions.length ? `where ${conditions.join(' and ')}` : '';
  const inventoryLocationJoin = locationRef ? ` and i.location_id = ${locationRef}` : '';

  const result = await query(
    `with base_styles as (
       select
         ps.style_id,
         ps.style_code,
         ps.name,
       ps.description,
       ps.active,
       ps.created_at,
       ps.updated_at,
       gt.name as garment_type_name
       from product_styles ps
       inner join garment_types gt on gt.garment_type_id = ps.garment_type_id
       ${styleWhereClause}
     ),
     size_stock as (
       select
         pv.style_id,
         pv.size_id,
         coalesce(sum(i.qty), 0)::int as stock_qty
       from product_variants pv
       left join inventory i
         on i.variant_id = pv.variant_id
        ${inventoryLocationJoin}
       where pv.style_id in (select style_id from base_styles)
       group by pv.style_id, pv.size_id
     ),
     configured_sizes as (
       select
         ss.style_id,
         count(*)::int as configured_size_count,
         array_remove(
           array_agg(s.code order by s.sort_order asc, s.code asc),
           null
         ) as size_codes,
         coalesce(
           json_agg(
             json_build_object(
               'size_id', s.size_id,
               'size_code', s.code,
               'qty', coalesce(ssk.stock_qty, 0)
             )
             order by s.sort_order asc, s.code asc
           ) filter (where s.size_id is not null),
           '[]'::json
         ) as size_stock
       from style_sizes ss
       inner join sizes s on s.size_id = ss.size_id
       left join size_stock ssk
         on ssk.style_id = ss.style_id
        and ssk.size_id = ss.size_id
       where ss.style_id in (select style_id from base_styles)
       group by ss.style_id
     ),
     configured_colors as (
       select
         sc.style_id,
         count(*)::int as configured_color_count
       from style_colors sc
       where sc.style_id in (select style_id from base_styles)
       group by sc.style_id
     ),
     variants as (
       select
         pv.style_id,
         count(*)::int as variant_count,
         count(*) filter (where pv.active = true)::int as active_variant_count
       from product_variants pv
       where pv.style_id in (select style_id from base_styles)
       group by pv.style_id
     ),
     inventory_by_style as (
       select
         pv.style_id,
         count(i.variant_id)::int as inventory_row_count,
         count(*) filter (where coalesce(i.qty, 0) > 0 and i.variant_id is not null)::int as stocked_variant_count,
         coalesce(sum(i.qty), 0)::int as total_stock_qty
       from product_variants pv
       left join inventory i
         on i.variant_id = pv.variant_id
        ${inventoryLocationJoin}
       where pv.style_id in (select style_id from base_styles)
       group by pv.style_id
     ),
     current_price_flags as (
       select
         ssp.style_id,
         ssp.size_id,
         bool_or(ssp.price_type = 'retail') as has_current_retail_price,
         bool_or(ssp.price_type = 'wholesale') as has_current_wholesale_price
       from style_size_prices ssp
       where ssp.style_id in (select style_id from base_styles)
         and ssp.active = true
         and ssp.start_date <= current_date
         and (ssp.end_date is null or ssp.end_date >= current_date)
       group by ssp.style_id, ssp.size_id
     ),
     size_coverage as (
       select
         ss.style_id,
         count(*) filter (where coalesce(cpf.has_current_retail_price, false))::int as retail_sizes_covered_count,
         count(*) filter (where coalesce(cpf.has_current_wholesale_price, false))::int as wholesale_sizes_covered_count,
         count(*) filter (
           where coalesce(ssk.stock_qty, 0) > 0
             and not coalesce(cpf.has_current_retail_price, false)
         )::int as sizes_with_stock_without_retail_count
       from style_sizes ss
       left join current_price_flags cpf
         on cpf.style_id = ss.style_id
        and cpf.size_id = ss.size_id
       left join size_stock ssk
         on ssk.style_id = ss.style_id
        and ssk.size_id = ss.size_id
       where ss.style_id in (select style_id from base_styles)
       group by ss.style_id
     )
     select
       bs.style_id,
       bs.style_code,
       bs.name,
       bs.description,
       bs.active,
       bs.created_at,
       bs.updated_at,
       bs.garment_type_name,
       coalesce(cs.configured_size_count, 0)::int as configured_size_count,
       coalesce(cs.size_codes, '{}') as size_codes,
       coalesce(cs.size_stock, '[]'::json) as size_stock,
       coalesce(cc.configured_color_count, 0)::int as configured_color_count,
       coalesce(v.variant_count, 0)::int as variant_count,
       coalesce(v.active_variant_count, 0)::int as active_variant_count,
       coalesce(ibs.inventory_row_count, 0)::int as inventory_row_count,
       coalesce(ibs.stocked_variant_count, 0)::int as stocked_variant_count,
       coalesce(ibs.total_stock_qty, 0)::int as total_stock_qty,
       coalesce(sc.retail_sizes_covered_count, 0)::int as retail_sizes_covered_count,
       coalesce(sc.wholesale_sizes_covered_count, 0)::int as wholesale_sizes_covered_count,
       coalesce(sc.sizes_with_stock_without_retail_count, 0)::int as sizes_with_stock_without_retail_count
     from base_styles bs
     left join configured_sizes cs on cs.style_id = bs.style_id
     left join configured_colors cc on cc.style_id = bs.style_id
     left join variants v on v.style_id = bs.style_id
     left join inventory_by_style ibs on ibs.style_id = bs.style_id
     left join size_coverage sc on sc.style_id = bs.style_id
     order by bs.active desc, bs.updated_at desc, bs.name asc`,
    values
  );

  return result.rows;
}

async function findProductSummaryById(styleId) {
  const rows = await findProductSummaries({ styleId });
  return rows[0] || null;
}

async function findProductWorkspaceSizes(styleId) {
  const result = await query(
    `with current_price_flags as (
       select
         ssp.style_id,
         ssp.size_id,
         bool_or(ssp.price_type = 'retail') as has_current_retail_price,
         bool_or(ssp.price_type = 'wholesale') as has_current_wholesale_price
       from style_size_prices ssp
       where ssp.style_id = $1
         and ssp.active = true
         and ssp.start_date <= current_date
         and (ssp.end_date is null or ssp.end_date >= current_date)
       group by ssp.style_id, ssp.size_id
     ),
     price_counts as (
       select
         ssp.style_id,
         ssp.size_id,
         count(*) filter (where ssp.price_type = 'retail')::int as retail_price_count,
         count(*) filter (where ssp.price_type = 'wholesale')::int as wholesale_price_count
       from style_size_prices ssp
       where ssp.style_id = $1
       group by ssp.style_id, ssp.size_id
     ),
     size_stock as (
       select
         pv.style_id,
         pv.size_id,
         coalesce(sum(i.qty), 0)::int as stock_qty
       from product_variants pv
       left join inventory i on i.variant_id = pv.variant_id
       where pv.style_id = $1
       group by pv.style_id, pv.size_id
     )
     select
       s.size_id,
       s.code,
       s.name,
       s.sort_order,
       s.active,
       coalesce(cpf.has_current_retail_price, false) as has_current_retail_price,
       coalesce(cpf.has_current_wholesale_price, false) as has_current_wholesale_price,
       coalesce(pc.retail_price_count, 0)::int as retail_price_count,
       coalesce(pc.wholesale_price_count, 0)::int as wholesale_price_count,
       get_current_style_size_price($1, s.size_id, 'retail', current_date) as current_retail_price,
       get_current_style_size_price($1, s.size_id, 'wholesale', current_date) as current_wholesale_price,
       coalesce(ssk.stock_qty, 0)::int as stock_qty,
       (coalesce(ssk.stock_qty, 0) > 0) as has_stock
     from style_sizes ss
     inner join sizes s on s.size_id = ss.size_id
     left join current_price_flags cpf
       on cpf.style_id = ss.style_id
      and cpf.size_id = ss.size_id
     left join price_counts pc
       on pc.style_id = ss.style_id
      and pc.size_id = ss.size_id
     left join size_stock ssk
       on ssk.style_id = ss.style_id
      and ssk.size_id = ss.size_id
     where ss.style_id = $1
     order by s.sort_order asc, s.name asc`,
    [styleId]
  );

  return result.rows;
}

async function findProductWorkspaceColors(styleId) {
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

module.exports = {
  findProductSummaries,
  findProductSummaryById,
  findProductWorkspaceSizes,
  findProductWorkspaceColors,
};
