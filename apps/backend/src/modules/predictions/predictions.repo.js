const { query } = require('../../shared/db');

async function findStockRiskPredictions(locationIds, lookbackDays = 30, thresholdDays = 30) {
  const result = await query(
    `with consumption as (
      select
        pv.variant_id,
        pv.sku,
        pv.style_id,
        ps.name as style_name,
        ps.style_code,
        siz.code as size_code,
        c.code as color_code,
        coalesce(sum(sd.quantity)::numeric / greatest($3, 1), 0) as daily_consumption
      from sales_details sd
      inner join sales s on s.sale_id = sd.sale_id
      inner join product_variants pv on pv.variant_id = sd.variant_id
      inner join product_styles ps on ps.style_id = pv.style_id
      inner join sizes siz on siz.size_id = pv.size_id
      inner join colors c on c.color_id = pv.color_id
      where s.location_id = any($1::uuid[])
        and s.status = 'confirmed'
        and s.confirmed_at >= current_date - ($2 || ' days')::interval
      group by pv.variant_id, pv.sku, pv.style_id, ps.name, ps.style_code, siz.code, c.code
    ),
    stock as (
      select variant_id, qty
      from inventory
      where location_id = any($1::uuid[])
    )
    select
      c.variant_id,
      c.sku,
      c.style_name,
      c.style_code,
      c.size_code,
      c.color_code,
      coalesce(st.qty, 0) as current_stock,
      round(c.daily_consumption::numeric, 2) as daily_consumption,
      case
        when c.daily_consumption > 0 then round((coalesce(st.qty, 0) / c.daily_consumption)::numeric, 0)::int
        else null
      end as days_remaining,
      case
        when coalesce(st.qty, 0) = 0 then 'out_of_stock'
        when c.daily_consumption > 0 and (coalesce(st.qty, 0) / c.daily_consumption) < $4 then 'at_risk'
        else 'healthy'
      end as risk_level
    from consumption c
    left join stock st on st.variant_id = c.variant_id
    where c.daily_consumption > 0
      and ((coalesce(st.qty, 0) / c.daily_consumption) < $4 or coalesce(st.qty, 0) = 0)
    order by days_remaining asc nulls first, daily_consumption desc
    limit 50`,
    [locationIds, lookbackDays, lookbackDays, thresholdDays]
  );

  return result.rows;
}

module.exports = {
  findStockRiskPredictions,
};
