/* ============================================================
   FUNCIÓN: create_user_with_password
   
   Propósito: Crear un usuario hasheando la contraseña con crypt()
   de PostgreSQL automáticamente.
   
   Uso desde Supabase RPC:
   SELECT * FROM create_user_with_password(
     'Juan Pérez',
     'juanperez',
     'juan@example.com',
     'password123',
     'role-id-aqui'
   );
   ============================================================ */

CREATE OR REPLACE FUNCTION create_user_with_password(
  p_full_name VARCHAR,
  p_username VARCHAR,
  p_email VARCHAR,
  p_password VARCHAR,
  p_role_id UUID
)
RETURNS TABLE (
  user_id UUID,
  full_name VARCHAR,
  username VARCHAR,
  email VARCHAR,
  role_id UUID,
  active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  INSERT INTO users (full_name, username, email, password_hash, role_id, active)
  VALUES (
    p_full_name,
    p_username,
    p_email,
    crypt(p_password, gen_salt('bf')),
    p_role_id,
    TRUE
  )
  RETURNING 
    users.user_id,
    users.full_name,
    users.username,
    users.email,
    users.role_id,
    users.active,
    users.created_at,
    users.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/* Legado: función no expuesta por RPC. El backend crea usuarios con SQL
   propio en apps/backend/src/modules/users/users.repo.js (insertUser).
   Se revoca el acceso por defecto de PUBLIC a esta función SECURITY DEFINER
   para que no quede ejecutable sin permiso explícito. */
REVOKE ALL ON FUNCTION create_user_with_password(
  VARCHAR,
  VARCHAR,
  VARCHAR,
  VARCHAR,
  UUID
) FROM PUBLIC;
