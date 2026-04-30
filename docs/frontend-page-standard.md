# Frontend Page Standard

Estandar modular para paginas operativas de RIPNEL. Este documento define como componer una pagina por bloques reutilizables y fija un patron mas estricto para paginas con tabla.

La referencia principal para listados tabulares es `transaction-history`. La composicion base es:

- `header`;
- `kpis` opcionales;
- separador sutil;
- `bloque tabla`, que incluye filtros, tabla y paginacion.

El bloque tabla se entiende como una sola unidad operativa. No debe fragmentarse en varios paneles independientes si borde, divisores y ritmo vertical ya resuelven la jerarquia.

## Objetivo

- dar consistencia a futuras paginas del frontend;
- mantener una lectura ERP compacta y directa;
- evitar dashboards decorativos y paneles pesados;
- asegurar que la UI responda al tema activo;
- dejar reglas claras para `header`, `kpis`, `tabla`, `filtros` y `paginacion`.

## Page Shell

La pagina se construye por modulos. Cada modulo debe tener una funcion clara y un lugar estable dentro del flujo visual.

- Respetar el tema activo usando tokens, superficies y bordes existentes.
- Mantener ancho util segun el tipo de contenido:
  - contenido simple, settings o formularios: ancho mas contenido;
  - listados densos o tablas anchas: ancho mas amplio.
- No usar full width por costumbre. Abrir el ancho solo cuando el volumen de columnas o controles realmente lo necesite.
- Mantener espaciado vertical compacto y operativo.
- Evitar panel dentro de panel si la jerarquia ya se entiende por orden, tipografia y separadores.
- Recordar que `SidebarShell` ya aporta breadcrumb y shortcuts globales; no duplicar ese contexto dentro del contenido.

## Modulo: Header

El `header` es el primer modulo de la pagina y define el contexto principal.

Incluye:

- `eyebrow`;
- `title`;
- `subtitle` opcional;
- `actions` o shortcuts a la derecha.

Reglas:

- Reutilizar `PosHeader` como referencia principal para este bloque.
- El `eyebrow` va en color de acento, en mayusculas y con presencia breve.
- El `title` es el `h1` principal de la pagina.
- El `subtitle` solo entra si orienta una decision real o evita confusion operativa.
- Las `actions` deben verse compactas y secundarias al titulo.
- No envolver el header en una card pesada por defecto.
- No meter KPIs dentro del header por costumbre.

### Tamaños del Header

- `eyebrow`: `11px`, `font-semibold`, uppercase, tracking amplio.
- `title`: `1.5rem` base, `1.75rem` en pantallas amplias, `font-semibold`.
- `subtitle`: `14px` aprox., color secundario, copy breve.
- `actions`: altura compacta, tamaño visual contenido, sin competir con el `h1`.

## Modulo: KPIs

Los `kpis` viven inmediatamente despues del `header` cuando la pagina necesita resumir el estado del listado o de la operacion.

Reglas:

- Son opcionales. No deben aparecer por inercia.
- Deben verse como pills, chips o metricas compactas.
- No usar cards grandes tipo dashboard como patron base.
- La fila puede hacer wrap, pero debe seguir sintiendose horizontal y breve.
- Los KPIs resumen estado; no reemplazan filtros, tabla ni paginacion.
- Si existe este modulo, debe haber un separador sutil antes del siguiente bloque operativo.
- La referencia oficial de color es `neutro + principal con acento + secundario semantico`.
- La variedad cromatica debe responder a importancia, tipo de dato o estado; no a decoracion gratuita.
- La jerarquia cromatica debe expresarse con `fondo + borde + tinta`; no solo con un borde diferente.
- Evitar varios KPIs "primarios" compitiendo al mismo tiempo.

## Modulo: Tabla

En paginas de historial, cola operativa, listado o consulta repetitiva, `tabla` es un modulo unico.

Incluye:

- `filtros`;
- `tabla visual`;
- `conteo y paginacion`.

Reglas:

- Tratarlo como un solo bloque funcional.
- No separar filtros, tabla y paginacion en paneles independientes salvo necesidad real.
- Puede vivir sin panel exterior si el borde de la tabla, los divisores y el ritmo visual ya ordenan la lectura.
- Si despues existe otro modulo distinto, recien ahi debe aparecer un nuevo separador.

## Submodulo: Filtros

Los `filtros` viven dentro del bloque tabla y se usan segun el dominio de datos del modulo.

Orden recomendado:

- busqueda a la izquierda cuando aplique;
- filtros especificos por estado, tipo, sede o similar;
- `fecha desde` y `fecha hasta` cuando tenga sentido;
- accion de `limpiar` o reset.

Reglas:

- Los filtros pueden vivir libres, sin panel propio.
- Deben usar componentes y estilos ya existentes.
- Deben responder correctamente al tema activo.
- Si un modulo no necesita un tipo de filtro, no se inventa solo por cumplir la estructura.
- Los labels de filtro deben ser compactos, claros y operativos.

### Date Picker reusable

Cuando un filtro de fecha requiera mejor experiencia que el input nativo, el patron recomendado es un `Date Picker` reusable del sistema.

Reglas:

- Debe abrir en popover ligero, no como widget protagonista.
- Debe verse como filtro de tabla y respetar los mismos tokens de tema.
- Debe usar locale en espanol si el modulo es operativo local.
- Debe ser reutilizable para `fecha desde` y `fecha hasta`.
- Debe devolver un valor estable para filtros, idealmente `YYYY-MM-DD`.
- Debe distinguir `hoy` y `seleccionado` con dos niveles de enfasis:
  - `hoy`: referencia suave;
  - `seleccionado`: enfasis principal.
- Si `hoy` coincide con el dia seleccionado, debe prevalecer visualmente `seleccionado`.
- Si la experiencia nativa ya cubre el caso y no aporta complejidad extra, puede mantenerse el input nativo como excepcion justificada.

### Regla de Limpiar

La accion de `limpiar` debe seguir este patron por defecto:

- boton `icon-only`;
- icono de reset o rotacion, no texto visible como patron base;
- tooltip `Limpiar filtros`;
- hover, focus y `cursor-pointer` obligatorios.

Si un caso puntual necesita texto visible por claridad o accesibilidad operativa, debe justificarse por el contexto del modulo.

## Submodulo: Tabla visual

La `tabla visual` es la superficie principal del bloque.

Reglas:

- Mantener headers compactos, breves y en uppercase.
- Mantener filas densas y operativas.
- Priorizar acciones directas por fila.
- Evitar copy decorativo o descriptivo dentro de la tabla.
- Usar divisores, borde y fondo para ordenar, sin sobrecargar de cajas.
- La tabla debe sentirse como herramienta operativa, no como dashboard.

### Layout tabular y ajuste entre columnas

- El template de columnas debe responder a la densidad real del dato.
- `Venta` y `Fecha` pueden compactarse mas que columnas descriptivas largas como `Cliente`.
- `Venta` y `Fecha` deben tender a una lectura cercana y continua cuando ambas columnas contienen datos cortos.
- Evitar huecos visuales innecesarios entre columnas ancla.
- Si una columna tiene contenido corto y estable, no debe recibir el mismo ancho que una columna narrativa.

### Escala de tamaños en filas

Dentro de una fila ERP compacta no todo debe pesar igual. La tabla necesita una jerarquia tipografica corta, estable y facil de escanear.

#### Dato principal de fila

- Usarlo para correlativo principal, nombre ancla o monto principal.
- Tamano base recomendado: `14px` aprox. (`text-sm`).
- Peso recomendado: `font-semibold`.
- Puede destacar un nivel sobre el resto, pero no debe verse como titulo.

#### Dato base de celda

- Usarlo para cliente, vendedor, sede o contenido principal regular.
- Tamano recomendado: `14px` aprox. (`text-sm`).
- Peso recomendado: regular o medium segun importancia.

#### Dato secundario o metadata

- Usarlo para fechas, codigos de apoyo, tipo de documento, moneda, subtipo o aclaracion breve.
- Tamano recomendado: `11px` a `12px`.
- Puede usar uppercase o tono muted segun el caso.
- Debe sentirse claramente mas pequeno que el dato principal.

Por defecto, los siguientes elementos se consideran secundarios:

- fechas;
- codigos secundarios;
- documento o subtipo;
- moneda;
- etiquetas auxiliares;
- metadata de apoyo en una segunda linea.

#### Encabezados, chips y densidad

- Encabezados de tabla: `12px` aprox. (`text-xs`), uppercase, `font-semibold`, tracking amplio.
- Chips o badges: `11px` a `12px`, `font-semibold`, padding corto y altura compacta.
- La fila debe resolverse con el menor contraste tipografico posible:
  - el dato principal sube solo un nivel;
  - lo secundario baja claramente;
  - evitar varios elementos compitiendo como principal.
- Intentar resolver cada celda en una o dos lineas como maximo.
- La densidad base del sistema para tablas es `Compacta ERP`.

### Acciones en fila

- Patron recomendado por defecto: `secundaria compacta de consulta + primaria contextual`.
- La accion de consulta puede ser `icon-only` o boton pequeno con texto visible; si el reconocimiento mejora de forma clara con texto, se prefiere el boton compacto.
- Reservar una sola accion destacada cuando exista una operacion principal contextual.
- Evitar que la accion secundaria compita visualmente con la primaria.
- Si una accion es condicional, la celda debe mantener balance visual y no romper la altura o alineacion de la fila.

## Submodulo: Paginacion

La `paginacion` vive al pie del bloque tabla cuando el listado lo requiere.

Reglas:

- Debe ser visible y compacta.
- Debe mostrar rango tipo `1-10 de N`.
- Default oficial: `10 filas por pagina`.
- La navegacion debe ser breve y directa.
- Para listados amplios, el patron recomendado es `paginacion numerada compacta`.
- Debe usar labels en espanol: `Anterior` y `Siguiente`.
- Debe poder mostrar elipsis cuando el total de paginas sea alto.
- La pagina activa debe tener el enfasis principal del sistema.
- Las paginas inactivas deben verse neutrales, compactas y claramente clickeables.
- Si un modulo rompe ese limite, debe justificarse explicitamente en codigo.

## Separadores entre modulos

Los separadores deben ordenar modulos grandes, no romper la continuidad interna del bloque tabla.

Reglas:

- `header` y `kpis` pueden convivir sin linea entre si.
- Entre `kpis` y `tabla` debe existir separador sutil.
- Dentro del bloque tabla no usar separadores externos que partan artificialmente `filtros`, `tabla` y `paginacion`.
- Si no hay KPIs, el separador antes del bloque tabla puede usarse segun densidad y claridad visual.
- Si aparece otro bloque distinto despues de la tabla, ese nuevo bloque debe separarse con una linea o respiracion equivalente.

## Tema, tokens y affordance

Toda pagina debe acoplarse al tema actual y usar el sistema visual existente.

Reglas:

- Usar tokens, superficies, bordes y estados ya presentes en el proyecto.
- No usar clases aisladas si ya existe una variable o patron equivalente.
- Botones, selects, dropdowns, icon-actions y filas accionables deben mostrar affordance clara.
- Todo control clickeable debe mostrar `cursor-pointer` o heredar ese comportamiento desde el componente base.
- Hover y focus deben ser visibles tanto en tema claro como en grafito.
- No dejar elementos que parezcan accion si no tienen feedback visual real.
- Preferir componentes base ya presentes como `Button`, `DropdownMenu` y `Tooltip`.

## Otras familias de pagina

Este estandar tambien aplica a otras vistas, aunque sin forzar tabla o KPIs.

### Formularios operativos

- Heredan el mismo `header`.
- Usan ancho mas contenido si la lectura lo permite.
- Priorizan grupos claros y compactos sobre muchas tarjetas separadas.

### Detalle o consulta

- Heredan el mismo `header`.
- Pueden omitir KPIs y tabla.
- Deben mantener jerarquia sobria y lectura operativa.

### Settings y cuenta

- Heredan `header` y `page shell`.
- Deben usar anchos mas contenidos.
- No necesitan KPIs ni tabla por obligacion.
- Deben sentirse como configuracion operativa, no como dashboard.

## Referencias de uso

### `transaction-history`

- referencia principal del patron tabular;
- usa `header` -> `kpis` -> separador -> `bloque tabla`;
- sirve como modelo base para futuras paginas con tabla.

### `postventa`

- referencia valida cuando un modulo necesita alternar tabla y tarjetas;
- no invalida el patron base, solo muestra una excepcion operativa legitima.

### `PosHeader`

- referencia principal del modulo `header`.

### `SidebarShell`

- referencia para no duplicar breadcrumb ni shortcuts globales dentro del contenido.

## Casos de prueba del estandar

- Una pagina de historial debe poder montarse con `header`, `kpis`, separador y `bloque tabla`.
- Una pagina sin KPIs debe poder resolver `header` y `bloque tabla` sin perder jerarquia.
- Una pagina de settings debe heredar `header` y `page shell` sin forzar tabla ni metricas.
- Una pagina de listado debe mantener tema, affordance y densidad sin depender de paneles extra.
- Una fila con `correlativo + documento` debe mostrar el correlativo como ancla y el documento en escala secundaria.
- Una fila con fecha y sede no debe darles el mismo peso visual que al dato principal.
- Una celda de total debe permitir monto principal y moneda secundaria sin verse alta.
- Un filtro de fecha reusable debe abrir calendario en espanol, respetar tema y seguir sintiendose como filtro compacto.
- Un calendario reusable debe distinguir claramente `hoy` y `seleccionado` sin romper el tema.
- Una celda de acciones debe poder resolver consulta y accion principal sin que ambas compitan como botones principales.

## Checklist rapido

- El `header` usa eyebrow, titulo y acciones con la escala correcta?
- El subtitulo existe solo si realmente orienta?
- Los `kpis` viven despues del header y no dentro de el?
- Los KPIs siguen la jerarquia `neutro + principal con acento + secundario semantico`?
- Los KPIs usan color real en fondo, borde y tinta, no solo un cambio de borde?
- Hay separador sutil entre `kpis` y `tabla` cuando existen KPIs?
- El bloque `tabla` incluye filtros, tabla y paginacion como una sola unidad?
- Los filtros son los necesarios para el dato y no una lista decorativa?
- `Limpiar` sigue el patron `icon-only + tooltip` salvo justificacion real?
- La tabla es la superficie principal de la pagina?
- La fila usa una jerarquia corta de tamanos y evita que varios elementos parezcan titulos?
- Fechas, codigos y metadata estan tratados como secundarios y se ven mas pequenos?
- El ancho relativo entre columnas acompana la densidad real del dato y evita huecos innecesarios, sobre todo entre `Venta` y `Fecha`?
- Las acciones de fila siguen el patron `secundaria compacta de consulta + primaria contextual` cuando aplica?
- El date picker diferencia `hoy` y `seleccionado` con dos niveles de enfasis?
- La paginacion usa un patron numerado compacto cuando el listado ya no se resuelve bien solo con anterior/siguiente?
- La paginacion usa `10 filas por pagina` por defecto y muestra rango visible?
- El ancho de la pagina responde al volumen real del contenido?
- La UI se adapta al tema activo usando tokens existentes?
- Todo elemento interactivo tiene cursor, hover y focus claros?
