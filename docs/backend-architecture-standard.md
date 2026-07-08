# Backend Architecture Standard

## Objetivo

Este documento define la estructura, patrones y convenciones del backend de RIPNEL. Es la referencia canónica para entender cómo están organizados los 21 módulos, cómo se comunican las capas y qué decisiones de arquitectura gobiernan el código.

La fuente de verdad para implementación es `apps/backend/src/`. Si este documento y el código difieren, prevalece el código.

---

## 1. Estructura de carpetas

```
apps/backend/src/
├── server.js              Punto de entrada: crea el servidor HTTP
├── app.js                 Configuración de Express: CORS, helmet, rutas, middlewares
├── config/
│   └── env.js             Validación de variables de entorno al startup
├── middlewares/
│   ├── auth.js            requireAuth, requirePermission, requireAnyPermission
│   ├── error-handler.js   notFoundHandler, errorHandler (mapeo AppError → HTTP)
│   └── validate.js        Middleware genérico de validación con Zod
├── shared/
│   ├── db.js              query(), withTransaction(), attachActor() — wrapper de pg
│   ├── errors.js          AppError — error de dominio con statusCode y código
│   ├── schemas.js         Schemas Zod compartidos para validación de requests
│   ├── jwt.js             Generación y verificación de JWT
│   ├── cookies.js         Configuración de cookies de sesión
│   ├── email.js           Envío de correos
│   ├── numbers.js         Helpers numéricos
│   ├── resilience.js      Patrones de resiliencia (retry, circuit breaker)
│   └── uuid.js            Generación y validación de UUIDs
└── modules/
    └── <dominio>/         Un módulo por dominio de negocio (21 módulos)
        ├── <dominio>.routes.js
        ├── <dominio>.controller.js
        ├── <dominio>.service.js
        └── <dominio>.repo.js
```

### Dónde va cada tipo de código

| Capa | Responsabilidad |
|---|---|
| `routes.js` | Definir endpoints HTTP, aplicar guards (`requireAuth`, `checkPermission`) y middleware (`validate`) |
| `controller.js` | Extraer parámetros del request, llamar al service, enviar respuesta JSON. Sin lógica de negocio |
| `service.js` | Reglas de negocio, validación de dominio, coordinación entre repos. Lanza `AppError` en caso inválido |
| `repo.js` | SQL parametrizado con `$N` placeholders. Sin lógica de negocio, sin validación |
| `shared/` | Utilidades transversales sin dependencia de dominio |
| `middlewares/` | Funciones de pipeline de Express reutilizables |

---

## 2. Contrato interno por módulo

Cada módulo sigue este patrón. El módulo `customers` es la referencia canónica.

### 2.1 Routes (`customers.routes.js`)

```js
const express = require('express');
const { requireAuth, requireAnyPermission } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');
const { createCustomer: createCustomerSchema } = require('../../shared/schemas');
const { getCustomers, createCustomer } = require('./customers.controller');

const router = express.Router();

router.get('/', requireAuth, requireAnyPermission(['customers.manage', 'sales.pos']), getCustomers);
router.post('/', requireAuth, requireAnyPermission(['customers.manage', 'sales.pos']), validate(createCustomerSchema), createCustomer);

module.exports = router;
```

Reglas:
- Un archivo `routes.js` por módulo, exporta un `express.Router()`
- Guards de auth antes del controller: `requireAuth`, `requirePermission(key)`, `requireAnyPermission([...])`
- Validación de body con `validate(schema)` entre guards y controller
- Todos los handlers delegan errores con `next(error)`

### 2.2 Controller (`customers.controller.js`)

```js
const { listCustomers } = require('./customers.service');

async function getCustomers(req, res, next) {
  try {
    const { document_type, sort, q, page, limit } = req.query;
    const result = await listCustomers({ documentType: document_type, sort, q, page, limit });
    res.json({ ok: true, data: result.rows, total: result.total });
  } catch (error) {
    next(error);
  }
}
```

Reglas:
- Extrae parámetros de `req.query`, `req.params` o `req.body`
- Convierte snake_case (query params) a camelCase (args del service)
- Llama al service, construye el response JSON
- Siempre `res.json({ ok: true, data, total? })` para éxito
- Errores delegados con `next(error)`, nunca con `res.status().json()` manual

### 2.3 Service (`customers.service.js`)

```js
const { AppError } = require('../../shared/errors');
const { findAllCustomers, createCustomer } = require('./customers.repo');

async function listCustomers({ documentType, sort, q, page, limit }) {
  const sortOrder = sort === 'asc' ? 'asc' : 'desc';
  return findAllCustomers({ documentType, sort: sortOrder, q, page, limit });
}

async function createNewCustomer(form) {
  const normalized = normalizeDocument(form);
  validateDocumentByType(normalized);
  return createCustomer(normalized);
}
```

Reglas:
- Contiene las reglas de negocio y validación de dominio
- Lanza `new AppError(message, statusCode, { code, details })` para errores predecibles
- Usa constantes locales (`ALLOWED_DOCUMENT_TYPES`) para reglas de dominio sin duplicar en shared
- Llama al repo para acceso a datos, puede coordinar múltiples llamadas al repo
- No accede a `req` ni `res` — solo recibe datos planos y retorna datos planos

### 2.4 Repo (`customers.repo.js`)

```js
const { query } = require('../../shared/db');

async function findAllCustomers({ documentType, sort, q, page, limit }) {
  const params = [];
  const conditions = [];

  if (documentType && documentType !== 'all') {
    params.push(documentType);
    conditions.push(`c.document_type = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query(
    `SELECT c.* FROM customers c ${where} ORDER BY c.created_at DESC`,
    params
  );

  return { rows: result.rows, total: result.rows.length };
}
```

Reglas:
- Solo recibe datos planos, retorna datos planos (`{ rows, total }`)
- SQL explícito con `$N` placeholders — nunca interpolar strings del usuario
- Sin lógica de negocio, sin validación, sin `AppError`
- Sin acceso a `req`, `res`, ni `next`
- Usa `query()` de `shared/db.js` para consultas simples
- Para operaciones transaccionales, recibe `tx.query` desde el service que llamó `withTransaction()`

---

## 3. Patrones transversales

### 3.1 `AppError` — errores de dominio

```js
// shared/errors.js
class AppError extends Error {
  constructor(message, statusCode, options = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode || 500;
    this.code = options.code || null;       // Código de error legible por frontend
    this.details = options.details || null;  // Detalle por campo (ej. errores de Zod)
  }
}

// Uso:
throw new AppError('El cliente ya existe con ese documento', 409, { code: 'DUPLICATE_CUSTOMER' });
throw new AppError('Validation failed', 400, { code: 'VALIDATION_ERROR', details: [...] });
```

El `errorHandler` (ver 3.5) captura `AppError` y construye la respuesta JSON con `ok: false`, `message`, `code` y `details`.

### 3.2 `query()` — SQL parametrizado

```js
// shared/db.js
const pool = new Pool({ connectionString: env.databaseUrl, ssl: buildSslConfig() });

async function query(text, params) {
  return pool.query(text, params);
}
```

Wrapper fino sobre `pg.Pool.query()`. Soporta SSL configurable. Para operaciones que no necesitan transacción.

### 3.3 `withTransaction()` — operaciones transaccionales

```js
const result = await withTransaction(
  { actorUserId: req.auth.sub, actorRole: req.auth.role_name },
  async (tx) => {
    const sale = await createSale(form, tx.query);
    await updateStock(sale.items, tx.query);
    return sale;
  }
);
```

- Abre un cliente del pool, ejecuta `BEGIN`, llama `fn(tx)`, ejecuta `COMMIT`
- Si `fn` lanza error, ejecuta `ROLLBACK`
- `tx.query` reemplaza a `query()` dentro de la transacción
- `actorUserId` y `actorRole` configuran variables de sesión (`app.actor_user_id`, `app.actor_role`) que los triggers de auditoría leen para el audit trail
- Uso recomendado: en el service para operaciones que modifican múltiples tablas

### 3.4 `validate` middleware — validación Zod

```js
// middlewares/validate.js
router.post('/', validate(createCustomerSchema), createCustomer);
```

Valida `req.body` contra un schema Zod. Si falla, responde `400` con `VALIDATION_ERROR` y `details` por campo. Los schemas compartidos viven en `shared/schemas.js`; los esquemas locales del módulo pueden vivir en `*-schema.js`.

### 3.5 `errorHandler` — captura global

```js
// middlewares/error-handler.js
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const payload = {
    ok: false,
    message: statusCode >= 500 ? 'Internal server error' : err.message,
  };
  if (err.code && statusCode < 500) payload.code = err.code;
  if (err.details && statusCode < 500) payload.details = err.details;
  res.status(statusCode).json(payload);
}
```

- Captura todo error no manejado en controllers
- `AppError` → mapea `statusCode`, `code` y `details` al response
- Errores 500+ → mensaje genérico, detalles ocultos, log en consola
- `notFoundHandler` captura rutas no definidas → 404

### 3.6 Guards de autenticación y permisos

```js
const { requireAuth, requirePermission, requireAnyPermission } = require('../../middlewares/auth');

// Requiere sesión activa
router.get('/', requireAuth, getItems);

// Requiere permiso específico
router.delete('/:id', requireAuth, requirePermission('admin.manage'), deleteItem);

// Requiere al menos uno de varios permisos
router.get('/', requireAuth, requireAnyPermission(['customers.manage', 'sales.pos']), getItems);
```

- `requireAuth`: verifica JWT (cookie `session`), rechaza si expirado/revocado/no autenticado
- `requirePermission(key)`: verifica que `req.auth.permissions` contenga `key`
- `requireAnyPermission([...])`: verifica que al menos una de las claves esté presente
- Los permisos disponibles están documentados en `docs/permisos-roles-sidebar.md`

---

## 4. Shape de respuesta estándar

### Éxito

```json
{
  "ok": true,
  "data": { ... } | [ ... ],
  "total": 123
}
```

- `ok: true` siempre presente
- `data`: objeto o array con los datos solicitados
- `total`: presente solo en respuestas paginadas (conteo total sin límite)

### Error

```json
{
  "ok": false,
  "message": "El cliente ya existe con ese documento",
  "code": "DUPLICATE_CUSTOMER"
}
```

- `ok: false` siempre presente
- `message`: descripción legible del error
- `code`: código de error para que el frontend pueda reaccionar programáticamente (opcional)
- `details`: array de errores por campo en errores de validación (opcional)

### Convenciones de naming

- `page` y `limit` como query params de paginación (estándar en `backend-pagination-standard.md`)
- `total` como conteo en la respuesta (no `total_pages`, `has_next`, etc.)
- snake_case en query params (`document_type`), camelCase en JS (`documentType`)

---

## 5. Convenciones

### Lenguaje y módulos

- **CommonJS** (`require`/`module.exports`). No usar ESM mientras el proyecto lo use
- **Sin ORM**. SQL explícito con `pg` y placeholders `$N`
- **Sin acceso directo del frontend a Supabase** para operaciones ERP. El frontend consume el backend, el backend consume PostgreSQL

### Naming

- DB: `snake_case` (tablas, columnas)
- JS: `camelCase` (variables, parámetros, keys de response)
- Archivos: `kebab-case` o `domain.capa.js` (ej. `customers.repo.js`)
- Rutas API: prefijo `/api/<dominio>` en inglés y sin guiones (ej. `/api/pricing-rules` es la única excepción)

### SQL y datos

- Placeholders `$N` siempre, sin interpolar strings del usuario
- Sin `SELECT *` sin control (preferir columnas explícitas en queries con JOIN)
- Sin DELETE físico salvo que el dominio lo justifique (preferir soft-delete con columna `active`)
- Códigos y SKUs los genera el backend, el frontend solo muestra preview u override puntual

---

## 6. Módulos

| # | Módulo | Ruta API | Responsabilidad | Capas | Archivos extra |
|---|---|---|---|---|---|
| 1 | `auth` | `/api/auth` | Login, logout, refresh, cambio de contraseña | R-C-S-R | `session-cookie.js` |
| 2 | `users` | `/api/users` | CRUD de usuarios, asignación de sede/rol | R-C-S-R | — |
| 3 | `roles` | `/api/roles` | CRUD de roles y matriz de permisos | R-C-S-R | — |
| 4 | `locations` | `/api/locations` | CRUD de ubicaciones/sedes | R-C-S-R | `locations-code.js` |
| 5 | `catalogs` | `/api` | CRUD genérico de catálogos (tallas, colores, tipos de prenda, etc.) | R-C-S-R | `catalogs-code.js`, `catalogs.config.js` |
| 6 | `styles` | `/api/styles` | CRUD de estilos de producto | R-C-S-R | `styles-code.js`, `style-technical-profiles.*` |
| 7 | `variants` | `/api/variants` | CRUD de variantes, generación de SKU | R-C-S-R | `variants-sku.js` |
| 8 | `prices` | `/api/prices` | CRUD de precios por variante/sede | R-C-S-R | — |
| 9 | `pricing-rules` | `/api/pricing-rules` | Reglas de precio mayorista y descuentos | R-C-S-R | (sub-módulo de `prices/`) |
| 10 | `products` | `/api/products` | Vista unificada de producto (estilo + variantes + precios + stock) | R-C-S-R | — |
| 11 | `inventory` | `/api/inventory` | Stock actual, ajustes, movimientos, kardex | R-C-S-R | — |
| 12 | `transfers` | `/api/transfers` | Solicitud, aprobación, despacho y recepción de transferencias | R-C-S-R | `transfers-access.js`, `transfers-inbox.js` |
| 13 | `customers` | `/api/customers` | CRUD de clientes, búsqueda, validación de documento | R-C-S-R | — |
| 14 | `sales` | `/api/sales` | Creación de venta, historial, detalle, comprobantes PDF | R-C-S-R | `sales-receipt-pdf.js`, `sales-proforma-pdf.js` |
| 15 | `postsales` | `/api/postsales` | Cancelaciones, cambios/devoluciones de ventas | R-C-S-R | — |
| 16 | `cash` | `/api/cash` | Apertura/cierre de caja, arqueo, historial, control administrativo | R-C-S-R | `cash-access.js`, `cash-schema.js`, `cash.errors.js` |
| 17 | `dashboard` | `/api/dashboard` | Métricas y KPIs del panel principal | R-C-S-R | `dashboard-scope.js` |
| 18 | `home` | `/api/home` | Datos de la página de inicio | R-C-S-R | — |
| 19 | `notifications` | `/api/notifications` | Bandeja de notificaciones del usuario | R-C-S | — |
| 20 | `audit` | `/api/audit` | Consulta del audit trail (WORM) | R-C-S-R | — |
| 21 | `chatbot` | `/api/chatbot` | Asistente conversacional (Gemini) | R-C-S-R | — |
| 22 | `health` | `/health` | Healthcheck del servidor | R-C | — |

Leyenda de capas: **R** = routes, **C** = controller, **S** = service, **R** = repo.

### Excepciones al patrón completo

- `health`: endpoint simple sin lógica de negocio (solo routes + controller)
- `notifications`: sin repo (consume otros módulos)
- `catalogs`: monta en `/api` directamente (sin subruta), con `catalogs.config.js` que define qué tablas son catalogables
- `pricing-rules`: sub-módulo de `prices/` con ruta propia `/api/pricing-rules`

---

## 7. Referencia cruzada

| Documento | Cubre |
|---|---|
| `docs/api-conventions.md` | Cómo consumir el backend: quickstart, autenticación, respuestas, códigos de error, permisos |
| `docs/seguridad-backend.md` | Helmet, rate limiting, Zod schemas, SQL injection, pruebas de seguridad |
| `docs/backend-pagination-standard.md` | Estándar de paginación server-side, capas, anti-patrones |
| `docs/backend-supabase-workflow.md` | Migraciones, seeds, política de códigos, orden técnico de módulos |
| `docs/permisos-roles-sidebar.md` | Sistema de permisos, roles, matriz, sidebar, guards |
| `docs/deploy.md` | Variables de entorno, CI/CD, migraciones, audit trail |
| `docs/cash-functional-spec.md` | Especificación funcional del módulo de caja |
| `docs/cash-database-spec.md` | Esquema de base de datos del módulo de caja |
| `docs/product-flow.md` | Flujo de producto, catálogos, estilos, variantes, SKU |
| `docs/frontend-architecture-standard.md` | Arquitectura del frontend (contraparte de este documento) |
