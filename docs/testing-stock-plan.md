# Plan de pruebas Playwright para Stock

Fecha base: `2026-06-24` en `America/Lima`.

## Objetivo

Cubrir con Playwright la logica critica del modulo de stock sin depender de flujos e2e fragiles mientras el modulo sigue cambiando.

El alcance actual del modulo incluye:

- stock actual: `/inventario`
- detalle por producto: `/inventario/[styleId]`
- movimientos de stock: `/inventario/movimientos`
- ajustes de inventario: `/inventario/ajustes`
- creacion y confirmacion de ajustes: `/inventario/ajustes/nuevo`

## Enfoque recomendado

La configuracion actual de `apps/frontend/playwright.config.ts` usa Playwright como runner de tests unitarios (`__tests__/*.test.ts`). Por eso la estrategia mas estable es dividir la cobertura en 3 capas:

1. utilidades puras y dominio compartido
2. integracion de backend para reglas de negocio de inventario
3. pruebas manuales guiadas para UI operativa y permisos

## Cobertura implementada en esta entrega

Archivo nuevo:

- `apps/frontend/__tests__/inventory-stock-utils.test.ts`

Cobertura agregada:

- `inventory-summary-shared.ts`
  - normalizacion de filtros de estado
  - tono visual por estado de stock
  - formateo de contadores y resumen talla/color
- `inventory-adjustments-shared.ts`
  - agrupacion de variantes por estilo
  - inferencia y resolucion de intencion (`opening` vs `adjustment`)
  - construccion de motivo final
  - etiquetas y clases semanticas
  - clases de diferencia positiva, negativa y neutra
- `kardex-domain.ts`
  - deteccion de apertura inicial
  - resolucion de familia documental
  - resolucion de direccion del movimiento
  - resolucion de origen semantico
  - labels operativos y referencia corta
  - traduccion de filtros UI -> parametros backend

## Matriz de cobertura completa

### Fase 1. Dominio compartido frontend

Estado: cubierto en esta entrega.

- normalizacion de filtros
- etiquetas semanticas
- conteos y resumenes
- reglas de agrupacion
- mapeos de kardex

### Fase 2. Backend de inventario

Estado: parcialmente cubierto por `apps/backend/src/__tests__/inventory-phase2.test.js`.

Agregar o reforzar estos casos:

- `listSummaryProducts`
  - filtro por `location_id`
  - filtro por `status`
  - filtro por `garment_type`
  - scoping por sedes asignadas
- `getStyleInventoryDetail`
  - sede invalida fuera del scope
  - matriz vacia en sede sin stock
  - metadatos de sedes disponibles
- `listKardex`
  - filtros combinados por fecha, `reference_type` y `movement_type`
  - priorizacion de `semantic_origin`
  - consistencia de `balance_qty`
- `createAdjustmentDraft`
  - rechazo sin lineas
  - rechazo sin sede
  - rechazo con variante fuera de scope
- `confirmAdjustment`
  - aplica diferencias positivas
  - aplica diferencias negativas
  - genera `stock_movements`
  - idempotencia o rechazo de doble confirmacion
- `cancelAdjustment`
  - no permite confirmar luego de cancelar

## Plan manual operativo

### Prerrequisitos

Verificar:

1. `database/seed_operational_demo.sql`
2. `database/seed_variants_inventory.sql`
3. `database/seed_access_control.sql`
4. migracion principal `supabase/migrations/202603250001_ripnel_mvp_v2.sql`
5. permisos de `inventory.view` e `inventory.adjust`

### Casos felices

1. Stock actual

- abrir `/inventario`
- cambiar sede
- filtrar por estado
- abrir detalle de un producto

Esperado:

- los totales cambian segun filtros
- el detalle mantiene `location_id` en URL
- el boton "Ver historial completo" lleva a kardex con query del producto

2. Kardex

- abrir `/inventario/movimientos`
- filtrar por sede
- filtrar por transferencia
- buscar por SKU o style code

Esperado:

- las filas corresponden a la sede visible
- el label de origen coincide con venta, transferencia, cambio o ajuste
- la referencia corta muestra el prefijo correcto

3. Ajuste de inventario

- abrir `/inventario/ajustes/nuevo`
- seleccionar sede
- buscar variantes
- agregar una o varias lineas
- cambiar conteo
- guardar borrador
- confirmar ajuste

Esperado:

- se genera numero de ajuste
- la confirmacion redirige al detalle
- el stock final cambia en la sede
- kardex registra movimiento `ADJUST`

### Casos borde

1. Usuario sin permiso `inventory.adjust`

- abrir `/inventario/ajustes`
- abrir `/inventario/ajustes/nuevo`

Esperado:

- se muestra `ForbiddenPage`

2. Conteo sin lineas

- intentar guardar borrador vacio

Esperado:

- la UI bloquea la accion
- aparece error claro

3. Cambio de sede con draft armado

- agregar lineas
- cambiar sede

Esperado:

- no se mezclan variantes de otra sede
- el draft no confirma datos inconsistentes

4. Movimiento con filtros vacios

- limpiar filtros en kardex

Esperado:

- vuelve a estado base
- no quedan parametros residuales en URL

## Comandos utiles

Desde `apps/frontend`:

```bash
npm run test
```

Solo la suite nueva:

```bash
npx playwright test __tests__/inventory-stock-utils.test.ts
```

Backend inventario:

```bash
cd apps/backend
npm test -- inventory-phase2.test.js
```

## Criterio de cierre recomendado

El modulo de stock puede darse por cubierto a nivel MVP cuando:

- la suite frontend de dominio de stock esta verde;
- `inventory-phase2.test.js` cubre listados, detalle, kardex y ajustes;
- existe al menos una prueba manual exitosa de ajuste confirmado;
- existe al menos una prueba manual de rechazo por permisos;
- existe trazabilidad verificable en `inventory` y `stock_movements`.
