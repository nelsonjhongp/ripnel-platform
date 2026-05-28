begin;

insert into permissions (key, description)
values
  ('inventory.adjust', 'Registrar, confirmar y cancelar aperturas y ajustes de inventario.')
on conflict (key) do update
set description = excluded.description;

delete from role_permissions rp
using roles r, permissions p
where rp.role_id = r.role_id
  and rp.permission_id = p.permission_id
  and r.name in ('ADMIN', 'ALMACEN', 'TIENDA', 'VENTAS')
  and p.key = 'inventory.adjust';

with seeded_role_permissions(role_name, permission_key) as (
  values
    ('ADMIN', 'inventory.adjust'),
    ('ALMACEN', 'inventory.adjust')
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
