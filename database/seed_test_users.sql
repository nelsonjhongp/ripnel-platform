-- =============================================================
-- INSERTAR USUARIOS DE PRUEBA CON DIFERENTES ROLES
-- Ejecuta este script en Supabase SQL editor
-- =============================================================

-- Obtener los role_id de cada rol
DO $$
DECLARE
  admin_role_id UUID;
  tienda_role_id UUID;
  caja_role_id UUID;
  ventas_role_id UUID;
  almacen_role_id UUID;
BEGIN
  -- Obtener los IDs de los roles
  SELECT role_id INTO admin_role_id FROM roles WHERE name = 'ADMIN' LIMIT 1;
  SELECT role_id INTO tienda_role_id FROM roles WHERE name = 'TIENDA' LIMIT 1;
  SELECT role_id INTO caja_role_id FROM roles WHERE name = 'CAJA' LIMIT 1;
  SELECT role_id INTO ventas_role_id FROM roles WHERE name = 'VENTAS' LIMIT 1;
  SELECT role_id INTO almacen_role_id FROM roles WHERE name = 'ALMACEN' LIMIT 1;

  -- ADMIN
  INSERT INTO users (full_name, username, email, password_hash, role_id, active)
  VALUES (
    'Admin Sistema',
    'admin',
    'admin@ripnel.com',
    crypt('admin123', gen_salt('bf')),
    admin_role_id,
    TRUE
  )
  ON CONFLICT (username) DO NOTHING;

  -- TIENDA
  INSERT INTO users (full_name, username, email, password_hash, role_id, active)
  VALUES (
    'Gerente Tienda',
    'tienda',
    'tienda@ripnel.com',
    crypt('tienda123', gen_salt('bf')),
    tienda_role_id,
    TRUE
  )
  ON CONFLICT (username) DO NOTHING;

  -- CAJA
  INSERT INTO users (full_name, username, email, password_hash, role_id, active)
  VALUES (
    'Operador Caja',
    'caja',
    'caja@ripnel.com',
    crypt('caja123', gen_salt('bf')),
    caja_role_id,
    TRUE
  )
  ON CONFLICT (username) DO NOTHING;

  -- VENTAS
  INSERT INTO users (full_name, username, email, password_hash, role_id, active)
  VALUES (
    'Ejecutivo Ventas',
    'ventas',
    'ventas@ripnel.com',
    crypt('ventas123', gen_salt('bf')),
    ventas_role_id,
    TRUE
  )
  ON CONFLICT (username) DO NOTHING;

  -- ALMACEN
  INSERT INTO users (full_name, username, email, password_hash, role_id, active)
  VALUES (
    'Jefe Almacén',
    'almacen',
    'almacen@ripnel.com',
    crypt('almacen123', gen_salt('bf')),
    almacen_role_id,
    TRUE
  )
  ON CONFLICT (username) DO NOTHING;

  RAISE NOTICE 'Usuarios de prueba insertados exitosamente';
END $$;

-- Verificar usuarios creados
SELECT u.full_name, u.username, r.name as rol, u.active
FROM users u
LEFT JOIN roles r ON u.role_id = r.role_id
WHERE u.username IN ('admin', 'tienda', 'caja', 'ventas', 'almacen')
ORDER BY r.name;
