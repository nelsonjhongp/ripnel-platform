# Flujo funcional de caja MVP

## Objetivo

Definir el comportamiento minimo de apertura y cierre de caja por sede y fecha para el modulo `Caja y cierre diario`.

## Roles autorizados

- `ADMIN`
- `CAJA`

Los demas roles no deben ver la UI de caja ni operar sus rutas backend.

## Contexto operativo

- La sede operativa sale de la sede default del usuario autenticado.
- La fecha de negocio se resuelve en `America/Lima`.
- Solo puede existir una caja por `location_id + business_date`.

## Estados

- `open`
- `closed`

## Apertura

1. El usuario autorizado entra a `Caja`.
2. Si no existe caja para su sede y fecha, puede abrirla.
3. La apertura crea un registro en `cash_closings` con estado `open`.

### Si ya existe caja para la fecha

- si ya existe una caja `open`, el sistema reutiliza esa caja como actual;
- si ya existe una caja `closed`, la apertura se rechaza con `409`;
- no hay reapertura en este MVP.

## Cierre

1. Solo una caja `open` puede cerrarse.
2. El cierre calcula los totales del dia usando ventas `confirmed` y `sales_payments`.
3. El cierre persiste los totales por metodo en `cash_closings`.
4. La caja queda en estado `closed`.

## Totales del dia

Los totales se calculan por:

- `cash`
- `yape`
- `plin`
- `transfer`
- total general del dia

Solo cuentan ventas:

- de la sede activa;
- con `status = 'confirmed'`;
- cuya fecha de negocio Lima coincide con la caja consultada.

## Consistencia minima

- el total general de ventas confirmadas se compara contra la suma de pagos del dia;
- si existe diferencia, la UI debe mostrar advertencia de consistencia;
- la deteccion de diferencia no habilita reapertura ni cambia el estado de caja automaticamente.

## Restricciones

- un usuario sin sede default recibe respuesta operativa y no puede abrir caja;
- un usuario con rol no autorizado recibe `403`;
- una caja de otra sede no puede consultarse ni cerrarse;
- una caja cerrada no puede volver a cerrarse.

## Fuera de alcance

- reaperturas;
- arqueo manual;
- faltantes o sobrantes;
- multiples cajas en la misma sede y fecha;
- conciliacion externa;
- UI avanzada de auditoria.
