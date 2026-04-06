# Scope de Ventas MVP - Semana 9

Semana 9 del proyecto: `2026-04-06` a `2026-04-12` en `America/Lima`.

## Objetivo unico de la semana

Dejar el flujo de registro de venta operable de punta a punta con backend real, sin comprometer aun historial ni detalle como cierre de sprint.

## Resultado esperado

Al cierre de la semana el equipo debe poder:

- iniciar una nueva venta desde una pantalla interna operada por vendedor;
- asociar un cliente existente o usar cliente generico;
- agregar items reales con stock disponible por sede;
- calcular precios vigentes desde backend;
- registrar un pago simple;
- confirmar la venta;
- descontar stock y dejar trazabilidad de inventario.

## Entra en Semana 9

- flujo interno de venta asistida por vendedor;
- uso de sede default del usuario como contexto operativo;
- cliente existente o cliente generico de mostrador;
- seleccion de variantes con stock disponible;
- precio automatico vigente por item;
- una sola forma de pago por venta;
- registro directo en `sales`, `sales_details` y `sales_payments`;
- salida de stock en `stock_movements`;
- checklist manual de pruebas;
- documentacion minima para Jira y seguimiento.

## No entra en Semana 9

- cambios o devoluciones;
- cierre de caja;
- aperturas y arqueo de caja;
- multiples pagos en una misma venta;
- descuentos manuales o globales;
- override manual de precio;
- comprobantes fiscales avanzados;
- historial de ventas como compromiso del sprint;
- detalle de venta confirmada como compromiso del sprint;
- reportes avanzados;
- anulacion completa de ventas;
- automatizacion de demo final.

## Defaults elegidos para reducir alcance

- `POST /api/sales` registra y confirma la venta en una sola operacion.
- El flujo de UI se modela como "registro de venta", no como carrito ecommerce.
- La sede de venta sale de la sede default del usuario autenticado.
- El pago MVP usa un solo metodo por venta: `cash`, `yape`, `plin` o `transfer`.
- El precio final se resuelve automaticamente desde backend.
- Si falta precio o stock, la venta no se confirma.
- `GET /api/sales` y `GET /api/sales/:saleId` quedan como backlog listo para el siguiente sprint.

## Definition of Done de la semana

Un ticket de esta semana se considera listo cuando:

- el cambio esta implementado;
- el criterio de aceptacion se cumple;
- existe validacion manual minima;
- la prueba realizada queda anotada en el ticket;
- no rompe el flujo base de login, sedes, inventario o precios.

## Responsables por frente

Definir en la planificacion antes de cargar Jira:

- Backend owner: por asignar
- Frontend owner: por asignar
- QA y documentacion owner: por asignar

## Dependencias de contexto

Para que Ventas MVP avance sin bloqueo, ya deben estar disponibles:

- auth y sesion;
- usuarios, roles y permisos base;
- sedes y usuario-sede;
- clientes;
- variantes activas;
- stock por sede;
- precios vigentes por style y talla.

## Historias fuera del sprint pero listas para backlog

- historial de ventas;
- detalle de venta confirmada.
