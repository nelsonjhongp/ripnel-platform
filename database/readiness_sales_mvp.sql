-- ============================================================
-- RIPNEL sales MVP readiness check
-- Purpose: verify the minimum context required to test the
-- Week 9 "Nueva venta" flow and the parallel cash closing base.
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

-- Demo confirmed sales ready for history/detail/cash closing base
select
  s.sale_number,
  s.document_type,
  s.status,
  l.code as location_code,
  timezone('America/Lima', s.confirmed_at)::date as business_date_lima,
  s.total_amount
from sales s
inner join locations l on l.location_id = s.location_id
where s.sale_number in ('N-900001', 'B-900001', 'F-900001')
order by s.confirmed_at desc, s.sale_number asc;

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

-- Cash closing aggregate based on confirmed sales and Lima business date
select
  l.code as location_code,
  timezone('America/Lima', s.confirmed_at)::date as business_date_lima,
  count(distinct s.sale_id) as confirmed_sales_count,
  coalesce(sum(case when sp.method = 'cash' then sp.amount else 0 end), 0)::numeric(12,2) as total_cash,
  coalesce(sum(case when sp.method = 'yape' then sp.amount else 0 end), 0)::numeric(12,2) as total_yape,
  coalesce(sum(case when sp.method = 'plin' then sp.amount else 0 end), 0)::numeric(12,2) as total_plin,
  coalesce(sum(case when sp.method = 'transfer' then sp.amount else 0 end), 0)::numeric(12,2) as total_transfer,
  coalesce(sum(sp.amount), 0)::numeric(12,2) as total_all
from sales s
inner join sales_payments sp on sp.sale_id = s.sale_id
inner join locations l on l.location_id = s.location_id
where s.status = 'confirmed'
  and s.sale_number in ('N-900001', 'B-900001', 'F-900001')
group by l.code, timezone('America/Lima', s.confirmed_at)::date
order by business_date_lima desc, location_code asc;

-- Header total vs payment total consistency for the demo sales
select
  s.sale_number,
  s.total_amount,
  coalesce(sum(sp.amount), 0)::numeric(12,2) as payment_total,
  (s.total_amount - coalesce(sum(sp.amount), 0))::numeric(12,2) as difference
from sales s
left join sales_payments sp on sp.sale_id = s.sale_id
where s.sale_number in ('N-900001', 'B-900001', 'F-900001')
group by s.sale_number, s.total_amount
order by s.sale_number asc;
