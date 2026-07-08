# Módulos de soporte — Documentación de dominio

Agrupa los módulos auxiliares: dashboard, auditoría, notificaciones, chatbot, home y health. No modifican stock, caja ni ventas.

---

## Resumen

| Módulo | Ruta API | Endpoints | Permiso | Descripción |
|---|---|---|---|---|
| `dashboard` | `/api/dashboard` | `overview`, `activity`, `sales-by-department`, `commercial-activity` | `dashboard.view` | KPIs del panel principal con alcance por sede |
| `audit` | `/api/audit` | `GET /` | `admin.manage` | Consulta del audit trail (tabla WORM `audit_logs`) |
| `notifications` | `/api/notifications` | `GET /`, `GET /topbar` | Autenticado | Bandeja de notificaciones del usuario |
| `chatbot` | `/api/chatbot` | `POST /messages`, `GET /conversations`, `GET /conversations/:id/messages`, `DELETE /conversations/:id` | Autenticado | Asistente conversacional con Gemini |
| `home` | `/api/home` | `GET /overview` | Autenticado | Datos de la página de inicio |
| `health` | `/health` | `GET /` | Público | Healthcheck del servidor |

---

## Dashboard — `/api/dashboard`

Requiere permiso `dashboard.view`. Filtra datos por sede según el alcance del usuario (`dashboard-scope.js`).

| Endpoint | Descripción |
|---|---|
| `GET /overview` | KPIs principales: total ventas, tickets, productos vendidos |
| `GET /activity` | Actividad reciente de ventas |
| `GET /sales-by-department` | Ventas agrupadas por tipo de prenda |
| `GET /commercial-activity` | Actividad comercial: clientes, frecuencia, ticket promedio |

---

## Audit — `/api/audit`

Endpoint único: `GET /api/audit` (requiere `admin.manage`).

Parámetros de consulta:
```
?table=sales        Filtrar por tabla
?operation=UPDATE   Filtrar por operación (INSERT, UPDATE, DELETE)
?row_id=...         Filtrar por ID de fila
?actor_id=...       Filtrar por usuario que realizó la acción
?from=2026-01-01    Fecha desde
?to=2026-12-31      Fecha hasta
?limit=50           Paginación
```

La tabla `audit_logs` es WORM (sin UPDATE ni DELETE permitidos). Los triggers AFTER en 26 tablas críticas capturan automáticamente cada cambio. El campo `actor_user_id` se obtiene de `current_setting('app.actor_user_id')`, configurado por `withTransaction()` / `attachActor()`.

---

## Notifications — `/api/notifications`

| Endpoint | Descripción |
|---|---|
| `GET /` | Todas las notificaciones del usuario autenticado |
| `GET /topbar` | Notificaciones no leídas para el badge del header |

Sin capa repo propia: el service consulta directamente otras fuentes.

---

## Chatbot — `/api/chatbot`

| Endpoint | Descripción |
|---|---|
| `POST /messages` | Enviar mensaje al asistente (Gemini) |
| `GET /conversations` | Listar conversaciones del usuario |
| `GET /conversations/:id/messages` | Historial de una conversación |
| `DELETE /conversations/:id` | Eliminar conversación |

Usa Gemini API. Requiere `GEMINI_API_KEY` configurada en backend.

---

## Home — `/api/home`

| Endpoint | Descripción |
|---|---|
| `GET /overview` | Datos para la landing page post-login |

---

## Health — `/health`

| Endpoint | Descripción |
|---|---|
| `GET /` | Healthcheck: responde status del servidor |

Único endpoint sin autenticación. Sin service ni repo.
