-- RIPNEL operational demo seed
-- Purpose: leave a coherent minimum dataset for team development on
-- users, user_locations, customers, inventory and stock movements.
-- Safe to re-run: uses upserts and replaces only stock movements marked
-- with the SEED reason prefix.

begin;

-- ============================================================
-- 1) OPERATIONAL USERS
-- ============================================================

with seeded_users(full_name, email, role_name) as (
  values
    ('Ventas Centro', 'ventas.centro@ripnel.com', 'VENTAS'),
    ('Almacen Central', 'almacen.central@ripnel.com', 'ALMACEN'),
    ('Tienda Centro', 'tienda.centro@ripnel.com', 'TIENDA'),
    ('Caja Centro', 'caja.centro@ripnel.com', 'CAJA')
)
insert into users (
  full_name,
  email,
  password_hash,
  role_id,
  active
)
select
  seeded_users.full_name,
  seeded_users.email,
  'temp_hash',
  roles.role_id,
  true
from seeded_users
inner join roles on roles.name = seeded_users.role_name
on conflict (email) do update
set
  full_name = excluded.full_name,
  password_hash = excluded.password_hash,
  role_id = excluded.role_id,
  active = excluded.active,
  updated_at = current_timestamp;

-- ============================================================
-- 2) USER DEFAULT LOCATIONS
-- ============================================================

with seeded_assignments(email, location_code, is_default) as (
  values
    ('jean@ripnel.com', 'ALM-CENT', true),
    ('jean@ripnel.com', 'TD-CENT', false),
    ('jean@ripnel.com', 'TD-MONT', false),
    ('nelson@ripnel.com', 'TD-CENT', true),
    ('nelson@ripnel.com', 'ALM-CENT', false),
    ('nelson@ripnel.com', 'TD-MONT', false),
    ('ventas.centro@ripnel.com', 'TD-CENT', true),
    ('almacen.central@ripnel.com', 'ALM-CENT', true),
    ('tienda.centro@ripnel.com', 'TD-CENT', true),
    ('caja.centro@ripnel.com', 'TD-CENT', true)
)
insert into user_locations (
  user_id,
  location_id,
  is_default
)
select
  users.user_id,
  locations.location_id,
  seeded_assignments.is_default
from seeded_assignments
inner join users on users.email = seeded_assignments.email
inner join locations on locations.code = seeded_assignments.location_code
on conflict (user_id, location_id) do update
set
  is_default = excluded.is_default;

-- ============================================================
-- 3) CUSTOMERS
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
    ('CLI-001', 'none', null, 'Consumidor Final', null, null, null, null, 'Lima', 'Venta mostrador', null, 'Cliente generico para venta rapida.', 'retail', true),
    ('CLI-002', 'dni', '74851236', 'Lucia Perez Soto', null, null, 'lucia.perez@example.com', '987654321', 'Lima', 'Av. Arequipa 1250', 'ventas.centro@ripnel.com', 'Cliente retail frecuente.', 'retail', true),
    ('CLI-003', 'dni', '70213498', 'Marco Valdez Rios', null, null, 'marco.valdez@example.com', '987654322', 'Surquillo', 'Calle Los Laureles 220', 'ventas.centro@ripnel.com', 'Cliente retail para pruebas de seguimiento.', 'retail', true),
    ('CLI-004', 'ruc', '20612345678', null, 'Boutique Centro SAC', 'Boutique Centro', 'compras@boutiquecentro.pe', '987654323', 'Cercado de Lima', 'Jr. Ucayali 410', 'ventas.centro@ripnel.com', 'Cliente mayorista de tienda.', 'wholesale', true),
    ('CLI-005', 'ruc', '20598765432', null, 'Distribuidora Textil Norte SAC', 'Textil Norte', 'pedidos@textilnorte.pe', '987654324', 'Trujillo', 'Av. America Norte 850', 'ventas.centro@ripnel.com', 'Cliente mayorista recurrente.', 'wholesale', true),
    ('CLI-006', 'ce', 'CE123456', 'Ana Morales Diaz', null, null, 'ana.morales@example.com', '987654325', 'Miraflores', 'Calle Tarata 155', 'ventas.centro@ripnel.com', 'Cliente retail extranjero.', 'retail', true)
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
left join users on users.email = seeded_customers.seller_email
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

-- ============================================================
-- 4) INVENTORY BASE
-- ============================================================

with seeded_inventory(location_code, sku, qty) as (
  values
    ('ALM-CENT', 'CAF-RIP-ST-UNICO', 40),
    ('TD-CENT',  'CAF-RIP-ST-UNICO', 12),
    ('TD-MONT',  'CAF-RIP-ST-UNICO', 8),
    ('ALM-CENT', 'CAF-RIP-L-UNICO', 28),
    ('TD-CENT',  'CAF-RIP-L-UNICO', 6),
    ('TD-MONT',  'CAF-RIP-L-UNICO', 4)
)
insert into inventory (
  location_id,
  variant_id,
  qty
)
select
  locations.location_id,
  product_variants.variant_id,
  seeded_inventory.qty
from seeded_inventory
inner join locations on locations.code = seeded_inventory.location_code
inner join product_variants on product_variants.sku = seeded_inventory.sku
on conflict (location_id, variant_id) do update
set
  qty = excluded.qty;

-- ============================================================
-- 5) SEEDED STOCK MOVEMENTS
-- ============================================================

delete from stock_movements
where reason like 'SEED:%';

with seeded_movements(location_code, sku, quantity, created_by_email, reason) as (
  values
    ('ALM-CENT', 'CAF-RIP-ST-UNICO', 40, 'almacen.central@ripnel.com', 'SEED: carga inicial CAF-RIP-ST-UNICO / ALM-CENT'),
    ('TD-CENT',  'CAF-RIP-ST-UNICO', 12, 'tienda.centro@ripnel.com',  'SEED: carga inicial CAF-RIP-ST-UNICO / TD-CENT'),
    ('TD-MONT',  'CAF-RIP-ST-UNICO', 8,  'tienda.centro@ripnel.com',  'SEED: carga inicial CAF-RIP-ST-UNICO / TD-MONT'),
    ('ALM-CENT', 'CAF-RIP-L-UNICO', 28,  'almacen.central@ripnel.com', 'SEED: carga inicial CAF-RIP-L-UNICO / ALM-CENT'),
    ('TD-CENT',  'CAF-RIP-L-UNICO', 6,   'tienda.centro@ripnel.com',  'SEED: carga inicial CAF-RIP-L-UNICO / TD-CENT'),
    ('TD-MONT',  'CAF-RIP-L-UNICO', 4,   'tienda.centro@ripnel.com',  'SEED: carga inicial CAF-RIP-L-UNICO / TD-MONT')
)
insert into stock_movements (
  location_id,
  variant_id,
  movement_type,
  quantity,
  reason,
  created_by
)
select
  locations.location_id,
  product_variants.variant_id,
  'IN',
  seeded_movements.quantity,
  seeded_movements.reason,
  users.user_id
from seeded_movements
inner join locations on locations.code = seeded_movements.location_code
inner join product_variants on product_variants.sku = seeded_movements.sku
left join users on users.email = seeded_movements.created_by_email;

commit;
