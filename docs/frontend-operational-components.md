# Frontend Operational Components

## Propósito

Guía breve para elegir componentes existentes según la interacción. No es una obligación de migrar todos los módulos ni una lista de wrappers que deban crearse.

## Acciones de fila

- Usar acción visible cuando existe una acción frecuente y clara.
- Usar menú de acciones cuando varias opciones competirían por ancho o prioridad.
- Mantener icono + texto para acciones que podrían ser ambiguas.
- Usar icono sin texto solo para acciones universalmente reconocibles y con tooltip.
- Destructivo debe conservar texto, tono semántico y confirmación proporcional.

## Selección simple y filtros

- `OpsSelect` para selección simple en formularios y filtros cuando el conjunto es acotado.
- `OpsSearchField` para buscar en listados.
- `SearchablePicker` para encontrar entidades o productos dentro de un catálogo grande.
- Los selectores deben tener máximo de altura y scroll cuando las opciones crecen.
- No crear una variante de select local solo por cambiar bordes o padding; el control compartido ya define el contrato visual.

## Búsqueda de producto en flujos workspace

POS, ajustes de inventario y solicitud de transferencias comparten un patrón de búsqueda dentro de un panel de etapa. Usar `SearchablePicker` (o un wrapper de dominio como `ProductStylePicker`) con las siguientes props para mantener consistencia operativa:

- `openOnFocus`: abrir el dropdown al enfocar, sin obligar a tipear primero.
- `density="compact"`: altura `h-9` para densidad operativa.
- `inputMode="search"` y `enterKeyHint="search"`: comportamiento móvil consistente.
- `autoComplete="off"`: evitar autocompletado del navegador.
- Sin `label`: el título de la sección (`OpsStepSectionHeading`) ya comunica el propósito; un label extra añade ruido vertical sin aportar información.
- Placeholder descriptivo ("Buscar por producto o código") en lugar de genérico ("Buscar producto...").

El panel contenedor debe usar `WORKSPACE_SECTION_CLASS` de `ops-control-styles.ts`, con `OpsStepSectionHeading` como primer hijo. Esto mantiene el contrato visual entre POS, ajustes y transferencias: borde, fondo surface, sombra suave, transición y padding responsivo.

Excepciones válidas: flujos donde el conjunto es acotado y no justifica abrir en focus (`minQueryLength` + `emptyStateMode="query"`), o donde el wrapper de dominio ya encapsula el comportamiento esperado.

## Estados vacíos en stages

Cuando un stage o panel de workspace no tiene contenido (carrito vacío, sin cliente, sin origen, sin items en borrador), usar `OpsHint` en lugar de dibujar la tabla, lista o card vacía.

- `OpsHint` aplica borde dashed, fondo muted y texto centrado, con padding compacto (`py-4` o `py-3`).
- No usar paddings altos (`py-10`, `py-12`) para estados vacíos: producen un panel "hueco" que rompe la densidad operativa.
- No dibujar una tabla con una sola fila `<td colSpan>` vacía: reemplazar toda la tabla por `OpsHint` cuando `length === 0`.
- Copy informativo ("Aún no hay productos agregados a la venta.") sobre instructivo ("Selecciona un producto para revisar detalle."); el contexto del stage ya indica la acción disponible.
- `OpsHint` es el componente compartido; no recrear el `div` con classes inline tipo `ops-empty-state-compact`.

## Multiselección

Usar multiselección cuando el operador necesita seleccionar varios elementos y comprender el conjunto resultante.

- `OpsMultiSelectMenu` cuando las opciones pueden crecer o requieren búsqueda.
- `OpsSelectionChip` para representar elementos seleccionados.
- `OpsToggleChip` cuando un conjunto corto necesita selección visible de un vistazo.
- `OpsColorSwatch` cuando el color es dato real del catálogo y no solo decoración.

No aplicar multiselección visual expandida cuando un select simple resuelve la tarea con menor ruido.

## Formularios y validación

- `OpsFormField` para label, requerido, hint y error.
- Usar errores por campo cuando el usuario pueda corregir el dato puntualmente.
- Mapear conflictos backend a un campo solo si la correspondencia es clara; de lo contrario, mostrar error de formulario.
- Limpiar el error del campo cuando el usuario lo corrige.
- Enfocar el primer error después de un submit fallido cuando el formulario sea largo o tenga varios campos.
- Estados de `validating` y `saving` se usan cuando hay una validación previa o escritura en curso perceptible; no son requisito universal.

## Diálogos

- `OpsDialog` para una decisión acotada.
- Cancelar y confirmar deben tener jerarquía visual clara.
- Incluir una descripción cuando la acción, consecuencia o contexto no sea obvio por título y contenido.
- No convertir formularios extensos, tablas o flujos multietapa en un diálogo solo por evitar una ruta.

## Campo readonly y permisos

- Mostrar valores generados o no editables con una apariencia distinta de un input editable.
- Las opciones visibles deben respetar permisos, pero el backend conserva autorización final.
- Roles y permisos requieren componentes o composiciones del dominio; no convertirlos en un patrón global sin necesidad.

## Regla práctica

Reutiliza una pieza existente cuando coincide semántica y funcionalmente. Crea una pieza nueva solo si la interacción cambia de verdad o si ya existe un segundo uso estable fuera del módulo actual.
