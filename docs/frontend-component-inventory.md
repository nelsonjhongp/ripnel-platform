# Frontend Component Inventory

Matriz cross-module de componentes, patrones y estado de hardening. Fuente de trazabilidad para agentes y auditorias de consistencia visual/estructural.

> **Documentos complementarios:** `AGENTS.md` (tabla resumen hardening), `docs/module-review-checklist.md` (auditoria paso a paso), `docs/frontend-page-standard.md` (composicion de pagina), `DESIGN.md` (tokens y sistema de diseno).

---

## 1. Matriz de componentes x modulos

Componentes y patrones usados por cada modulo. `Si` = presente, `No` = ausente, `N/A` = no aplica.

| Componente | Ventas | Caja | Clientes | Postventa | Inventario | Kardex | Admin | Catalogos | Productos |
|------------|:------:|:----:|:--------:|:---------:|:----------:|:------:|:-----:|:---------:|:---------:|
| `PosHeader` | Si | Si | Si | Si | Si | Si | Si | Si | No |
| `OpsPageShell` | Si | Si | Si | Si | Si | Si | Si | Si | Si |
| `OpsDataTable` | Si | Si | Si | Si | Si | Si | Si | Si | Si |
| `OpsSelect` | Si | Si | Si | Si | Si | Si | Si | Si | Si |
| `Button` | Si | Si | Si | Si | Si | Si | Si | Si | Si |
| `Tooltip` | Si | Si | Si | Si | Si | Si | Si | Si | Si |
| `Pagination` | Si | Si | Si | Si | Si | Si | Si | Si | Si |
| `OpsStatusBadge` | Si | Si | Si | Si | Si | Si | Si | Si | Si |
| `OpsMetricInlineGroup` | Si | N/A | N/A | Si | Si | Si | Si | Si | Si |
| `OpsMetricRow` | Si | Si | N/A | Si | Si | N/A | N/A | N/A | No |
| `OpsPanelSection` | Si | Si | N/A | Si | Si | N/A | N/A | N/A | No |
| `OpsFormField` | N/A | Si | Si | Si | Si | N/A | N/A | N/A | Si |
| `OpsDialog` | N/A | Si | Si | Si | Si | N/A | N/A | N/A | Si |
| `INFO_BOX_XL` | Si | Si | N/A | Si | Si | N/A | N/A | N/A | No |
| `ACCENT_HIGHLIGHT_PANEL` | Si | Si | N/A | Si | Si | N/A | N/A | N/A | No |
| `SearchablePicker` | Si | N/A | N/A | Si | Si | N/A | N/A | N/A | No |
| `OpsSegmentedControl` | Si | N/A | Si | N/A | N/A | N/A | N/A | N/A | No |
| `DateFilterPicker` | Si | Si | N/A | Si | N/A | Si | N/A | N/A | No |
| `PermissionGuard` | Si | Si | N/A | Si | Si | N/A | N/A | N/A | No |
| `OpsEmptyState` | N/A | N/A | Si | N/A | N/A | N/A | Si | Si | No |
| `OpsQuantityStepper` | N/A | N/A | N/A | N/A | Si | N/A | N/A | N/A | No |
| `OpsActionBanner` | Si | Si | N/A | N/A | N/A | N/A | N/A | N/A | No |
| `AdminFormPageShell` | N/A | N/A | N/A | N/A | N/A | N/A | Si | Si | No |
| `AdminRowActionsMenu` | N/A | N/A | Si | N/A | N/A | N/A | Si | Si | Si |
| `AdminConfirmModal` | N/A | N/A | Si | N/A | N/A | N/A | Si | Si | No |
| `OpsFiltersRow` | Si | Si | Si | Si | Si | Si | Si | Si | No |
| `OpsSearchField` | Si | N/A | Si | Si | Si | Si | Si | Si | No |
| `OpsSectionDivider` | N/A | N/A | Si | N/A | N/A | Si | Si | Si | No |
| `OpsMultiSelectMenu` | N/A | N/A | N/A | N/A | N/A | N/A | Si | Si | Si |
| `OpsSelectionChip` | N/A | N/A | N/A | N/A | N/A | N/A | Si | Si | Si |
| `OpsToggleChip` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Si |
| `OpsColorSwatch` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Si |

### Componentes por adopcion

| Adopcion | Componentes |
|----------|------------|
| **Base universal** | `OpsPageShell`, `OpsDataTable`, `OpsSelect`, `Button`, `Tooltip`, `Pagination`, `OpsStatusBadge` |
| **Alta** | `OpsMetricInlineGroup`, `OpsFiltersRow`, `OpsSearchField` |
| **Media** | `OpsMetricRow`, `OpsPanelSection`, `OpsFormField`, `OpsDialog`, `INFO_BOX_XL`, `ACCENT_HIGHLIGHT_PANEL`, `PermissionGuard`, `DateFilterPicker` |
| **Baja** | `SearchablePicker`, `OpsSegmentedControl`, `OpsEmptyState`, `AdminFormPageShell`, `AdminRowActionsMenu`, `AdminConfirmModal`, `OpsMultiSelectMenu`, `OpsSelectionChip` |
| **Especifica / referencia nueva** | `OpsQuantityStepper` (inventario), `OpsActionBanner` (ventas + caja), `OpsSectionDivider`, `OpsToggleChip` (nuevo producto), `OpsColorSwatch` (nuevo producto) |

---

## 2. Tipo de pagina por modulo

| Modulo | Tipo | Paginas | Referencia canonica |
|--------|------|---------|---------------------|
| **Ventas (POS)** | Formulario operativo | `/ventas/nueva` (multi-stage wizard) | `pos-page.tsx` |
| **Ventas (Historial)** | Listado | `/ventas/historial` | `transaction-history-page.tsx` |
| **Ventas (Detalle)** | Detalle | `/ventas/[saleId]` | `sale-detail-page.tsx` |
| **Caja (Dia)** | Estado/workspace | `/caja` | `cash-page.tsx` |
| **Caja (Historial)** | Listado | `/caja/historial` | `cash-history-page.tsx` |
| **Caja (Admin)** | Listado + charts | `/caja/control` | `cash-control-page.tsx` |
| **Caja (Detalle)** | Detalle | `/caja/historial/[id]` | `cash-history-detail-page.tsx` |
| **Clientes** | Listado CRUD | `/clientes` | `customers-page.tsx` |
| **Postventa** | Listado | `/postventa` | `postsales-page.tsx` |
| **Postventa (Detalle)** | Detalle | `/postventa/[saleId]` | `postsale-detail-page.tsx` |
| **Inventario** | Listado | `/inventario` | `inventory-page.tsx` |
| **Inventario (Detalle)** | Detalle | `/inventario/[styleId]` | `inventory-detail-page.tsx` |
| **Inventario (Ajustes)** | Listado | `/inventario/ajustes` | `inventory-adjustments-page.tsx` |
| **Inventario (Ajuste nuevo)** | Formulario | `/inventario/ajustes/nuevo` | `inventory-adjustments-create-page.tsx` |
| **Kardex** | Listado | `/inventario/movimientos` | `kardex-page.tsx` |
| **Productos (Resumen)** | Listado operativo | `/productos` | `products-overview-page.tsx` |
| **Productos (Alta)** | Modal operativo completo | `Nuevo producto` desde `/productos` y `/productos/estilos` | `product-create-dialog.tsx` + `product-create-form.tsx` |
| **Productos (Estilos)** | Listado/edicion | `/productos/estilos` | `styles-page.tsx` |
| **Productos (Variantes)** | Configuracion/listado | `/productos/variantes` | `variants-page.tsx` |
| **Administracion** | Listado CRUD x 3 + Form x 3 | `/administracion/usuarios`, `/roles`, `/ubicaciones` | `users/roles/locations-page.tsx` |
| **Catalogos** | Hub + Listado CRUD + Form | `/catalogos`, `/catalogos/[id]` | `catalog-hub/crud/form-page.tsx` |

---

## 3. Componentes deprecados

Estos componentes no deben usarse en codigo nuevo. Usar el reemplazo indicado.

| Deprecado | Reemplazo | Notas |
|-----------|-----------|-------|
| `OpsInlineBadge` | `OpsStatusBadge` | `OpsInlineBadge` es alias legacy compacto |
| `OpsMetricPill` | `OpsMetricInline` / `OpsMetricInlineGroup` | Migrar a metrica plana sin contenedor |
| `OpsMetricStripItem` | `OpsMetricInline` | Legacy |
| `OpsSummaryBand` | `OpsMetricCard` | Solo si se necesita KPI con contexto |
| `OpsPendingRow` | `OpsAttentionRow` | `OpsPendingRow` es wrapper legacy |
| `OpsCardActionLink` | `OpsActionLink` | Solo para compatibilidad temporal |
| `AdminModalShell` | `OpsDialog` | Migrar dialogs administrativos a `OpsDialog` |
| `FilterDropdown` | `OpsSelectMenu` (formularios) | `FilterDropdown` solo valido en contextos de filtro de tabla |
| `CompactPicker*` | `SearchablePicker` | `CompactPicker*` es primitiva interna de UI |

---

## 4. Referencias canonicas por patron

Cada patron tiene una implementacion de referencia. Nuevos modulos deben seguir estos ejemplos.

| Patron | Referencia canonica | Archivo |
|--------|---------------------|---------|
| **Listado con paginacion server-side** | Clientes | `customers-page.tsx` |
| **Detalle con INFO_BOX_XL + grid sidebar** | Venta detalle | `sale-detail-page.tsx` |
| **Formulario operativo multi-stage** | POS | `pos-page.tsx` |
| **Modal operativo con alta completa y multiseleccion** | Nuevo producto | `product-create-dialog.tsx` + `product-create-form.tsx` |
| **Two-phase save (idle -> validating -> saving)** | Clientes / Nuevo producto | `customers-page.tsx`; `product-create-dialog.tsx` |
| **Per-field errors** | Clientes / Nuevo producto | `customers-utils.ts`; `products-utils.ts` |
| **Duplicate detection guard** | Clientes / Nuevo producto | `customer-document-guard.ts`; `buildProductNameDuplicateIndex` |
| **Entry-mode switch (persona/empresa)** | Clientes | `customer-form.tsx` |
| **Hook composition (orquestador + sub-hooks)** | Ventas POS | `use-pos-sale.ts` + sub-hooks |
| **CSS class constants centralizados** | UI | `components/ui/ops-control-styles.ts` |
| **Mensajes centralizados** | Ventas POS / Productos | `pos-messages.ts`; `products-messages.ts` |
| **Utility split por dominio** | Ventas POS | `pos-utils.ts` + `pos-pricing/search/customer/summary-utils.ts` |
| **Tabla border-y (sin rounded)** | Clientes | `customers-page.tsx` |
| **Fila con dato principal + metadata secundario** | Clientes / Productos | `customers-page.tsx`; `products-overview-page.tsx` |
| **Dialog footer canonico** | Caja / Postventa / Nuevo producto | `flex flex-col-reverse gap-2 sm:flex-row sm:justify-end` + `outline` + `accent` |
| **Child component sin wrapper OpsPanelSection** | Postventa | `postsale-detail-sections.tsx` |
| **Subsequent load dimmer** | Inventario detalle | `opacity-50 transition-opacity duration-150 pointer-events-none` con guard `loading && data` |
| **Multiseleccion operativa** | Nuevo producto | `OpsMultiSelectMenu` + `OpsSelectionChip removeMode="chip"`; `OpsToggleChip` para chips inline |
| **Swatch de color** | Nuevo producto | `OpsColorSwatch` |

---

## 5. Estado de archivos por modulo

| Modulo | -messages | -constants | -types | -utils | Hooks |
|--------|:---------:|:----------:|:------:|:------:|:-----:|
| Ventas (POS) | Si `pos-messages.ts` | Si `pos-constants.ts` | Si `pos-types.ts` | Si, varios archivos | Si, varios hooks |
| Ventas (Historial) | Si `sales-history-messages.ts` | Si `sales-history-constants.ts` | N/A | Si `sales-utils.ts` | N/A |
| Caja | Si `cash-messages.ts` | Si `cash-constants.ts` | Si `cash-types.ts` | Si `cash-utils.ts` | Si |
| Clientes | Si `customers-messages.ts` | Si `customers-constants.ts` | Si `customers-types.ts` | Si `customers-utils.ts` | N/A |
| Postventa | Si `postsales-messages.ts` | Si `postsales-constants.ts` | Parcial (`@/types/postsales`) | No dedicado | Si |
| Inventario | Si `inventory-messages.ts` + `adjustments-messages.ts` | Si | Si | Parcial | N/A |
| Kardex | Si `kardex-messages.ts` | Si `kardex-constants.ts` | Si `kardex-domain.ts` | En domain | N/A |
| Productos | Si `products-messages.ts` | No dedicado; usa `ops-control-styles.ts` | Si `products-types.ts` | Si `products-utils.ts` | N/A |
| Administracion | Si `admin-messages.ts` | Si `admin-constants.ts` | Si `admin-types.ts` | Si `admin-utils.ts` | N/A |
| Catalogos | No | No | No | No | N/A |

---

## 6. Anti-patrones detectados y referencias activas

### Administracion

| Archivo | Hallazgo | Severidad |
|---------|----------|:---------:|
| ~~`users-page.tsx`, `roles-page.tsx`, `locations-page.tsx`~~ | ~~`color-mix()` inline y strings hardcodeados~~ — Resuelto Junio 2026 | ~~Critica~~ |
| ~~Los 6 archivos~~ | ~~Sin `-constants.ts`, sin `-types.ts`, sin `-utils.ts`~~ — Resuelto Junio 2026 | ~~Critica~~ |
| Refactor completado | `admin-messages.ts`, `admin-types.ts`, `admin-constants.ts`, `admin-utils.ts` creados. `AdminModalShell` migrado a `OpsDialog`. Two-phase save + per-field errors. Rutas `/nuevo` eliminadas (dialogs unificados). `window.alert` reemplazado por dialog de clave temporal con copy-to-clipboard. | ✅ |

### Catalogos

| Archivo | Hallazgo | Severidad |
|---------|----------|:---------:|
| `catalog-crud-page.tsx` | `color-mix()` inline y strings hardcodeados | Critica |
| Los 4 archivos | Chips con clases locales en vez de stack reusable | Mayor |

### Kardex

| Archivo | Hallazgo | Severidad |
|---------|----------|:---------:|
| `kardex-constants.ts` | Constantes `color-mix()` locales no migradas a `ops-control-styles.ts` | Mayor |

### Clientes

| Archivo | Hallazgo | Severidad |
|---------|----------|:---------:|
| `pos-customer-form.tsx` | Strings hardcodeados que no importan de `customers-messages.ts` | Mayor |

### Caja

| Archivo | Hallazgo | Severidad |
|---------|----------|:---------:|
| `cash-control-page.tsx` | Raw `<section>` para grouping donde podria aplicar `OpsPanelSection` | Menor |

### Productos

| Area | Estado | Evidencia |
|------|:------:|-----------|
| Mensajes centralizados | Si | `products-messages.ts` |
| Tipos y utilidades puras | Si | `products-types.ts`, `products-utils.ts` |
| Modal canonico | Si | `ProductCreateDialog` usa `OpsDialog`, `description` y footer canonico |
| Multiseleccion reusable | Si | `OpsMultiSelectMenu`, `OpsSelectionChip removeMode="chip"`, `OpsToggleChip`, `OpsColorSwatch` |
| Validacion operativa | Si | errores por campo, duplicado reactivo, foco al primer error, estados `validating/saving` |
| Deuda controlada | Parcial | `/productos/nuevo` queda como compatibilidad legacy y debe seguir las mismas reglas mientras exista |

---

## 7. Guia rapida para agentes

### Al crear un nuevo modulo

1. Determinar tipo de pagina: listado, detalle, formulario, settings o modal operativo.
2. Copiar estructura de archivos del modulo canonico del mismo tipo.
3. Usar componentes de la matriz de adopcion universal.
4. Crear `-messages.ts`, `-types.ts` y `-utils.ts` antes de escribir JSX complejo.
5. No usar componentes deprecados.
6. Si necesita alta completa con multiseleccion, revisar `Nuevo producto` antes de crear componentes nuevos.

### Al auditar un modulo existente

1. Ejecutar `docs/module-review-checklist.md`.
2. Cruzar hallazgos contra esta matriz.
3. Verificar anti-patrones y referencias activas.
4. Asignar severidad y plan de accion segun score.

### Al refactorizar

1. Identificar el patron canonico en la seccion 4.
2. Migrar strings a `-messages.ts`.
3. Migrar `color-mix()` a `ops-control-styles.ts`.
4. Reemplazar componentes deprecados.
5. Verificar page type compliance (`docs/frontend-page-standard.md` seccion E).

---

## Changelog

| Fecha | Cambios |
|-------|---------|
| 2026-06-29 | Administracion refactorizado: `admin-messages.ts`, `admin-types.ts`, `admin-constants.ts`, `admin-utils.ts` creados. `AdminModalShell` → `OpsDialog`. Two-phase save + per-field errors. Rutas `/nuevo` eliminadas. 6 archivos → 7 (4 base + 3 paginas). |
| 2026-06-29 | Productos agregado a la matriz; `Nuevo producto` queda como referencia de modal operativo con alta completa, validaciones por campo y multiseleccion reusable. |
| 2026-06-29 | Alta de producto documentada como referencia de multiseleccion: `OpsMultiSelectMenu`, `OpsSelectionChip removeMode="chip"`, `OpsToggleChip` y `OpsColorSwatch`. |
| 2026-06-26 | Creacion inicial. Matriz de modulos frontend auditados. |
