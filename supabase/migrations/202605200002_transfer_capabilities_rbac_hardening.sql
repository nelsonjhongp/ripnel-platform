begin;

insert into permissions (key, description)
values
  ('transfers.approve', 'Aprobar solicitudes de transferencia desde la sede operativa.'),
  ('transfers.cancel', 'Cancelar solicitudes de transferencia antes del despacho.'),
  ('transfers.request.create', 'Crear solicitudes entre tiendas para la sede operativa.'),
  ('transfers.request.view_own', 'Ver solicitudes y seguimiento de transferencias de la sede operativa.'),
  ('transfers.ship', 'Despachar transferencias desde la sede operativa.'),
  ('transfers.receive', 'Recepcionar transferencias hacia la sede operativa.'),
  ('transfers.manage', 'Gestionar transferencias internas.')
on conflict (key) do update
set description = excluded.description;

delete from role_permissions rp
using roles r, permissions p
where rp.role_id = r.role_id
  and rp.permission_id = p.permission_id
  and r.name in ('ADMIN', 'ALMACEN', 'TIENDA', 'VENTAS')
  and p.key in (
    'transfers.manage',
    'transfers.request.create',
    'transfers.request.view_own',
    'transfers.approve',
    'transfers.ship',
    'transfers.receive',
    'transfers.cancel'
  );

with seeded_role_permissions(role_name, permission_key) as (
  values
    ('ADMIN', 'transfers.manage'),
    ('ADMIN', 'transfers.request.create'),
    ('ADMIN', 'transfers.request.view_own'),
    ('ADMIN', 'transfers.approve'),
    ('ADMIN', 'transfers.ship'),
    ('ADMIN', 'transfers.receive'),
    ('ADMIN', 'transfers.cancel'),
    ('ALMACEN', 'transfers.approve'),
    ('ALMACEN', 'transfers.ship'),
    ('ALMACEN', 'transfers.receive'),
    ('ALMACEN', 'transfers.cancel'),
    ('TIENDA', 'transfers.request.create'),
    ('TIENDA', 'transfers.request.view_own'),
    ('VENTAS', 'transfers.request.create'),
    ('VENTAS', 'transfers.request.view_own')
)
insert into role_permissions (role_id, permission_id)
select
  r.role_id,
  p.permission_id
from seeded_role_permissions srp
inner join roles r on r.name = srp.role_name
inner join permissions p on p.key = srp.permission_key
on conflict (role_id, permission_id) do nothing;

commit;
