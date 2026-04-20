begin;

create table if not exists sale_cancellations (
  sale_cancellation_id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(sale_id) on delete cascade,
  location_id uuid not null references locations(location_id),
  status varchar(20) not null default 'confirmed',
  reason varchar(200) not null,
  notes text,
  cancelled_by uuid references users(user_id),
  cancelled_at timestamptz not null default current_timestamp,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,
  constraint uq_sale_cancellations_sale unique (sale_id),
  constraint chk_sale_cancellations_status
    check (status in ('confirmed'))
);

create index if not exists idx_sale_cancellations_location_date
  on sale_cancellations(location_id, cancelled_at desc);

create index if not exists idx_sale_cancellations_cancelled_at
  on sale_cancellations(cancelled_at desc);

create table if not exists sales_payment_reversals (
  payment_reversal_id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references sales_payments(payment_id) on delete cascade,
  sale_id uuid not null references sales(sale_id) on delete cascade,
  location_id uuid not null references locations(location_id),
  method varchar(20) not null,
  amount numeric(12,2) not null check (amount > 0),
  reason varchar(200) not null,
  notes text,
  reversed_by uuid references users(user_id),
  reversed_at timestamptz not null default current_timestamp,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,
  constraint uq_sales_payment_reversals_payment unique (payment_id),
  constraint chk_sales_payment_reversals_method
    check (method in ('cash','yape','plin','transfer'))
);

create index if not exists idx_sales_payment_reversals_sale
  on sales_payment_reversals(sale_id);

create index if not exists idx_sales_payment_reversals_location_date
  on sales_payment_reversals(location_id, reversed_at desc);

create index if not exists idx_sales_payment_reversals_reversed_at
  on sales_payment_reversals(reversed_at desc);

insert into permissions (key, description)
values
  ('sales.postsale.view', 'Consultar postventa operativa y ventas elegibles.'),
  ('sales.postsale.exchange', 'Registrar cambios simples de postventa.'),
  ('sales.postsale.cancel', 'Registrar anulaciones controladas de postventa.')
on conflict (key) do update
set description = excluded.description;

with seeded_role_permissions(role_name, permission_key) as (
  values
    ('ADMIN', 'sales.postsale.view'),
    ('ADMIN', 'sales.postsale.exchange'),
    ('ADMIN', 'sales.postsale.cancel'),
    ('TIENDA', 'sales.postsale.view'),
    ('TIENDA', 'sales.postsale.exchange'),
    ('CAJA', 'sales.postsale.view'),
    ('CAJA', 'sales.postsale.cancel'),
    ('VENTAS', 'sales.postsale.view'),
    ('VENTAS', 'sales.postsale.exchange')
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
