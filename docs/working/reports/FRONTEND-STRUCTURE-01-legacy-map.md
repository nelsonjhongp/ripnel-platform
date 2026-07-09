# FRONTEND-STRUCTURE-01: mapa de estructura frontend y limpieza gradual

> Fecha: 2026-07-08  
> Alcance: `apps/frontend/app`, `apps/frontend/components`, `apps/frontend/lib/routes.ts`, `apps/frontend/next.config.ts`  
> Tipo: diagnostico y plan de seguimiento; no implementa refactor.

## Objetivo

Ordenar el frente de estructura frontend sin convertirlo en una campania masiva. El resultado buscado es que el frontend conserve rutas, modulos y componentes faciles de ubicar, pero que la limpieza ocurra solo con evidencia, por fases pequenas y sin bloquear flujos operativos como ventas, inventario, transferencias o caja.

## Reglas de trabajo

- No mezclar este frente con `PRODUCT-SEARCH-01` mientras existan cambios abiertos de busqueda de productos.
- No borrar componentes legacy solo porque existen; retirarlos solo si no tienen consumidores o si el flujo afectado ya se esta trabajando.
- No mover carpetas por simetria. Mover solo si reduce friccion real, evita duplicacion o corrige un nombre que induce a error.
- Mantener `app/` como rutas finas y `components/modules/<dominio>/` como lugar principal de pantallas de negocio.
- Conservar redirects y compatibilidad hasta validar navegacion, sidebar, command palette y enlaces guardados.

## Estado observado

### Snapshot de carpetas

`apps/frontend/app` tiene 48 archivos `page.tsx`.

`apps/frontend/components/modules` concentra el producto operativo:

| Dominio | Archivos | Lineas aprox. |
|---|---:|---:|
| `sales` | 39 | 6774 |
| `transfers` | 12 | 5022 |
| `products` | 10 | 3789 |
| `inventory` | 12 | 3488 |
| `cash` | 17 | 2724 |
| `administration` | 9 | 2708 |
| `postsales` | 10 | 2246 |
| `customers` | 9 | 1627 |
| `pricing` | 6 | 1219 |
| `dashboard` | 3 | 1128 |
| `catalogs` | 6 | 957 |
| `kardex` | 4 | 855 |
| `home` | 3 | 727 |
| `account` | 5 | 604 |
| `notifications` | 2 | 250 |
| `shared` | 1 | 51 |

Carpetas fuera de `components/modules`:

| Carpeta | Archivos | Lectura |
|---|---:|---|
| `ui` | 71 | Primitivas, componentes Ops y piezas heredadas. |
| `sidebar` | 9 | Transversal; razonable fuera de modulos. |
| `auth` | 10 | Transversal; razonable fuera de modulos. |
| `feedback` | 1 | Transversal; razonable fuera de modulos. |
| `notifications` | 3 | Provider/topbar transversal. |
| `appearance` | 1 | Provider visual transversal. |
| `admin` | 3 | Piezas compartidas antiguas, con uso real en varios dominios. |
| `dashboard` | 6 | Piezas usadas por dashboard y caja; revisar al tocar esos flujos. |
| `home` | 5 | Piezas usadas por `modules/home`; candidato a migracion local si se toca Inicio. |
| `shared` | 1 | Picker compartido de variante; uso real en postventa. |
| `account` | 1 | UI de preferencias usada por `modules/account`; candidato a migracion local si se toca Cuenta. |
| `chatbot` | 2 | Transversal/futuro; revisar segun prioridad de soporte. |

## Hallazgos

### 1. `app/` esta mayormente sano

La mayoria de rutas son wrappers finos hacia `components/modules`, que coincide con `docs/frontend-architecture-standard.md`.

Rutas de compatibilidad o redirects detectadas:

| Ruta | Estado actual |
|---|---|
| `/bi` | Redirige a `/panel`. |
| `/clientes/dashboards` | Redirige a `/panel?view=clientes`. |
| `/administracion/roles&usuarios` | Redirige a `/administracion/usuarios`. |
| `/kardex` | Redirige a `/inventario/movimientos`. |
| `/productos/nuevo` | Redirige a `/productos?crear=1`. |
| `/precios/listado-de-precios` | Redirige a `/precios`. |
| `/precios/crear-y-editar-precio` | Redirige a `/precios/crear`, preservando `style_id`. |
| `/transferencias/[transferId]` | Hace dispatch entre slugs legacy y detalle real. |
| `/productos/[productId]` | Hace dispatch a estilos/variantes; el comentario indica que `productId` es compatibilidad, no detalle real. |

`apps/frontend/next.config.ts` mantiene redirects legacy adicionales para `/account`, `/dashboard`, `/inventory`, `/purchase-system`, `/transaction-history`, `/ventas` y slugs antiguos de transferencias/administracion.

Lectura: correcto como compatibilidad. No crear rutas nuevas en ingles y no borrar redirects sin validar enlaces reales.

### 2. `purchase-system` ya no es una ruta, pero sigue siendo UI compartida

La carpeta `components/ui/purchase-system` tiene nombre historico. Hoy contiene piezas usadas fuera de POS:

- `PosHeader`: 38 archivos consumidores.
- `ReceiptOptionsModal`: ventas, postventa y demo.
- `SalesWizardRail`: POS/demo y referencia en `PosHeader`.

Lectura: no conviene borrarla ni renombrarla ahora. El nombre puede confundir, pero el riesgo de moverla es alto por cantidad de consumidores. Si se toca, debe ser una fase propia, probablemente renombrando hacia un nombre mas neutral como `components/ui/ops-page-header` o extrayendo primero un `OpsPageHeader`.

### 3. `admin-ui` es legacy parcial, pero todavia es infraestructura viva

`components/admin/admin-ui.tsx` contiene `AdminConfirmModal` marcado deprecated, pero tambien exporta acciones, mensajes y menus usados por administration, catalogs, customers, products, transfers, cash, demo y componentes UI.

Lectura: no borrar. La migracion debe ocurrir por flujo, por ejemplo reemplazar `AdminConfirmModal` por `OpsDialog` cuando se toque clientes o catalogos.

### 4. Componentes legacy UI: casi todos estan acotados

Componentes legacy documentados:

| Componente | Uso observado |
|---|---|
| `OpsInlineBadge` | Demo y `notifications-page`. |
| `OpsPendingRow` | Demo. |
| `OpsCardActionLink` | Demo. |
| `OpsMetricStripItem` | Demo. |
| `OpsSummaryBand` | Demo. |
| `CompactPicker*` | Implementacion interna de `SearchablePicker` y demo. |

Lectura: solo `OpsInlineBadge` tiene un uso operativo claro fuera de demo. Los demas no deben usarse en codigo nuevo, pero retirarlos depende de decidir si `/demo` debe seguir mostrando legacy.

### 5. Candidatos reales a limpieza de bajo riesgo

Estos archivos no tienen referencias activas detectadas por `rg`:

| Archivo | Clasificacion |
|---|---|
| `apps/frontend/components/app-sidebar.tsx` | Wrapper de compatibilidad sin imports actuales. Candidato a borrar con typecheck/lint. |
| `apps/frontend/lib/supabase-FIXED.ts` | Re-export legacy sin referencias por nombre. Candidato a borrar si no hay consumers externos. |
| `apps/frontend/lint-output.txt` | Artefacto versionado historico. Candidato a borrar. |
| `apps/frontend/lint-output-2.txt` | Artefacto versionado historico. Candidato a borrar. |

No incluir en esta lista:

- `apps/frontend/lib/supabase.ts`: aunque no tenga consumidores ERP, sirve como guard explicito contra acceso directo a Supabase. Mantenerlo salvo decision tecnica contraria.
- `components/ui/purchase-system/*`: tiene consumidores reales.
- `components/admin/*`: tiene consumidores reales.

### 6. Graphify existe, pero esta desactualizado

`graphify-out/GRAPH_REPORT.md` existe con fecha 2026-05-05. `docs/INDEX.md` advierte que Graphify es un snapshot y debe compararse con `git status` antes de decisiones estructurales. Para este reporte se uso solo como contexto, no como fuente primaria.

## Fases propuestas

### Fase 0: congelar alcance

Objetivo: no mezclar limpieza estructural con Product Search.

No tocar:

- cambios abiertos de `PRODUCT-SEARCH-01`;
- backend, seeds, migraciones, Supabase remoto, DigitalOcean;
- rutas legacy sin validacion previa.

Aceptacion:

- este documento existe;
- `git status --short` muestra claramente que los cambios de Product Search siguen separados.

### Fase 1: limpieza documental y clasificacion

Objetivo: convertir este mapa en una guia de decisiones.

Acciones:

- confirmar candidatos de bajo riesgo con `rg`;
- decidir si `/demo` debe seguir mostrando componentes legacy;
- alinear `frontend-component-inventory.md` solo si el equipo decide cambiar el estatus de un componente.

Aceptacion:

- cada candidato queda clasificado como `mantener`, `borrar`, `migrar al tocar flujo` o `investigar`.

### Fase 2: borrar solo artefactos sin consumidores

Objetivo: retirar ruido comprobado sin alterar flujos.

Candidatos iniciales:

- `components/app-sidebar.tsx`;
- `lib/supabase-FIXED.ts`;
- `lint-output.txt`;
- `lint-output-2.txt`.

Validacion:

```text
npm exec --workspace @ripnel/frontend tsc -- --noEmit
npm run lint --workspace @ripnel/frontend
```

Riesgo:

- bajo en codigo compilado;
- medio si algun proceso externo esperaba esos archivos por nombre.

### Fase 3: rutas y compatibilidad

Objetivo: separar rutas canonicas de rutas legacy sin romper bookmarks ni navegacion.

Acciones:

- revisar sidebar, command palette, `appRoutes` y redirects;
- marcar rutas legacy en `routes.ts` o en metadata si hace falta;
- no crear nuevas URLs canonicas en ingles.

No hacer:

- borrar redirects por limpieza estetica;
- cambiar `appRoutes` si el flujo visible no lo requiere.

### Fase 4: nombres historicos de UI transversal

Objetivo: reducir confusion de nombres como `purchase-system` sin mover todo de golpe.

Orden recomendado:

1. Extraer o introducir un nombre neutral solo cuando se toque un flujo que usa `PosHeader`.
2. Mantener re-export temporal si se renombra.
3. Migrar consumidores por dominio.
4. Borrar alias solo cuando `rg` confirme cero consumidores.

Posible direccion:

```text
components/ui/purchase-system/PosHeader.tsx
  -> components/ui/ops-page-header.tsx
```

La decision final debe depender de si `PosHeader` sigue siendo header operacional general o si se reemplaza por `OpsPageShell`/otro patron ya existente.

### Fase 5: islas fuera de `modules`

Objetivo: decidir si `components/home`, `components/account` y `components/dashboard` deben quedarse como transversales o migrar hacia sus modulos.

Regla:

- si una carpeta solo sirve a un modulo, migrar cuando se toque ese modulo;
- si sirve a dos o mas dominios con la misma semantica, mantener fuera de `modules` o mover a `components/shared`;
- no mover por simetria.

Primeros candidatos:

| Carpeta | Decision sugerida |
|---|---|
| `components/home` | Migrar a `components/modules/home` si se toca Inicio. |
| `components/account` | Migrar a `components/modules/account` si se toca Cuenta. |
| `components/dashboard` | Mantener por ahora; dashboard y caja consumen piezas graficas. |
| `components/admin` | Mantener por ahora; migrar piezas puntuales a `ui` solo con reemplazo funcional. |

## Estructura objetivo

```text
apps/frontend/app/
  (auth)/
  (protected)/
  forbidden/
  layout.tsx
  page.tsx

apps/frontend/components/
  auth/
  feedback/
  sidebar/
  notifications/
  appearance/
  modules/
    account/
    administration/
    cash/
    catalogs/
    customers/
    dashboard/
    home/
    inventory/
    kardex/
    notifications/
    postsales/
    pricing/
    products/
    sales/
    transfers/
  shared/
    pickers/
  ui/

apps/frontend/hooks/
apps/frontend/lib/
apps/frontend/types/
```

No se propone crear `layout/`, `messages/`, `constants/`, `types/` o `utils` globales por simetria. La estructura objetivo es una direccion, no una orden de migracion inmediata.

## Coordinacion con Product Search

Frente A: `PRODUCT-SEARCH-01`

- Continua en otro chat.
- Debe validar los cambios abiertos antes de seguir con nuevas fases.
- No debe aprovechar Product Search para mover carpetas globales.

Frente B: `FRONTEND-STRUCTURE-01`

- Este chat puede seguir con diagnostico y limpieza estructural.
- Primer cambio tecnico recomendable, cuando Product Search este estable, seria Fase 2: borrar archivos sin consumidores.
- Cualquier migracion de `purchase-system`, `admin-ui`, `home` o `dashboard` debe esperar a un flujo funcional relacionado.

## Pendientes

- Decidir si los artefactos `lint-output*.txt` deben eliminarse del repo y agregarse a `.gitignore` si se vuelven a generar.
- Decidir si `components/app-sidebar.tsx` todavia cumple una funcion externa no visible por imports.
- Decidir si `supabase-FIXED.ts` puede retirarse sin afectar scripts o docs antiguos.
- Decidir si `/demo` debe conservar ejemplos legacy o transformarse en referencia solo de componentes activos.
- Actualizar Graphify solo si se va a mover una frontera relevante entre dominios.

