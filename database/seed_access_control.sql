-- RIPNEL access control seed
-- Purpose: leave a minimum, coherent RBAC base for login and route access.
-- Safe to re-run.

begin;

with seeded_permissions(permission_key, description) as (
  values
    ('dashboard.view', 'Ver inicio y panel general.'),
    ('users.manage', 'Gestionar usuarios.'),
    ('roles.manage', 'Gestionar roles.'),
    ('locations.manage', 'Gestionar ubicaciones.'),
    ('catalogs.manage', 'Gestionar catalogos maestros.'),
    ('styles.manage', 'Gestionar estilos.'),
    ('variants.manage', 'Gestionar variantes.'),
    ('prices.manage', 'Gestionar precios y reglas comerciales.'),
    ('customers.manage', 'Gestionar clientes.'),
    ('inventory.view', 'Consultar inventario y kardex.'),
    ('inventory.adjust', 'Registrar ajustes de inventario.'),
    ('transfers.manage', 'Gestionar transferencias internas.'),
    ('sales.use', 'Operar venta rapida y checkout.')
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

delete from role_permissions;

with seeded_role_permissions(role_name, permission_key) as (
  values
    ('ADMIN', 'dashboard.view'),
    ('ADMIN', 'users.manage'),
    ('ADMIN', 'roles.manage'),
    ('ADMIN', 'locations.manage'),
    ('ADMIN', 'catalogs.manage'),
    ('ADMIN', 'styles.manage'),
    ('ADMIN', 'variants.manage'),
    ('ADMIN', 'prices.manage'),
    ('ADMIN', 'customers.manage'),
    ('ADMIN', 'inventory.view'),
    ('ADMIN', 'inventory.adjust'),
    ('ADMIN', 'transfers.manage'),
    ('ADMIN', 'sales.use'),

    ('ALMACEN', 'dashboard.view'),
    ('ALMACEN', 'variants.manage'),
    ('ALMACEN', 'inventory.view'),
    ('ALMACEN', 'inventory.adjust'),
    ('ALMACEN', 'transfers.manage'),

    ('TIENDA', 'dashboard.view'),
    ('TIENDA', 'customers.manage'),
    ('TIENDA', 'prices.manage'),
    ('TIENDA', 'inventory.view'),
    ('TIENDA', 'sales.use'),

    ('CAJA', 'dashboard.view'),
    ('CAJA', 'customers.manage'),
    ('CAJA', 'sales.use'),

    ('VENTAS', 'dashboard.view'),
    ('VENTAS', 'customers.manage'),
    ('VENTAS', 'prices.manage'),
    ('VENTAS', 'sales.use')
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
