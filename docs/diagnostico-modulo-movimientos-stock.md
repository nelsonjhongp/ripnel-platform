# Diagnóstico técnico del módulo de movimientos de stock

Fecha de diagnóstico: `2026-05-28`

## Objetivo

Aclara el modelo actual del módulo de movimientos de stock en RIPNEL y deja una propuesta de conceptos y nombres de negocio más consistente para `transferencias`, `kardex` y `aperturas/ajustes`.

Este diagnóstico es acumulativo sobre migraciones y código actual. No se limita al snapshot base `202603250001_ripnel_mvp_v2.sql`.

## Fuentes revisadas

- `supabase/migrations/202603250001_ripnel_mvp_v2.sql`
- `supabase/migrations/202605200001_transfer_approval_flow.sql`
- `supabase/migrations/202604200001_postsales_controlled_mvp.sql`
- `apps/backend/src/modules/inventory/*`
- `apps/backend/src/modules/transfers/*`
- `apps/backend/src/modules/sales/*`
- `apps/backend/src/modules/postsales/*`
- `apps/frontend/components/modules/kardex/*`
- `apps/frontend/components/modules/transfers/*`
- `apps/frontend/components/modules/inventory/*`

## Resumen ejecutivo

- `inventory` representa el saldo actual por sede y variante. Es la vista operativa del stock.
- `stock_movements` representa el historial de eventos de stock. Esa tabla es el soporte real del kardex.
- `stock_transfers` y `stock_transfer_lines` representan un documento logístico entre sedes. La transferencia no toca stock al crearla ni aprobarla; recién impacta en `ship` y `receive`.
- `inventory_adjustments` y `inventory_adjustment_lines` representan un documento formal de regularización. Al confirmar actualiza `inventory` y registra `ADJUST` en `stock_movements`.
- `sales` descuenta stock y registra `OUT` con `reference_type = 'sale'`.
- `postsales` puede devolver stock por anulación o intercambiar stock por cambio, y también registra movimientos.
- Hoy el sistema no deriva `inventory` desde `stock_movements`; la consistencia depende de que cada escritor actualice saldo e historial dentro de la misma transacción.

## Modelo conceptual actual

### 1. Stock actual

- Concepto de negocio: saldo actual disponible por sede y variante.
- Soporte técnico principal: `inventory`.
- Uso principal: consultas operativas, ventas, transferencias y conteos.

### 2. Movimiento de stock

- Concepto de negocio: evento trazable que aumenta, disminuye o corrige stock.
- Soporte técnico principal: `stock_movements`.
- Tipos formales en SQL: `IN`, `OUT`, `ADJUST`.
- Orígenes formales en SQL: `sale`, `transfer`, `exchange`, `adjustment`.

### 3. Kardex

- Concepto de negocio: vista de historial y trazabilidad de movimientos.
- Soporte técnico principal: lectura de `stock_movements`.
- No es un documento. Es una vista de consulta sobre movimientos ya registrados.

### 4. Transferencia

- Concepto de negocio: documento de traslado entre sedes.
- Soporte técnico principal: `stock_transfers`, `stock_transfer_lines`.
- Estados actuales en código: `requested`, `approved`, `shipped`, `received`, `cancelled`.
- Impacto en stock: al despachar sale stock del origen; al recepcionar entra stock al destino.

### 5. Ajuste de inventario

- Concepto de negocio: documento de regularización por conteo, merma, corrección o carga inicial.
- Soporte técnico principal: `inventory_adjustments`, `inventory_adjustment_lines`.
- Estados actuales: `draft`, `confirmed`, `cancelled`.
- Impacto en stock: al confirmar.

### 6. Apertura inicial

- Concepto de negocio: carga inicial de stock antes de operar.
- Estado técnico actual: no es un tipo formal propio.
- Hoy se infiere por `reason` con texto que contenga `apertura` o `inicial`.

## Mapa funcional unificado

| Concepto | Tablas principales | Endpoints actuales | Pantallas actuales | Estados / forma | Momento de impacto en stock | Escritura en kardex |
| --- | --- | --- | --- | --- | --- | --- |
| Stock actual | `inventory` + catálogos | `GET /api/inventory`, `GET /api/inventory/summary/*`, `GET /api/inventory/styles/:styleId` | `Stock actual` | saldo por sede y variante | lectura solamente | no aplica |
| Kardex | `stock_movements` | `GET /api/inventory/kardex` | `Kardex` | historial | lectura solamente | no aplica |
| Transferencia | `stock_transfers`, `stock_transfer_lines` | `GET/POST /api/transfers/*` | `Transferencias`, `Solicitar reposición`, detalle | `requested`, `approved`, `shipped`, `received`, `cancelled` | `ship` descuenta origen, `receive` aumenta destino | sí, `OUT` y `IN` con `reference_type = 'transfer'` |
| Ajuste de inventario | `inventory_adjustments`, `inventory_adjustment_lines`, `inventory`, `stock_movements` | `GET/POST /api/inventory/adjustments*` | `Aperturas y ajustes`, crear ajuste | `draft`, `confirmed`, `cancelled` | `confirm` actualiza saldo al conteo físico | sí, `ADJUST` con `reference_type = 'adjustment'` |
| Apertura inicial | mismas que ajuste | mismo endpoint de ajustes | misma pantalla de ajustes | intención inferida | `confirm` actualiza saldo inicial | sí, `ADJUST`; se interpreta como apertura por `reason` |
| Venta confirmada | `sales`, `sales_details`, `sales_payments`, `inventory`, `stock_movements` | `POST /api/sales`, `GET /api/sales/*` | `Ventas`, `Historial de ventas` | venta confirmada | al confirmar venta | sí, `OUT` con `reference_type = 'sale'` |
| Postventa cambio | `exchanges`, `exchange_lines`, `inventory`, `stock_movements` | `POST /api/postsales/:saleId/exchanges` | `Postventa` | cambio simple | entrada del producto devuelto y salida del reemplazo | sí, `IN` y `OUT` con `reference_type = 'exchange'` |
| Postventa anulación | `sale_cancellations`, `sales_payment_reversals`, `inventory`, `stock_movements` | `POST /api/postsales/:saleId/cancel` | `Postventa` | anulación controlada | reingreso del stock vendido | sí, `IN` con `reference_type = 'sale'` |

## Escritores reales de stock

| Módulo | Operación | Cambio en `inventory` | Movimiento en `stock_movements` | Observaciones |
| --- | --- | --- | --- | --- |
| `transfers` | crear transferencia | no | no | crea documento solamente |
| `transfers` | aprobar transferencia | no | no | valida flujo, no toca stock |
| `transfers` | despachar | descuenta origen | `OUT`, `reference_type = 'transfer'` | usa `reference_line_id` por línea |
| `transfers` | recepcionar | aumenta destino | `IN`, `reference_type = 'transfer'` | usa `reference_line_id` por línea |
| `inventory adjustments` | crear borrador | no | no | captura conteo y diferencia |
| `inventory adjustments` | confirmar ajuste | reemplaza saldo por conteo | `ADJUST`, `reference_type = 'adjustment'` | usa `difference_qty` y `reference_line_id` |
| `sales` | confirmar venta | descuenta sede operativa | `OUT`, `reference_type = 'sale'` | no guarda `reference_line_id` |
| `postsales` | cambio simple | devuelve una variante y descuenta otra | `IN` y `OUT`, `reference_type = 'exchange'` | usa `reference_line_id` |
| `postsales` | anulación controlada | devuelve stock vendido | `IN`, `reference_type = 'sale'` | usa `reference_line_id`, pero comparte `reference_type` con la venta original |

## Diferencia real entre transferencias, kardex y aperturas/ajustes

### Transferencias

- Son documentos operativos entre sedes.
- Tienen ciclo logístico propio.
- Su unidad principal es la solicitud/traslado, no el movimiento individual.
- El kardex solo refleja el efecto de la transferencia cuando se concreta el despacho o la recepción.

### Kardex

- Es una vista de trazabilidad.
- No expresa por sí solo el flujo documental completo.
- Resume eventos `IN`, `OUT` y `ADJUST` ya confirmados.
- Una transferencia, una venta o un ajuste pueden generar varias líneas de kardex.

### Aperturas y ajustes

- Son documentos de regularización.
- No viven como evento aislado: primero nacen en borrador, luego se confirman o cancelan.
- La apertura inicial hoy no existe como documento distinto, sino como ajuste con una intención inferida.

## Hallazgos y desalineaciones

### 1. Transferencias tienen una evolución de esquema que no se entiende si se mira solo la migración base

- El SQL base define `stock_transfers` con estados `draft`, `shipped`, `received`, `cancelled`.
- El código actual ya trabaja con `requested`, `approved`, `shipped`, `received`, `cancelled`.
- La migración `202605200001_transfer_approval_flow.sql` corrige esta diferencia y agrega `approved_by` y `approved_at`.
- Conclusión: para este módulo ya no alcanza revisar solo el snapshot base; hay que leer migraciones posteriores.

### 2. “Apertura inicial” no es un tipo formal, sino una interpretación por texto libre

- Frontend construye motivos como `Apertura inicial` o `Apertura inicial - ...`.
- Kardex detecta apertura buscando `/apertura|inicial/i` en `reason`.
- Esto vuelve frágil la clasificación de negocio y acopla semántica operativa a un texto editable.

### 3. `reference_type` distingue familias de documento, pero no distingue todas las operaciones de negocio

- `sale` se usa tanto para la venta confirmada como para la anulación controlada de la venta.
- `adjustment` se usa tanto para ajuste como para apertura inicial.
- El sistema termina dependiendo de `reason` y del signo operativo para explicar el movimiento real.

### 4. La trazabilidad por línea no es consistente en todos los orígenes

- Transferencias, ajustes y cambios guardan `reference_line_id`.
- La venta confirmada no guarda `reference_line_id` porque su helper de inserción no lo soporta.
- La anulación de venta sí guarda `reference_line_id`.
- Esto deja a ventas con menor granularidad de trazabilidad que el resto del módulo.

### 5. La escritura de movimientos no está centralizada

- `inventory` expone `insertStockMovement` y `upsertInventoryQty`.
- `transfers`, `postsales` y `inventory adjustments` reutilizan esa capa.
- `sales` mantiene su propio `insertStockMovementInTx` y `decrementInventoryInTx`.
- Esto duplica reglas de escritura y aumenta el riesgo de divergencia funcional.

### 6. El alcance operativo por sede no es homogéneo entre módulos

- `sales` y `transfers` sí resuelven contexto operativo del actor.
- `inventory` resumen por productos y sedes sí usa `resolveInventoryScope`.
- `listKardex`, `listAdjustments`, `searchVariantsForAdjustment` y `createAdjustment` validan permiso, pero no aplican el mismo scoping operativo por sedes.
- Conclusión: el dominio de movimientos de stock hoy tiene reglas de visibilidad heterogéneas.

### 7. UI y backend no expresan exactamente el mismo modelo conceptual

- La UI dice `Aperturas y ajustes`, lo que sugiere dos tipos documentales.
- Backend expone solo `adjustments`; apertura es una intención.
- La UI de transferencias ya usa un lenguaje documental correcto.
- La UI de kardex ya habla de trazabilidad, pero el nombre de la ruta sigue viviendo bajo `/api/inventory/kardex`.

### 8. El permiso de ajustes no está expresado de forma uniforme

- Backend protege ajustes con `inventory.adjust`.
- Sidebar muestra `Aperturas y ajustes` con `inventory.view` más restricción por roles.
- La página también refuerza acceso por rol.
- Esto no rompe el flujo actual para `ADMIN` y `ALMACEN`, pero mezcla permiso funcional con rol explícito y visibilidad de menú.

## Propuesta de conceptos y nombres de negocio

### Taxonomía recomendada

- `Stock actual`: saldo vigente por sede y variante.
- `Movimiento de stock`: evento individual que entra al historial.
- `Kardex`: vista o reporte del historial de movimientos.
- `Transferencia`: documento de traslado entre sedes.
- `Ajuste de inventario`: documento de regularización.
- `Apertura inicial`: subtipo operativo de ajuste de inventario.

### Mapeo recomendado

| Superficie actual | Nombre recomendado de negocio | Lectura técnica recomendada |
| --- | --- | --- |
| `Stock actual` | `Stock actual` | correcto; representa `inventory` |
| `Kardex` | `Movimientos de stock (Kardex)` | mantener `Kardex` como nombre funcional, pero tratarlo como historial/trazabilidad |
| `Aperturas y ajustes` | `Ajustes de inventario` | `Apertura inicial` debe quedar como intención/subtipo del ajuste |
| `Solicitar reposición` | `Solicitar transferencia` o `Solicitud de traslado` | hoy el flujo soporta más que reposición clásica |
| `/api/inventory/kardex` | alias vigente | conceptualmente debería pertenecer a `stock movements`, aunque se mantenga por compatibilidad |
| `/api/inventory/adjustments` | correcto como documento | conviene explicitar que maneja ajustes y aperturas iniciales |
| `stock_movements` | `movimientos de stock` | correcto; es el ledger operativo |
| `inventory` | `stock actual` o `saldo actual` | correcto; es snapshot, no historial |

## Criterios para una futura refactorización

### Prioridad 1. Formalizar semántica operativa

- Convertir `apertura inicial` en tipo explícito de documento o subtipo persistido.
- Evaluar si la anulación de venta necesita un `reference_type` o `operation_type` más claro que `sale`.

### Prioridad 2. Centralizar escritura de stock

- Unificar en una sola capa transaccional la actualización de `inventory` y la inserción en `stock_movements`.
- Eliminar duplicación de helpers entre `sales` e `inventory`.

### Prioridad 3. Normalizar trazabilidad

- Hacer obligatorio el manejo consistente de `reference_line_id` cuando exista línea origen.
- Centralizar constantes de `movement_type` y `reference_type`.

### Prioridad 4. Normalizar alcance operativo por sede

- Reutilizar una sola estrategia de scoping para kardex, ajustes, ventas y transferencias.
- Evitar que algunas vistas dependan solo de permiso global y otras de contexto operativo.

### Prioridad 5. Alinear nombre de negocio con contrato técnico

- Mantener compatibilidad en endpoints actuales.
- Ajustar títulos, breadcrumbs y ayudas de UI para que “documento”, “movimiento” e “historial” no se mezclen.

## Escenarios de validación del diagnóstico

- Crear transferencia: no debe afectar `inventory` ni escribir en kardex.
- Aprobar transferencia: no debe afectar `inventory` ni escribir en kardex.
- Despachar transferencia: debe descontar origen y registrar `OUT`.
- Recepcionar transferencia: debe aumentar destino y registrar `IN`.
- Crear ajuste borrador: no debe afectar `inventory` ni escribir en kardex.
- Confirmar ajuste: debe actualizar `inventory` al conteo y registrar `ADJUST`.
- Apertura inicial: hoy debe comportarse como ajuste confirmado y clasificarse por `reason`.
- Confirmar venta: debe descontar stock y registrar `OUT`.
- Cambio simple: debe reingresar una variante, sacar otra y registrar ambos movimientos.
- Anulación controlada: debe reingresar stock y registrar `IN` asociado a la venta.

## Conclusión

El módulo ya tiene una base funcional coherente, pero todavía mezcla tres capas distintas:

- documentos operativos (`transferencias`, `ajustes`);
- saldo actual (`inventory`);
- historial de eventos (`kardex` / `stock_movements`).

La mejora más importante no es visual sino semántica: separar con claridad documento, movimiento y saldo. A partir de esa separación, la refactorización natural es centralizar la escritura de stock, formalizar subtipos operativos y unificar el alcance por sede.
