begin;

-- TIENDA: add approve and cancel for transfers
insert into role_permissions (role_id, permission_id)
select
  r.role_id,
  p.permission_id
from roles r
cross join permissions p
where r.name = 'TIENDA'
  and p.key in ('transfers.approve', 'transfers.cancel')
on conflict (role_id, permission_id) do nothing;

-- VENTAS: add approve and cancel for transfers
insert into role_permissions (role_id, permission_id)
select
  r.role_id,
  p.permission_id
from roles r
cross join permissions p
where r.name = 'VENTAS'
  and p.key in ('transfers.approve', 'transfers.cancel')
on conflict (role_id, permission_id) do nothing;

-- VENTAS: remove dashboard.view
delete from role_permissions rp
using roles r, permissions p
where rp.role_id = r.role_id
  and rp.permission_id = p.permission_id
  and r.name = 'VENTAS'
  and p.key = 'dashboard.view';

commit;
