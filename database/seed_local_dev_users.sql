-- ============================================================
-- RIPNEL — LOCAL DEV-ONLY seed: usuarios minimos con roles vigentes
--
-- ADVERTENCIA: este archivo es EXCLUSIVAMENTE para entornos locales
-- de desarrollo, pruebas, agentes y demo controlada (ver serie de
-- reportes INFRA-03 en docs/working/reports/). NO representa datos
-- reales de Ripnel: no es inventario real, no es caja real, no son
-- ventas reales, y estos usuarios NO son usuarios reales de
-- produccion. No aplicar contra Supabase remoto ni contra ninguna
-- base de staging o produccion.
--
-- Contexto (ver docs/working/reports/INFRA-03-C3-local-dev-users.md):
-- supabase/migrations/202607020001_role_redesign_vendedora.sql
-- desactivo los roles legacy TIENDA, CAJA y VENTAS y elimino todo su
-- role_permissions sin reemplazo. database/seed_operational_mvp.sql
-- y database/seed_test_users.sql todavia crean usuarios con esos
-- roles legacy (caja, tienda, ventas). Esos usuarios pueden iniciar
-- sesion igual (el login no filtra por roles.active), pero quedan
-- con permissions: [] porque ya no existe ningun role_permissions
-- para esos roles — quedan autenticados pero sin poder operar nada.
-- Este seed evita ese problema usando exclusivamente los roles
-- vigentes.
--
-- Dependencias (aplicar en este orden):
-- 1) todas las migraciones de supabase/migrations/ (incluye el
--    redesign de roles 202607020001)
-- 2) database/seed_access_control.sql (crea ADMIN, VENDEDOR/A,
--    ALMACEN y sus permisos)
-- 3) database/seed_operational_mvp.sql — SOLO hace falta su seccion
--    "1) OPERATIONAL LOCATIONS" (crea ALM-CENT, TD-CENT). Este
--    archivo NO depende de la seccion "2) OPERATIONAL USERS" de ese
--    seed — esa es justamente la seccion con el problema de roles
--    legacy que este archivo evita.
-- 4) este archivo
--
-- Contrasenas: dev-only, deliberadamente obvias y NO reales,
-- documentadas aqui mismo en texto plano porque no protegen nada
-- real. NUNCA reutilizar estos valores fuera de un entorno local
-- descartable, y nunca usarlos como base para una contrasena real.
--   admin    / LocalDevAdmin123
--   almacen  / LocalDevAlmacen123
--   vendedor / LocalDevVendedor123
--
-- Idempotente: seguro de re-ejecutar (upsert por username).
-- ============================================================

begin;

-- ============================================================
-- 1) USUARIOS LOCALES CON ROLES VIGENTES (ADMIN, ALMACEN, VENDEDOR/A)
-- ============================================================

with seeded_users(username, full_name, email, role_name, password_plain) as (
  values
    ('admin',    'Admin Local Dev',    'admin.localdev@ripnel.invalid',    'ADMIN',      'LocalDevAdmin123'),
    ('almacen',  'Almacen Local Dev',  'almacen.localdev@ripnel.invalid',  'ALMACEN',    'LocalDevAlmacen123'),
    ('vendedor', 'Vendedor Local Dev', 'vendedor.localdev@ripnel.invalid', 'VENDEDOR/A', 'LocalDevVendedor123')
)
insert into users (
  full_name,
  username,
  email,
  password_hash,
  role_id,
  active,
  must_change_password
)
select
  seeded_users.full_name,
  seeded_users.username,
  seeded_users.email,
  crypt(seeded_users.password_plain, gen_salt('bf', 10)),
  roles.role_id,
  true,
  false
from seeded_users
inner join roles on roles.name = seeded_users.role_name
on conflict (username) do update
set
  full_name = excluded.full_name,
  email = excluded.email,
  password_hash = excluded.password_hash,
  role_id = excluded.role_id,
  active = excluded.active,
  must_change_password = excluded.must_change_password,
  updated_at = current_timestamp;

-- ============================================================
-- 2) SEDE POR DEFECTO
--    Requiere que existan las sedes ALM-CENT y TD-CENT, creadas por
--    la seccion "1) OPERATIONAL LOCATIONS" de
--    database/seed_operational_mvp.sql. No requiere su seccion de
--    usuarios.
-- ============================================================

with target_defaults(username, location_code) as (
  values
    ('almacen',  'ALM-CENT'),
    ('vendedor', 'TD-CENT')
)
update user_locations ul
set is_default = false
from users u
inner join target_defaults td on td.username = u.username
where ul.user_id = u.user_id
  and ul.is_default = true;

with target_defaults(username, location_code) as (
  values
    ('almacen',  'ALM-CENT'),
    ('vendedor', 'TD-CENT')
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
set is_default = excluded.is_default;

commit;

-- ============================================================
-- Nota sobre el username "ventas" (evaluado, NO implementado)
-- ============================================================
-- Se evaluo tambien crear/reasignar un usuario "ventas" al rol
-- vigente VENDEDOR/A, por compatibilidad con la precondicion
-- documentada en docs/seed-operational-30-days.md ("deben existir
-- usuarios operativos activos almacen y ventas"). No se implemento
-- en este archivo porque:
--   - ese seed opcional (database/seed_operational_30_days.sql) no
--     forma parte del conjunto minimo/seguro propuesto para
--     INFRA-03-D;
--   - agregar un usuario adicional identico en permisos a
--     "vendedor" duplicaria cuentas sin necesidad concreta todavia;
--   - si en el futuro se decide aplicar ese seed opcional en local,
--     conviene revisar en ese momento si conviene agregar "ventas"
--     explicitamente (mismo patron de este archivo) en vez de
--     decidirlo de antemano sin una necesidad real.
