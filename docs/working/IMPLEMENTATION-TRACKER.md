# RIPNEL — Implementation Tracker

> Documento vivo de trazabilidad para coordinar decisiones, tareas y validaciones entre Nelson, ChatGPT y agentes.
>
> No reemplaza Jira, Git, `AGENTS.md`, `DESIGN.md` ni documentos de dominio. No convierte una decisión temporal en una regla global.

## Uso

- Mantener solo trabajo activo, decisiones vigentes y resultados relevantes.
- Cada tarea actualiza una sola entrada; no crear un diario extenso.
- Jira conserva prioridad, ownership y sprint.
- Git conserva historial de cambios.
- Los documentos de dominio conservan reglas funcionales duraderas.

## Estado actual

**Foco:** estabilizar la base visual recién ajustada y cerrar roles, permisos y sedes operativas.

**Referencia visual:** escritorio 1366×768 a 100% de zoom.

**Regla activa:** no iniciar campañas masivas de strings, selects, aliases, clases Tailwind o componentes legacy. Los refactors deben resolver un flujo o un riesgo comprobable.

## Tablero actual

| ID | Trabajo | Estado | Siguiente evidencia requerida |
|---|---|---|---|
| UI-01 | Contrato de controles operativos | Aceptado | Validación visual completada a 1366×768 |
| DOC-01 | Router documental y workflow frontend | Implementado | Cerrado; tareas documentales completadas |
| DOC-02 | Consolidación del contrato frontend | Implementado | Cerrado; inventario canónico y consolidación completados |
| AUTH-01 | Roles, permisos, sedes, sidebar y guards | Preparación | Revisar cambios locales, migración y pruebas por rol |
| TRANSFERS-01 | Transferencias entre sedes | Validacion operativa completada | Siguiente: decidir rechazo/edicion/despacho parcial y stock visible en aprobacion/despacho |
| ARCH-01 | Auditoría de documentación frontend vs código real | Implementado | Cerrado; discrepancias corregidas en inventory, README, POS arch, y 4 componentes canónicos |
| ARCH-02-A | Documento de arquitectura backend | Implementado | Cerrado; 22 módulos documentados con patrón, endpoints y convenciones |
| ARCH-02-B1 | Documentos de dominio backend (sales, transfers, inventory, postsales) | Implementado | Cerrado; 4 documentos de dominio con flujos, reglas y endpoints |
| ARCH-02-B2 | Documentos de dominio backend (customers, prices, catalogs, locations) | Implementado | Cerrado; 1 documento agrupado commercial-domain.md |
| ARCH-02-B3 | Documentos de dominio backend (dashboard, audit, notifications, chatbot, home, health) | Implementado | Cerrado; 1 documento agrupado support-modules.md |
| ARCH-03 | Convenciones de API y reorganización del índice documental | Implementado | Cerrado; api-conventions.md con quickstart + catálogo de errores + INDEX.md reorganizado con 3 niveles |
| OPS-01 | Flujo operativo integral caja → venta → stock → postventa → cierre | En cola | Iniciar solo después de AUTH-01 |

## Decisiones vigentes

| Decisión | Estado | Nota |
|---|---|---|
| Backend conserva reglas ERP, autorización, stock, precios y transacciones | Vigente | El frontend no sustituye validación de dominio. |
| Frontend consume backend para operaciones ERP | Vigente | No acceso directo a Supabase para reglas de negocio. |
| shadcn es base y `Ops*` es capa operativa | Vigente | No crear familias nuevas sin dos usos reales. |
| Input, OpsSelect, OpsSearchField y OpsFormField comparten contrato operativo | Aceptado; validado visualmente a 1366×768 | Componentes base ajustados el 2026-07-03. |
| Strings simples locales pueden quedar inline | Vigente | Centralizar errores, toasts, validaciones, estados y copy reutilizado. |
| No crear `messages`, `types`, `constants` o `utils` por convención | Vigente | Solo por dominio, repetición o complejidad real. |
| Graphify es diagnóstico estructural opcional | Vigente | No es requisito para tarea visual o cambio localizado. |

## UI-01 — Controles operativos

**Objetivo:** que Input, OpsSelect, OpsSearchField, textarea y OpsFormField se perciban y comporten como una familia.

**Implementado:**

```text
apps/frontend/app/globals.css
apps/frontend/components/ui/input.tsx
apps/frontend/components/ui/ops-control-styles.ts
apps/frontend/components/ui/ops-form-field.tsx
apps/frontend/components/ui/ops-page-shell.tsx
apps/frontend/components/ui/ops-selection.tsx
```

**Validación técnica reportada:**

```text
TypeScript: OK
Lint: OK, sin errores nuevos
```

**Validación manual cerrada:**

- Viewport: `1366×768`, zoom `100%`.
- Rutas: `/ventas/nueva`, `/clientes`, `/administracion/usuarios`, `/caja`.
- `/clientes` antes: `bodyScrollWidth=1376`, `documentElement.scrollWidth=1376`, overflow global `+10px`.
- Causa: `SidebarInset` en `apps/frontend/components/ui/sidebar.tsx` usaba `w-full flex-1` sin `min-w-0`; dentro del layout con sidebar el área de contenido no podía contraerse y empujaba `SidebarShell`, topbar y `OpsPageShell` hasta `right=1376`.
- Corrección: agregar `min-w-0` a `SidebarInset`; no se usó `overflow-x-hidden`, ancho calculado, margen negativo ni cambio global.
- `/clientes` después: listado normal, filtros visibles, modal `Nuevo cliente` y menú de acción por fila en `1366/1366`, overflow `0`.
- `/ventas/nueva`: `1366/1366`, overflow `0`.
- `/administracion/usuarios`: claro y oscuro en `1366/1366`, overflow `0`.
- `/caja`: diálogo de cierre visible y legible en `1366/1366`, overflow `0`.

**Archivos modificados:**

```text
apps/frontend/components/ui/sidebar.tsx
docs/working/IMPLEMENTATION-TRACKER.md
```

**Validación técnica:**

```text
TypeScript: OK
Lint: OK, 0 errores; warnings existentes fuera del cambio
```

**Hallazgos fuera de alcance:**

- `docs/working/UI-PATTERNS.md` no existe; se registra como hallazgo documental, no como bloqueo.
- Lint mantiene warnings preexistentes en varios módulos; no se corrigieron por alcance.

**Decisión al validar:**

- Aceptado: congelar el núcleo de controles y no iniciar otra migración masiva.

## AUTH-01 — Roles, permisos y sedes

**Objetivo:** cerrar una vertical de acceso consistente.

**Resultado esperado:**

- ADMIN puede administrar usuarios y roles.
- VENDEDORA ve y opera solo módulos autorizados.
- Cada usuario queda limitado a sus sedes autorizadas.
- Sidebar, rutas, guards frontend y autorización backend coinciden.
- El backend rechaza permisos insuficientes aunque la UI oculte acciones.

**Documentos requeridos:**

- `docs/permisos-roles-sidebar.md`
- `docs/testing-permisos.md`
- `docs/seguridad-backend.md`

**Fuera de alcance:**

- refactor global de UI;
- producción/taller;
- rediseño POS;
- migración masiva de componentes legacy.

**Primer paso:**

- [ ] revisar el diff local de auth/users/sidebar/guards y la migración de roles;
- [ ] verificar seed y compatibilidad de datos;
- [ ] definir matriz mínima de roles × módulo × sede;
- [ ] ejecutar pruebas backend/frontend existentes y completar casos críticos.

## TRANSFERS-01 — Transferencias entre sedes

Estado: Validacion operativa completada; validar continuidad de producto.

Objetivo:
Endurecer el flujo real de transferencias sin reescribir el modulo, empezando por integridad de estado, stock y autorizacion.

Alcance actual:
`approve` y `cancel` en backend, helpers condicionales de repositorio y pruebas unitarias del servicio.

No tocar en Fase A:
Estados nuevos, despacho parcial, `PATCH` de lineas, UX, permisos de roles y migraciones.

Invariantes:
Crear/aprobar no mueven stock; despachar registra `OUT`; recibir registra `IN`; toda operacion ERP sigue validada por backend y sede.

Aceptacion Fase A:
`approve` y `cancel` usan lectura bloqueada, transaccion y update condicional. `approve` revalida stock antes de aprobar.

Resultado:
Implementado en `apps/backend/src/modules/transfers/transfers.service.js`, `apps/backend/src/modules/transfers/transfers.repo.js` y `apps/backend/src/__tests__/transfers.service.test.js`.

Validacion:
`cd apps/backend; node --test src/__tests__/transfers.service.test.js` -> `17` tests pasan, `0` fallan.
`npm run test --workspace @ripnel/backend` -> `146` tests pasan, `0` fallan tras corregir `patchStyle`.

Reporte:
`docs/working/reports/TRANSFERS-01-A-integrity.md`

Revision de permisos:
`docs/working/reports/TRANSFERS-01-B-permissions.md`

Validacion operativa:
`docs/working/reports/TRANSFERS-01-D-operational-validation.md`

Siguiente:
Mantener `ALMACEN` como rol ejecutor salvo decision contraria de producto. Decidir si `rejected`, edicion de lineas en `requested`, despacho parcial o stock visible en aprobacion/despacho entran en MVP.

## DOC-02 — Consolidación del contrato frontend

**Estado:** Implementado

**Objetivo:** eliminar duplicación documental y dejar un contrato frontend claro sobre componentes canonical, utilidades, dominio, legacy y pantallas de referencia.

**Alcance:** archivos documentales dentro de `docs/` y raíz.

**No tocar:** código, configuración, migraciones, seeds, `docs/archive/`, `docs/frontend-operational-components.md`, `docs/frontend-architecture-standard.md`, `docs/frontend-pos-architecture.md`.

**Implementado:**

```text
docs/frontend-component-inventory.md  → reescritura como contrato canónico
DESIGN.md                             → eliminados anti-patrones y catálogo duplicado
docs/frontend-ui-ux-operativo.md      → anti-patrones consolidados, densidad delegada
docs/frontend-page-standard.md        → pantallas de referencia por arquetipo
docs/working/FRONTEND-WORKFLOW.md     → sección "Modo revisión / triage"
AGENTS.md                             → lista de componentes reemplazada por referencia canónica
docs/INDEX.md                         → rol del inventory actualizado
docs/working/IMPLEMENTATION-TRACKER.md → entrada DOC-02
```

**Resultado:**
- `frontend-component-inventory.md` es el documento canónico para componentes compartidos, dominio, legacy y reglas de creación.
- `DESIGN.md` conserva solo tokens, tipografía, densidad, tema y reglas visuales.
- `frontend-ui-ux-operativo.md` conserva copy, ayuda contextual, flujos sensibles y una única lista consolidada de anti-patrones.
- `frontend-page-standard.md` contiene referencias reales por arquetipo con rutas verificadas.
- `demo-page.tsx` queda marcado como playground visual, no referencia de UX operativa.
- Se agregó sección "Modo revisión / triage" en `FRONTEND-WORKFLOW.md`.
- Componentes no clasificados quedan en "Pendientes de clasificación" dentro del inventory.

**Hallazgos fuera de alcance:** ninguno. La clasificación de componentes pendientes se realizará en tareas posteriores según necesidad funcional.

**Siguiente:** mantener el inventory como fuente canónica; clasificar pendientes solo cuando un flujo lo requiera.

## Registro de decisiones y hallazgos

| Fecha | ID | Hallazgo / decisión | Estado |
|---|---|---|---|
| 2026-07-03 | UI-01 | Inputs, selects y búsqueda tenían geometrías y estados distintos. | Implementado; validar visualmente |
| 2026-07-03 | UI-01 | OpsFormField no propagaba por completo atributos a OpsSelect. | Implementado; validar en pantalla |
| 2026-07-03 | DOC-01 | Router documental, workflow frontend e INDEX.md creados. | Implementado |
| 2026-07-03 | DOC-01 | El tracker creado quedó como `MENTATION-TRACKER.md`. | Renombrado a `IMPLEMENTATION-TRACKER.md` |
| 2026-07-04 | DOC-02 | Consolidación del contrato frontend. `frontend-component-inventory.md` como canónico. Duplicación eliminada entre DESIGN, ui-ux-operativo y page-standard. | Implementado |
| 2026-07-07 | TRANSFERS-01-A | `approve` y `cancel` quedan protegidos con transaccion, `FOR UPDATE` y update condicional; `approve` revalida stock. | Implementado; backend tests OK |
| 2026-07-07 | TRANSFERS-01-B | Permisos finales revisados: `ALMACEN` queda como ejecutor, no solicitante; no se recomienda migracion sin decision de producto. | Documentado |
| 2026-07-07 | TRANSFERS-01-C | UX minima: `open_for_store` usa "Ver detalle" como accion primaria, Entrada/Salida respeta perspectiva y detalle muestra sede del siguiente paso. | Implementado; frontend typecheck/lint OK |
| 2026-07-03 | ARCH-01 | Graphify representa commit `f48c6039`, pero hay cambios locales no incluidos. | Usar solo como snapshot; actualizar en revisión estructural |

## Plantilla para nueva entrada

```text
## [ID] — [Nombre]

Estado: Preparación | En curso | Implementado; validar | Aceptado | Bloqueado | Descartado

Objetivo:
Alcance:
No tocar:
Invariantes:
Documentos/código a revisar:
Aceptación:
Resultado:
Hallazgos fuera de alcance:
Siguiente:
```

## Mapa de frentes

| ID | Vertical | Tipo | Estado actual | Próximo paso |
|---|---|---|---|---|
| UI-01 | Base visual y layout | Transversal | Aceptado | Congelado salvo regresión visible |
| AUTH-01 | Roles, permisos, sedes, sidebar y guards | Acceso | Por revisar | Mapear cambios locales y pruebas existentes |
| SALES-01 | POS, caja, stock y postventa | Transaccional | Parcial | Revisar flujo completo con venta real |
| INVENTORY-01 | Inventario, ajustes, kardex y transferencias | Operativo | Parcial | Transferencias validadas; seguir con inventario/kardex segun prioridad |
| TRANSFERS-01 | Transferencias entre sedes | Operativo | Validacion operativa completada | Decidir rechazo/edicion/despacho parcial y stock visible |
| CATALOG-01 | Productos, catálogos y precios | Maestro comercial | Por confirmar | Revisar modelo y flujos |
| PRODUCTION-01 | Taller, insumos y producción | Futuro | No iniciar | Definir después de estabilizar ventas y stock |
