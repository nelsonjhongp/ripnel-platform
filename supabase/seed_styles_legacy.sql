-- RIPNEL MVP legacy styles seed
-- Run this file only after supabase/seed.sql.
-- This seed creates a small set of styles based on the legacy spreadsheet.
-- It does not create prices or variants yet.

begin;

-- ============================================================
-- 1) BASE STYLES FROM LEGACY SHEET
-- ============================================================

insert into product_styles (
  garment_type_id,
  fabric_id,
  fabric_detail_id,
  target_id,
  style_code,
  name,
  description,
  active
)
select
  gt.garment_type_id,
  f.fabric_id,
  null,
  null,
  seeded.style_code,
  seeded.name,
  seeded.description,
  true
from (
  values
    ('JOG-FTER', 'JOG', 'FTER', 'Jogger - French Terry', 'Style legado cargado desde hoja antigua.'),
    ('LEG-SUP', 'LEG', 'SUP', 'Legging - Suplex', 'Style legado cargado desde hoja antigua.'),
    ('POL-FLIC', 'POL', 'FLIC', 'Polo Manga Corta - Full Licra', 'Style legado cargado desde hoja antigua.'),
    ('SHO-CHA', 'SHO', 'CHA', 'Short - Chaliz', 'Style legado cargado desde hoja antigua.'),
    ('CAF-RIP', 'CAF', 'RIP', 'Cafarena - Rip', 'Style legado cargado desde hoja antigua.')
) as seeded(style_code, garment_type_code, fabric_code, name, description)
inner join garment_types gt on gt.code = seeded.garment_type_code
inner join fabrics f on f.code = seeded.fabric_code
on conflict (style_code) do update
set
  garment_type_id = excluded.garment_type_id,
  fabric_id = excluded.fabric_id,
  fabric_detail_id = excluded.fabric_detail_id,
  target_id = excluded.target_id,
  name = excluded.name,
  description = excluded.description,
  active = excluded.active,
  updated_at = current_timestamp;

-- ============================================================
-- 2) STYLE SIZES
-- ============================================================

insert into style_sizes (style_id, size_id)
select ps.style_id, s.size_id
from (
  values
    ('JOG-FTER', 'S'),
    ('JOG-FTER', 'M'),
    ('JOG-FTER', 'L'),
    ('JOG-FTER', 'XL'),
    ('LEG-SUP', 'S'),
    ('LEG-SUP', 'M'),
    ('LEG-SUP', 'L'),
    ('LEG-SUP', 'XL'),
    ('POL-FLIC', 'ST'),
    ('POL-FLIC', 'L'),
    ('POL-FLIC', 'XL'),
    ('SHO-CHA', 'ST'),
    ('CAF-RIP', 'ST'),
    ('CAF-RIP', 'L')
) as seeded(style_code, size_code)
inner join product_styles ps on ps.style_code = seeded.style_code
inner join sizes s on s.code = seeded.size_code
on conflict (style_id, size_id) do nothing;

-- ============================================================
-- 3) DEFAULT STYLE COLOR
-- ============================================================

insert into style_colors (style_id, color_id)
select ps.style_id, c.color_id
from product_styles ps
inner join colors c on c.code = 'UNICO'
where ps.style_code in ('JOG-FTER', 'LEG-SUP', 'POL-FLIC', 'SHO-CHA', 'CAF-RIP')
on conflict (style_id, color_id) do nothing;

commit;
