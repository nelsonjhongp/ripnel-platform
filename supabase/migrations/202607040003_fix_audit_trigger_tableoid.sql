-- ============================================================================
-- Fix broken fn_audit_capture function (replace TG_TABLE_OID with TG_TABLEOID)
-- This unblocks migration execution on environments with existing active triggers.
-- ============================================================================

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
        where a.attrelid = TG_TABLEOID and a.attnum > 0 and not a.attisdropped
        order by a.attnum limit 1), 'id')));
  else
    v_pk := (to_jsonb(NEW) ->> (coalesce(
      (select a.attname from pg_attribute a
        where a.attrelid = TG_TABLEOID and a.attnum > 0 and not a.attisdropped
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
