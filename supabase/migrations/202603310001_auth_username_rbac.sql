/* ============================================================
   Auth: usuario (username) + contraseña y RBAC

   Objetivo (solo esquema/datos, sin cambiar la interfaz):
   - Login y API usan `users.username` como identificador de acceso.
   - `users.email` pasa a ser opcional: sigue existiendo para datos
     que ya tengas o para el CRUD que aún muestre correo; no es
     obligatorio para iniciar sesión.
   - Se rellena `username` para filas existentes (desde email o nombre).
   - Se insertan permisos y se enlazan a roles (ADMIN, TIENDA, CAJA,
     VENTAS, ALMACEN) para que la sesión lleve permisos[] sin romper
     la relación users.role_id -> roles.

   Idempotente: se puede ejecutar más de una vez en Supabase SQL editor.
   Requiere: migración base 202603250001 (tablas users, roles, permissions).
   ============================================================ */

BEGIN;

-- ------------------------------------------------------------
-- 1) Tabla users: username obligatorio, email opcional
-- ------------------------------------------------------------

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username VARCHAR(60);

ALTER TABLE users
  ALTER COLUMN email DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_users_username'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT uq_users_username UNIQUE (username);
  END IF;
END$$;

-- Rellenar username donde falte (usuarios ya existentes)
DO $$
DECLARE
  r RECORD;
  base_username TEXT;
  candidate TEXT;
  n INT;
BEGIN
  FOR r IN
    SELECT user_id, email, full_name
    FROM users
    WHERE username IS NULL OR btrim(username) = ''
  LOOP
    base_username := NULL;

    IF r.email IS NOT NULL AND btrim(r.email) <> '' THEN
      base_username := lower(regexp_replace(split_part(r.email, '@', 1), '[^a-zA-Z0-9_]+', '', 'g'));
    END IF;

    IF base_username IS NULL OR base_username = '' THEN
      base_username := lower(regexp_replace(coalesce(r.full_name, 'user'), '[^a-zA-Z0-9_]+', '', 'g'));
    END IF;

    IF base_username IS NULL OR base_username = '' THEN
      base_username := 'user';
    END IF;

    candidate := base_username;
    n := 0;

    WHILE EXISTS (SELECT 1 FROM users u WHERE u.username = candidate AND u.user_id <> r.user_id) LOOP
      n := n + 1;
      candidate := base_username || '_' || n::text;
    END LOOP;

    UPDATE users
    SET username = candidate
    WHERE user_id = r.user_id;
  END LOOP;
END$$;

ALTER TABLE users
  ALTER COLUMN username SET NOT NULL;

-- ------------------------------------------------------------
-- 2) Roles base (misma convención que seed / pantalla de roles)
--    Necesario antes de role_permissions si falta algún rol en BD.
-- ------------------------------------------------------------

INSERT INTO roles (name, description, active)
VALUES
  ('ADMIN', 'Acceso general al sistema y configuracion base.', TRUE),
  ('TIENDA', 'Operacion de ventas y consultas', TRUE),
  ('CAJA', 'Cobros y cierre diario', TRUE),
  ('VENTAS', 'Operacion comercial y venta rapida.', TRUE),
  ('ALMACEN', 'Operacion de stock y movimientos internos.', TRUE)
ON CONFLICT (name) DO UPDATE
SET
  description = EXCLUDED.description,
  active = EXCLUDED.active,
  updated_at = CURRENT_TIMESTAMP;

-- ------------------------------------------------------------
-- 3) Permisos y asignación por rol (idempotente)
-- ------------------------------------------------------------

INSERT INTO permissions (key, description)
VALUES
  ('admin.manage', 'Administracion: roles, usuarios, ubicaciones'),
  ('catalogs.manage', 'Catalogos maestros'),
  ('products.manage', 'Estilos y variantes'),
  ('prices.manage', 'Precios y reglas'),
  ('transfers.manage', 'Transferencias'),
  ('inventory.view', 'Inventario y kardex'),
  ('sales.pos', 'Venta rapida / compra')
ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description;

DO $$
DECLARE
  perm_key TEXT;
BEGIN
  -- ADMIN: todos los permisos
  FOR perm_key IN SELECT key FROM permissions
  LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.role_id, p.permission_id
    FROM roles r
    JOIN permissions p ON p.key = perm_key
    WHERE r.name = 'ADMIN'
    ON CONFLICT DO NOTHING;
  END LOOP;

  FOREACH perm_key IN ARRAY ARRAY[
    'sales.pos', 'inventory.view', 'catalogs.manage', 'products.manage', 'prices.manage'
  ]
  LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.role_id, p.permission_id
    FROM roles r
    JOIN permissions p ON p.key = perm_key
    WHERE r.name = 'TIENDA'
    ON CONFLICT DO NOTHING;
  END LOOP;

  FOREACH perm_key IN ARRAY ARRAY['sales.pos', 'products.manage', 'prices.manage']
  LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.role_id, p.permission_id
    FROM roles r
    JOIN permissions p ON p.key = perm_key
    WHERE r.name = 'VENTAS'
    ON CONFLICT DO NOTHING;
  END LOOP;

  FOREACH perm_key IN ARRAY ARRAY['sales.pos']
  LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.role_id, p.permission_id
    FROM roles r
    JOIN permissions p ON p.key = perm_key
    WHERE r.name = 'CAJA'
    ON CONFLICT DO NOTHING;
  END LOOP;

  FOREACH perm_key IN ARRAY ARRAY['inventory.view', 'transfers.manage']
  LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.role_id, p.permission_id
    FROM roles r
    JOIN permissions p ON p.key = perm_key
    WHERE r.name = 'ALMACEN'
    ON CONFLICT DO NOTHING;
  END LOOP;
END$$;

COMMIT;
