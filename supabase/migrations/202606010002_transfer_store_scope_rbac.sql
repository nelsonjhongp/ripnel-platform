begin;

insert into permissions (key, description)
values
  ('transfers.approve', 'Aprobar solicitudes de transferencia desde la sede operativa.'),
  ('transfers.cancel', 'Cancelar solicitudes de transferencia antes del despacho.')
on conflict (key) do update
set description = excluded.description;

delete from role_permissions rp
using roles r, permissions p
where rp.role_id = r.role_id
  and rp.permission_id = p.permission_id
  and r.name = 'TIENDA'
  and p.key in (
    'transfers.approve',
    'transfers.ship',
    'transfers.receive',
    'transfers.cancel'
  );

with seeded_role_permissions(role_name, permission_key) as (
  values
    ('TIENDA', 'transfers.approve'),
    ('TIENDA', 'transfers.ship'),
    ('TIENDA', 'transfers.receive'),
    ('TIENDA', 'transfers.cancel')
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
