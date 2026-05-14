# Seguridad - Backend

## 1. Validación de variables de entorno al startup

**Archivo:** `apps/backend/src/config/env.js`

Al cargar el módulo, se ejecuta `validateEnv()` que verifica que existan `DATABASE_URL` y `JWT_SECRET`. Si falta alguna, el proceso termina con un mensaje claro en consola y `process.exit(1)`. Esto evita errores opacos en runtime cuando la configuración es incorrecta.

```js
REQUIRED_VARS = [
  ['DATABASE_URL', 'Database connection string'],
  ['JWT_SECRET', 'JWT signing secret'],
];
```

---

## 2. Helmet (headers de seguridad HTTP)

**Middleware global** agregado en `apps/backend/src/app.js`.

```js
app.use(helmet());
```

Establece los siguientes headers en todas las respuestas:

| Header | Valor |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Strict-Transport-Security` | `max-age=15552000; includeSubDomains` |
| `X-DNS-Prefetch-Control` | `off` |
| `X-Download-Options` | `noopen` |
| `X-Permitted-Cross-Domain-Policies` | `none` |
| `X-XSS-Protection` | `0` (desactivado, se prefiere CSP) |
| `Content-Security-Policy` | configurado por defecto de helmet |
| `Referrer-Policy` | `no-referrer` |

---

## 3. Rate limiting

### Global (en app.js)
```js
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 20,                     // máximo 20 intentos
});
```

### En login (auth.routes.js)
Rate limiter específico para `POST /api/auth/login` — 20 intentos por ventana de 15 minutos. Al exceder el límite, responde con `429 Too Many Requests` y código `RATE_LIMIT_EXCEEDED`.

```js
router.post('/login', loginLimiter, validate(loginSchema), login);
```

### Límite de tamaño de body
```js
app.use(express.json({ limit: '1mb' }));
```

---

## 4. Validación de esquemas con Zod

### Middleware genérico
**Archivo:** `apps/backend/src/middlewares/validate.js`

```js
validate(schema, source = 'body')
```

Valida `req[source]` contra un schema Zod. Si falla, responde con `400` y detalle de los campos inválidos:

```json
{
  "ok": false,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    { "path": "username", "message": "username is required" }
  ]
}
```

### Schemas definidos
**Archivo:** `apps/backend/src/shared/schemas.js`

| Schema | Endpoints protegidos |
|---|---|
| `login` | `POST /api/auth/login` |
| `changePassword` | `POST /api/auth/change-password` |
| `createUser` | `POST /api/users` |
| `patchUser` | `PATCH /api/users/:userId` |
| `createCustomer` | `POST /api/customers` |
| `patchCustomer` | `PATCH /api/customers/:customerId` |
| `createSale` | `POST /api/sales` |

Validaciones clave por schema:

- **login**: `username` y `password` requeridos, al menos 1 caracter cada uno.
- **createUser**: `full_name`, `username`, `role_id` (UUID válido), `assignments` (array no vacío con `location_id` UUID y `is_default` booleano).
- **patchUser**: todos los campos opcionales, `role_id` acepta UUID o null.
- **createCustomer**: `document_type` enum (`none`, `dni`, `ruc`, `ce`, `passport`), `customer_type` enum (`retail`, `wholesale`).
- **patchCustomer**: todos los campos opcionales.
- **createSale**: `document_type` enum, `payment_method` enum, `items` (array mínimo 1 item con `variant_id` UUID y `quantity` entero positivo), `payments` opcional con `method` enum y `amount` positivo.

---

## 5. SQL Injection — Protección existente

Ya estaba implementada antes de este cambio. Todos los `.repo.js` usan consultas parametrizadas con `$N` placeholders a través de `pg`. Los datos del usuario nunca se interpolan directamente en el SQL.

```js
// Ejemplo de auth.repo.js — patrón usado en todos los repos
const result = await query(
  `select ... from users u where u.username = $1 and u.active = true limit 1`,
  [username]  // parámetro separado del SQL
);
```

La validación con Zod (punto 4) agrega una capa adicional: payloads maliciosos o con tipos incorrectos son rechazados antes de llegar a la capa de servicio/repositorio.

---

## 6. Pruebas de seguridad automatizadas

**Archivo:** `apps/backend/src/__tests__/security.test.js`
**Framework:** `node:test` (built-in Node 22)
**Ejecución:** `npm test` en `apps/backend`

24 tests distribuidos en 4 suites:

### Suite 1: Zod schema validation (unit)
- **SQL injection en login**: payloads como `' OR 1=1 --` pasan como strings — el backend los trata como datos parametrizados, no como SQL.
- **SQL injection en createUser**: `'; DROP TABLE users; --` en `full_name` es aceptado como string válido (luego se parametriza).
- **SQL injection en createCustomer**: texto SQL en `full_name` se acepta como string.
- **SQL injection en createSale**: payloads SQL en `notes` se aceptan como strings.
- **Casos de rechazo**: campos vacíos, UUIDs inválidos, tipos incorrectos, document_type inválido, arrays vacíos, cantidades negativas, métodos de pago inválidos.

### Suite 2: Validation middleware (integration)
- Body inválido → 400 con `VALIDATION_ERROR` y `details` array.
- Body válido → 200 con datos transformados.
- SQL injection en campos → 200 (confirmación de que no hay falsos positivos).

### Suite 3: Rate limiter (integration)
- 5 requests exitosos (200).
- 6to request bloqueado (429).

### Suite 4: Helmet headers (integration)
- Verifica `x-content-type-options: nosniff`.
- Verifica `x-frame-options: SAMEORIGIN`.
- Verifica `strict-transport-security` presente.

---

## Resumen de archivos modificados/creados

| Archivo | Acción |
|---|---|
| `apps/backend/package.json` | Modificado — se agregaron dependencias y script `test` |
| `apps/backend/src/config/env.js` | Modificado — se agregó `validateEnv()` startup |
| `apps/backend/src/app.js` | Modificado — se agregó `helmet()`, rate limiter, body size limit |
| `apps/backend/src/middlewares/validate.js` | **Creado** — middleware genérico de validación Zod |
| `apps/backend/src/shared/schemas.js` | **Creado** — schemas Zod para endpoints críticos |
| `apps/backend/src/modules/auth/auth.routes.js` | Modificado — se agregó rate limiter + validate |
| `apps/backend/src/modules/users/users.routes.js` | Modificado — se agregó validate en create/patch |
| `apps/backend/src/modules/customers/customers.routes.js` | Modificado — se agregó validate en create/patch |
| `apps/backend/src/modules/sales/sales.routes.js` | Modificado — se agregó validate en create |
| `apps/backend/src/__tests__/security.test.js` | **Creado** — 24 tests de seguridad |
| `docs/seguridad-backend.md` | **Creado** — este documento |
