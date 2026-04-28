const { query } = require('../../shared/db');

async function findAllPrices(filters = {}) {
  const conditions = [];
  const values = [];

  if (filters.styleId) {
    values.push(filters.styleId);
    conditions.push(`ssp.style_id = $${values.length}`);
  }

  if (filters.priceType) {
    values.push(filters.priceType);
    conditions.push(`ssp.price_type = $${values.length}`);
  }

  if (typeof filters.active === 'boolean') {
    values.push(filters.active);
    conditions.push(`ssp.active = $${values.length}`);
  }

  const whereClause = conditions.length ? `where ${conditions.join(' and ')}` : '';

  const result = await query(
    `select
       ssp.style_size_price_id,
       ssp.style_id,
       ps.style_code,
       ps.name as style_name,
       ssp.size_id,
       s.code as size_code,
       s.name as size_name,
       ssp.price_type,
       ssp.price,
       ssp.start_date,
       ssp.end_date,
       ssp.active,
       ssp.created_at,
       ssp.updated_at,
       case
         when ssp.active = false then 'inactive'
         when ssp.start_date > current_date then 'scheduled'
         when ssp.end_date is not null and ssp.end_date < current_date then 'expired'
         else 'active'
       end as validity_status
     from style_size_prices ssp
     inner join product_styles ps on ps.style_id = ssp.style_id
     inner join sizes s on s.size_id = ssp.size_id
     ${whereClause}
     order by ps.name asc, s.sort_order asc, s.code asc, ssp.start_date desc`,
    values
  );

  return result.rows;
}

async function findStylesMissingCommercialPrices() {
  const result = await query(
    `with style_coverage as (
       select
         ps.style_id,
         ps.style_code,
         ps.name as style_name,
         count(distinct pv.variant_id)::int as variant_count,
         count(distinct i.location_id::text || ':' || i.variant_id::text)::int as inventory_row_count,
         count(distinct ssp.style_size_price_id)::int as price_row_count
       from product_styles ps
       left join product_variants pv on pv.style_id = ps.style_id
       left join inventory i on i.variant_id = pv.variant_id
       left join style_size_prices ssp on ssp.style_id = ps.style_id
       group by ps.style_id, ps.style_code, ps.name
     )
     select
       style_id,
       style_code,
       style_name,
       variant_count,
       inventory_row_count,
       price_row_count
     from style_coverage
     where price_row_count = 0
       and (variant_count > 0 or inventory_row_count > 0)
     order by inventory_row_count desc, variant_count desc, style_name asc`
  );

  return result.rows;
}

async function findPriceById(priceId) {
  const result = await query(
    `select
       style_size_price_id,
       style_id,
       size_id,
       price_type,
       price,
       start_date,
       end_date,
       active,
       created_at,
       updated_at
     from style_size_prices
     where style_size_price_id = $1`,
    [priceId]
  );

  return result.rows[0] || null;
}

async function findStyleById(styleId) {
  const result = await query(
    `select style_id
     from product_styles
     where style_id = $1`,
    [styleId]
  );

  return result.rows[0] || null;
}

async function findSizeById(sizeId) {
  const result = await query(
    `select size_id
     from sizes
     where size_id = $1`,
    [sizeId]
  );

  return result.rows[0] || null;
}

async function findConfiguredStyleSize(styleId, sizeId) {
  const result = await query(
    `select style_id, size_id
     from style_sizes
     where style_id = $1
       and size_id = $2`,
    [styleId, sizeId]
  );

  return result.rows[0] || null;
}

async function insertPrice(payload, executor = query) {
  const result = await executor(
    `insert into style_size_prices (
       style_id,
       size_id,
       price_type,
       price,
       start_date,
       end_date,
       active
     )
     values ($1, $2, $3, $4, $5, $6, $7)
     returning
       style_size_price_id,
       style_id,
       size_id,
       price_type,
       price,
       start_date,
       end_date,
       active,
       created_at,
       updated_at`,
    [
      payload.style_id,
      payload.size_id,
      payload.price_type,
      payload.price,
      payload.start_date,
      payload.end_date,
      payload.active,
    ]
  );

  return result.rows[0] || null;
}

async function closePreviousPricesForNewStart(
  { styleId, sizeId, priceType, startDate },
  executor = query
) {
  await executor(
    `update style_size_prices
     set
       end_date = ($4::date - interval '1 day')::date,
       updated_at = current_timestamp
     where style_id = $1
       and size_id = $2
       and price_type = $3
       and start_date < $4::date
       and (end_date is null or end_date >= $4::date)`,
    [styleId, sizeId, priceType, startDate]
  );
}

async function updatePrice(priceId, payload) {
  const columns = Object.keys(payload);
  const values = Object.values(payload);
  const assignments = columns.map((column, index) => `${column} = $${index + 2}`);

  assignments.push('updated_at = current_timestamp');

  const result = await query(
    `update style_size_prices
     set ${assignments.join(', ')}
     where style_size_price_id = $1
     returning
       style_size_price_id,
       style_id,
       size_id,
       price_type,
       price,
       start_date,
       end_date,
       active,
       created_at,
       updated_at`,
    [priceId, ...values]
  );

  return result.rows[0] || null;
}

module.exports = {
  findAllPrices,
  findStylesMissingCommercialPrices,
  findPriceById,
  findStyleById,
  findSizeById,
  findConfiguredStyleSize,
  insertPrice,
  closePreviousPricesForNewStart,
  updatePrice,
};
