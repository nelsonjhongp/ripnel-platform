# RIPNEL — Índice de documentación

> Este índice orienta qué leer según la tarea. No reemplaza el código: para APIs, props, rutas, permisos y comportamiento actual, prevalecen la implementación y las pruebas vigentes.

## Regla de lectura

No leer toda `docs/` por defecto.

Para una tarea frontend, leer siempre:

1. `AGENTS.md`
2. `docs/working/FRONTEND-WORKFLOW.md`
3. `docs/working/IMPLEMENTATION-TRACKER.md`

Después, leer únicamente los documentos del dominio o interacción afectados y revisar el código fuente real de los componentes, rutas y contratos involucrados.

`docs/archive/` es histórico. Consultarlo solo si la tarea lo cita expresamente o si hace falta entender una decisión anterior.

## Mapa por tipo de tarea

| Tarea | Documentos adicionales | Código que debe verificarse |
|---|---|---|
| UI general, formulario, tabla o diálogo | `DESIGN.md`, `docs/frontend-component-inventory.md`, `docs/frontend-page-standard.md`, `docs/frontend-ui-ux-operativo.md`, `docs/frontend-operational-components.md` | componente UI, pantalla y estilos/tokens que usa |
| Nueva ruta o reorganización de pantalla | `docs/frontend-architecture-standard.md` | `app/`, `components/modules/`, `lib/routes.ts` |
| POS o venta nueva | `docs/frontend-pos-architecture.md` | módulo POS, contratos de ventas y caja |
| Caja | `docs/cash-functional-spec.md`, `docs/cash-database-spec.md` | backend cash, pantallas de caja y pruebas relacionadas |
| Roles, permisos, sidebar o sedes | `docs/permisos-roles-sidebar.md`, `docs/testing-permisos.md`, `docs/seguridad-backend.md` | auth, guards, sidebar, endpoints y migraciones |
| Productos, variantes o precios | `docs/product-flow.md`, `docs/product-normalization-roadmap.md` | módulos product/styles/variants/prices y migraciones |
| Stock, ajustes, transferencias o kardex | `docs/diagnostico-modulo-movimientos-stock.md`, `docs/testing-stock-plan.md` | inventory, transfers, kardex, sales y postsales |
| Backend + Supabase o migración | `docs/backend-supabase-workflow.md`, `docs/seguridad-backend.md`, `docs/supabase-team-access.md` | módulo backend, SQL/migración, pruebas y permisos |
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
| `working/FRONTEND-WORKFLOW.md` | método de trabajo para tareas y refactors |
| `working/IMPLEMENTATION-TRACKER.md` | estado, decisiones y trazabilidad actual |

## Documentos activos por dominio

- **Permisos y accesos:** `permisos-roles-sidebar.md`, `testing-permisos.md`, `seguridad-backend.md`
- **Caja:** `cash-functional-spec.md`, `cash-database-spec.md`, `cash-improvement-plan.md`
- **Productos:** `product-flow.md`, `product-normalization-roadmap.md`
- **Stock y transferencias:** `diagnostico-modulo-movimientos-stock.md`, `testing-stock-plan.md`
- **POS:** `frontend-pos-architecture.md`
- **Backend y datos:** `backend-pagination-standard.md`, `backend-supabase-workflow.md`, `supabase-team-access.md`

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
