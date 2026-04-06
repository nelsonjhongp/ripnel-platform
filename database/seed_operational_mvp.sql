-- RIPNEL operational MVP seed
-- Purpose: normalize a minimum operational base for sales MVP using
-- usernames as the stable internal identifier.
-- Safe to re-run.

begin;

-- ============================================================
-- 1) OPERATIONAL LOCATIONS
-- ============================================================

with seeded_locations(name, code, type, address) as (
  values
    ('Almacen Central', 'ALM-CENT', 'warehouse', 'Almacen central de operaciones'),
    ('Tienda Centro', 'TD-CENT', 'store', 'Tienda principal para operacion comercial'),
    ('Montevideo', 'TD-MONT', 'store', 'Tienda secundaria para demo operativa'),
    ('Taller Central', 'TLL-CENT', 'workshop', 'Taller central de produccion')
)
insert into locations (
  name,
  code,
  type,
  address,
  active
)
select
  seeded_locations.name,
  seeded_locations.code,
  seeded_locations.type,
  seeded_locations.address,
  true
from seeded_locations
on conflict (code) do update
set
  name = excluded.name,
  type = excluded.type,
  address = excluded.address,
  active = excluded.active,
  updated_at = current_timestamp;

-- ============================================================
-- 2) OPERATIONAL USERS
-- ============================================================

with seeded_users(username, full_name, email, role_name, password_plain) as (
  values
    ('admin', 'Admin Sistema', null::varchar, 'ADMIN', 'admin123'),
    ('almacen', 'Almacen Central', 'almacen@ripnel.com', 'ALMACEN', 'almacen123'),
    ('caja', 'Operador Caja', 'caja@ripnel.com', 'CAJA', 'caja123'),
    ('tienda', 'Gerente Tienda', 'tienda@ripnel.com', 'TIENDA', 'tienda123'),
    ('ventas', 'Ejecutivo Ventas', 'ventas@ripnel.com', 'VENTAS', 'ventas123')
)
insert into users (
  full_name,
  username,
  email,
  password_hash,
  role_id,
  active
)
select
  seeded_users.full_name,
  seeded_users.username,
  seeded_users.email,
  crypt(seeded_users.password_plain, gen_salt('bf')),
  roles.role_id,
  true
from seeded_users
inner join roles on roles.name = seeded_users.role_name
on conflict (username) do update
set
  full_name = excluded.full_name,
  email = coalesce(excluded.email, users.email),
  role_id = excluded.role_id,
  active = excluded.active,
  updated_at = current_timestamp;

-- ============================================================
-- 3) USER DEFAULT LOCATIONS
-- ============================================================

with target_defaults(username, location_code) as (
  values
    ('ventas', 'TD-CENT'),
    ('caja', 'TD-CENT'),
    ('tienda', 'TD-CENT'),
    ('almacen', 'ALM-CENT')
)
update user_locations ul
set is_default = false
from users u
inner join target_defaults td on td.username = u.username
where ul.user_id = u.user_id
  and ul.is_default = true;

with target_defaults(username, location_code) as (
  values
    ('ventas', 'TD-CENT'),
    ('caja', 'TD-CENT'),
    ('tienda', 'TD-CENT'),
    ('almacen', 'ALM-CENT')
)
insert into user_locations (
  user_id,
  location_id,
  is_default
)
select
  u.user_id,
  l.location_id,
  true
from target_defaults td
inner join users u on u.username = td.username
inner join locations l on l.code = td.location_code
on conflict (user_id, location_id) do update
set
  is_default = excluded.is_default;

commit;

-- ============================================================
-- 4) READINESS CHECKS
-- ============================================================

select
  u.username,
  u.full_name,
  u.email,
  r.name as role_name,
  u.active
from users u
left join roles r on r.role_id = u.role_id
where u.username in ('admin', 'almacen', 'caja', 'tienda', 'ventas')
order by u.username;

select
  u.username,
  l.code as default_location_code,
  l.name as default_location_name
from users u
inner join user_locations ul
  on ul.user_id = u.user_id
 and ul.is_default = true
inner join locations l
  on l.location_id = ul.location_id
where u.username in ('almacen', 'caja', 'tienda', 'ventas')
order by u.username;

