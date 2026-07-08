# Inventory — Documentación de dominio

## Propósito

El módulo `inventory` gestiona la consulta de stock, el kardex (trazabilidad de movimientos) y los ajustes de inventario. Es el punto central de verdad sobre cantidades disponibles por sede y variante.

## Endpoints

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/api/inventory` | `inventory.view` | Stock actual con filtros (sede, producto, estado de stock) |
| `GET` | `/api/inventory/summary/products` | `inventory.view` | Resumen agregado por producto |
| `GET` | `/api/inventory/summary/locations` | `inventory.view` | Resumen agregado por sede |
| `GET` | `/api/inventory/styles/:styleId` | `inventory.view` | Stock de un estilo con detalle por variante |
| `GET` | `/api/inventory/kardex` | `inventory.view` | Historial de movimientos de stock (kardex valorizado) |
| `GET` | `/api/inventory/adjustment-variants` | `inventory.adjust` | Variantes disponibles para incluir en un ajuste |
| `GET` | `/api/inventory/adjustments` | `inventory.adjust` | Listado de ajustes (borrador, confirmados, cancelados) |
| `GET` | `/api/inventory/adjustments/:adjustmentId` | `inventory.adjust` | Detalle de un ajuste (header + líneas) |
| `POST` | `/api/inventory/adjustments` | `inventory.adjust` | Crear ajuste de inventario (borrador) |
| `POST` | `/api/inventory/adjustments/:adjustmentId/confirm` | `inventory.adjust` | Confirmar ajuste (aplica cambios al stock) |
| `POST` | `/api/inventory/adjustments/:adjustmentId/cancel` | `inventory.adjust` | Cancelar ajuste |

## Consulta de stock

```
GET /api/inventory
  ?location_id=     Filtrar por sede
  ?q=               Búsqueda por nombre de producto, SKU o código
  ?stock_status=    available | low | out | incomplete
  ?page=&limit=     Paginación
```

El stock se calcula desde la tabla `inventory` que mantiene cantidades por `(location_id, variant_id)`. Estados de stock:
- `available`: cantidad ≥ 3
- `low`: 1 ≤ cantidad < 3
- `out`: cantidad = 0
- `incomplete`: variantes sin stock en algunas tallas/colores del mismo estilo

## Kardex

```
GET /api/inventory/kardex
  ?variant_id=      Variante específica
  ?location_id=     Sede específica
  ?date_from=&date_to=  Rango de fechas
  ?reference_type=  sale | transfer | exchange | adjustment
  ?page=&limit=     Paginación
```

El kardex lee de `stock_movements`. Cada movimiento registra:
- `variant_id`, `location_id`
- `movement_type`: IN, OUT, ADJUST
- `quantity`: cantidad movida (positiva = entrada, negativa = salida)
- `reference_type` + `reference_id`: trazabilidad al documento origen (sale, transfer, exchange, adjustment)
- `unit_cost`: costo unitario al momento del movimiento
- `created_at`: fecha/hora del movimiento

## Ajustes de inventario

### Máquina de estados

```
draft → confirmed
  ↓
cancelled
```

| Estado | Significado |
|---|---|
| `draft` | Ajuste creado, no aplicado al stock |
| `confirmed` | Ajuste aplicado: stock actualizado, movimientos registrados |
| `cancelled` | Ajuste anulado (solo desde draft) |

### Tipos de ajuste

| Tipo | Disparador | Comportamiento |
|---|---|---|
| `opening` | Motivo contiene "apertura" o "inicial" | Crea stock inicial (ignora cantidad previa) |
| `adjustment` | Cualquier otro motivo | Ajusta stock existente (suma/resta sobre cantidad actual) |

### Flujo de creación y confirmación

```
POST /api/inventory/adjustments (crear borrador)
  → Validar sede y variantes
  → INSERT en adjustment_headers (estado: draft)
  → INSERT en adjustment_lines

POST /api/inventory/adjustments/:id/confirm (aplicar)
  → Validar ajuste en estado draft
  → Por cada línea:
      - Calcular nueva cantidad (opening: reemplazar, adjustment: sumar)
      - upsert inventory (location_id, variant_id)
      - INSERT en stock_movements (tipo ADJUST)
  → UPDATE adjustment_headers → status: confirmed
  → COMMIT atómico
```

## Reglas de negocio clave

- **Stock es atómico:** las operaciones que modifican stock (venta, transferencia, ajuste) usan `withTransaction` para garantizar consistencia
- **Ajuste de apertura:** ignora el stock previo y establece una cantidad inicial. Útil para carga inicial de inventario
- **Ajuste normal:** suma o resta sobre el stock actual. Puede resultar en cantidades negativas (se registra pero se marca)
- **Kardex es append-only:** los movimientos no se modifican ni eliminan; las correcciones se hacen con ajustes
- **Costo:** el costo unitario se registra en el momento del movimiento; no se recalcula retrospectivamente

## Integración con otros módulos

| Módulo | Relación |
|---|---|
| `auth` | Validación de usuario |
| `users` | Sede default y sedes del usuario |
| `locations` | Validación de sedes |
| `products/variants` | Validación de variantes |
| `sales` | Las ventas escriben en inventory (decremento) y stock_movements |
| `transfers` | Los despachos y recepciones escriben en inventory |
| `postsales` | Los cambios y cancelaciones escriben en inventory |

## Archivos

```
apps/backend/src/modules/inventory/
  inventory.routes.js      Rutas y guards
  inventory.controller.js  Handlers HTTP
  inventory.service.js     Reglas de negocio (1016 líneas)
  inventory.repo.js        Queries SQL (compartido con transfers y postsales)
```
