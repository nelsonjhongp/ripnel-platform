# RIPNEL — Índice de documentación

> Este índice orienta qué leer según la tarea. No reemplaza el código: para APIs, props, rutas, permisos y comportamiento actual, prevalecen la implementación y las pruebas vigentes.

## Regla de lectura

No leer toda `docs/` por defecto.

Para una tarea **frontend**, leer siempre:

1. `AGENTS.md`
2. `docs/working/FRONTEND-WORKFLOW.md`
3. `docs/working/IMPLEMENTATION-TRACKER.md`

Para una tarea **backend**, leer siempre:

1. `AGENTS.md`
2. `docs/backend-architecture-standard.md` (secciones 1-5: estructura, contrato interno, patrones, respuestas, convenciones)
3. `docs/working/IMPLEMENTATION-TRACKER.md`

Para **consumir el backend desde el frontend**, leer siempre:

1. `docs/api-conventions.md` (quickstart con código real, autenticación, errores)

Después, leer únicamente los documentos del dominio o interacción afectados y revisar el código fuente real de los componentes, rutas y contratos involucrados.

`docs/archive/` es histórico. Consultarlo solo si la tarea lo cita expresamente o si hace falta entender una decisión anterior.

Si un archivo `.md` existe en la raíz de `docs/`, debe estar listado o justificado en este índice (ver "Otros documentos de docs/" más abajo). Un documento vigente que no aparece aquí es un hallazgo de mantenimiento del índice, no una señal de que deba ignorarse.

## Mapa por tipo de tarea

> Las secciones "Documentos de arquitectura backend", "Convenciones de consumo API" y "Documentos de dominio" más abajo organizan la documentación completa por nivel. Usalas para navegar fuera de una tarea puntual.

| Tarea | Documentos adicionales | Código que debe verificarse |
|---|---|---|
| UI general, formulario, tabla o diálogo | `DESIGN.md`, `docs/frontend-component-inventory.md`, `docs/frontend-page-standard.md`, `docs/frontend-ui-ux-operativo.md`, `docs/frontend-operational-components.md` | componente UI, pantalla y estilos/tokens que usa |
| Nueva ruta o reorganización de pantalla | `docs/frontend-architecture-standard.md` | `app/`, `components/modules/`, `lib/routes.ts` |
| Llamar API desde el frontend | `docs/api-conventions.md` | `lib/api.ts`, `hooks/use-api-get.ts` |
| Listado con paginación (frontend o backend) | `docs/backend-pagination-standard.md` | `usePagination`, repo de referencia `customers` |
| Crear/modificar endpoint backend | `docs/backend-architecture-standard.md` + doc de dominio del módulo | `routes.js` y `service.js` del módulo afectado |
| Crear migración o seed | `docs/backend-supabase-workflow.md` | `supabase/migrations/` |
| Seguridad, validación o guards | `docs/seguridad-backend.md`, `docs/permisos-roles-sidebar.md` | `middlewares/auth.js`, `middlewares/validate.js` |
| Ventas | `docs/sales-domain.md` | módulos sales, contratos de ventas y caja |
| Postventa | `docs/postsales-domain.md` | cancelaciones, cambios, elegibilidad |
| Inventario | `docs/inventory-domain.md` | stock, ajustes, kardex |
| Transferencias | `docs/transfers-domain.md` | solicitud, aprobación, despacho, recepción |
| Clientes, precios, catálogos o sedes | `docs/commercial-domain.md` | customers, prices, catalogs, locations |
| Caja | `docs/cash-functional-spec.md`, `docs/cash-database-spec.md` | backend cash, pantallas de caja y pruebas |
| Productos, variantes o SKU | `docs/product-flow.md`, `docs/product-normalization-roadmap.md` | módulos product/styles/variants/prices y migraciones |
| Dashboard, auditoría, notificaciones, chatbot | `docs/support-modules.md` | dashboard, audit, notifications, chatbot, home, health |
| POS o venta nueva | `docs/frontend-pos-architecture.md` | módulo POS, contratos de ventas y caja |
| Roles, permisos, sidebar | `docs/permisos-roles-sidebar.md`, `docs/testing-permisos.md` | auth, guards, sidebar, endpoints y migraciones |
| Refactor estructural explícito | `docs/refactor-vs-rebuild.md` y documento de dominio correspondiente | dependencias, estado, contratos y pruebas |
| Elegir un componente compartido | `docs/frontend-component-inventory.md` | implementación real del componente antes de usarlo |

## Rol de los documentos frontend

| Documento | Rol |
|---|---|
| `AGENTS.md` | reglas estables del proyecto y límites técnicos |
| `DESIGN.md` | tokens, tipografía, densidad, tema y reglas de estilo |
| `frontend-page-standard.md` | arquetipos de página y composición |
| `frontend-ui-ux-operativo.md` | criterios de operación, densidad y anti-patrones |
| `frontend-operational-components.md` | elección de componentes por interacción |
| `frontend-component-inventory.md` | contrato canónico de componentes compartidos, dominio, legacy y reglas de creación |
| `frontend-architecture-standard.md` | ubicación de rutas, módulos y lógica |
| `backend-architecture-standard.md` | estructura del backend, patrón de módulos, capas y convenciones |
| `api-conventions.md` | cómo consumir el backend: autenticación, respuestas, errores y quickstart con código real |
| `working/FRONTEND-WORKFLOW.md` | método de trabajo para tareas y refactors |
| `working/IMPLEMENTATION-TRACKER.md` | estado, decisiones y trazabilidad actual |

## Documentos de arquitectura backend

> Leer una vez al onboardear o al tocar estructura del backend.

| Documento | Rol |
|---|---|
| `backend-architecture-standard.md` | Estructura de carpetas, patrón routes→controller→service→repo, 22 módulos con rutas API |
| `seguridad-backend.md` | Helmet, rate limiting, Zod validation, SQL injection, pruebas de seguridad |
| `backend-supabase-workflow.md` | Migraciones vs seed vs CRUD, política de códigos, orden técnico |
| `deploy.md` | Variables de entorno, CI/CD, migraciones, audit trail |

## Convenciones de consumo API

> Leer antes de escribir cualquier llamada al backend desde el frontend.

| Documento | Rol |
|---|---|
| `api-conventions.md` | Quickstart con código real, autenticación, shape de respuesta, catálogo de errores, permisos |
| `backend-pagination-standard.md` | Contrato detallado de paginación server-side (query params, capas, anti-patrones) |
| `permisos-roles-sidebar.md` | Matriz de permisos por rol, sidebar, guards, hooks frontend |

**Fuente primaria de permisos, roles y sidebar:** `permisos-roles-sidebar.md`. Los documentos de dominio (`transfers-domain.md`, `cash-functional-spec.md`, etc.) describen permisos específicos del módulo, pero la matriz general vive ahí.

> Pendiente de validación: hay contradicciones activas sin resolver entre el modelo documentado y las migraciones recientes de transferencias (`admin.manage` funcionando como super-gate implícito; `ALMACEN` con visibilidad efectiva sin tener `request.view_own`). No asumir la matriz de `permisos-roles-sidebar.md` como cerrada para ese módulo hasta revisar `docs/working/reports/TRANSFERS-01-B-permissions.md`.

## Documentos de dominio

> Leer solo el documento del módulo que estás tocando.

| Dominio | Documento | Cuándo |
|---|---|---|
| Ventas | `sales-domain.md` | Crear venta, historial, comprobantes PDF |
| Postventa | `postsales-domain.md` | Anulaciones, cambios, elegibilidad |
| Inventario | `inventory-domain.md` | Stock, ajustes, kardex |
| Transferencias | `transfers-domain.md` | Solicitud, aprobación, despacho, recepción |
| Comercial | `commercial-domain.md` | Clientes, precios, reglas mayoristas, catálogos, sedes |
| Caja | `cash-functional-spec.md`, `cash-database-spec.md` | Apertura, cierre, arqueo, control |
| Productos | `product-flow.md`, `product-normalization-roadmap.md` | Estilos, variantes, SKU, normalización |
| Soporte | `support-modules.md` | Dashboard, auditoría, notificaciones, chatbot, home, health |
| POS | `frontend-pos-architecture.md` | Arquitectura del wizard de venta, hooks, stages |

## Otros documentos de docs/

> Documentos vigentes que no aparecen en el mapa por tarea porque son de uso puntual, no de lectura recurrente. Leer solo cuando la tarea coincide con la columna "Cuándo leerlo".

| Documento | Categoría | Cuándo leerlo |
|---|---|---|
| `supabase-team-access.md` | Operativo / onboarding | Dar de alta acceso a Supabase a alguien del equipo o resolver variables locales de conexión |
| `testing-stock-plan.md` | Testing | Escribir o revisar pruebas de inventario/stock (Playwright) |
| `seed-operational-30-days.md` | Operativo | Sembrar datos operativos de referencia para pruebas o demo |
| `cash-improvement-plan.md` | Histórico / pendiente de confirmar | Plan de mejora de caja sin marcador de cierre en el propio archivo; confirmar vigencia antes de tratarlo como activo. No usar como fuente de reglas sin verificar contra `cash-functional-spec.md` y `cash-database-spec.md` |
| `diagnostico-modulo-movimientos-stock.md` | Diagnóstico técnico | Tocar movimientos de stock, kardex, transferencias o ajustes; contiene hallazgos y una taxonomía propuesta aún no implementada, no un contrato vigente |

## Uso de Graphify

`graphify-out/GRAPH_REPORT.md` sirve para explorar dependencias, comunidades, ciclos y archivos acoplados. No sustituye revisión de UX, dominio ni pruebas.

Usarlo cuando una tarea:

- divide o mueve módulos;
- cambia límites entre dominios;
- toca estado o contratos compartidos;
- investiga acoplamiento o riesgo de regresión;
- evalúa un refactor estructural.

No usarlo por defecto para copy, espaciado, una pantalla aislada, corrección de control visual o ajustes menores de formulario.

El reporte actual fue generado sobre el commit `f48c6039` el 2026-06-30. Si hay cambios sin commit, describe el último commit, no necesariamente el working tree actual. Antes de usarlo para una decisión estructural, comparar `git rev-parse HEAD` y `git status --short`; actualizarlo solo cuando sea necesario para esa revisión.
