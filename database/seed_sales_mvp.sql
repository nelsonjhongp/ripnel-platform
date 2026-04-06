-- ============================================================
-- RIPNEL sales MVP seed
-- Purpose: leave a minimum functional dataset for Week 9 sales
-- testing without changing sales tables yet.
--
-- Recommended execution order:
-- 1) database/seed_access_control.sql
-- 2) database/seed_operational_demo.sql
-- 3) database/seed_variants_inventory.sql
-- 4) database/seed_style_size_prices.sql
-- 5) this file
--
-- Safe to re-run:
-- - customer inserts use upsert by internal_code
-- - does not insert into sales tables yet
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
  seller_email,
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
      'ventas.centro@ripnel.com',
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
      'ventas.centro@ripnel.com',
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
      'ventas.centro@ripnel.com',
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
  on users.email = seeded_customers.seller_email
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
