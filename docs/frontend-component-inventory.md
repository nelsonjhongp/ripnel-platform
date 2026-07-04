# Frontend Component Inventory

## Propósito

Este documento es el contrato canónico de componentes frontend de RIPNEL. Define qué existe, qué usar por defecto y qué reglas gobiernan la creación, reutilización y reemplazo de componentes.

> Usar por defecto cuando coincida con la semántica y necesidad del caso. Canonical no significa obligatorio sin excepción.

La fuente de verdad para implementación es el código dentro de `apps/frontend/components/`. Si este inventario y el código difieren, prevalece el código y el inventario debe corregirse dentro de una tarea documental acotada.

Los componentes revisados en UI-01 tienen geometría y estados consistentes, pero no se afirma que todos los componentes canonical fueron validados visualmente en todos los flujos.

## Componentes canonical compartidos

Estos componentes están aprobados como núcleo compartido. Usar por defecto cuando coincidan con la necesidad del caso.

| Componente | Propósito | Archivo |
|---|---|---|
| `Button` | Acciones primarias, secundarias, ghost y destructivas | `components/ui/button.tsx` |
| `Input` | Entrada de texto simple | `components/ui/input.tsx` |
| `OpsFormField` | Campo con label, requerido, hint y error | `components/ui/ops-form-field.tsx` |
| `OpsSelect` | Selección simple en formularios y filtros | `components/ui/ops-selection.tsx` |
| `OpsSearchField` | Búsqueda en listados | `components/ui/ops-page-shell.tsx` |
| `OpsDialog` | Diálogo modal para decisiones acotadas | `components/ui/ops-dialog.tsx` |
| `OpsDataTable` | Tabla de datos con columnas, ordenamiento y acciones | `components/ui/ops-data-table.tsx` |
| `OpsStatusBadge` | Estado de negocio con texto y color semántico | `components/ui/ops-status-badge.tsx` |
| `OpsPageShell` | Shell y layout de página operativa | `components/ui/ops-page-shell.tsx` |
| `OpsPanelSection` | Sección con información agrupada | `components/ui/ops-panel-section.tsx` |
| `OpsEmptyState` | Estado vacío con siguiente acción | `components/ui/ops-empty-state.tsx` |
| `Pagination` | Paginación de resultados | `components/ui/pagination.tsx` |
| `Tooltip` | Ayuda contextual breve o iconos ambiguos | `components/ui/tooltip.tsx` |

Estos trece componentes forman el núcleo. No es obligatorio envolver toda vista con todos ellos; usar solo los que el flujo requiera.

## Componentes de dominio

Componentes y pantallas específicas de cada módulo de negocio. Mantener cerca del dominio si no tienen uso transversal demostrado.

| Dominio | Ruta principal | Pantallas y componentes clave |
|---|---|---|
| POS / Ventas | `/ventas/nueva` | `sales/pos/pos-page.tsx`, stages (`stage-customer`, `stage-products`, `stage-payment`, `stage-summary`), hooks de carrito y pago |
| Ventas | `/ventas/historial` | `sales/transaction-history-page.tsx` |
| Caja | `/caja` | `cash/cash-page.tsx`, `cash/cash-control-page.tsx`, `cash/cash-history-page.tsx`, `cash/cash-history-detail-page.tsx`, `cash/cash-status-badge.tsx`, `cash/cash-dialogs/` |
| Productos | `/productos` | `products/products-overview-page.tsx`, `products/product-create-page.tsx`, `products/product-create-form.tsx`, `products/styles-page.tsx`, `products/variants-page.tsx` |
| Inventario | `/inventario` | `inventory/inventory-page.tsx`, `inventory/inventory-detail-page.tsx`, `inventory/inventory-adjustments-page.tsx`, `inventory/inventory-adjustments-create-page.tsx`, `inventory/adjustments-detail-page.tsx`, `inventory/adjustment-summary-stage.tsx` |
| Clientes | `/clientes` | `customers/customers-page.tsx`, `customers/customer-form.tsx`, `customers/pos-customer-form.tsx`, `customers/customer-document-guard.ts` |
| Transferencias | `/transferencias` | `transfers/transfers-list-page.tsx`, `transfers/transfers-detail-page.tsx`, `transfers/transfers-manage-page.tsx`, `transfers/transfers-request-page.tsx`, `transfers/transfers-pending-page.tsx`, `transfers/transfers-history-page.tsx` |
| Postventa | `/postventa` | `postsales/postsales-page.tsx`, `postsales/postsale-detail-page.tsx`, `postsales/postsale-cancel-dialog.tsx`, `postsales/postsale-exchange-dialog.tsx` |
| Precios | `/precios` | `pricing/prices-overview-page.tsx`, `pricing/prices-workspace-page.tsx`, `pricing/pricing-rules-page.tsx`, `pricing/coverage-bar.tsx` |
| Catálogos | `/catalogos` | `catalogs/catalog-hub-page.tsx`, `catalogs/catalog-crud-page.tsx`, `catalogs/catalog-form-page.tsx`, `catalogs/catalog-item-form.tsx` |
| Administración | `/administracion` | `administration/users-page.tsx`, `administration/user-form.tsx`, `administration/roles-page.tsx`, `administration/locations-page.tsx`, `administration/user-locations-dialog.tsx` |
| Cuenta | `/cuenta` | `account/account-page.tsx`, `account/account-security-page.tsx` |
| Kardex | `/kardex` | `kardex/kardex-page.tsx`, `kardex/kardex-domain.ts` |
| Dashboard | `/panel` | `dashboard/dashboard-page.tsx` |
| Inicio | `/inicio` | `home/home-page.tsx` |
| Demo | `/demo` | `demo/demo-page.tsx` — playground visual, no referencia de UX operativa |
| Notificaciones | `/notificaciones` | `notifications/notifications-page.tsx` |

## Legacy / transicionales

Componentes que permanecen por compatibilidad. No usar como primera opción en código nuevo. No iniciar una migración masiva solo para retirarlos; el reemplazo ocurre cuando se trabaja funcionalmente en el flujo afectado.

| Legacy | Preferencia actual | Archivo |
|---|---|---|
| `OpsInlineBadge` | `OpsStatusBadge` | `components/ui/ops-inline-badge.tsx` |
| `OpsPendingRow` | `OpsAttentionRow` | `components/ui/ops-pending-row.tsx` |
| `OpsCardActionLink` | `OpsActionLink` o `Button` según jerarquía | `components/ui/ops-card-action-link.tsx` |
| `OpsMetricStripItem` | Composición con métricas actuales si el flujo lo necesita | `components/ui/ops-metric-strip-item.tsx` |
| `OpsSummaryBand` | Composición con métricas actuales si el flujo lo necesita | `components/ui/ops-summary-band.tsx` |
| `CompactPicker*` | Usar la composición pública adecuada, no la primitiva | `components/ui/compact-picker.tsx` |

La existencia de una fila en esta tabla no obliga a cambiar consumidores vigentes.

## Pendientes de clasificación

Componentes en `components/ui/` cuyo estatus canónico no está confirmado. No forzar su clasificación durante DOC-02.

| Componente | Archivo | Nota |
|---|---|---|
| `OpsMetricCard`, `OpsMetricInline`, `OpsMetricInlineGroup`, `OpsMetricPill`, `OpsMetricRow` | `components/ui/ops-metric-*.tsx` | Familia de métricas; uso principal en demo, apariciones puntuales en módulos |
| `OpsActionBanner` | `components/ui/ops-action-banner.tsx` | Banner de acción; relación con `OpsAttentionRow` por definir |
| `OpsAttentionRow` | `components/ui/ops-attention-row.tsx` | Fila de atención/prioridad; relación con `OpsActionBanner` por definir |
| `OpsActionTile` | `components/ui/ops-action-tile.tsx` | Tile/tarjeta accionable; uso limitado |
| `OpsActionLink` | `components/ui/ops-action-link.tsx` | Enlace estilizado como acción |
| `OpsInfoCard` | `components/ui/ops-info-card.tsx` | Tarjeta informativa; uso limitado |
| `OpsPanel` | `components/ui/ops-panel.tsx` | Panel anterior a `OpsPanelSection`; relación por definir |
| `OpsSectionHeader` | `components/ui/ops-section-header.tsx` | Encabezado de sección |
| `OpsStepSectionHeading` | `components/ui/ops-step-section-heading.tsx` | Encabezado para etapas/flujo multietapa |
| `OpsSegmentedControl` | `components/ui/ops-segmented-control.tsx` | Control segmentado; uso limitado |
| `OpsMultiSelectCatalog`, `OpsMultiSelectField` | `components/ui/ops-multi-select-*.tsx` | Variantes de multiselección con búsqueda |
| `OpsQuantityStepper` | `components/ui/ops-quantity-stepper.tsx` | Stepper de cantidad; uso principal en POS |
| `SearchablePicker` | `components/ui/searchable-picker.tsx` | Selector con búsqueda integrada |
| `DateFilterPicker` | `components/ui/date-filter-picker.tsx` | Selector de rango de fechas para filtros |
| `preset-text-field` | `components/ui/preset-text-field.tsx` | Campo de texto con valores predefinidos |
| `export-csv-button` | `components/ui/export-csv-button.tsx` | Botón de exportación CSV |
| `help-tooltip` | `components/ui/help-tooltip.tsx` | Tooltip de ayuda; relación con `Tooltip` por definir |

## Reglas de creación, reutilización y reemplazo

### Crear un componente compartido

Solo cuando se cumpla al menos una condición:

- existe en al menos dos módulos estables con la misma semántica;
- encapsula accesibilidad o comportamiento difícil de repetir correctamente;
- reduce una duplicación que ya causó divergencia real.

No crear por: una clase Tailwind repetida una o dos veces, un wrapper que solo renombra un componente, una variación local de padding o copy, ni por completar una taxonomía de UI.

### Mantener en el dominio

Las composiciones específicas de POS, productos, caja, postventa y transferencias permanecen cerca de su módulo. No se convierten automáticamente en estándar global.

### Reemplazar componentes

Los componentes legacy se conservan por compatibilidad. El reemplazo ocurre cuando se trabaja funcionalmente en el flujo afectado, no como campaña independiente. No crear wrappers que solo agreguen una clase Tailwind o cambien el nombre de un componente base.

## Mantenimiento del inventario

Actualizar solo cuando:

- se introduce una familia compartida con al menos dos usos estables;
- se retira definitivamente una compatibilidad;
- cambia la recomendación pública de una interacción;
- se corrige una referencia factual que ya no coincide con el código.

No actualizar para registrar cada clase, cada prop o cada cambio local de una pantalla.

## Referencias

- `DESIGN.md`: tokens visuales, tipografía, densidad y reglas de estilo.
- `docs/frontend-operational-components.md`: elección de componente por interacción (selección, formularios, diálogos).
- `docs/frontend-page-standard.md`: arquetipos de página, composición y pantallas de referencia.
- `docs/frontend-architecture-standard.md`: ubicación de pantallas y rutas.
