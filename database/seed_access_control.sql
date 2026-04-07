-- RIPNEL access control seed
-- Purpose: leave a minimum, coherent RBAC base for login and route access.
-- Safe to re-run.

begin;

insert into roles (name, description, active)
values
  ('ADMIN', 'Acceso general al sistema y configuracion base.', true),
  ('TIENDA', 'Operacion de ventas y consultas.', true),
  ('CAJA', 'Cobros y registro de ventas.', true),
  ('VENTAS', 'Operacion comercial y venta rapida.', true),
  ('ALMACEN', 'Operacion de stock y movimientos internos.', true)
on conflict (name) do update
set
  description = excluded.description,
  active = excluded.active,
  updated_at = current_timestamp;

with seeded_permissions(permission_key, description) as (
  values
    ('admin.manage', 'Administracion de roles, usuarios y ubicaciones.'),
    ('catalogs.manage', 'Gestionar catalogos maestros.'),
    ('products.manage', 'Gestionar estilos y variantes.'),
    ('prices.manage', 'Gestionar precios y reglas comerciales.'),
    ('customers.manage', 'Gestionar clientes.'),
    ('inventory.view', 'Consultar inventario y kardex.'),
    ('inventory.adjust', 'Registrar ajustes de inventario.'),
    ('transfers.manage', 'Gestionar transferencias internas.'),
    ('sales.pos', 'Operar venta rapida y checkout.')
)
insert into permissions (
  key,
  description
)
select
  seeded_permissions.permission_key,
  seeded_permissions.description
from seeded_permissions
on conflict (key) do update
set
  description = excluded.description;

with base_roles(role_name) as (
  values
    ('ADMIN'),
    ('TIENDA'),
    ('CAJA'),
    ('VENTAS'),
    ('ALMACEN')
),
permission_keys(permission_key) as (
  values
    ('admin.manage'),
    ('catalogs.manage'),
    ('products.manage'),
    ('prices.manage'),
    ('customers.manage'),
    ('inventory.view'),
    ('inventory.adjust'),
    ('transfers.manage'),
    ('sales.pos'),
    ('dashboard.view'),
    ('users.manage'),
    ('roles.manage'),
    ('locations.manage'),
    ('styles.manage'),
    ('variants.manage'),
    ('sales.use')
)
delete from role_permissions rp
using roles r, permissions p, base_roles br, permission_keys pk
where rp.role_id = r.role_id
  and rp.permission_id = p.permission_id
  and r.name = br.role_name
  and p.key = pk.permission_key;

with seeded_role_permissions(role_name, permission_key) as (
  values
    ('ADMIN', 'admin.manage'),
    ('ADMIN', 'catalogs.manage'),
    ('ADMIN', 'products.manage'),
    ('ADMIN', 'prices.manage'),
    ('ADMIN', 'customers.manage'),
    ('ADMIN', 'inventory.view'),
    ('ADMIN', 'inventory.adjust'),
    ('ADMIN', 'transfers.manage'),
    ('ADMIN', 'sales.pos'),

    ('ALMACEN', 'inventory.view'),
    ('ALMACEN', 'inventory.adjust'),
    ('ALMACEN', 'transfers.manage'),

    ('TIENDA', 'catalogs.manage'),
    ('TIENDA', 'products.manage'),
    ('TIENDA', 'prices.manage'),
    ('TIENDA', 'customers.manage'),
    ('TIENDA', 'inventory.view'),
    ('TIENDA', 'sales.pos'),

    ('CAJA', 'customers.manage'),
    ('CAJA', 'sales.pos'),

    ('VENTAS', 'products.manage'),
    ('VENTAS', 'customers.manage'),
    ('VENTAS', 'prices.manage'),
    ('VENTAS', 'sales.pos')
)
insert into role_permissions (
  role_id,
  permission_id
)
select
  roles.role_id,
  permissions.permission_id
from seeded_role_permissions
inner join roles on roles.name = seeded_role_permissions.role_name
inner join permissions on permissions.key = seeded_role_permissions.permission_key
on conflict (role_id, permission_id) do nothing;

commit;
