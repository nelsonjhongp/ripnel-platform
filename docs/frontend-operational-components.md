# Frontend Operational Components

Catalogo corto de componentes y patrones reusables para vistas operativas RIPNEL.

Este documento complementa a `docs/frontend-page-standard.md`.

## Acciones de fila

- Usar `AdminRowActions` para la celda de acciones.
- Usar `AdminRowActionButton` como patron por defecto.
- El layout oficial es `icono + texto`.
- `tone="neutral"` para consulta o edicion.
- `tone="danger"` para inactivar, eliminar o acciones destructivas.
- `icon-only` solo cuando la accion sea universalmente reconocible y lleve tooltip.
- `AdminRowActionsMenu` es la variante oficial para tablas densas donde varias acciones visibles rompen alineacion o consumen demasiado ancho.
- El trigger del menu usa `3 puntos verticales`.
- Los items del dropdown conservan `icono + texto`.

## Selects operativos

- `AdminSelectMenu` para seleccion simple en formularios administrativos.
- `FilterDropdown` para filtros de tabla.
- `OpsSelectMenu` como base reusable.
- Los dropdowns deben abrir con alto maximo y scroll; no deben crecer sin limite.

## Multiseleccion operativa

- `AdminMultiSelectMenu` para formularios administrativos.
- `OpsMultiSelectMenu` como base reusable.
- Los seleccionados deben resumirse con chips debajo o en el bloque inmediato.

## Chips

- `AdminSelectionChip` para seleccionados de formularios administrativos.
- `OpsSelectionChip` como base reusable.
- Usar version `selected` cuando represente una opcion activa o `por defecto`.

## Checkbox simple

- `AdminCheckboxField` para estados booleanos directos como:
  - `Usuario activo`
  - `Rol activo`
  - `Sede activa`
  - `Cliente activo`
- Debe verse discreto, sin panel pesado, y permitir click en box y label.

## Checkbox option

- `AdminCheckboxOption` para listas seleccionables con:
  - label principal;
  - helper corto;
  - estado visual de seleccionado.
- Usarlo en permisos u opciones operativas donde el usuario necesita escanear varias filas.

## Campo readonly

- `AdminReadonlyFieldState` para valores autogenerados o no editables en formularios.
- Debe comunicar estado de solo lectura sin parecer input manual.

## Permisos

- `RolePermissionPicker` es el punto unico para permisos de roles.
- Debe trabajar con `Buscar + Módulo`.
- Los permisos visibles deben usar `AdminCheckboxOption`.
- La vista `Todos` no debe renderizar una pared larga de modulos abiertos.

## Regla practica

Si una pantalla nueva necesita alguno de estos patrones, primero reutilizar este set y solo crear una pieza nueva cuando:

- el caso no encaje semanticamente;
- la interaccion cambie de verdad;
- o la nueva pieza vaya a servir a una familia clara de pantallas.

## Familia Productos

- `Resumen de productos` debe apoyarse en `OpsPageShell`, `OpsMetricPill`, `FilterDropdown` y `AdminRowActionsMenu`.
- `Nuevo producto` mantiene `OpsSelectMenu`, `OpsMultiSelectMenu`, `OpsSelectionChip` y `OpsReadonlyFieldState` como referencia del flujo de alta completo.
- `Styles` y `Variantes` deben reutilizar el mismo stack de tablas y acciones que `Administracion` y `Clientes`, incluyendo confirmacion para `Activar / Inactivar`.
- La ruta `/productos/[productId]` hoy funciona como orquestador de submodulos (`estilos`, `variantes`); no debe tratarse como detalle real de producto mientras esa pantalla no exista.
