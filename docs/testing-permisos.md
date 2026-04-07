# Testing del Sistema de Permisos - Guía Práctica

## ��� Checklist de Testing Manual

### 1. Verificación en Base de Datos

Ejecuta en Supabase SQL editor:
```sql
-- Verifica que los permisos estén asignados
SELECT r.name as rol, p.key as permiso
FROM roles r
JOIN role_permissions rp ON r.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.permission_id
ORDER BY r.name, p.key;
```

**Resultado esperado:**
- ADMIN: 7 permisos (todos)
- TIENDA: 5 permisos (sales.pos, inventory.view, catalogs.manage, products.manage, prices.manage)
- CAJA: 1 permiso (sales.pos)
- VENTAS: 3 permisos (sales.pos, products.manage, prices.manage)
- ALMACEN: 2 permisos (inventory.view, transfers.manage)

### 2. Prueba de Login y Permisos

#### Crear usuarios de prueba (si no existen):

En Supabase, inserta usuarios con diferentes roles:

```sql
-- ADMIN
INSERT INTO users (full_name, username, email, password_hash, role_id, active)
SELECT 'Admin Test', 'admin_test', 'admin@test.com', 
       crypt('password123', gen_salt('bf')), 
       role_id, TRUE
FROM roles WHERE name = 'ADMIN'
ON CONFLICT DO NOTHING;

-- TIENDA
INSERT INTO users (full_name, username, email, password_hash, role_id, active)
SELECT 'Tienda Test', 'tienda_test', 'tienda@test.com', 
       crypt('password123', gen_salt('bf')), 
       role_id, TRUE
FROM roles WHERE name = 'TIENDA'
ON CONFLICT DO NOTHING;

-- CAJA
INSERT INTO users (full_name, username, email, password_hash, role_id, active)
SELECT 'Caja Test', 'caja_test', 'caja@test.com', 
       crypt('password123', gen_salt('bf')), 
       role_id, TRUE
FROM roles WHERE name = 'CAJA'
ON CONFLICT DO NOTHING;

-- VENTAS
INSERT INTO users (full_name, username, email, password_hash, role_id, active)
SELECT 'Ventas Test', 'ventas_test', 'ventas@test.com', 
       crypt('password123', gen_salt('bf')), 
       role_id, TRUE
FROM roles WHERE name = 'VENTAS'
ON CONFLICT DO NOTHING;

-- ALMACEN
INSERT INTO users (full_name, username, email, password_hash, role_id, active)
SELECT 'Almacen Test', 'almacen_test', 'almacen@test.com', 
       crypt('password123', gen_salt('bf')), 
       role_id, TRUE
FROM roles WHERE name = 'ALMACEN'
ON CONFLICT DO NOTHING;
```

#### Prueba de Login en Frontend:

1. **Abre la aplicación** en `http://localhost:3000`
2. **Intenta loguear** con cada usuario:
   - username: `admin_test`, password: `password123`
   - username: `tienda_test`, password: `password123`
   - username: `caja_test`, password: `password123`
   - etc.

### 3. Verificación del Sidebar por Rol

#### ADMIN (admin_test / password123)
**Debe ver:**
- ✅ Administración
- ✅ Catálogos
- ✅ Productos
- ✅ Precios
- ✅ Transferencias
- ✅ **Venta Rápida** (con este título específico)
- ✅ Inventario

**No debe ver:** Nada

#### TIENDA (tienda_test / password123)
**Debe ver:**
- ❌ Administración
- ✅ Catálogos
- ✅ Productos
- ✅ Precios
- ❌ Transferencias
- ✅ **Compra** (con este título, no "Venta Rápida")
- ✅ Inventario

#### CAJA (caja_test / password123)
**Debe ver:**
- ❌ Administración
- ❌ Catálogos
- ❌ Productos
- ❌ Precios
- ❌ Transferencias
- ✅ **Venta Rápida** (SOLO esto debe verse)
- ❌ Inventario

**Especial:** El rol CAJA solo ve "Venta Rápida" en el sidebar

#### VENTAS (ventas_test / password123)
**Debe ver:**
- ❌ Administración
- ❌ Catálogos
- ✅ Productos
- ✅ Precios
- ❌ Transferencias
- ✅ **Compra** (con este título, no "Venta Rápida")
- ❌ Inventario

#### ALMACEN (almacen_test / password123)
**Debe ver:**
- ❌ Administración
- ❌ Catálogos
- ❌ Productos
- ❌ Precios
- ✅ Transferencias
- ❌ Compra / Venta Rápida
- ✅ Inventario

### 4. Testing en DevTools (Browser Console)

Abre la consola del navegador (F12) y ejecuta:

```javascript
// Obtener el contexto de autenticación
const authContext = document.querySelector('[data-testid="auth-provider"]')

// O directamente desde React DevTools:
// 1. Instala React DevTools extension
// 2. Abre React DevTools (Fn + F12 en algunos navegadores)
// 3. Busca <AuthProvider> 
// 4. Verifica el state.permissions
```

**Esperado en consola:**
```javascript
// Para ADMIN
permissions: ["admin.manage", "catalogs.manage", "products.manage", "prices.manage", "transfers.manage", "inventory.view", "sales.pos"]

// Para CAJA
permissions: ["sales.pos"]

// Para TIENDA
permissions: ["sales.pos", "inventory.view", "catalogs.manage", "products.manage", "prices.manage"]
```

### 5. API Testing

#### Verificar endpoint /api/auth/me

```bash
# 1. Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin_test","password":"password123"}'

# Respuesta esperada:
{
  "user": {
    "user_id": "...",
    "full_name": "Admin Test",
    "username": "admin_test",
    "email": "admin@test.com",
    "role_id": "...",
    "role_name": "ADMIN"
  },
  "permissions": ["admin.manage", "catalogs.manage", ..., "sales.pos"]
}

# 2. Verificar sesión con /api/auth/me
curl -X GET http://localhost:3001/api/auth/me \
  -H "Cookie: ripnel_session=YOUR_TOKEN"

# Respuesta debe incluir los mismos permisos
```

### 6. Testing de Componentes

#### Verificar que usePermissions funciona:

Crea un archivo temporal de testing:

```typescript
// components/test-permissions.tsx (temporal)
'use client'

import { usePermissions } from "@/hooks/usePermissions"

export function TestPermissions() {
  const {
    hasPermission,
    hasRole,
    canAccessQuickSale,
    getUserRole,
    getUserPermissions
  } = usePermissions()

  return (
    <div style={{ padding: '20px', border: '1px solid red' }}>
      <h3>��� Testing de Permisos</h3>
      <p><strong>Rol actual:</strong> {getUserRole()}</p>
      <p><strong>Permisos:</strong> {JSON.stringify(getUserPermissions())}</p>
      
      <h4>Verificaciones:</h4>
      <ul>
        <li>hasPermission('admin.manage'): {hasPermission('admin.manage') ? '✅' : '❌'}</li>
        <li>hasPermission('sales.pos'): {hasPermission('sales.pos') ? '✅' : '❌'}</li>
        <li>hasRole('ADMIN'): {hasRole('ADMIN') ? '✅' : '❌'}</li>
        <li>canAccessQuickSale(): {canAccessQuickSale() ? '✅' : '❌'}</li>
      </ul>
    </div>
  )
}
```

Importa este componente en una página y verifica que muestre los datos correctos.

### 7. Testing de Protección de Rutas

#### Crear página de testing protegida:

```typescript
// app/(protected)/test-permissions/page.tsx
'use client'

import { usePermissions } from "@/hooks/usePermissions"

export default function TestPermissionsPage() {
  const { hasPermission, getUserRole } = usePermissions()

  return (
    <div>
      <h1>Página de Testing de Permisos</h1>
      <p>Rol: {getUserRole()}</p>

      {hasPermission('admin.manage') && (
        <div style={{ padding: '10px', backgroundColor: '#green', color: 'white' }}>
          ✅ Puedes ver esto porque tienes permiso admin.manage
        </div>
      )}

      {!hasPermission('admin.manage') && (
        <div style={{ padding: '10px', backgroundColor: '#red', color: 'white' }}>
          ❌ No tienes permiso admin.manage
        </div>
      )}

      {hasPermission('sales.pos') && (
        <div style={{ padding: '10px', backgroundColor: '#blue', color: 'white' }}>
          ✅ Puedes ver esto porque tienes permiso sales.pos
        </div>
      )}
    </div>
  )
}
```

Accede a `/test-permissions` y verifica que muestra correctamente según el rol.

## ✅ Checklist de Validación Final

- [ ] Base de datos: Todos los permisos asignados correctamente
- [ ] ADMIN: Ve todas las secciones del sidebar
- [ ] TIENDA: Ve Catálogos, Productos, Precios, Compra, Inventario
- [ ] CAJA: Ve SOLO "Venta Rápida"
- [ ] VENTAS: Ve Productos, Precios, Compra
- [ ] ALMACEN: Ve Transferencias, Inventario
- [ ] El título cambia a "Venta Rápida" para CAJA y "Compra" para otros
- [ ] /api/auth/me retorna permisos correctos
- [ ] usePermissions hook funciona en componentes
- [ ] No se puede acceder a rutas protegidas sin permisos (backend)

## ��� Troubleshooting

### Problema: Sidebar muestra todas las secciones para todos los roles

**Causa:** El hook `useAuth()` no está retornando permisos correctamente

**Solución:**
1. Verifica que `/api/auth/me` retorna `permissions: []` en la respuesta
2. Verifica que el usuario en BD tiene un `role_id` asignado
3. Verifica la migración SQL se ejecutó correctamente

### Problema: CAJA ve "Compra" en lugar de "Venta Rápida"

**Causa:** La lógica de filtrado no está funcionando correctamente

**Solución:**
1. Verifica que `user?.role_name` es exactamente "CAJA" (mayúsculas)
2. Revisa la consola del navegador para errores de JavaScript
3. Limpia el caché del navegador (Ctrl + Shift + Del)

### Problema: El hook usePermissions retorna undefined

**Causa:** Se está usando fuera del AuthProvider

**Solución:**
```typescript
// ❌ Incorrecto
function MyComponent() {
  const perms = usePermissions() // Error si está fuera de AuthProvider
}

// ✅ Correcto
function MyComponent() {
  const perms = usePermissions() // Debe estar dentro de AuthProvider
}

// En layout.tsx:
<AuthProvider>
  <MyComponent /> {/* Ahora funciona */}
</AuthProvider>
```

## ��� Matriz de Referencia Rápida

```
┌────────┬───────────┬──────────┬──────────┬──────────┬───────────┬───────────┐
│ Rol    │ Admin     │ Catalogs │ Products │ Prices   │ Transfers │ Sales/Inv │
├────────┼───────────┼──────────┼──────────┼──────────┼───────────┼───────────┤
│ ADMIN  │ ✅ (7/7)  │ ✅ (7/7) │ ✅ (7/7) │ ✅ (7/7) │ ✅ (7/7)  │ ✅ (7/7)  │
│ TIENDA │ ❌        │ ✅ (5/7) │ ✅ (5/7) │ ✅ (5/7) │ ❌        │ ✅ (5/7)  │
│ CAJA   │ ❌        │ ❌       │ ❌       │ ❌       │ ❌        │ ✅ (1/7)  │
│ VENTAS │ ❌        │ ❌       │ ✅ (3/7) │ ✅ (3/7) │ ❌        │ ✅ (3/7)  │
│ ALMACEN│ ❌        │ ❌       │ ❌       │ ❌       │ ✅ (2/7)  │ ✅ (2/7)  │
└────────┴───────────┴──────────┴──────────┴──────────┴───────────┴───────────┘
```

Números entre paréntesis = permisos asignados / total
