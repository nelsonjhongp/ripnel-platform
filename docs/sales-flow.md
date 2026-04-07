# Flujo funcional de ventas MVP

Semana 9 del proyecto: `2026-04-06` a `2026-04-12` en `America/Lima`.

## Objetivo

Definir el flujo interno de "Nueva venta" que si se compromete en Semana 9 para que backend, frontend, QA y Jira trabajen sobre el mismo comportamiento.

## Actor principal

- vendedor interno autenticado en el sistema.

## Precondiciones

Antes de iniciar una venta debe existir:

- usuario autenticado con permiso operativo de ventas;
- una sede default asignada al usuario;
- clientes base cargados;
- variantes activas con stock en la sede;
- precios vigentes para las tallas vendibles.

## Flujo principal

1. El vendedor entra a "Nueva venta".
2. El sistema toma la sede default del usuario como contexto operativo.
3. El vendedor busca productos o variantes disponibles para esa sede.
4. El vendedor agrega uno o mas items a la venta.
5. El sistema valida stock por item antes de confirmar.
6. El vendedor selecciona un cliente existente o usa cliente generico real de mostrador.
7. El sistema calcula precio vigente por item desde backend.
8. El vendedor define el metodo de pago.
9. El sistema registra la venta en una sola operacion.
10. La venta queda confirmada y genera:
    - cabecera en `sales`;
    - lineas en `sales_details`;
    - pago en `sales_payments`;
    - salida en `stock_movements`.
11. El vendedor ve confirmacion de venta con identificador o referencia operativa.

## Estados del flujo

### UI

- Edicion
- Validando
- Confirmada
- Error

### Base de datos

Para Semana 9 el comportamiento esperado es:

- la venta nace y termina como `confirmed`;
- `draft` y `cancelled` quedan para una iteracion posterior.

## Validaciones minimas

- el usuario debe tener sede default;
- la variante debe existir y estar activa;
- la cantidad debe ser mayor a cero;
- debe existir stock suficiente en la sede;
- debe existir precio vigente aplicable;
- toda venta confirmada debe persistir `customer_id`;
- el total calculado por backend debe ser consistente con los items;
- el monto de pago debe cubrir el total de la venta;
- el metodo de pago debe estar en el set permitido.

## Casos permitidos en MVP

- venta con cliente retail existente;
- venta con cliente generico de mostrador;
- venta con un solo metodo de pago;
- venta con uno o varios items.

## Casos fuera de MVP

- mezcla de varios pagos;
- descuento manual;
- override de precio;
- reserva sin confirmacion;
- anulacion posterior;
- cambio o devolucion;
- modulo de caja y cierre diario end-to-end;
- historial de ventas dentro del alcance de Semana 9;
- detalle de venta confirmada dentro del alcance de Semana 9.

## Efectos esperados de una venta confirmada

- descuenta stock en la sede correcta;
- deja trazabilidad en movimientos;
- no modifica precios ni clientes base.

## Nota de sprint

Historial y detalle pueden quedar preparados como backlog tecnico, pero no forman parte del criterio de cierre de esta semana.

La base tecnica de caja si puede avanzar en paralelo a partir de ventas confirmadas, pagos y fecha de negocio Lima, sin comprometer aun una UI final de cierre diario.

## Contrato tecnico minimo

- `POST /api/sales` toma `customer_id`, `document_type`, `payment_method`, `notes?` e `items[{variant_id, quantity}]`.
- La sede, el vendedor, los snapshots de cliente y el precio final los resuelve backend.
- Las lecturas de ventas y variantes vendibles quedan limitadas a la sede default del usuario autenticado.
