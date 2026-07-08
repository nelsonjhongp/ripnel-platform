# Transfers — Documentación de dominio

## Propósito

El módulo `transfers` gestiona el ciclo completo de transferencias de stock entre sedes: solicitud, aprobación, despacho, recepción y cancelación. Cada etapa avanza el estado de la transferencia y actualiza el inventario en el momento correspondiente.

## Endpoints

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/api/transfers` | `visible` | Listado de transferencias con filtros (estado, sede, fechas, búsqueda) |
| `GET` | `/api/transfers/inbox` | `visible` | Bandeja de entrada: conteos de pendientes por cola de trabajo |
| `GET` | `/api/transfers/pending-receipts` | `receive` | Transferencias pendientes de recepción para la sede del usuario |
| `GET` | `/api/transfers/request-candidates` | `request_create` | Variantes disponibles para solicitar (con stock en otras sedes) |
| `GET` | `/api/transfers/:transferId` | `visible` | Detalle de una transferencia (header + líneas) |
| `POST` | `/api/transfers` | `request_create` | Crear solicitud de transferencia |
| `POST` | `/api/transfers/:transferId/approve` | `approve` | Aprobar solicitud |
| `POST` | `/api/transfers/:transferId/ship` | `ship` | Registrar despacho |
| `POST` | `/api/transfers/:transferId/receive` | `receive` | Registrar recepción |
| `POST` | `/api/transfers/:transferId/cancel` | `visible` | Cancelar transferencia (solo en estado `requested`) |

## Máquina de estados

```
requested → approved → shipped → received
                ↓           ↓
            cancelled    cancelled
```

| Transición | Condición | Efecto en stock |
|---|---|---|
| `requested` | Usuario con permiso `request_create` | Sin efecto (solo registro) |
| `approved` | Usuario con permiso `approve`, transferencia en `requested` | Sin efecto |
| `shipped` | Usuario con permiso `ship`, transferencia en `approved` | **Descuenta stock** de la sede origen |
| `received` | Usuario con permiso `receive`, transferencia en `shipped` | **Incrementa stock** en la sede destino |
| `cancelled` | Solo desde `requested` o `approved` | Sin efecto (stock nunca se movió) |

## Capacidades (permisos granulares)

El archivo `transfers-access.js` define capacidades por rol y sede. Cada endpoint usa `requireTransferCapability(capability)`:

| Capacidad | Quién la tiene | Qué permite |
|---|---|---|
| `visible` | ADMIN, ALMACEN | Ver listados y detalles |
| `request_create` | ADMIN, ALMACEN | Crear solicitudes |
| `approve` | ADMIN | Aprobar solicitudes |
| `ship` | ADMIN, ALMACEN (sede origen) | Despachar |
| `receive` | ADMIN, ALMACEN (sede destino) | Recibir |

## Flujo de creación de solicitud (`POST /api/transfers`)

```
1. Validar sede origen y destino
   → Ambas deben existir y estar activas
   → No pueden ser la misma sede
   → El usuario debe tener acceso a la sede origen

2. Validar líneas
   → Cada línea: variant_id, quantity > 0
   → Las variantes deben existir
   → Se consulta stock disponible en sede origen (informativo, no bloqueante)

3. Insertar
   → INSERT en transfer_headers (estado: requested)
   → INSERT en transfer_lines
   → El backend genera el número de transferencia

4. Nota: no se descuenta stock al solicitar, solo al despachar (shipped)
```

## Flujo de recepción (`POST /api/transfers/:transferId/receive`)

```
1. Validar transferencia en estado shipped
2. Validar usuario con acceso a sede destino
3. Por cada línea:
   → Registrar cantidad recibida (puede ser parcial)
   → Incrementar stock en sede destino (upsert inventory)
   → Registrar stock_movement (tipo TRANSFER_IN)
4. Si todas las líneas están completamente recibidas → estado received
```

## Inbox (bandeja de entrada)

`transfers-inbox.js` calcula 4 colas de trabajo para el usuario actual:

| Cola | Qué agrupa | Condición |
|---|---|---|
| `open_for_store` | Solicitudes creadas por la sede del usuario | status = `requested` |
| `pending_approval` | Solicitudes que requieren aprobación | status = `requested` (ADMIN) |
| `pending_dispatch` | Transferencias aprobadas listas para despachar | status = `approved`, sede origen = sede usuario |
| `pending_receipts` | Transferencias despachadas pendientes de recibir | status = `shipped`, sede destino = sede usuario |

## Reglas de negocio clave

- **Stock no se descuenta al solicitar:** el descuento ocurre en `shipped` (salida de origen) y el incremento en `received` (entrada a destino)
- **Recepción parcial:** se permite recibir menos de lo despachado; la transferencia queda en `shipped` hasta completar
- **Cancelación restringida:** solo desde `requested` o `approved`; una vez `shipped`, no se puede cancelar (requiere transferencia inversa)
- **Sede origen/destino:** siempre deben ser distintas; el usuario debe pertenecer a la sede desde la que opera
- **Numeración:** el backend genera el número de transferencia

## Integración con otros módulos

| Módulo | Relación |
|---|---|
| `auth` | Validación de usuario activo |
| `users` | Sedes del usuario, sede default |
| `locations` | Validación de sedes origen/destino |
| `inventory` | Consulta de stock, upsert en ship/receive, stock_movements |
| `products/variants` | Validación de variantes |

## Archivos

```
apps/backend/src/modules/transfers/
  transfers.routes.js       Rutas y guards de capacidad
  transfers.controller.js   Handlers HTTP
  transfers.service.js      Reglas de negocio (1103 líneas)
  transfers.repo.js         Queries SQL
  transfers-access.js       Capacidades granulares por rol/sede
  transfers-inbox.js        Lógica de bandeja de entrada y conteos
```
