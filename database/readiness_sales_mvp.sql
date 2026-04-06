-- ============================================================
-- RIPNEL sales MVP readiness check
-- Purpose: verify the minimum context required to test the
-- Week 9 "Nueva venta" flow.
-- Read only.
-- ============================================================

-- Active users with default location
select
  u.email,
  u.full_name,
  r.name as role_name,
  l.code as default_location_code,
  l.name as default_location_name
from users u
inner join user_locations ul
  on ul.user_id = u.user_id
 and ul.is_default = true
inner join locations l
  on l.location_id = ul.location_id
left join roles r
  on r.role_id = u.role_id
where u.active = true
order by u.email;

-- Sales test customers
select
  internal_code,
  document_type,
  document_number,
  coalesce(full_name, business_name, commercial_name) as customer_name,
  customer_type,
  active
from customers
where internal_code like 'SALE-CLI-%'
order by internal_code;

-- Sales tables should remain empty until backend transactions are ready
select
  (select count(*) from sales) as sales_count,
  (select count(*) from sales_details) as sales_details_count,
  (select count(*) from sales_payments) as sales_payments_count;

-- Variants with stock and current retail price in store locations
select
  l.code as location_code,
  pv.sku,
  ps.style_code,
  s.code as size_code,
  c.code as color_code,
  i.qty,
  ssp.price as retail_price
from inventory i
inner join locations l on l.location_id = i.location_id
inner join product_variants pv on pv.variant_id = i.variant_id
inner join product_styles ps on ps.style_id = pv.style_id
inner join sizes s on s.size_id = pv.size_id
inner join colors c on c.color_id = pv.color_id
left join style_size_prices ssp
  on ssp.style_id = pv.style_id
 and ssp.size_id = pv.size_id
 and ssp.price_type = 'retail'
 and ssp.active = true
 and ssp.start_date <= current_date
 and (ssp.end_date is null or ssp.end_date >= current_date)
where l.type = 'store'
  and i.qty > 0
order by l.code, ps.style_code, s.sort_order, pv.sku;
