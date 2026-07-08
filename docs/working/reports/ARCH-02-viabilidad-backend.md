# ARCH-02: Viabilidad — Documentación de arquitectura backend

> Fecha: 2026-07-08 | Depende de: ARCH-01-A (completado)

---

## Viabilidad: Alta

La arquitectura backend es **altamente consistente y documentable** porque:

1. Los 21 módulos siguen el mismo patrón `routes → controller → service → repo` sin excepción
2. La capa compartida (`shared/`) tiene solo 9 archivos con responsabilidades claras
3. Los middlewares y config son mínimos (6 archivos en total)
4. No hay ORM ni capas de abstracción que compliquen el trazado

---

## Estructura real descubierta

### Capa compartida (`shared/`)

| Archivo | Responsabilidad |
|---|---|
| `db.js` | `query()`, `withTransaction()`, `attachActor()` — wrapper de `pg` |
| `errors.js` | `AppError` — errores de dominio con código y status |
| `jwt.js` | Generación y verificación de JWT |
| `schemas.js` | Schemas Zod para validación de requests |
| `cookies.js` | Configuración de cookies de sesión |
| `email.js` | Envío de correos |
| `numbers.js` | Helpers numéricos |
| `resilience.js` | Patrones de resiliencia (retry, circuit breaker, etc.) |
| `uuid.js` | Generación/validación de UUIDs |

### Middlewares (`middlewares/`)

| Archivo | Propósito |
|---|---|
| `auth.js` | `requireAuth`, `checkPermission` — guards de ruta |
| `error-handler.js` | Captura global de errores, mapeo `AppError` → HTTP |
| `validate.js` | Middleware genérico de validación Zod |

### Config (`config/`)

| Archivo | Propósito |
|---|---|
| `env.js` | Validación de variables de entorno al startup |

### Módulos (21)

Todos siguen el patrón:

```
modules/<dominio>/
  <dominio>.routes.js       # Definición de endpoints + guards + validate
  <dominio>.controller.js   # Extrae params, llama service, responde JSON
  <dominio>.service.js      # Reglas de negocio, validación de dominio
  <dominio>.repo.js         # SQL parametrizado con pg, sin lógica de negocio
  [+ opcionales específicos del dominio]
```

Archivos opcionales por módulo:

| Tipo | Ejemplos | Módulos que lo tienen |
|---|---|---|
| `*-code.js` | Generación de códigos (SKU, location code, catalog code) | `variants`, `locations`, `catalogs`, `styles` |
| `*-access.js` | Guards de permiso específicos del módulo | `cash`, `transfers` |
| `*-schema.js` | Schemas Zod locales del módulo | `cash` |
| `*-errors.js` | Errores de dominio específicos | `cash` |
| `*-pdf.js` | Generación de PDFs (recibos, proformas) | `sales` |
| `*-scope.js` | Filtrado por sede/alcance | `dashboard` |
| `*-inbox.js` | Lógica de bandeja de entrada | `transfers` |

### Excepciones al patrón completo

Solo 1 módulo no tiene las 4 capas: `health` (solo `routes.js` + `controller.js`, endpoint simple de ping).

---

## Plan de documentación

### ARCH-02-A: Documento de arquitectura general (`docs/backend-architecture-standard.md`)

Contenido propuesto:

1. **Estructura de carpetas** — `modules/`, `shared/`, `middlewares/`, `config/`
2. **Contrato interno por módulo** — `routes → controller → service → repo`
3. **Patrones transversales:**
   - `AppError` — cómo lanzar errores de dominio
   - `withTransaction` + `attachActor` — transacciones con auditoría
   - `validate` middleware + Zod schemas
   - `requireAuth` + `checkPermission` guards
   - `query()` — SQL parametrizado con `pg`
4. **Shape de respuesta estándar:** `{ ok, data, total?, error? }`
5. **Convenciones:** CommonJS, snake_case en DB, camelCase en JS, sin ORM, sin acceso directo del frontend a Supabase
6. **Tabla de módulos:** 21 entradas con responsabilidad (1 línea), ruta base de API, y si tiene archivos opcionales
7. **Referencia cruzada** con `seguridad-backend.md`, `backend-pagination-standard.md`, `backend-supabase-workflow.md`, `deploy.md`

**Esfuerzo estimado:** 1 sesión. El patrón es tan regular que el documento se escribe casi por inspección.

### ARCH-02-B: Documentos de dominio por módulo (solo los sin cobertura)

Módulos que ya tienen documentación de dominio:

| Módulo | Documento existente |
|---|---|
| `auth` | `seguridad-backend.md`, `permisos-roles-sidebar.md` |
| `cash` | `cash-functional-spec.md`, `cash-database-spec.md` |
| `products/styles/variants` | `product-flow.md` |
| `roles` | `permisos-roles-sidebar.md` |

Módulos sin documentación de dominio, por prioridad:

| Prioridad | Módulos | Justificación |
|---|---|---|
| Alta | `sales`, `transfers`, `inventory`, `postsales` | Flujos críticos del ERP |
| Media | `customers`, `prices`, `catalogs`, `locations` | Operación comercial frecuente |
| Baja | `dashboard`, `audit`, `notifications`, `chatbot`, `home`, `health` | Soporte o auxiliares |

**Esfuerzo estimado:**
- Alta: 1 sesión por módulo (4 sesiones)
- Media: condensable en 1-2 sesiones (tabla resumen)
- Baja: 1 sesión (tabla resumen)

---

## Recomendación

Ejecutar en este orden:

1. **ARCH-02-A primero** — el documento de arquitectura general es el de mayor retorno. Captura el patrón que explica todos los módulos.
2. **ARCH-02-B alta** — documentar `sales`, `transfers`, `inventory`, `postsales`. Son los flujos donde una decisión mal informada tiene mayor impacto.
3. **ARCH-02-B media+baja** — tabla resumen con endpoint list y responsabilidad; no requiere documento extenso por módulo.

¿Procedo con ARCH-02-A?
