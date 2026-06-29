# Readiness Check - Semana 9 Ventas MVP

Semana 9 del proyecto: `2026-04-06` a `2026-04-12` en `America/Lima`.

## Objetivo

Confirmar antes de ejecutar el sprint que el equipo tiene contexto, datos y accesos minimos para probar "Nueva venta" sin bloqueos evitables y para dejar lista la base tecnica de caja en paralelo.

## Cuando usarlo

- al inicio del sprint;
- antes de QA manual end-to-end;
- cuando backend o frontend reporten bloqueos de datos;
- antes de mover una historia a Done.

## Evidencia minima esperada

- captura o nota de que existe usuario operativo con sede default;
- salida de consulta que demuestre stock vendible;
- salida de consulta que demuestre precio vigente;
- confirmacion de que existen clientes de prueba, incluido cliente generico de mostrador;
- confirmacion de que existen 3 ventas demo confirmadas para historial, detalle y caja;
- salida de consulta con agregado por metodo de pago y fecha Lima;
- nota breve del owner si hay bloqueos.

## Checklist operativo

### 1. Accesos y contexto operativo

- existe rol con permiso de ventas;
- existe usuario activo para ventas o caja;
- el usuario tiene sede default asignada;
- login y sesion funcionan en frontend;
- las rutas de ventas requieren auth y permiso operativo;
- el flujo visible en UI se identifica como "Nueva venta".

### 2. Datos minimos

- existe al menos una sede `store` activa;
- existen variantes activas con stock en esa sede;
- existe precio vigente retail para esas variantes;
- existen clientes de prueba para mostrador, retail y factura con `customer_id` utilizable;
- existe dataset demo con 3 ventas `confirmed` en `TD-CENT`;
- no hay datos base faltantes para confirmar una venta simple.

### 3. Dependencias tecnicas

- backend confirma contrato minimo para busqueda de items vendibles;
- backend confirma contrato minimo para `POST /api/sales`;
- frontend conoce errores esperados por stock o precio;
- frontend usa la sede default del usuario y no deja elegir ubicacion manual;
- existe una base tecnica documentada para `cash_closings`;
- QA sabe que caja queda habilitada en paralelo solo a nivel dataset, reglas y queries.

## SQL recomendado

Ejecutar despues de:

1. `database/seed_access_control.sql`
2. `database/seed_operational_demo.sql`
3. `database/seed_variants_inventory.sql`
4. `database/seed_style_size_prices.sql`
5. `database/seed_sales_mvp.sql`
6. `database/seed_sales_confirmed_demo.sql`
7. `database/readiness_sales_mvp.sql`

## Criterio para marcar RP-121 como listo

- el checklist esta revisado;
- no hay bloqueos criticos abiertos por permisos, sede default, stock, precios o ventas demo;
- si existe bloqueo, queda anotado en Jira con responsable y siguiente accion;
- el equipo puede arrancar QA del flujo comprometido sin inventar datos;
- un integrante distinto puede usar las consultas base para arrancar backend de caja sin inspeccion manual extra del repo.
