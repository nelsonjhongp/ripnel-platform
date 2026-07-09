# PRODUCT-SEARCH-01: Roadmap de buscadores de productos, variantes y stock

> Estado: Fase 1 implementada y validada parcialmente en POS, transferencias y ajustes. Postventa queda pendiente por falta de venta local en DB (`sales` vacia). Fase 2 iniciada con extraccion local de agrupacion de transferencias.
>
> Alcance: buscadores/selectores frontend que cargan productos, variantes o stock para POS, postventa, transferencias y ajustes.
>
> Decision base: no crear un buscador universal de productos. Mejorar por fases, separando infraestructura tecnica de reglas de dominio.

## Objetivo general

Ordenar y endurecer los buscadores de productos/variantes sin romper la separacion de dominio.

El resultado buscado no es que todos los flujos usen el mismo componente, sino que:

- la busqueda async sea consistente y segura;
- cada flujo mantenga sus datos y reglas propias;
- las diferencias entre POS, postventa, transferencias y ajustes queden intencionales;
- cualquier reutilizacion sea pequena, tecnica y justificada;
- se reduzcan riesgos de resultados obsoletos, handlers grandes y duplicacion que pueda divergir.

## Flujos incluidos

| Flujo | Archivos principales | Endpoint | Motivo de diferencia |
|---|---|---|---|
| Nueva venta / POS | `sales/pos/use-product-search.ts`, `stage-products.tsx`, `product-style-picker.tsx` | `/api/sales/sellable-variants` | Necesita variantes vendibles, stock y precios |
| Postventa / cambio | `postsales/use-replacement-search.ts`, `postsale-exchange-dialog.tsx`, `shared/pickers/product-variant-picker.tsx` | `/api/sales/sellable-variants` | Busca reemplazos vendibles para cambio |
| Transferencias | `transfers-request-page.tsx`, `transfers-request-workspace.tsx`, `transfers-request-ui.tsx` | `/api/transfers/request-candidates` | Necesita stock en otras sedes y fuentes por sede |
| Ajustes de inventario | `inventory-adjustments-create-page.tsx`, `inventory-adjustments-shared.ts` | `/api/inventory/adjustment-variants` | Necesita variantes incluso con stock sistema 0 |
| Base UI | `components/ui/searchable-picker.tsx` | N/A | Combobox reusable para busqueda/lista |

## Principios

- El backend sigue siendo la fuente de verdad para stock, precio, permisos y transacciones.
- El frontend puede hacer validaciones preventivas y ordenamiento UX, pero no decidir reglas finales.
- No unificar endpoints que tienen semantica distinta.
- No crear props por modo como `mode="pos" | "transfer" | "adjustment"` en un componente universal.
- Extraer solo cuando reduzca duplicacion real o riesgo real.
- Mantener componentes de dominio cerca de su modulo cuando el renderizado o la decision operativa sea especifica.

## Patron operativo deseado

El objetivo visual no es que todos los buscadores carguen los mismos datos, sino que el operador entienda siempre el mismo flujo mental:

```text
1. Click/foco en el campo.
2. Se abre el panel si el flujo tiene el contexto minimo.
3. El panel muestra opciones iniciales o una instruccion clara.
4. El operador escribe para acotar la busqueda.
5. Desde el umbral definido, se consulta el backend con debounce.
6. Los resultados muestran datos utiles para decidir en ese flujo.
7. El operador selecciona producto, variante, sede, talla/color o cantidad segun corresponda.
```

### Regla de click/foco

Todos los buscadores operativos deben abrir el panel al click/foco cuando el contexto minimo exista.

Contexto minimo por flujo:

| Flujo | Contexto minimo para abrir panel |
|---|---|
| POS / nueva venta | Sede operativa resuelta |
| Postventa / cambio | Dialogo abierto, permiso y venta elegible para cambio |
| Transferencias | Origen/destino o sede requerida por el flujo ya definida |
| Ajustes | Sede seleccionada |

Si falta contexto, el campo debe quedar deshabilitado o mostrar una indicacion concreta, no abrir una lista vacia ambigua.

### Opciones iniciales vs busqueda remota

El click/foco no significa necesariamente consultar toda la base ni listar todo.

La regla propuesta es:

```text
Click/foco:
  abrir panel.
  mostrar sugerencias iniciales solo si el endpoint es limitado y operativo.

1 caracter:
  no disparar busqueda remota pesada.
  opcionalmente filtrar localmente resultados ya cargados.

2+ caracteres:
  disparar busqueda remota con debounce, AbortController y limpieza de resultados obsoletos.
```

Configuracion esperada por flujo:

| Flujo | Al click/foco | 1 caracter | 2+ caracteres |
|---|---|---|---|
| POS / nueva venta | Puede mostrar catalogo vendible limitado | Filtrar localmente o esperar | Buscar backend |
| Transferencias | Puede mostrar candidatos limitados si ya hay origen/sede | Filtrar localmente o esperar | Buscar backend |
| Postventa / cambio | Mostrar instruccion, no listar todo | Mantener instruccion | Buscar backend |
| Ajustes | Mostrar instruccion, no listar todo | Mantener instruccion | Buscar backend |

### Datos utiles por flujo

Cada resultado debe mostrar la informacion necesaria para decidir en ese proceso operativo:

| Flujo | Datos prioritarios en resultado |
|---|---|
| POS / nueva venta | Producto/style, SKU o codigo, talla/color disponible, stock, precio aplicable |
| Postventa / cambio | Producto/style, SKU, talla/color, stock, precio, diferencia contra producto original |
| Transferencias | Producto/style, talla/color, stock disponible, sede origen o fuentes disponibles |
| Ajustes | Producto/style, SKU, talla/color, stock sistema actual |

### Cuidado de performance

- No cargar listados masivos si el endpoint no tiene limite claro.
- Preferir resultados iniciales limitados y utiles antes que "todos los productos".
- Usar debounce de referencia de 250 ms para busqueda remota.
- Abort/cancelar requests obsoletos al cambiar query, sede, origen, dialogo o contexto.
- Limpiar resultados al cambiar un contexto que invalida la busqueda anterior.

## Fase 1: Infraestructura async comun

### Objetivo

Estandarizar debounce, cancelacion, loading/error/results y limpieza de busquedas async.

### Estado

Implementada en:

```text
apps/frontend/hooks/use-debounced-api-search.ts
apps/frontend/components/modules/sales/pos/use-product-search.ts
apps/frontend/components/modules/postsales/use-replacement-search.ts
apps/frontend/components/modules/transfers/transfers-request-page.tsx
apps/frontend/components/modules/inventory/inventory-adjustments-create-page.tsx
```

Validacion tecnica ejecutada:

```text
npm exec --workspace @ripnel/frontend tsc -- --noEmit
npm run lint --workspace @ripnel/frontend
```

Resultado: TypeScript sin errores. Lint sin errores bloqueantes; mantiene 41 warnings preexistentes fuera del alcance.

Validacion manual local:

```text
Backend: localhost:3001 contra ripnel-postgres-local
Frontend: localhost:3000 sin NEXT_PUBLIC_API_BASE_URL
Usuarios: vendedor / LocalDevVendedor123, almacen / LocalDevAlmacen123
```

- `/ventas/nueva`: buscador POS abre al foco, conserva sugerencias sin query, filtra con query y limpia sin resultados residuales.
- `/transferencias/solicitar`: sin origen el buscador queda deshabilitado; con origen abre al foco, muestra candidatos, filtra y limpia resultados al cambiar origen.
- `/inventario/ajustes/nuevo`: buscador abre al foco con instruccion de 2 caracteres; 1 caracter no llama API; 2+ caracteres busca y limpiar no deja resultados residuales.
- `/postventa/[saleId]`: pendiente porque la base local no tiene ventas (`sales` vacia).

### Alcance

Crear, si corresponde, un hook tecnico generico:

```text
apps/frontend/hooks/use-debounced-api-search.ts
```

El hook no debe saber de productos, stock, precios, sedes ni transferencias. Solo debe resolver:

- `debounceMs`;
- `enabled`;
- `minQueryLength`;
- `AbortController`;
- `loading`;
- `error`;
- `results`;
- `hasSearched`;
- `reset`.

### Candidatos

- `apps/frontend/components/modules/sales/pos/use-product-search.ts`
- `apps/frontend/components/modules/postsales/use-replacement-search.ts`
- `apps/frontend/components/modules/inventory/inventory-adjustments-create-page.tsx`
- `apps/frontend/components/modules/transfers/transfers-request-page.tsx`

### No tocar

- UI visual de pickers.
- Endpoints backend.
- Tipos de dominio.
- Agrupaciones por estilo, salvo adaptacion minima al hook.

### Criterio de salida

- Los requests obsoletos no actualizan resultados despues de abort/cambio de contexto.
- POS conserva carga sin query cuando corresponde.
- Postventa y ajustes conservan minimo de 2 caracteres.
- Transferencias limpia o invalida resultados al cambiar origen.

## Fase 2: Extraer funciones puras locales

### Objetivo

Mejorar legibilidad donde hay `useMemo` o handlers grandes, sin crear utilidades globales prematuras.

### Primer candidato

Extraer la agrupacion de productos de transferencias:

```text
transfers-request-page.tsx
  requestProducts useMemo
```

Destino probable:

```text
apps/frontend/components/modules/transfers/transfers-shared.tsx
```

Nombre tentativo:

```ts
buildTransferRequestProductGroups(...)
```

### Estado

Implementado en:

```text
apps/frontend/components/modules/transfers/transfers-shared.tsx
apps/frontend/components/modules/transfers/transfers-request-page.tsx
```

Notas:

- `buildTransferRequestProductGroups` conserva el shape y ordenamiento previo del `useMemo`.
- `transfers-request-page.tsx` mantiene el `useMemo` como adaptador fino.
- Al aplicar cambio de origen en solicitud de transferencias, los candidatos se limpian explicitamente para evitar resultados residuales.

### Otros candidatos

- Toggle de modo de precio en `stage-products.tsx`, si queda como bloque inline dificil de leer.
- Agrupacion de variantes en ajustes, solo si se repite o crece.

### No tocar

- No crear un `groupVariantsUniversal` global en esta fase.
- No normalizar todos los nombres `stock`, `system_qty`, `qty_available`, `total_available`.

### Criterio de salida

- El componente principal queda mas corto y legible.
- La funcion extraida es pura y testeable mentalmente.
- No cambia el shape del dato ni el render.

## Fase 3: Revisar tipos compartibles POS/Postventa

### Objetivo

Evaluar si `SaleVariant`, `SellableVariant` y `ProductVariantOption` pueden compartir un contrato pequeno sin acoplar modulos.

### Alcance

Solo POS y postventa, porque ambos consumen `/api/sales/sellable-variants`.

### Preguntas

- ¿El backend devuelve exactamente el mismo shape para ambos?
- ¿Las diferencias de nulabilidad son reales o accidentales?
- ¿Conviene declarar un tipo compartido en `lib/` o mantener tipos locales?
- ¿`ProductVariantOption` debe extender ese tipo o seguir siendo una interfaz flexible de UI?

### No tocar

- `RequestCandidate` de transferencias.
- `AdjustmentVariant` de inventario.
- Tipos backend.

### Criterio de salida

- Decidir una de estas opciones:
  - mantener tipos locales;
  - crear tipo compartido minimo para variantes vendibles;
  - ajustar solo nulabilidad/documentacion sin mover archivos.

### Estado

Analizado; no implementar refactor de tipos en este corte.

Evidencia revisada:

```text
Backend:
apps/backend/src/modules/sales/sales.repo.js
apps/backend/src/modules/sales/sales.service.js
apps/backend/src/modules/sales/sales.controller.js

Frontend:
apps/frontend/components/modules/sales/pos/pos-types.ts
apps/frontend/components/modules/sales/pos/use-product-search.ts
apps/frontend/types/postsales.ts
apps/frontend/components/modules/postsales/use-replacement-search.ts
apps/frontend/components/shared/pickers/product-variant-picker.tsx
```

Contrato real de `/api/sales/sellable-variants`:

- El backend devuelve `style_id`, `variant_id`, `sku`, `style_name`, `style_code`, `size_id`, `size_code`, `size_name`, `size_sort_order`, `color_id`, `color_code`, `color_name`, `stock`, `retail_price`, `wholesale_price`.
- En PostgreSQL, los precios `numeric` llegan al frontend como `string` en la respuesta JSON local, aunque el frontend los consume con `Number(...)`.

Comparacion:

- `SaleVariant` de POS es el tipo mas cercano al contrato real, pero no declara `size_id`, `size_sort_order` ni `color_id`, y asume precios `number | null`.
- `SellableVariant` de postventa es mas chico: no declara `style_id` ni `wholesale_price`, y endurece `retail_price` como `number`.
- `ProductVariantOption` es una interfaz de UI flexible para el picker; no debe convertirse en contrato API porque sirve como superficie visual generica.

Decision:

- Mantener tipos locales por ahora.
- No crear un tipo compartido minimo hasta introducir una normalizacion explicita de respuesta API o un contrato raw separado.
- Si se retoma esta fase, la opcion segura seria crear un tipo raw compartido para `/api/sales/sellable-variants` y mapearlo por flujo, no reemplazar directamente `SaleVariant`/`SellableVariant`.

Motivo:

Unificar ahora obligaria a ampliar nulabilidad y tipos de precio (`number | string | null`) en POS, carrito y postventa. Eso aumenta blast radius sin mejorar el flujo operativo validado en Fase 1.

## Fase 4: Evaluar wrappers de UI

### Objetivo

Revisar si los wrappers actuales sobre `SearchablePicker` exponen suficiente capacidad o si alguno debe ajustarse.

### Alcance

- `ProductStylePicker`
- `ProductVariantPicker`
- usos directos de `SearchablePicker` en transferencias e inventario

### Preguntas

- ¿`ProductStylePicker` necesita exponer `error`, `selectedItemKey`, `minQueryLength` o `emptyStateMode`?
- ¿`ProductVariantPicker` debe limpiar filtros internos al cambiar `items` o seleccion?
- ¿Los usos directos de `SearchablePicker` siguen siendo mas claros que crear wrappers nuevos?

### No tocar

- No redisenar `SearchablePicker`.
- No crear una familia nueva de pickers.
- No convertir renderizados especificos en configuraciones por modo.

### Criterio de salida

- Ajustes pequenos si reducen friccion real.
- Si no hay repeticion estable en dos modulos, mantener uso directo.

## Fase 5: Validacion operativa

### Objetivo

Comprobar que los cambios no alteran el flujo real del operador.

### Rutas

- `/ventas/nueva`
- `/postventa/[saleId]`
- `/transferencias/solicitar`
- `/inventario/ajustes/nuevo`

### Casos minimos

- Buscar con texto corto y largo.
- Limpiar busqueda.
- Cambiar rapido el texto.
- Cambiar sede/origen cuando aplique.
- Seleccionar producto/variante.
- Confirmar que no quedan resultados residuales.
- Revisar estados loading, vacio y error cuando sea posible.

### Validacion tecnica

```bash
npm exec --workspace @ripnel/frontend tsc -- --noEmit
npm run lint --workspace @ripnel/frontend
```

## Decisiones cerradas

- Fase 1 se implemento como infraestructura tecnica comun, adaptada por flujo.
- Transferencias limpia candidatos inmediatamente al cambiar `originId`.
- POS conserva catalogo/sugerencias sin query cuando corresponde.
- Ajustes abre el panel al foco, pero mantiene busqueda remota desde 2+ caracteres.
- Fase 3 no crea tipo compartido por ahora; POS y postventa mantienen tipos locales hasta contar con normalizacion explicita del contrato raw.

## Pendientes abiertos

- Validar postventa con una venta local de prueba.
- No continuar Fase 4 hasta revisar el diff y confirmar que aporta valor real.

## Recomendacion actual

Cerrar este corte como Fase 1 implementada y validada parcialmente, con el primer candidato de Fase 2 implementado y Fase 3 resuelta como decision documental sin refactor de tipos. La siguiente decision es si se crea una venta local de prueba para validar postventa o si se evalua Fase 4 como analisis acotado de wrappers UI.
