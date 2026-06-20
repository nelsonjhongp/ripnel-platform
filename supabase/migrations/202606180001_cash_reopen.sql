begin;

-- Add reopen tracking columns to cash_closings
alter table cash_closings
  add column if not exists reopened_by uuid references users(user_id),
  add column if not exists reopened_at timestamptz,
  add column if not exists reopen_notes text;

-- New permission: cash.admin.reopen
insert into permissions (key, description)
values ('cash.admin.reopen', 'Reabrir cajas cerradas de cualquier sede.')
on conflict (key) do nothing;

-- Assign to ADMIN role
insert into role_permissions (role_id, permission_id)
select r.role_id, p.permission_id
from roles r
cross join permissions p
where r.name = 'ADMIN'
  and p.key = 'cash.admin.reopen'
on conflict (role_id, permission_id) do nothing;

commit;
