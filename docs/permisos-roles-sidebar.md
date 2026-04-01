# Sistema de Permisos y Roles - Documentación

## ��� Resumen

Este documento describe cómo está implementado el sistema de control de permisos y roles en la plataforma Ripnel, incluyendo cómo cada rol puede acceder a diferentes secciones del sidebar.

## ��� Estructura de Permisos en Base de Datos

### Tablas Involucradas

```sql
-- Tabla: roles
CREATE TABLE roles (
  role_id UUID PRIMARY KEY,
  name VARCHAR(30) NOT NULL UNIQUE,  -- ADMIN, TIENDA, CAJA, VENTAS, ALMACEN
  description TEXT,
  active BOOLEAN
);

-- Tabla: permissions
CREATE TABLE permissions (
  permission_id UUID PRIMARY KEY,
  key VARCHAR(80) NOT NULL UNIQUE,
  description TEXT
);

-- Tabla: role_permissions (relación muchos-a-muchos)
CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(role_id),
  permission_id UUID NOT NULL REFERENCES permissions(permission_id),
  PRIMARY KEY (role_id, permission_id)
);
```

### Permisos Disponibles

| Clave | Descripción |
|-------|-------------|
| `admin.manage` | Administración: roles, usuarios, ubicaciones |
| `catalogs.manage` | Catálogos maestros (tallas, colores, telas, etc.) |
| `products.manage` | Estilos y variantes |
| `prices.manage` | Precios y reglas comerciales |
| `transfers.manage` | Transferencias de stock |
| `inventory.view` | Inventario y kardex |
| `sales.pos` | Venta rápida / compra |

## �� Matriz de Roles y Permisos

| Rol | admin.manage | catalogs.manage | products.manage | prices.manage | transfers.manage | inventory.view | sales.pos |
|-----|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **ADMIN** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **TIENDA** | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **CAJA** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **VENTAS** | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **ALMACEN** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |

## ��� Secciones del Sidebar por Rol

### ADMIN
Acceso completo a todas las secciones:
- ✅ Administración (Roles y usuarios, Ubicaciones)
- ✅ Catálogos (Tallas, Colores, Tipo de prenda, etc.)
- ✅ Productos (Estilos, Variantes)
- ✅ Precios (Listado, Crear/editar, Regla mayorista)
- ✅ Transferencias (Listado, Crear, Recepciones)
- ✅ **Venta Rápida** (Nueva compra, Checkout, Pago)
- ✅ Inventario (Stock actual, Kardex, Historial)

### TIENDA
Operación de ventas y consultas:
- ❌ Administración
- ✅ Catálogos
- ✅ Productos
- ✅ Precios
- ❌ Transferencias
- ✅ **Compra** (Nueva compra, Checkout, Pago)
- ✅ Inventario

### CAJA
Solo venta rápida y cierre diario:
- ❌ Administración
- ❌ Catálogos
- ❌ Productos
- ❌ Precios
- ❌ Transferencias
- ✅ **Venta Rápida** (Nueva compra, Checkout, Pago)
- ❌ Inventario

**Nota especial:** El rol CAJA ve "Venta Rápida" en lugar de "Compra"

### VENTAS
Operación comercial y venta rápida:
- ❌ Administración
- ❌ Catálogos
- ✅ Productos
- ✅ Precios
- ❌ Transferencias
- ✅ **Compra** (Nueva compra, Checkout, Pago)
- ❌ Inventario

### ALMACEN
Operación de stock y movimientos internos:
- ❌ Administración
- ❌ Catálogos
- ❌ Productos
- ❌ Precios
- ✅ Transferencias (Listado, Crear, Recepciones)
- ❌ Compra
- ✅ Inventario

## ��� Flujo de Autenticación y Permisos

### 1. Login
```typescript
// Backend: auth.controller.js
const { user, permissions } = await loginWithUsernamePassword({
  username,
  password
});
// El backend obtiene los permisos desde role_permissions según el role_id
```

### 2. Sesión JWT
```typescript
// El token JWT incluye:
{
  sub: user.user_id,
  role_id: user.role_id,
  role_name: user.role_name,
  permissions: string[] // Ej: ["sales.pos", "inventory.view"]
}
```

### 3. Frontend Auth Provider
```typescript
// components/auth/AuthProvider.tsx
export const useAuth() => {
  // Proporciona:
  user: AuthUser
  permissions: string[]
  loading: boolean
  has(permissionKey: string): boolean // Verifica si tiene permiso
}
```

## ��� Implementación en Frontend

### AppSidebar.tsx - Lógica de Filtrado

El sidebar filtra grupos basándose en:

1. **Permiso base requerido** (`permission`): Verifica si el usuario tiene el permiso
2. **Restricción de roles específicos** (`onlyForRoles`): Solo muestra si el usuario está en ese rol
3. **Exclusión de roles** (`excludeRoles`): Oculta para ciertos roles

```typescript
const sidebarGroups = [
  // Ejemplo: Venta Rápida (solo CAJA)
  {
    title: "Venta Rápida",
    icon: ShoppingCart,
    permission: "sales.pos",
    onlyForRoles: ["CAJA"],
    items: [...]
  },
  
  // Ejemplo: Compra (todos excepto CAJA)
  {
    title: "Compra",
    icon: ShoppingCart,
    permission: "sales.pos",
    excludeRoles: ["CAJA"],
    items: [...]
  }
]
```

**Lógica de filtrado:**
```typescript
const visibleGroups = sidebarGroups.filter((g) => {
  // 1. Verificar permiso base
  if (g.permission && !has(g.permission)) return false

  // 2. Verificar restricción de roles (onlyForRoles)
  if (group.onlyForRoles && user?.role_name) {
    if (!group.onlyForRoles.includes(user.role_name)) return false
  }

  // 3. Verificar exclusión de roles (excludeRoles)
  if (group.excludeRoles && user?.role_name) {
    if (group.excludeRoles.includes(user.role_name)) return false
  }

  return true
})
```

### Hook usePermissions

Para verificaciones de permisos en otros componentes:

```typescript
import { usePermissions } from "@/hooks/usePermissions"

function MiComponente() {
  const { 
    hasPermission,
    hasRole,
    canAccessQuickSale,
    getUserRole 
  } = usePermissions()

  if (!hasPermission("products.manage")) {
    return <div>Sin acceso</div>
  }

  return <div>Contenido protegido</div>
}
```

**Métodos disponibles:**
- `hasPermission(permissionKey)` - Verifica un permiso específico
- `hasAnyPermission(perms[])` - Verifica si tiene al menos uno
- `hasAllPermissions(perms[])` - Verifica si tiene todos
- `hasRole(role)` - Verifica un rol específico
- `hasAnyRole(roles[])` - Verifica si está en alguno de los roles
- `canAccessQuickSale()` - ¿Puede acceder a Venta Rápida?
- `canAccessAdministration()` - ¿Puede acceder a Administración?
- `canAccessCatalogs()` - ¿Puede acceder a Catálogos?
- `canAccessTransfers()` - ¿Puede acceder a Transferencias?
- `canAccessInventory()` - ¿Puede acceder a Inventario?

## ���️ Protección de Rutas

### Usando ProtectedGuard

```typescript
// components/auth/ProtectedGuard.tsx
<ProtectedGuard 
  permission="admin.manage"
  fallback={<AccessDenied />}
>
  <AdminDashboard />
</ProtectedGuard>
```

### En Layout.tsx

```typescript
// app/(protected)/layout.tsx
export default function ProtectedLayout({ children }) {
  return (
    <ProtectedGuard 
      fallback={<div>No autenticado</div>}
    >
      <AppSidebar>{children}</AppSidebar>
    </ProtectedGuard>
  )
}
```

## ��� Ejemplo de Uso en Componentes

### Mostrar/Ocultar basado en Rol

```typescript
import { usePermissions } from "@/hooks/usePermissions"

function ProductosPage() {
  const { hasRole, canAccessCatalogs } = usePermissions()

  return (
    <div>
      {canAccessCatalogs() && (
        <button>Crear Producto</button>
      )}
      
      {hasRole("ADMIN") && (
        <button>Configuración Avanzada</button>
      )}
    </div>
  )
}
```

### Proteger Formulario

```typescript
import { usePermissions } from "@/hooks/usePermissions"

function PreciosForm() {
  const { hasPermission } = usePermissions()
  const canEdit = hasPermission("prices.manage")

  return (
    <form>
      <input 
        disabled={!canEdit}
        {...priceField}
      />
      {!canEdit && <p>No tienes permiso para editar precios</p>}
    </form>
  )
}
```

## ��� Seguridad

### Backend Validation (IMPORTANTE)

Aunque el frontend filtra el sidebar, **SIEMPRE valida en el backend**:

```javascript
// Backend: auth.routes.js o middleware
router.post('/products', requireAuth, checkPermission('products.manage'), createProduct)

// Middleware de validación
function checkPermission(requiredPermission) {
  return (req, res, next) => {
    const userPermissions = req.auth?.permissions || []
    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}
```

### Flujo de Seguridad

1. **Frontend**: Filtra UI según permisos (experiencia de usuario)
2. **Backend**: Valida permisos antes de procesar (seguridad)
3. **Database**: Row-level security (RLS) si es necesario

## ��� Checklist de Implementación

- ✅ Base de datos: roles, permissions, role_permissions pobladas
- ✅ Backend: `/api/auth/me` retorna user + permissions
- ✅ Frontend: AuthProvider proporciona contexto de autenticación
- ✅ Sidebar: Filtra grupos según permisos y roles
- ✅ Hook usePermissions: Disponible para componentes
- ✅ ProtectedGuard: Protege rutas
- ✅ Backend validation: Cada endpoint valida permisos

## ��� Próximos Pasos (Futuros)

- Implementar page-level permissions en protectedPages array
- Agregar auditoría de acceso (logging)
- Crear dashboard de permisos para ADMIN
- Implementar permisos dinámicos por ubicación
- Row-level security (RLS) en Supabase

## ��� Soporte

Para preguntas sobre la implementación de permisos:
1. Revisar esta documentación
2. Consultar `apps/frontend/components/sidebar/AppSidebar.tsx`
3. Consultar `apps/frontend/hooks/usePermissions.ts`
4. Revisar `database/ripnel_mvp_v2.sql` (tablas de roles y permisos)
