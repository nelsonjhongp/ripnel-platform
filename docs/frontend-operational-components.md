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
- Usar dropdown multiselect cuando el catalogo puede crecer o cuando la lista
  ocupa demasiado espacio en el formulario.
- Usar chips inline cuando el conjunto es corto y conviene verlo completo de un
  vistazo, como tallas operativas.

## Chips

- `AdminSelectionChip` para seleccionados de formularios administrativos.
- `OpsSelectionChip` como base reusable.
- Usar version `selected` cuando represente una opcion activa o `por defecto`.
- `OpsSelectionChip removeMode="chip"` es el patron para seleccionados que se
  quitan haciendo click en todo el chip; mantiene `aria-label="Quitar ..."` y
  muestra una `X` visual.
- `OpsToggleChip` es el patron para seleccion multiple inline con estado
  `Plus` / `Check`, por ejemplo tallas.
- `OpsColorSwatch` es el swatch circular reusable para colores de catalogo.
- No recrear chips de multiseleccion locales si el caso encaja con
  `OpsSelectionChip` u `OpsToggleChip`.

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

## Validacion en modales operativos

- Usar errores por campo tipados; evitar un unico string global cuando hay varios campos editables.
- Al editar un campo, limpiar solo el error de ese campo y conservar errores pendientes de otros campos.
- El submit debe enfocar el primer campo invalido en orden visual de correccion.
- Usar validacion reactiva solo cuando evita trabajo perdido, como duplicados de nombre o documento.
- No mostrar estados positivos permanentes como `disponible`; mostrar feedback solo si bloquea o corrige una accion.
- Mapear conflictos `409` del backend al campo responsable cuando sea claro, por ejemplo nombre duplicado.
- Normalizar entradas suavemente en `blur` cuando no cambia la intencion del usuario, como `trim` y espacios multiples.
- Mantener estados de accion en fases (`validating`, `saving`) con `LoaderCircle` y botones deshabilitados.
- Los errores de catalogo vacio deben explicar el bloqueo real, no quedar como validacion generica.

Checklist minimo para un modal nuevo:

- `OpsDialog` con `description` y footer canonico.
- `Button variant="outline"` para cancelar y `variant="accent"` para confirmar.
- Textos visibles en `<module>-messages.ts`.
- Tipos de error por campo en `<module>-types.ts`.
- Validacion pura en `<module>-utils.ts`.
- `actionState: "idle" | "validating" | "saving"` si hay chequeos previos o escritura en backend.
- Foco al primer error despues de submit.
- Conflictos backend (`409`) mapeados al campo responsable cuando exista una correspondencia clara.
- Sin mensajes positivos persistentes si no cambian la decision del usuario.

Referencia actual: `Nuevo producto` usa duplicado reactivo por nombre comercial,
errores por campo, foco al primer error y multiseleccion con componentes reusables.

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

- `Resumen de productos` debe apoyarse en `OpsPageShell`, `OpsMetricInlineGroup`, `OpsSelect` y `AdminRowActionsMenu`.
- `Nuevo producto` mantiene `OpsDialog`, `OpsFormField`, `OpsSelect`, `OpsMultiSelectMenu`, `OpsSelectionChip`, `OpsToggleChip` y `OpsColorSwatch` como referencia del flujo de alta completo.
- Para tallas, preferir chips inline con `OpsToggleChip`; para colores,
  preferir `OpsMultiSelectMenu` + chips `OpsSelectionChip removeMode="chip"`.
- `Nuevo producto` es la referencia para validacion de alta completa: duplicado reactivo por nombre comercial, foco al primer error y errores por campo sin mensajes positivos permanentes.
- SKU y codigo de barras no pertenecen al modal de alta comercial; viven en variantes, etiquetado o flujos tecnicos posteriores.
- No recrear dropdowns, chips o swatches locales si el caso puede cubrirse con
  `OpsMultiSelectMenu`, `OpsSelectionChip`, `OpsToggleChip` u `OpsColorSwatch`.
- `MultiSelectCatalog` existe como wrapper de catalogos, pero no debe ser el
  patron primario para `Nuevo producto` mientras incluya accion `Crear nuevo` y
  copy de fallback propio. Si se reutiliza, debe consumir `OpsColorSwatch` y
  `OpsSelectionChip`.
- `Styles` y `Variantes` deben reutilizar el mismo stack de tablas y acciones que `Administracion` y `Clientes`, incluyendo confirmacion para `Activar / Inactivar`.
- La ruta `/productos/[productId]` hoy funciona como orquestador de submodulos (`estilos`, `variantes`); no debe tratarse como detalle real de producto mientras esa pantalla no exista.
