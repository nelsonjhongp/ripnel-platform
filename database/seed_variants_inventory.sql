-- RIPNEL variants + inventory seed
-- Purpose: complete usable variants and opening stock for priced styles.
-- Safe to re-run.

begin;

-- ============================================================
-- 1) MISSING VARIANTS FOR PRICED STYLES
-- ============================================================

with seeded_variants(style_code, size_code, color_code, sku, barcode) as (
  values
    ('JOG-FTER', 'S',  'UNICO', 'JOG-FTER-S-UNICO',  'PV-JOG-FTER-S-UNICO'),
    ('JOG-FTER', 'M',  'UNICO', 'JOG-FTER-M-UNICO',  'PV-JOG-FTER-M-UNICO'),
    ('JOG-FTER', 'L',  'UNICO', 'JOG-FTER-L-UNICO',  'PV-JOG-FTER-L-UNICO'),
    ('JOG-FTER', 'XL', 'UNICO', 'JOG-FTER-XL-UNICO', 'PV-JOG-FTER-XL-UNICO'),
    ('LEG-SUP',  'S',  'UNICO', 'LEG-SUP-S-UNICO',   'PV-LEG-SUP-S-UNICO'),
    ('LEG-SUP',  'M',  'UNICO', 'LEG-SUP-M-UNICO',   'PV-LEG-SUP-M-UNICO'),
    ('LEG-SUP',  'L',  'UNICO', 'LEG-SUP-L-UNICO',   'PV-LEG-SUP-L-UNICO'),
    ('LEG-SUP',  'XL', 'UNICO', 'LEG-SUP-XL-UNICO',  'PV-LEG-SUP-XL-UNICO'),
    ('POL-FLIC', 'ST', 'UNICO', 'POL-FLIC-ST-UNICO', 'PV-POL-FLIC-ST-UNICO'),
    ('POL-FLIC', 'L',  'UNICO', 'POL-FLIC-L-UNICO',  'PV-POL-FLIC-L-UNICO'),
    ('POL-FLIC', 'XL', 'UNICO', 'POL-FLIC-XL-UNICO', 'PV-POL-FLIC-XL-UNICO'),
    ('SHO-CHA',  'ST', 'UNICO', 'SHO-CHA-ST-UNICO',  'PV-SHO-CHA-ST-UNICO')
)
insert into product_variants (
  style_id,
  size_id,
  color_id,
  sku,
  barcode,
  active
)
select
  ps.style_id,
  s.size_id,
  c.color_id,
  seeded_variants.sku,
  seeded_variants.barcode,
  true
from seeded_variants
inner join product_styles ps on ps.style_code = seeded_variants.style_code
inner join sizes s on s.code = seeded_variants.size_code
inner join colors c on c.code = seeded_variants.color_code
on conflict (style_id, size_id, color_id) do update
set
  sku = excluded.sku,
  barcode = excluded.barcode,
  active = excluded.active,
  updated_at = current_timestamp;

-- ============================================================
-- 2) OPENING STOCK BY LOCATION
-- ============================================================

with seeded_inventory(location_code, sku, qty) as (
  values
    ('ALM-CENT', 'JOG-FTER-S-UNICO', 18),
    ('ALM-CENT', 'JOG-FTER-M-UNICO', 20),
    ('ALM-CENT', 'JOG-FTER-L-UNICO', 18),
    ('ALM-CENT', 'JOG-FTER-XL-UNICO', 12),
    ('TD-CENT',  'JOG-FTER-S-UNICO', 6),
    ('TD-CENT',  'JOG-FTER-M-UNICO', 7),
    ('TD-CENT',  'JOG-FTER-L-UNICO', 6),
    ('TD-CENT',  'JOG-FTER-XL-UNICO', 4),
    ('TD-MONT',  'JOG-FTER-S-UNICO', 4),
    ('TD-MONT',  'JOG-FTER-M-UNICO', 5),
    ('TD-MONT',  'JOG-FTER-L-UNICO', 4),
    ('TD-MONT',  'JOG-FTER-XL-UNICO', 3),

    ('ALM-CENT', 'LEG-SUP-S-UNICO', 22),
    ('ALM-CENT', 'LEG-SUP-M-UNICO', 24),
    ('ALM-CENT', 'LEG-SUP-L-UNICO', 22),
    ('ALM-CENT', 'LEG-SUP-XL-UNICO', 16),
    ('TD-CENT',  'LEG-SUP-S-UNICO', 8),
    ('TD-CENT',  'LEG-SUP-M-UNICO', 8),
    ('TD-CENT',  'LEG-SUP-L-UNICO', 6),
    ('TD-CENT',  'LEG-SUP-XL-UNICO', 5),
    ('TD-MONT',  'LEG-SUP-S-UNICO', 6),
    ('TD-MONT',  'LEG-SUP-M-UNICO', 6),
    ('TD-MONT',  'LEG-SUP-L-UNICO', 5),
    ('TD-MONT',  'LEG-SUP-XL-UNICO', 4),

    ('ALM-CENT', 'POL-FLIC-ST-UNICO', 14),
    ('ALM-CENT', 'POL-FLIC-L-UNICO', 10),
    ('ALM-CENT', 'POL-FLIC-XL-UNICO', 8),
    ('TD-CENT',  'POL-FLIC-ST-UNICO', 5),
    ('TD-CENT',  'POL-FLIC-L-UNICO', 4),
    ('TD-CENT',  'POL-FLIC-XL-UNICO', 3),
    ('TD-MONT',  'POL-FLIC-ST-UNICO', 3),
    ('TD-MONT',  'POL-FLIC-L-UNICO', 2),
    ('TD-MONT',  'POL-FLIC-XL-UNICO', 2),

    ('ALM-CENT', 'SHO-CHA-ST-UNICO', 12),
    ('TD-CENT',  'SHO-CHA-ST-UNICO', 4),
    ('TD-MONT',  'SHO-CHA-ST-UNICO', 3)
)
insert into inventory (
  location_id,
  variant_id,
  qty
)
select
  l.location_id,
  pv.variant_id,
  seeded_inventory.qty
from seeded_inventory
inner join locations l on l.code = seeded_inventory.location_code
inner join product_variants pv on pv.sku = seeded_inventory.sku
on conflict (location_id, variant_id) do update
set
  qty = excluded.qty;

-- ============================================================
-- 3) SEEDED OPENING MOVEMENTS
-- ============================================================

delete from stock_movements
where reason like 'SEED-INV:%';

with seeded_movements(location_code, sku, quantity, created_by_email, reason) as (
  values
    ('ALM-CENT', 'JOG-FTER-S-UNICO', 18, 'almacen.central@ripnel.com', 'SEED-INV: apertura JOG-FTER-S-UNICO / ALM-CENT'),
    ('ALM-CENT', 'JOG-FTER-M-UNICO', 20, 'almacen.central@ripnel.com', 'SEED-INV: apertura JOG-FTER-M-UNICO / ALM-CENT'),
    ('ALM-CENT', 'JOG-FTER-L-UNICO', 18, 'almacen.central@ripnel.com', 'SEED-INV: apertura JOG-FTER-L-UNICO / ALM-CENT'),
    ('ALM-CENT', 'JOG-FTER-XL-UNICO', 12, 'almacen.central@ripnel.com', 'SEED-INV: apertura JOG-FTER-XL-UNICO / ALM-CENT'),
    ('TD-CENT',  'JOG-FTER-S-UNICO', 6,  'tienda.centro@ripnel.com',  'SEED-INV: apertura JOG-FTER-S-UNICO / TD-CENT'),
    ('TD-CENT',  'JOG-FTER-M-UNICO', 7,  'tienda.centro@ripnel.com',  'SEED-INV: apertura JOG-FTER-M-UNICO / TD-CENT'),
    ('TD-CENT',  'JOG-FTER-L-UNICO', 6,  'tienda.centro@ripnel.com',  'SEED-INV: apertura JOG-FTER-L-UNICO / TD-CENT'),
    ('TD-CENT',  'JOG-FTER-XL-UNICO', 4, 'tienda.centro@ripnel.com',  'SEED-INV: apertura JOG-FTER-XL-UNICO / TD-CENT'),
    ('TD-MONT',  'JOG-FTER-S-UNICO', 4,  'tienda.centro@ripnel.com',  'SEED-INV: apertura JOG-FTER-S-UNICO / TD-MONT'),
    ('TD-MONT',  'JOG-FTER-M-UNICO', 5,  'tienda.centro@ripnel.com',  'SEED-INV: apertura JOG-FTER-M-UNICO / TD-MONT'),
    ('TD-MONT',  'JOG-FTER-L-UNICO', 4,  'tienda.centro@ripnel.com',  'SEED-INV: apertura JOG-FTER-L-UNICO / TD-MONT'),
    ('TD-MONT',  'JOG-FTER-XL-UNICO', 3, 'tienda.centro@ripnel.com',  'SEED-INV: apertura JOG-FTER-XL-UNICO / TD-MONT'),

    ('ALM-CENT', 'LEG-SUP-S-UNICO', 22, 'almacen.central@ripnel.com', 'SEED-INV: apertura LEG-SUP-S-UNICO / ALM-CENT'),
    ('ALM-CENT', 'LEG-SUP-M-UNICO', 24, 'almacen.central@ripnel.com', 'SEED-INV: apertura LEG-SUP-M-UNICO / ALM-CENT'),
    ('ALM-CENT', 'LEG-SUP-L-UNICO', 22, 'almacen.central@ripnel.com', 'SEED-INV: apertura LEG-SUP-L-UNICO / ALM-CENT'),
    ('ALM-CENT', 'LEG-SUP-XL-UNICO', 16, 'almacen.central@ripnel.com', 'SEED-INV: apertura LEG-SUP-XL-UNICO / ALM-CENT'),
    ('TD-CENT',  'LEG-SUP-S-UNICO', 8,  'tienda.centro@ripnel.com',  'SEED-INV: apertura LEG-SUP-S-UNICO / TD-CENT'),
    ('TD-CENT',  'LEG-SUP-M-UNICO', 8,  'tienda.centro@ripnel.com',  'SEED-INV: apertura LEG-SUP-M-UNICO / TD-CENT'),
    ('TD-CENT',  'LEG-SUP-L-UNICO', 6,  'tienda.centro@ripnel.com',  'SEED-INV: apertura LEG-SUP-L-UNICO / TD-CENT'),
    ('TD-CENT',  'LEG-SUP-XL-UNICO', 5, 'tienda.centro@ripnel.com',  'SEED-INV: apertura LEG-SUP-XL-UNICO / TD-CENT'),
    ('TD-MONT',  'LEG-SUP-S-UNICO', 6,  'tienda.centro@ripnel.com',  'SEED-INV: apertura LEG-SUP-S-UNICO / TD-MONT'),
    ('TD-MONT',  'LEG-SUP-M-UNICO', 6,  'tienda.centro@ripnel.com',  'SEED-INV: apertura LEG-SUP-M-UNICO / TD-MONT'),
    ('TD-MONT',  'LEG-SUP-L-UNICO', 5,  'tienda.centro@ripnel.com',  'SEED-INV: apertura LEG-SUP-L-UNICO / TD-MONT'),
    ('TD-MONT',  'LEG-SUP-XL-UNICO', 4, 'tienda.centro@ripnel.com',  'SEED-INV: apertura LEG-SUP-XL-UNICO / TD-MONT'),

    ('ALM-CENT', 'POL-FLIC-ST-UNICO', 14, 'almacen.central@ripnel.com', 'SEED-INV: apertura POL-FLIC-ST-UNICO / ALM-CENT'),
    ('ALM-CENT', 'POL-FLIC-L-UNICO', 10,  'almacen.central@ripnel.com', 'SEED-INV: apertura POL-FLIC-L-UNICO / ALM-CENT'),
    ('ALM-CENT', 'POL-FLIC-XL-UNICO', 8,  'almacen.central@ripnel.com', 'SEED-INV: apertura POL-FLIC-XL-UNICO / ALM-CENT'),
    ('TD-CENT',  'POL-FLIC-ST-UNICO', 5,  'tienda.centro@ripnel.com',  'SEED-INV: apertura POL-FLIC-ST-UNICO / TD-CENT'),
    ('TD-CENT',  'POL-FLIC-L-UNICO', 4,   'tienda.centro@ripnel.com',  'SEED-INV: apertura POL-FLIC-L-UNICO / TD-CENT'),
    ('TD-CENT',  'POL-FLIC-XL-UNICO', 3,  'tienda.centro@ripnel.com',  'SEED-INV: apertura POL-FLIC-XL-UNICO / TD-CENT'),
    ('TD-MONT',  'POL-FLIC-ST-UNICO', 3,  'tienda.centro@ripnel.com',  'SEED-INV: apertura POL-FLIC-ST-UNICO / TD-MONT'),
    ('TD-MONT',  'POL-FLIC-L-UNICO', 2,   'tienda.centro@ripnel.com',  'SEED-INV: apertura POL-FLIC-L-UNICO / TD-MONT'),
    ('TD-MONT',  'POL-FLIC-XL-UNICO', 2,  'tienda.centro@ripnel.com',  'SEED-INV: apertura POL-FLIC-XL-UNICO / TD-MONT'),

    ('ALM-CENT', 'SHO-CHA-ST-UNICO', 12, 'almacen.central@ripnel.com', 'SEED-INV: apertura SHO-CHA-ST-UNICO / ALM-CENT'),
    ('TD-CENT',  'SHO-CHA-ST-UNICO', 4,  'tienda.centro@ripnel.com',  'SEED-INV: apertura SHO-CHA-ST-UNICO / TD-CENT'),
    ('TD-MONT',  'SHO-CHA-ST-UNICO', 3,  'tienda.centro@ripnel.com',  'SEED-INV: apertura SHO-CHA-ST-UNICO / TD-MONT')
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
  l.location_id,
  pv.variant_id,
  'IN',
  seeded_movements.quantity,
  seeded_movements.reason,
  u.user_id
from seeded_movements
inner join locations l on l.code = seeded_movements.location_code
inner join product_variants pv on pv.sku = seeded_movements.sku
left join users u on u.email = seeded_movements.created_by_email;

commit;
