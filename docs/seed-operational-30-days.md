# Seed operativo de 30 dias

## Objetivo

Dejar una historia operativa de 30 dias sobre Supabase de desarrollo usando el subset demo actual del repo, con ingresos por ajustes formales, transferencias y ventas confirmadas.

## Archivo

- `database/seed_operational_30_days.sql`

## Orden de ejecucion recomendado

1. `database/seed_access_control.sql`
2. `database/seed_operational_mvp.sql`
3. `supabase/seed.sql`
4. `supabase/seed_styles_legacy.sql`
5. `database/seed_variants_inventory.sql`
6. `database/seed_style_size_prices.sql`
7. `database/seed_sales_mvp.sql`
8. `database/seed_operational_30_days.sql`

## Precondiciones

- La base destino debe ser Supabase de desarrollo, no produccion.
- Deben existir usuarios operativos activos `almacen` y `ventas`.
- Deben existir sedes activas `ALM-CENT`, `TD-CENT` y `TD-MONT`.
- Deben existir las variantes demo del subset actual:
  `JOG-FTER`, `LEG-SUP`, `POL-FLIC`, `SHO-CHA`.
- Deben existir clientes demo `SALE-CLI-001`, `SALE-CLI-002` y `SALE-CLI-003`.
- Deben existir precios retail vigentes para todas las ventas demo del seed.

## Comportamiento de reejecucion

- El seed limpia solo su propio dataset demo.
- Usa prefijos `A30D-`, `T30D-` y `SEED-30D:` para localizar y reconstruir documentos.
- Reescribe solo el subset demo en `ALM-CENT`, `TD-CENT` y `TD-MONT`.

## Resultado esperado

- 8 ajustes confirmados:
  3 aperturas y 5 ingresos posteriores.
- 6 transferencias recibidas.
- 30 ventas confirmadas con pago unico.
- Kardex con movimientos `ADJUST`, `IN` y `OUT`.
- Stock final deterministico validado por sede y SKU al final del script.
