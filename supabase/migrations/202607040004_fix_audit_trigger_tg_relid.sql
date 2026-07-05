-- Reconciles the versioned schema with the TG_RELID audit-trigger hotfix
-- already applied manually in the remote database.

CREATE OR REPLACE FUNCTION public.fn_audit_capture()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pk text;
  v_actor text;
  v_role text;
BEGIN
  v_actor := current_setting('app.actor_user_id', true);
  v_role := current_setting('app.actor_role', true);

  IF tg_op = 'DELETE' THEN
    v_pk := (
      to_jsonb(OLD) ->> (
        COALESCE(
          (
            SELECT a.attname
            FROM pg_attribute a
            WHERE a.attrelid = TG_RELID
              AND a.attnum > 0
              AND NOT a.attisdropped
            ORDER BY a.attnum
            LIMIT 1
          ),
          'id'
        )
      )
    );
  ELSE
    v_pk := (
      to_jsonb(NEW) ->> (
        COALESCE(
          (
            SELECT a.attname
            FROM pg_attribute a
            WHERE a.attrelid = TG_RELID
              AND a.attnum > 0
              AND NOT a.attisdropped
            ORDER BY a.attnum
            LIMIT 1
          ),
          'id'
        )
      )
    );
  END IF;

  INSERT INTO audit_logs (
    table_name,
    operation,
    row_pk,
    old_data,
    new_data,
    actor_user_id,
    actor_role
  )
  VALUES (
    tg_table_name,
    tg_op,
    v_pk,
    CASE WHEN tg_op IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN tg_op IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END,
    CASE
      WHEN v_actor IS NOT NULL AND v_actor <> ''
        THEN v_actor::uuid
      ELSE NULL
    END,
    v_role
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;