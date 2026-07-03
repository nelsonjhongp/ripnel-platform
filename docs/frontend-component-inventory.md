# Frontend Component Inventory

## Propósito

Este documento es un inventario de referencia de componentes y patrones que ya existen en RIPNEL.

> No es un checklist obligatorio, no define un puntaje de hardening y no ordena una migración masiva. Úsalo para descubrir una pieza existente antes de crear una nueva o para entender compatibilidad durante una tarea funcional.

La fuente de verdad para implementación es el código dentro de `apps/frontend/components/`. Si este inventario y el código difieren, prevalece el código y el inventario debe corregirse dentro de una tarea documental acotada.

## Núcleo recomendado para trabajo nuevo

| Necesidad | Componente / familia |
|---|---|
| shell de página | `OpsPageShell` |
| tabla y columnas | `OpsDataTable` |
| acción | `Button` |
| campo simple | `Input` + `OpsFormField` |
| select simple | `OpsSelect` |
| búsqueda en listado | `OpsSearchField` |
| selección con búsqueda | `SearchablePicker` |
| diálogo | `OpsDialog` |
| estado de negocio | `OpsStatusBadge` |
| sección agrupada | `OpsPanelSection` |
| vacío | `OpsEmptyState` |
| paginación | `Pagination` |
| ayuda contextual | `Tooltip` |

Usar solo los que encajen con el flujo. No se debe envolver una página con todos ellos por convención.

## Familias específicas de dominio

| Dominio / interacción | Referencias existentes |
|---|---|
| POS y flujo multietapa | `SalesWizardRail`, composiciones de `components/ui/purchase-system/` |
| producto y catálogos | `OpsMultiSelectMenu`, `OpsSelectionChip`, `OpsToggleChip`, `OpsColorSwatch` cuando la interacción lo requiere |
| administración y tablas densas | acciones de fila y menús de acciones existentes en `components/admin/` o módulo correspondiente |
| permisos | `RolePermissionPicker` y opciones de selección asociadas |
| cantidad | `OpsQuantityStepper` cuando el operador ajusta unidades paso a paso |
| alertas de módulo | `OpsAttentionRow` u `OpsActionBanner` según prioridad |

Estas piezas no son estándares universales. Mantenerlas cerca del dominio si no tienen uso transversal demostrado.

## Compatibilidad y legacy

Algunos aliases o wrappers antiguos permanecen para no romper módulos existentes. Para código nuevo, preferir el núcleo actual cuando el reemplazo sea claro. No abrir una migración masiva solo por retirar un alias.

Ejemplos de compatibilidad conocida:

| Compatibilidad | Preferencia actual |
|---|---|
| `OpsInlineBadge` | `OpsStatusBadge` |
| `OpsPendingRow` | `OpsAttentionRow` |
| `OpsCardActionLink` | `OpsActionLink` o `Button` según jerarquía |
| `OpsMetricStripItem`, `OpsSummaryBand` | composición con métricas actuales si el flujo lo necesita |
| primitivas internas `CompactPicker*` | consumir la composición pública adecuada, no la primitiva directamente |

La existencia de una fila en esta tabla no obliga a cambiar consumidores vigentes.

## Cómo mantener el inventario

Actualizarlo solo cuando ocurra una de estas situaciones:

- se introduce una familia compartida con al menos dos usos estables;
- se retira definitivamente una compatibilidad;
- cambia la recomendación pública de una interacción;
- se corrige una referencia factual que ya no coincide con el código.

No actualizarlo para registrar cada clase, cada prop o cada cambio local de una pantalla.

## Referencias relacionadas

- `DESIGN.md`: reglas visuales y núcleo compartido.
- `docs/frontend-operational-components.md`: elección por interacción.
- `docs/frontend-page-standard.md`: composición de página.
- `docs/frontend-architecture-standard.md`: ubicación de pantallas y rutas.
