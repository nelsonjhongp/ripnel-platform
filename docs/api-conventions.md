# API Conventions — Cómo consumir el backend desde el frontend

> Documento de consulta rápida. Si necesitás detalle de arquitectura, reglas de negocio o endpoints por módulo, usá los documentos referenciados en cada sección. Si este documento y el código difieren, prevalece el código.

---

## 0. Quickstart — patrones reales

Estos ejemplos están extraídos del código del frontend (`transfers-history-page.tsx`, `use-transfer-draft.ts`).

### GET con `useApiGet` (lectura de datos con filtros)

```tsx
import { apiFetch, type ApiEnvelope, unwrapApiData } from "@/lib/api";
import { useApiGet } from "@/hooks/use-api-get";

const { data, loading, error, refetch } = useApiGet<TransferSummary[]>(
  () => {
    const params = new URLSearchParams({ scope, status });
    if (query) params.set("query", query);
    return apiFetch<ApiEnvelope<TransferSummary[]> | TransferSummary[]>(
      `/api/transfers?${params}`, { cache: "no-store" }
    ).then((payload) => unwrapApiData(payload) || []);
  },
  [debouncedQuery, scope, status]
);
```

### POST con `apiFetch` (mutación)

```tsx
import { apiFetch, unwrapApiData } from "@/lib/api";
import { showSuccess } from "@/lib/toast";

const payload = await apiFetch<ApiEnvelope<{ transfer_id: string }>>(
  "/api/transfers",
  {
    method: "POST",
    body: JSON.stringify({ from_location_id, to_location_id, lines }),
  }
);
const data = unwrapApiData(payload);
showSuccess("Transferencia creada");
```

### Manejo de errores

```tsx
import { formatApiFetchError } from "@/lib/api";
import { showError } from "@/lib/toast";

try {
  const result = await apiFetch<ApiEnvelope<Sale>>("/api/sales", { method: "POST", body: JSON.stringify(form) });
} catch (err) {
  showError(formatApiFetchError(err, "Error al crear la venta"));
}
```

### APIs disponibles

| Utilidad | Archivo | Propósito |
|---|---|---|
| `apiFetch<T>(path, init)` | `lib/api.ts` | Fetch wrapper: cookies, 401 dispatch, ApiError |
| `apiFetchData<T>(path, init)` | `lib/api.ts` | Igual que `apiFetch` pero extrae `.data` automáticamente |
| `unwrapApiData(payload)` | `lib/api.ts` | Extrae `.data` de `{ ok, data }` |
| `ApiError` | `lib/api.ts` | Error con `.status`, `.code`, `.message`, `.details` |
| `formatApiFetchError(err, fallback)` | `lib/api.ts` | Mensaje en español según status code |
| `useApiGet<T>(fetcher, deps)` | `hooks/use-api-get.ts` | Hook con `{ data, loading, error, refetch }` y abort automático |
| `usePagination(total, pageSize)` | `hooks/use-pagination.ts` | Hook de paginación client-side |
| `showSuccess(msg)` / `showError(msg)` | `lib/toast.ts` | Toasts Sonner |

---

## 1. Autenticación

- Las cookies de sesión (`session`, `refresh`) se envían con `credentials: "include"` (configurado en `apiFetch`)
- Al recibir 401, `apiFetch` dispara `AUTH_ERROR_EVENT`. El `AuthProvider` escucha el evento y redirige a `/login`
- `GET /api/auth/me` retorna `{ user, permissions }` — el frontend lo consume al montar `AuthProvider`
- El backend valida autenticación con `requireAuth` en la ruta, y permisos con `requirePermission(key)` o `requireAnyPermission([...])`
- Para suprimir el redirect automático en 401 (ej. chequeo silencioso), usar `{ suppressAuthEvent: true }` en `apiFetch`

> Ver también: `seguridad-backend.md` (helmet, rate limiting, Zod), `permisos-roles-sidebar.md` (roles y matriz)

---

## 2. Shape de respuesta

### Éxito

```json
{ "ok": true, "data": { ... } | [ ... ], "total": 123 }
```

- `ok: true` siempre presente
- `data`: objeto o array con los datos solicitados
- `total`: presente solo en respuestas paginadas (conteo total sin límite)
- El frontend puede llamar `unwrapApiData(payload)` para extraer `.data`, o usar `apiFetchData()` que lo hace automáticamente

### Error

```json
{ "ok": false, "message": "Descripción del error", "code": "CASH_OPEN_REQUIRED", "details": [...] }
```

- `ok: false` siempre presente
- `message`: descripción legible
- `code`: código de error para reaccionar programáticamente
- `details`: array de errores por campo en errores de validación

El frontend recibe esto como `ApiError` con `.status`, `.message`, `.code`, `.details`.

---

## 3. Paginación

| Query param | Tipo | Default | Max | Descripción |
|---|---|---|---|---|
| `page` | number | — | — | Página (1-indexed). Si no se envía, se devuelven todos los resultados |
| `limit` | number | 20 | 100 | Ítems por página |

Response: `{ data: [...], total: 123 }`. El frontend calcula `totalPages = Math.ceil(total / limit)`.

En el frontend, usar `usePagination(total, pageSize)` de `hooks/use-pagination.ts` que expone `{ paginatedItems, totalPages, safePage, setPage }`.

> Ver también: `backend-pagination-standard.md` (contrato completo, capas, anti-patrones)

---

## 4. Códigos de error

### Autenticación y sesión (401)

| Código | Significado |
|---|---|
| `AUTH_REQUIRED` | No autenticado |
| `SESSION_EXPIRED` | Sesión expiró |
| `SESSION_REVOKED` | Sesión revocada |
| `INVALID_SESSION` | Sesión inválida |
| `INVALID_REFRESH` | Refresh token inválido |
| `REFRESH_EXPIRED` | Refresh token expirado |
| `REFRESH_REUSE` | Reuso de refresh token detectado |
| `PASSWORD_CHANGE_REQUIRED` | Debe cambiar contraseña |

### Autorización (403)

| Código | Significado |
|---|---|
| `FORBIDDEN` | Sin permiso para la operación |
| `FORBIDDEN_ROLE` | Rol no autorizado |
| `CSRF_ORIGIN_REQUIRED` | Falta header de origen |
| `CSRF_ORIGIN_DENIED` | Origen no coincide con sesión |

### Validación (400)

| Código | Significado |
|---|---|
| `VALIDATION_ERROR` | Error de validación Zod (`.details` tiene errores por campo) |
| `INVALID_DATE_FROM` / `INVALID_DATE_TO` | Rango de fechas inválido |
| `INVALID_DATE_RANGE` | `date_from` > `date_to` |
| `INVALID_STATUS` | Estado no permitido en filtro |

### Operación bloqueada (409)

| Código | Significado | Acción sugerida |
|---|---|---|
| `CASH_OPEN_REQUIRED` | Caja no abierta en la sede | Mostrar diálogo de apertura |
| `CASH_ALREADY_CLOSED_FOR_DATE` | Caja ya cerrada | Mostrar estado bloqueante |
| `DEFAULT_LOCATION_REQUIRED` | Usuario sin sede default | Asignar sede al usuario |
| `DEFAULT_LOCATION_INACTIVE` | Sede default inactiva | Activar sede o cambiar asignación |
| `POSTSALE_EXCHANGE_BLOCKED` | Cambio bloqueado (`.details` explica por qué) | Mostrar razones |
| `POSTSALE_CANCEL_BLOCKED` | Anulación bloqueada (`.details` explica por qué) | Mostrar razones |
| `TRANSFER_STATUS_CHANGED` | La transferencia cambió de estado | Refrescar datos |
| `TRANSFER_REQUEST_STOCK_CHANGED` | Stock insuficiente al aprobar | Mostrar nuevo stock |
| `TRANSFER_APPROVAL_STOCK_CHANGED` | Stock cambió durante aprobación | Refrescar |
| `SALE_NUMBER_CONFLICT` | Conflicto de numeración | Reintentar automáticamente |

### Rate limiting (429)

| Código | Significado |
|---|---|
| `RATE_LIMIT_EXCEEDED` | Demasiados intentos (login/refresh) |
| `RATE_LIMITED` | Chatbot saturado |

### Configuración (500)

| Código | Significado |
|---|---|
| `CONFIG_ERROR` | Variable de entorno faltante (JWT_SECRET, GEMINI_API_KEY) |

### Dominio específico

| Código | Módulo | Significado |
|---|---|---|
| `POSTSALE_REASON_REQUIRED` | postsales | Falta motivo de anulación/cambio |
| `POSTSALE_CASH_BLOCKED` | postsales | Caja cerrada bloquea postventa |
| `SALE_NOT_FOUND` | postsales | Venta no encontrada |
| `INVALID_SALE_ID` | postsales | ID de venta inválido |
| `SALE_DETAIL_NOT_FOUND` | postsales | Línea de venta no encontrada |
| `REPLACEMENT_VARIANT_NOT_FOUND` | postsales | Variante de reemplazo no existe |
| `REPLACEMENT_STOCK_INSUFFICIENT` | postsales | Sin stock del producto de reemplazo |
| `REPLACEMENT_PRICE_NOT_FOUND` | postsales | Sin precio para variante de reemplazo |
| `ACCOUNT_LOCKED` | auth | Cuenta bloqueada por intentos fallidos |

---

## 5. Permisos

El backend expone los permisos del usuario en `GET /api/auth/me` como array de strings en el JWT. El frontend los consume en `AuthProvider`:

```tsx
import { useAuth } from "@/components/auth/AuthProvider";
const { has, permissions } = useAuth();
if (has("sales.pos")) { /* ... */ }
```

El sidebar, guards de ruta (`ProtectedGuard`) y controles de UI usan `has()` para mostrar/ocultar. El backend valida cada endpoint con `requirePermission(key)` o `requireAnyPermission([...])` — el frontend filtra la UI, pero la autoridad final es el backend.

> Ver también: `permisos-roles-sidebar.md` (lista completa, matriz por rol, sidebar)

---

## 6. Dónde encontrar el contrato real de cada módulo

El archivo `apps/backend/src/modules/<dominio>/<dominio>.routes.js` es la fuente canónica de endpoints, guards y validación de cada módulo. La tabla completa de módulos con sus rutas API está en `backend-architecture-standard.md` §6. Los documentos de dominio (`*-domain.md`) explican reglas de negocio y flujos.

Si este documento y el código difieren, **prevalece el código.**
