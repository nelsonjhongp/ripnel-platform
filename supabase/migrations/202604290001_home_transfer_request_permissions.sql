begin;

insert into permissions (key, description)
values
  ('transfers.request.create', 'Crear solicitudes entre tiendas para la sede operativa.'),
  ('transfers.request.view_own', 'Ver solicitudes y seguimiento de transferencias de la sede operativa.'),
  ('transfers.ship', 'Despachar transferencias desde la sede operativa.'),
  ('transfers.receive', 'Recepcionar transferencias hacia la sede operativa.')
on conflict (key) do update
set description = excluded.description;

with seeded_role_permissions(role_name, permission_key) as (
  values
    ('ADMIN', 'transfers.request.create'),
    ('ADMIN', 'transfers.request.view_own'),
    ('ADMIN', 'transfers.ship'),
    ('ADMIN', 'transfers.receive'),
    ('ALMACEN', 'transfers.ship'),
    ('ALMACEN', 'transfers.receive'),
    ('TIENDA', 'transfers.request.create'),
    ('TIENDA', 'transfers.request.view_own'),
    ('TIENDA', 'transfers.ship'),
    ('TIENDA', 'transfers.receive'),
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
