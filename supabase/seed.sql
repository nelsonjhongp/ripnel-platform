-- RIPNEL MVP base seed
-- Idempotent seed focused on master catalogs and base roles.
-- This file is safe to run multiple times on an empty or partially seeded database.
-- The values below are aligned to the legacy product spreadsheet shared by the team.
-- Styles and prices from that sheet should be loaded after catalog and style CRUD are validated.

begin;

-- ============================================================
-- 1) BASE ROLES
-- ============================================================

insert into roles (name, description, active)
values
  ('ADMIN', 'Acceso general al sistema y configuracion base.', true),
  ('VENTAS', 'Operacion comercial y venta rapida.', true),
  ('ALMACEN', 'Operacion de stock y movimientos internos.', true)
on conflict (name) do update
set
  description = excluded.description,
  active = excluded.active,
  updated_at = current_timestamp;

-- ============================================================
-- 2) MASTER CATALOGS - PRIORITY 1
-- ============================================================

insert into sizes (code, name, sort_order, description, active)
values
  ('ST', 'Estandar', 10, 'Talla estandar usada en la hoja legacy.', true),
  ('S', 'Small', 20, 'Talla base S', true),
  ('M', 'Medium', 30, 'Talla base M', true),
  ('L', 'Large', 40, 'Talla base L', true),
  ('XL', 'Extra Large', 50, 'Talla base XL', true),
  ('XXL', 'Double Extra Large', 60, 'Talla base XXL', true)
on conflict (code) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  description = excluded.description,
  active = excluded.active,
  updated_at = current_timestamp;

insert into colors (code, name, hex, active)
values
  ('UNICO', 'Unico', '#94A3B8', true),
  ('NEG', 'Negro', '#000000', true),
  ('BLA', 'Blanco', '#FFFFFF', true),
  ('AZU', 'Azul', '#1D4ED8', true),
  ('ROJ', 'Rojo', '#DC2626', true),
  ('BEI', 'Beige', '#D6C3A1', true)
on conflict (code) do update
set
  name = excluded.name,
  hex = excluded.hex,
  active = excluded.active,
  updated_at = current_timestamp;

insert into garment_types (code, name, active)
values
  ('BIK', 'Biker', true),
  ('CAF', 'Cafarena', true),
  ('FAL', 'Falda', true),
  ('JOG', 'Jogger', true),
  ('LEG', 'Legging', true),
  ('PAL', 'Palazo', true),
  ('PAN', 'Pantalon', true),
  ('POL', 'Polo', true),
  ('SHO', 'Short', true),
  ('TOP', 'Top', true),
  ('BIB', 'Bibidis', true),
  ('SNI', 'Snicker', true)
on conflict (code) do update
set
  name = excluded.name,
  active = excluded.active,
  updated_at = current_timestamp;

-- ============================================================
-- 3) MASTER CATALOGS - PRIORITY 2
-- ============================================================

insert into fabrics (code, name, active)
values
  ('OLI', 'Olimpico', true),
  ('FLIC', 'Full Licra', true),
  ('SUP', 'Suplex', true),
  ('RIP', 'Rip', true),
  ('CAM', 'Campana', true),
  ('FTER', 'French Terry', true),
  ('FTEP', 'French Terry Perchado', true),
  ('OVFT', 'Oversize French Terry', true),
  ('OVPE', 'Oversize Perchado', true),
  ('PREA', 'Pretina Ancha', true),
  ('RAY', 'Rayas', true),
  ('FRA', 'Franela', true),
  ('FTRI', 'French Terry Rigido', true),
  ('RFRA', 'Recto Franela', true),
  ('CHA', 'Chaliz', true),
  ('RFTE', 'Recto French Terry', true),
  ('CFLI', 'Clasica Full Licra', true),
  ('LIN', 'Lino', true),
  ('CSBO', 'Chaliz s/ Bolsillo', true)
on conflict (code) do update
set
  name = excluded.name,
  active = excluded.active,
  updated_at = current_timestamp;

insert into fabric_details (code, name, active)
values
  ('CLAS', 'Clasica', true),
  ('OVSZ', 'Oversize', true),
  ('PER', 'Perchado', true),
  ('RIG', 'Rigido', true),
  ('RECT', 'Recto', true),
  ('PREA', 'Pretina Ancha', true),
  ('SBLS', 'Sin Bolsillo', true),
  ('MCER', 'Manga Cero', true)
on conflict (code) do update
set
  name = excluded.name,
  active = excluded.active,
  updated_at = current_timestamp;

insert into targets (name, active)
values
  ('Hombre', true),
  ('Mujer', true),
  ('Unisex', true)
on conflict (name) do update
set
  active = excluded.active,
  updated_at = current_timestamp;

commit;
