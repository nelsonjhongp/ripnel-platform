-- =============================================================
-- Validación de Permisos y Roles
-- Ejecuta este script en Supabase SQL editor para verificar
-- que los permisos estén correctamente asignados
-- =============================================================

-- 1. Verificar que existan todos los roles
SELECT 'ROLES CREADOS' as seccion;
SELECT role_id, name, description, active
FROM roles
ORDER BY name;

-- 2. Verificar que existan todos los permisos
SELECT '' as seccion;
SELECT 'PERMISOS CREADOS' as seccion;
SELECT permission_id, key, description
FROM permissions
ORDER BY key;

-- 3. Matriz de permisos por rol
SELECT '' as seccion;
SELECT 'MATRIZ DE PERMISOS POR ROL' as seccion;
SELECT 
  r.name as rol,
  STRING_AGG(p.key, ', ' ORDER BY p.key) as permisos
FROM roles r
LEFT JOIN role_permissions rp ON r.role_id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.permission_id
WHERE r.active = TRUE
GROUP BY r.role_id, r.name
ORDER BY r.name;

-- 4. Contar permisos por rol
SELECT '' as seccion;
SELECT 'CONTEO DE PERMISOS POR ROL' as seccion;
SELECT 
  r.name as rol,
  COUNT(rp.permission_id) as total_permisos
FROM roles r
LEFT JOIN role_permissions rp ON r.role_id = rp.role_id
WHERE r.active = TRUE
GROUP BY r.role_id, r.name
ORDER BY total_permisos DESC, r.name;

-- 5. Verificar que ADMIN tenga acceso a todos los permisos
SELECT '' as seccion;
SELECT 'VERIFICACIÓN: ADMIN debe tener acceso a todos los permisos' as seccion;
SELECT 
  (SELECT COUNT(*) FROM permissions) as total_permisos,
  (SELECT COUNT(*) FROM role_permissions 
   WHERE role_id = (SELECT role_id FROM roles WHERE name = 'ADMIN')) as admin_permisos,
  CASE 
    WHEN (SELECT COUNT(*) FROM permissions) = 
         (SELECT COUNT(*) FROM role_permissions 
          WHERE role_id = (SELECT role_id FROM roles WHERE name = 'ADMIN'))
    THEN '✅ CORRECTO'
    ELSE '❌ ERROR: ADMIN no tiene todos los permisos'
  END as resultado;

-- 6. Usuarios y sus roles
SELECT '' as seccion;
SELECT 'USUARIOS Y SUS ROLES' as seccion;
SELECT 
  u.user_id,
  u.full_name,
  u.username,
  r.name as rol,
  u.active
FROM users u
LEFT JOIN roles r ON u.role_id = r.role_id
ORDER BY u.full_name;

-- 7. Permisos específicos para cada rol (matriz detallada)
SELECT '' as seccion;
SELECT 'MATRIZ DETALLADA DE PERMISOS' as seccion;
SELECT 
  r.name as rol,
  p.key as permiso,
  CASE WHEN rp.role_id IS NOT NULL THEN 'SÍ' ELSE 'NO' END as tiene_acceso
FROM roles r
CROSS JOIN permissions p
LEFT JOIN role_permissions rp ON r.role_id = rp.role_id AND p.permission_id = rp.permission_id
WHERE r.active = TRUE
ORDER BY r.name, p.key;
