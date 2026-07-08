# ARCH-01-A: Auditoría de documentación frontend vs código real

> Fecha: 2026-07-08 | Commit base: working tree actual
> 
> Objetivo: verificar que los documentos de arquitectura frontend reflejan el código real.
> Se compararon 4 fuentes documentales contra el árbol de archivos del repositorio.

---

## 1. Módulos de dominio (`components/modules/`)

### 1.1 Correspondencia general: OK

Los 17 módulos reales coinciden con los 17 dominios listados en `frontend-component-inventory.md`.

| # | Módulo real | Dominio en inventario | Coincide |
|---|---|---|---|
| 1 | `account/` | Cuenta | ✓ |
| 2 | `administration/` | Administración | ✓ |
| 3 | `cash/` | Caja | ✓ |
| 4 | `catalogs/` | Catálogos | ✓ |
| 5 | `customers/` | Clientes | ✓ |
| 6 | `dashboard/` | Dashboard | ✓ |
| 7 | `demo/` | Demo | ✓ |
| 8 | `home/` | Inicio | ✓ |
| 9 | `inventory/` | Inventario | ✓ |
| 10 | `kardex/` | Kardex | ✓ |
| 11 | `notifications/` | Notificaciones | ✓ |
| 12 | `postsales/` | Postventa | ✓ |
| 13 | `pricing/` | Precios | ✓ |
| 14 | `products/` | Productos | ✓ |
| 15 | `sales/` | POS / Ventas + Ventas | ✓ |
| 16 | `shared/` | — | No listado (es infraestructura) |
| 17 | `transfers/` | Transferencias | ✓ |

### 1.2 Discrepancia: `postsale-cancel-dialog.tsx`

- **Documentado en inventario:** `postsales/postsale-cancel-dialog.tsx`
- **Real:** no existe. Hay `postsales/use-cancel-form.ts` (hook) en su lugar.

Acción sugerida: corregir la entrada del inventario.

### 1.3 Archivos de soporte omitidos (esperado)

Cada módulo tiene `*-messages.ts`, `*-constants.ts`, `*-utils.ts` y hooks que no están listados en el inventario. Esto es correcto según la regla: _"No actualizar para registrar cada clase, cada prop o cada cambio local de una pantalla."_

---

## 2. Componentes canónicos (`components/ui/`)

### 2.1 Los 13 componentes canónicos: todos existen

| Componente | Archivo real | Estado |
|---|---|---|
| `Button` | `button.tsx` | ✓ |
| `Input` | `input.tsx` | ✓ |
| `OpsFormField` | `ops-form-field.tsx` | ✓ |
| `OpsSelect` | `ops-selection.tsx` | ✓ |
| `OpsSearchField` | `ops-page-shell.tsx` (export) | ✓ |
| `OpsDialog` | `ops-dialog.tsx` | ✓ |
| `OpsDataTable` | `ops-data-table.tsx` | ✓ |
| `OpsStatusBadge` | `ops-status-badge.tsx` | ✓ |
| `OpsPageShell` | `ops-page-shell.tsx` | ✓ |
| `OpsPanelSection` | `ops-panel-section.tsx` | ✓ |
| `OpsEmptyState` | `ops-empty-state.tsx` | ✓ |
| `Pagination` | `pagination.tsx` | ✓ |
| `Tooltip` | `tooltip.tsx` | ✓ |

### 2.2 Componentes usados en docs operativos pero no en inventario

`frontend-operational-components.md` referencia estos componentes de multiselección. Existen en `ops-selection.tsx` pero no figuran en el inventario canónico (ni siquiera en "pendientes"):

| Componente | Archivo (línea) |
|---|---|
| `OpsMultiSelectMenu` | `ops-selection.tsx:211` |
| `OpsSelectionChip` | `ops-selection.tsx:264` |
| `OpsToggleChip` | `ops-selection.tsx:336` |
| `OpsColorSwatch` | `ops-selection.tsx:370` |

Acción sugerida: decidir si son canónicos (ya tienen uso en `demo-page.tsx` y `product-create-form.tsx`) y agregarlos al inventario, o moverlos a "pendientes".

### 2.3 Legacy y pendientes: sin cambios

Los componentes legacy listados existen y coinciden con el código. Los pendientes también.

---

## 3. Rutas (`app/(protected)/`)

### 3.1 Rutas en README.md que NO existen en código real

| Ruta en README | Estado |
|---|---|
| `/contrasena` | No existe `page.tsx` en `app/(protected)/contrasena/` |

### 3.2 Rutas reales que NO están en README.md

| Ruta real | Observación |
|---|---|
| `/precios/crear-y-editar-precio` | No documentada |
| `/precios/listado-de-precios` | No documentada |
| `/catalogos/[catalogId]/nuevo` | No documentada |
| `/clientes/dashboards` | No documentada |
| `/administracion/roles&usuarios` | No documentada |
| `/inventario/ajustes/[adjustmentId]` | No documentada |

### 3.3 `contrasena` en frontend-page-standard.md

El estándar de página lista rutas de referencia para "Cuenta y settings": `/cuenta`, `/cuenta/seguridad`. No menciona `/contrasena`. Correcto.

---

## 4. POS Architecture (`frontend-pos-architecture.md`)

### 4.1 Archivos documentados que NO existen

Ninguno. Todos los archivos listados en el file map existen.

### 4.2 Archivos reales que NO están documentados

| Categoría | Archivos faltantes en el doc |
|---|---|
| `pos-dialogs/` | `clear-sale-dialog.tsx`, `cash-reopen-dialog.tsx`, `cash-open-dialog.tsx` |
| `purchase-system/` | `SalesWizardRail.tsx`, `ReceiptOptionsModal.tsx`, `receipt-messages.ts` |
| Utils split | `pos-summary-utils.ts`, `pos-search-utils.ts`, `pos-pricing-utils.ts`, `pos-customer-utils.ts` |

### 4.3 Divergencia estructural

El documento dice que `pos-utils.ts` contiene _"Pure functions: pricing, search, validation, summary derivation"_. En la práctica, esas responsabilidades se dividieron en 4 archivos separados:

- `pos-summary-utils.ts`
- `pos-search-utils.ts`
- `pos-pricing-utils.ts`
- `pos-customer-utils.ts`

`pos-utils.ts` aún existe (probablemente con funciones remanentes o re-exports).

### 4.4 Tests

El documento dice que el test matcher es `*.test.ts` y el test file es `pos-utils.test.ts`. El matcher real en `playwright.config.ts` es `*.test.ts`. Correcto.

---

## 5. Resumen de hallazgos

### Críticos (doc afirma algo que no existe)

| # | Hallazgo | Documento | Archivo real |
|---|---|---|---|
| 1 | `postsale-cancel-dialog.tsx` no existe | `frontend-component-inventory.md` | Es `use-cancel-form.ts` |

### Significativos (código real no reflejado en doc)

| # | Hallazgo | Documento afectado |
|---|---|---|
| 2 | 6 rutas reales no listadas en README.md | `README.md` |
| 3 | `/contrasena` listada en README pero no existe | `README.md` |
| 4 | 3 dialogs POS no documentados | `frontend-pos-architecture.md` |
| 5 | 3 archivos purchase-system no documentados | `frontend-pos-architecture.md` |
| 6 | 4 utils POS split no reflejados en doc | `frontend-pos-architecture.md` |
| 7 | 4 componentes de multiselección existen pero no están en inventario | `frontend-component-inventory.md` |

### Correcto (sin discrepancias)

- Los 13 componentes canónicos existen y coinciden
- Los 17 módulos de dominio coinciden con el inventario
- Los componentes legacy listados coinciden con el código
- Los componentes "pendientes" listados existen
- Las rutas en `frontend-architecture-standard.md` (como lista frecuente, no exhaustiva) son correctas

---

## 6. Acciones recomendadas

| Prioridad | Acción |
|---|---|
| Alta | Corregir `postsale-cancel-dialog.tsx` → `use-cancel-form.ts` en inventario |
| Alta | Actualizar README.md con las 6 rutas faltantes y eliminar `/contrasena` |
| Media | Actualizar `frontend-pos-architecture.md` con los 10 archivos no documentados |
| Baja | Decidir estatus de `OpsMultiSelectMenu`, `OpsSelectionChip`, `OpsToggleChip`, `OpsColorSwatch` en el inventario |
