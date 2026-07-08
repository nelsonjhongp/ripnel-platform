# Postsales — Documentación de dominio

## Propósito

El módulo `postsales` gestiona las operaciones posteriores a una venta confirmada: anulaciones (cancelación de venta) y cambios (exchange de producto). Ambas operaciones afectan el inventario, los pagos y el estado de la venta original.

## Endpoints

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/api/postsales/eligible` | `sales.postsale.view` | Ventas elegibles para postventa con estado de disponibilidad |
| `GET` | `/api/postsales/:saleId` | `sales.postsale.view` | Detalle de postventa de una venta (disponibilidad, cambios, anulación) |
| `POST` | `/api/postsales/:saleId/exchanges` | `sales.postsale.exchange` | Registrar cambio de producto |
| `POST` | `/api/postsales/:saleId/cancel` | `sales.postsale.cancel` | Anular venta completa |

## Permisos

| Permiso | Operación |
|---|---|
| `sales.postsale.view` | Ver ventas elegibles y detalle de postventa |
| `sales.postsale.exchange` | Registrar cambios de producto |
| `sales.postsale.cancel` | Anular ventas |

## Disponibilidad de postventa (`GET /api/postsales/:saleId`)

Al consultar una venta, el backend calcula qué operaciones están disponibles:

```
{
  sale: { ... },
  details: [ ... ],
  exchanges: [ ... ],        // Cambios ya registrados
  cancellation: { ... } | null,  // Anulación si existe
  availability: {
    exchange_allowed: boolean,
    exchange_reasons: string[],   // Razones si no permitido
    cancel_allowed: boolean,
    cancel_reasons: string[]      // Razones si no permitido
  }
}
```

### Condiciones que bloquean cambios

- Venta no está en estado `confirmed`
- Venta ya fue anulada (`cancelled`)
- Venta no tiene líneas operativas
- Ya existe una anulación registrada
- Caja de la sede para el día de la venta está cerrada

### Condiciones que bloquean anulaciones

- Las mismas que para cambios
- Ya existen cambios registrados (debe resolverse primero)

## Anulación de venta (`POST /api/postsales/:saleId/cancel`)

```
1. Validar disponibilidad (mismas reglas que arriba)
2. Validar motivo de anulación (requerido)
3. Transacción:
   → UPDATE sales SET status = 'cancelled'
   → INSERT en sale_cancellations (motivo, usuario)
   → Por cada pago original: INSERT en payment_reversals (reversión)
   → Por cada línea de venta:
       - Devolver stock al inventario (upsert + cantidad positiva)
       - INSERT en stock_movements (tipo CANCEL)
   → COMMIT atómico
```

Reglas:
- Se revierten todos los pagos (no hay reembolso parcial)
- El stock se devuelve a la sede original de la venta
- Una venta anulada no puede reactivarse

## Cambio de producto (`POST /api/postsales/:saleId/exchanges`)

```
1. Validar disponibilidad
2. Validar datos del cambio:
   → return_items: array de { sale_detail_id, quantity } — qué se devuelve
   → exchange_items: array de { variant_id, quantity, unit_price? } — qué se entrega
   → payment_settlement: { method, amount } — ajuste de diferencia de precio (opcional)

3. Transacción:
   → INSERT en exchanges (header con número de cambio)
   → Por cada return_item:
       - Devolver stock al inventario
       - INSERT en stock_movements (tipo EXCHANGE_RETURN)
   → Por cada exchange_item:
       - Validar stock suficiente
       - Descontar stock del inventario
       - INSERT en stock_movements (tipo EXCHANGE_DELIVERY)
   → Si hay diferencia de precio:
       - INSERT en sale_payments (pago adicional o reembolso)
   → COMMIT atómico
```

Reglas:
- El cambio puede ser parcial (no todas las líneas de la venta)
- Si el producto nuevo es más caro → el cliente paga la diferencia
- Si el producto nuevo es más barato → se registra reembolso
- El precio del producto nuevo se toma del precio actual (retail/wholesale según tipo de cliente)
- Mismos métodos de pago que ventas: cash, yape, plin, transfer

## Estados de venta afectados

| Operación | Estado resultante de la venta |
|---|---|
| Anulación | `cancelled` |
| Cambio | La venta sigue `confirmed`; los cambios se registran en tabla `exchanges` |

## Reglas de negocio clave

- **Una venta no puede anularse si ya tiene cambios:** primero deben resolverse los cambios (no aplica en esta versión — el sistema bloquea la anulación si hay cambios)
- **Caja cerrada bloquea postventa:** si la caja de la sede para el día de la venta ya fue cerrada, no se permiten cambios ni anulaciones
- **Solo ventas confirmadas:** drafts y ventas ya canceladas no son elegibles
- **Reversión de pagos:** la anulación revierte todos los pagos; el cambio ajusta por diferencia
- **Stock se devuelve a la sede original:** tanto en anulación como en cambio

## Integración con otros módulos

| Módulo | Relación |
|---|---|
| `auth` | Validación de usuario |
| `users` | Sede default del usuario |
| `sales` | Lectura de venta original (header, líneas, pagos); inserción de pagos de ajuste |
| `inventory` | Devolución y descuento de stock; stock_movements |
| `cash` | Validación de estado de caja para la fecha de la venta |
| `products/variants` | Validación de variantes en cambio |

## Archivos

```
apps/backend/src/modules/postsales/
  postsales.routes.js      Rutas y guards
  postsales.controller.js  Handlers HTTP
  postsales.service.js     Reglas de negocio (748 líneas)
  postsales.repo.js        Queries SQL (comparte algunas con sales.repo)
```
