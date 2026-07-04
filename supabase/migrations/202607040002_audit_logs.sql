-- ============================================================================
-- Forensic audit trail (Phase 2)
-- WORM (Write-Once, Read-Many) audit_logs table populated by AFTER triggers.
-- Actor identity is propagated from the backend via SET LOCAL app.actor_user_id.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- audit_logs: append-only ledger. UPDATE/DELETE/TRUNCATE revoked from app role.
-- ---------------------------------------------------------------------------
create table if not exists audit_logs (
  audit_id      bigserial primary key,
  table_name    text   not null,
  operation     text   not null check (operation in ('INSERT','UPDATE','DELETE')),
  row_pk        text,
  old_data      jsonb,
  new_data      jsonb,
  actor_user_id uuid,
  actor_role    text,
  occurred_at   timestamptz not null default current_timestamp
);

create index if not exists idx_audit_logs_table_time
  on audit_logs(table_name, occurred_at desc);
create index if not exists idx_audit_logs_actor_time
  on audit_logs(actor_user_id, occurred_at desc);
create index if not exists idx_audit_logs_occurred
  on audit_logs(occurred_at desc);

-- Make the table append-only for the default (non-superuser) role.
-- PostgreSQL enforces privileges per role; GRANT only INSERT + SELECT.
revoke update, delete, truncate on audit_logs from public;
grant  insert, select on audit_logs to public;

-- Sequence grant so INSERT ... default nextval works for app roles.
grant usage, select on sequence audit_logs_audit_id_seq to public;

-- ---------------------------------------------------------------------------
-- Generic AFTER trigger function.
-- Captures OLD/NEW as JSONB, extracts PK from the first column, and reads
-- the actor from session settings injected by the backend (SET LOCAL).
-- ---------------------------------------------------------------------------
create or replace function fn_audit_capture()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pk text;
  v_actor text;
  v_role text;
begin
  v_actor := current_setting('app.actor_user_id', true);
  v_role  := current_setting('app.actor_role', true);

  -- Derive a primary key value from NEW (insert/update) or OLD (delete).
  if tg_op = 'DELETE' then
    v_pk := (to_jsonb(OLD) ->> (coalesce(
      (select a.attname from pg_attribute a
        where a.attrelid = tg_tableoid and a.attnum > 0 and not a.attisdropped
        order by a.attnum limit 1), 'id')));
  else
    v_pk := (to_jsonb(NEW) ->> (coalesce(
      (select a.attname from pg_attribute a
        where a.attrelid = tg_tableoid and a.attnum > 0 and not a.attisdropped
        order by a.attnum limit 1), 'id')));
  end if;

  insert into audit_logs (table_name, operation, row_pk, old_data, new_data, actor_user_id, actor_role)
  values (
    tg_table_name,
    tg_op,
    v_pk,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(OLD) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(NEW) end,
    case when v_actor is not null and v_actor <> ''
         then v_actor::uuid else null end,
    v_role
  );

  return coalesce(NEW, OLD);
end;
$$;

-- ---------------------------------------------------------------------------
-- Attach AFTER triggers to critical tables.
-- Each trigger is idempotent (drop if exists + create).
-- Do Block 1: identity, RBAC, customers, products, pricing.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'users',
    'roles',
    'role_permissions',
    'permissions',
    'user_locations',
    'locations',
    'customers',
    'product_styles',
    'style_sizes',
    'style_colors',
    'product_variants',
    'style_size_prices',
    'pricing_rules',
    'inventory',
    'inventory_adjustments',
    'inventory_adjustment_lines'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists trg_audit_%s on %I;', t, t);
    execute format(
      'create trigger trg_audit_%s '
      'after insert or update or delete on %I '
      'for each row execute function fn_audit_capture();',
      t, t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Do Block 2: transactional financials + stock movements.
-- These produce the highest-volume audit rows.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'sales',
    'sales_details',
    'sales_payments',
    'sales_receipts',
    'cash_closings',
    'stock_movements',
    'stock_transfers',
    'stock_transfer_lines',
    'exchanges',
    'exchange_lines'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists trg_audit_%s on %I;', t, t);
    execute format(
      'create trigger trg_audit_%s '
      'after insert or update or delete on %I '
      'for each row execute function fn_audit_capture();',
      t, t
    );
  end loop;
end;
$$;