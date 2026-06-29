# Validacion minima de historial y detalle de ventas

## Objetivo

Validar el circuito de consulta comercial de ventas de la epica `RP-169`:

- listar ventas reales desde backend;
- filtrar y buscar sin romper la pantalla;
- abrir un detalle existente;
- contrastar cabecera, lineas y pagos con base de datos;
- dejar una nota breve lista para Jira.

## Precondiciones

Ejecutar o verificar:

1. `database/seed_access_control.sql`
2. `database/seed_operational_mvp.sql`
3. `database/seed_variants_inventory.sql`
4. `database/seed_style_size_prices.sql`
5. `database/seed_sales_mvp.sql`
6. `database/seed_sales_confirmed_demo.sql`

Si estas usando el dataset MVP local, el usuario de referencia es:

- `ventas`
- `ventas123`

## Caso funcional minimo

1. Iniciar sesion con un usuario de ventas que tenga sede default.
2. Ir a `Historial de ventas`.
3. Confirmar que el listado carga.
4. Filtrar por estado `Confirmadas`.
5. Filtrar por una fecha que incluya ventas demo.
6. Buscar por numero de venta, por ejemplo `N-900001`, `B-900001` o `F-900001`.
7. Abrir una venta desde el listado.
8. Confirmar en el detalle:
   - cliente;
   - vendedor;
   - sede;
   - lineas;
   - pagos;
   - resumen y consistencia.
9. Volver al historial.
10. Entrar a `Nueva venta` y confirmar que el flujo sigue navegando a detalle o historial sin friccion.

## Validaciones esperadas

- el historial muestra numero, cliente, vendedor, sede, estado y total;
- los filtros por estado y fecha responden sin romper la vista;
- la busqueda encuentra ventas por numero o cliente;
- el detalle abre una venta real de la sede operativa;
- la suma de lineas coincide con cabecera;
- la suma de pagos coincide con el total;
- una venta inexistente responde con estado visual de no encontrado.

## Contraste con base de datos

Usar `database/validate_sales_history_detail.sql`.

Consulta minima recomendada:

1. ubicar `sale_id` o `sale_number` en historial;
2. correr la query de cabecera;
3. correr la query de lineas;
4. correr la query de pagos y consistencia;
5. comparar contra la pantalla de detalle.

## Evidencia minima para Jira

Nota breve sugerida:

`Probado historial y detalle con la venta <sale_number>. Historial cargo, filtros respondieron, detalle abrio correctamente y cabecera/lineas/pagos coincidieron con BD.`

Si hubo hallazgo:

`Probado historial y detalle con la venta <sale_number>. Se detecto inconsistencia en <campo> y queda pendiente ajuste.`
