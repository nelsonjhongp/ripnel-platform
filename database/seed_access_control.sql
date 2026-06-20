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
    ('transfers.request.create', 'Crear solicitudes entre tiendas para la sede operativa.'),
    ('transfers.request.view_own', 'Ver solicitudes y seguimiento de transferencias de la sede operativa.'),
    ('transfers.approve', 'Aprobar solicitudes de transferencia desde la sede operativa.'),
    ('transfers.ship', 'Despachar transferencias desde la sede operativa.'),
    ('transfers.receive', 'Recepcionar transferencias hacia la sede operativa.'),
    ('transfers.cancel', 'Cancelar solicitudes de transferencia antes del despacho.'),
    ('sales.pos', 'Operar venta rapida y checkout.'),
    ('sales.postsale.view', 'Consultar postventa operativa y ventas elegibles.'),
    ('sales.postsale.exchange', 'Registrar cambios simples de postventa.'),
    ('sales.postsale.cancel', 'Registrar anulaciones controladas de postventa.'),
    ('cash.view', 'Consultar caja del dia e historial operativo de la sede activa.'),
    ('cash.operate', 'Abrir y cerrar la caja operativa de la sede activa.'),
    ('cash.admin.view', 'Consultar el control transversal de cajas multi-sede.'),
    ('cash.admin.reopen', 'Reabrir cajas cerradas de cualquier sede.'),
    ('dashboard.view', 'Consultar el panel operativo y gerencial.'),
    ('dashboard.global.view', 'Consultar el panel con alcance multi-sede.')
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
    ('transfers.request.create'),
    ('transfers.request.view_own'),
    ('transfers.approve'),
    ('transfers.ship'),
    ('transfers.receive'),
    ('transfers.cancel'),
    ('sales.pos'),
    ('sales.postsale.view'),
    ('sales.postsale.exchange'),
    ('sales.postsale.cancel'),
    ('cash.view'),
    ('cash.operate'),
    ('cash.admin.view'),
    ('cash.admin.reopen'),
    ('dashboard.view'),
    ('dashboard.global.view'),
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
    ('ADMIN', 'transfers.request.create'),
    ('ADMIN', 'transfers.request.view_own'),
    ('ADMIN', 'transfers.approve'),
    ('ADMIN', 'transfers.ship'),
    ('ADMIN', 'transfers.receive'),
    ('ADMIN', 'transfers.cancel'),
    ('ADMIN', 'sales.pos'),
    ('ADMIN', 'sales.postsale.view'),
    ('ADMIN', 'sales.postsale.exchange'),
    ('ADMIN', 'sales.postsale.cancel'),
    ('ADMIN', 'cash.view'),
    ('ADMIN', 'cash.operate'),
    ('ADMIN', 'cash.admin.view'),
    ('ADMIN', 'cash.admin.reopen'),
    ('ADMIN', 'dashboard.view'),
    ('ADMIN', 'dashboard.global.view'),

    ('ALMACEN', 'inventory.view'),
    ('ALMACEN', 'inventory.adjust'),
    ('ALMACEN', 'transfers.manage'),
    ('ALMACEN', 'transfers.approve'),
    ('ALMACEN', 'transfers.ship'),
    ('ALMACEN', 'transfers.receive'),
    ('ALMACEN', 'transfers.cancel'),
    ('ALMACEN', 'dashboard.view'),

    ('TIENDA', 'catalogs.manage'),
    ('TIENDA', 'products.manage'),
    ('TIENDA', 'prices.manage'),
    ('TIENDA', 'customers.manage'),
    ('TIENDA', 'inventory.view'),
    ('TIENDA', 'transfers.request.create'),
    ('TIENDA', 'transfers.request.view_own'),
    ('TIENDA', 'transfers.approve'),
    ('TIENDA', 'transfers.ship'),
    ('TIENDA', 'transfers.receive'),
    ('TIENDA', 'transfers.cancel'),
    ('TIENDA', 'sales.pos'),
    ('TIENDA', 'sales.postsale.view'),
    ('TIENDA', 'sales.postsale.exchange'),
    ('TIENDA', 'dashboard.view'),

    ('CAJA', 'customers.manage'),
    ('CAJA', 'sales.pos'),
    ('CAJA', 'sales.postsale.view'),
    ('CAJA', 'sales.postsale.cancel'),
    ('CAJA', 'cash.view'),
    ('CAJA', 'cash.operate'),
    ('CAJA', 'dashboard.view'),

    ('VENTAS', 'products.manage'),
    ('VENTAS', 'customers.manage'),
    ('VENTAS', 'prices.manage'),
    ('VENTAS', 'transfers.request.create'),
    ('VENTAS', 'transfers.request.view_own'),
    ('VENTAS', 'transfers.approve'),
    ('VENTAS', 'transfers.cancel'),
    ('VENTAS', 'sales.pos'),
    ('VENTAS', 'sales.postsale.view'),
    ('VENTAS', 'sales.postsale.exchange')
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
