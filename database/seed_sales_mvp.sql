-- ============================================================
-- RIPNEL sales MVP seed
-- Purpose: leave a minimum functional dataset for Week 9 sales
-- testing without changing sales tables yet.
--
-- Recommended execution order:
-- 1) database/seed_access_control.sql
-- 2) database/seed_operational_mvp.sql
-- 3) database/seed_variants_inventory.sql
-- 4) database/seed_style_size_prices.sql
-- 5) this file
--
-- Safe to re-run:
-- - customer inserts use upsert by internal_code
-- - validation queries are read only
-- ============================================================

begin;

-- ============================================================
-- 1) SALES TEST CUSTOMERS
-- ============================================================

with seeded_customers(
  internal_code,
  document_type,
  document_number,
  full_name,
  business_name,
  commercial_name,
  email,
  phone,
  district,
  address,
  seller_username,
  notes,
  customer_type,
  active
) as (
  values
    (
      'SALE-CLI-001',
      'none',
      null,
      'Cliente Mostrador',
      null,
      null,
      null,
      null,
      'Lima',
      'Venta de mostrador',
      'ventas',
      'Cliente generico para nueva venta MVP.',
      'retail',
      true
    ),
    (
      'SALE-CLI-002',
      'dni',
      '73645128',
      'Paola Rivas Quispe',
      null,
      null,
      'paola.rivas@example.com',
      '987654401',
      'Lima',
      'Av. Petit Thouars 1200',
      'ventas',
      'Cliente retail para boleta en pruebas de ventas.',
      'retail',
      true
    ),
    (
      'SALE-CLI-003',
      'ruc',
      '20654321987',
      null,
      'Comercial Textil Andina SAC',
      'Textil Andina',
      'compras@textilandina.pe',
      '987654402',
      'La Victoria',
      'Jr. Gamarra 155',
      'ventas',
      'Cliente empresa para pruebas de factura.',
      'wholesale',
      true
    )
)
insert into customers (
  internal_code,
  document_type,
  document_number,
  full_name,
  business_name,
  commercial_name,
  email,
  phone,
  district,
  address,
  assigned_seller_user_id,
  notes,
  customer_type,
  active
)
select
  seeded_customers.internal_code,
  seeded_customers.document_type,
  seeded_customers.document_number,
  seeded_customers.full_name,
  seeded_customers.business_name,
  seeded_customers.commercial_name,
  seeded_customers.email,
  seeded_customers.phone,
  seeded_customers.district,
  seeded_customers.address,
  users.user_id,
  seeded_customers.notes,
  seeded_customers.customer_type,
  seeded_customers.active
from seeded_customers
left join users
  on users.username = seeded_customers.seller_username
 and users.active = true
on conflict (internal_code) do update
set
  document_type = excluded.document_type,
  document_number = excluded.document_number,
  full_name = excluded.full_name,
  business_name = excluded.business_name,
  commercial_name = excluded.commercial_name,
  email = excluded.email,
  phone = excluded.phone,
  district = excluded.district,
  address = excluded.address,
  assigned_seller_user_id = excluded.assigned_seller_user_id,
  notes = excluded.notes,
  customer_type = excluded.customer_type,
  active = excluded.active,
  updated_at = current_timestamp;

commit;

-- ============================================================
-- 2) READINESS CHECKS FOR SALES MVP
-- ============================================================

-- Active users with default location
select
  u.username,
  u.full_name,
  l.code as default_location_code,
  l.name as default_location_name
from users u
inner join user_locations ul
  on ul.user_id = u.user_id
 and ul.is_default = true
inner join locations l
  on l.location_id = ul.location_id
where u.active = true
order by u.username;

-- Customers ready for sales testing
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
