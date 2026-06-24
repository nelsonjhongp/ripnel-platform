# Frontend Page Standard

Fuente principal para composicion visual de paginas frontend en RIPNEL. Este documento define como componer una pagina por bloques reutilizables y fija el patron canonico para headers operativos, listados y modulos de soporte.

La referencia principal para listados tabulares es `/ventas/historial`. La composicion base es:

- `header`;
- `kpis` opcionales;
- separador sutil;
- `bloque tabla`, que incluye filtros, tabla y paginacion.

El bloque tabla se entiende como una sola unidad operativa. No debe fragmentarse en varios paneles independientes si borde, divisores y ritmo vertical ya resuelven la jerarquia.

## Objetivo

- dar consistencia a futuras paginas del frontend;
- actuar como referencia principal cuando otros documentos visuales hablen de estructura de pagina;
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
- `actions` o shortcuts a la derecha.

Reglas:

- Reutilizar `PosHeader` como referencia principal para este bloque.
- El `eyebrow` va en color de acento, en mayusculas y con presencia breve.
- El `title` es el `h1` principal de la pagina.
- El header principal estandar no lleva `subtitle` ni `description` visible.
- Si una pantalla necesita orientacion extra, debe resolverse con `actions`, estructura, labels, estados o ayuda contextual puntual; no con un parrafo bajo el `h1`.
- Las `actions` deben verse compactas y secundarias al titulo.
- No envolver el header en una card pesada por defecto.
- No meter KPIs dentro del header por costumbre.

### Tamaños del Header

- `eyebrow`: `11px`, `font-semibold`, uppercase, tracking amplio.
- `title`: `1.5rem` base, `1.75rem` en pantallas amplias, `font-semibold`.
- `actions`: altura compacta, tamaño visual contenido, sin competir con el `h1`.

### Excepcion: paginas de estado

Los componentes de estado o feedback del sistema, como `StatusPage`, `loading`, `error`, `403` y `404`, no usan este contrato de header operativo.

- Pueden mantener `eyebrow + title + description + actions`.
- Su descripcion sigue siendo valida porque orienta recuperacion, error o contexto de sistema.
- No deben reutilizarse como referencia del header principal de paginas operativas.

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
- Si un dato ya se entiende por el rango visible, la paginacion o la propia estructura de tabla, no debe subir a KPI por inercia.

### KPI redundante

Un KPI es redundante cuando solo repite una senal que la tabla ya comunica sin esfuerzo.

Casos tipicos:

- total visible que ya aparece junto a la paginacion;
- conteo general que ya se entiende por el listado y su rango;
- resumen que no cambia prioridad, accion ni lectura operativa.

Si el dato no cambia una decision o no resume algo que de otro modo costaria ver, debe salir del bloque de KPIs.

## Modulo: Tabla

En paginas de historial, cola operativa, listado o consulta repetitiva, `tabla` es un modulo unico.

Incluye:

- `filtros`;
- `tabla visual`;
- `conteo util y paginacion`.

Reglas:

- Tratarlo como un solo bloque funcional.
- No separar filtros, tabla y paginacion en paneles independientes salvo necesidad real.
- Puede vivir sin panel exterior si el borde de la tabla, los divisores y el ritmo visual ya ordenan la lectura.
- Si despues existe otro modulo distinto, recien ahi debe aparecer un nuevo separador.

## Submodulo: Filtros

Los `filtros` viven dentro del bloque tabla y se usan segun el dominio de datos del modulo.

Orden recomendado:

- busqueda a la izquierda como patron base en entidades buscables por nombre, codigo, documento, correo o similar;
- filtros especificos por estado, tipo, sede o similar;
- `fecha desde` y `fecha hasta` cuando tenga sentido;
- accion de `limpiar` o reset.

Reglas:

- Los filtros pueden vivir libres, sin panel propio.
- Deben usar componentes y estilos ya existentes.
- Deben responder correctamente al tema activo.
- Si un modulo no necesita un tipo de filtro, no se inventa solo por cumplir la estructura.
- Los labels de filtro deben ser compactos, claros y operativos.
- En listados de entidades, la busqueda debe asumirse como patron base salvo que el dominio no tenga una clave humana util para buscar.
- Los dropdowns y filtros estructurados complementan la busqueda; no la reemplazan por costumbre.

### Busqueda en listados

Para listados de clientes, usuarios, productos, styles, variantes u otras entidades consultables:

- la busqueda debe ser el primer control del bloque tabla;
- debe resolver el caso comun mas probable antes que los filtros secundarios;
- debe convivir con dropdowns, fechas o orden cuando el dominio lo pida;
- si el dominio no ofrece una busqueda humana util, esa excepcion debe ser intencional y clara.

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

### Regla de Actualizar

La accion de `actualizar` o `refresh` no debe competir con los filtros principales del bloque tabla.

Patron recomendado:

- accion secundaria compacta del `header`; o
- accion de borde superior junto a acciones secundarias del modulo.

Reglas:

- evitar que `refresh` ocupe el lugar de un filtro primario;
- si existe busqueda, no debe ser desplazada por un boton de actualizar;
- si el listado se refresca automaticamente o por cambios de filtro, `refresh` puede omitirse.

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

### Inventario: variantes y tallas en chips

- En inventario agrupado por SKU/producto/ubicacion, la columna de tallas puede resolverse con chips compactos tipo `ST:40`.
- Los chips de tallas deben ser sobrios, de baja saturacion, y no competir con estados operativos.
- La columna de tallas debe mantener lectura horizontal rapida y wrap controlado, sin aumentar en exceso la altura de fila.
- El total de stock por fila debe conservar una columna dedicada y alineacion a la derecha.

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

### Tipos, categorias y estados

No todo chip comunica el mismo nivel de importancia.

#### Badge de tipo o categoria

- Sirve para clasificar una entidad, no para alertar.
- Debe tender a neutro o acento leve.
- No debe competir con la accion principal ni con un estado operativo real.

Ejemplos:

- `Mayorista`;
- `Retail`;
- tipo documental o segmentacion comercial.

#### Estado operativo

- Debe usar color semantico cuando cambia una decision, requiere seguimiento, bloquea o alerta.
- Si es un estado binario estable y repetitivo, debe resolverse de manera mas sobria.
- El estado no debe resaltar mas que el dato principal de fila salvo necesidad real.

#### Estado binario estable

Para valores como `Activo` o `Inactivo` que aparecen repetidamente en tablas:

- evitar saturacion alta por defecto;
- usar tratamiento compacto y coherente con el tema;
- reservar verdes, rojos o ambar fuertes para estados con mayor impacto operativo.

### Estados y tema oscuro

Los badges y estados deben derivar de tokens del tema activo, no de un relleno fijo copiado de tema claro.

Reglas:

- en tema oscuro, bajar saturacion y brillo del relleno;
- mantener contraste legible sin que el chip sobresalga mas que la fila;
- usar `fondo + borde + tinta` adaptados al tema, no el mismo color bruto en ambos modos;
- claro y oscuro pueden compartir semantica, pero no necesariamente el mismo relleno visual.

### Acciones en fila

- Patron recomendado por defecto: `secundaria compacta de consulta + primaria contextual`.
- Patron visual por defecto: `icono + texto` en botones compactos.
- En tablas densas de entidades operativas, cuando varias acciones visibles comprometen alineacion, ancho o consistencia entre filas, se permite usar un menu de overflow con `3 puntos verticales`.
- En ese patron de overflow:
  - el trigger debe ser un icon-only discreto, con hover y focus claros;
  - el menu debe abrir alineado al borde derecho de la celda;
  - los items internos deben mantener `icono + texto`.
- `Editar` debe verse neutral.
- `Inactivar`, `Activar`, `Eliminar` u otra accion destructiva nunca deben resolverse como `icon-only` por defecto.
- `icon-only` queda reservado para acciones universalmente reconocibles, de alta frecuencia y con `tooltip` obligatorio.
- Si una accion necesita texto para evitar ambiguedad operativa, se prefiere `icono + texto` sobre `solo texto`.
- El orden recomendado es:
  - consulta o gestion secundaria;
  - edicion;
  - accion destructiva o de cambio fuerte al final.
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

### Conteo visible

El rango visible y la paginacion son el lugar preferido para el conteo util del listado.

Patron recomendado:

- mostrar `X-Y de N` cuando exista paginacion;
- si no hay paginacion, usar un conteo breve solo si aporta contexto real;
- no duplicar el mismo conteo en KPIs, filtros y paginacion al mismo tiempo.

### Paginacion server-side

Cuando el backend expone endpoints paginados (`LIMIT / OFFSET`), el frontend debe cablear la paginacion de forma consistente siguiendo este patron:

**Estado local:**
```tsx
const [page, setPage] = useState(1)
const pageSize = 20
```

**Query params al backend:**
```tsx
params.set("page", String(page))
params.set("limit", String(pageSize))
```

**Dependencias del fetch:**
- La llamada API incluye `page` en los query params
- `page` esta en el array de dependencias de `useApiGet`
- `page` se resetea a 1 en cada `onChange` de filtro (busqueda, tipo, orden)

**Response del backend:**
```json
{ "ok": true, "data": [...], "total": 123 }
```
El frontend extrae `data` y `total` del JSON completo (no usa `apiFetchData` que solo devuelve `data`).
Usar `apiFetch` directamente y mapear: `.then(res => ({ data: res.data, total: res.total }))`.

**Calculos derivados:**
```tsx
const totalPages = Math.max(1, Math.ceil(total / pageSize))
const safePage = Math.max(1, Math.min(page, totalPages))
const firstVisible = total === 0 ? 0 : (safePage - 1) * pageSize + 1
const lastVisible = Math.min(safePage * pageSize, total)
```

**Renderizado:**
- Pasar `safePage` (no `page`) al componente `<Pagination>`
- Mostrar rango: `CUSTOMERS.table.results(firstVisible, lastVisible, total)` → `"1-20 de 123"`
- Si `total === 0`, mostrar `"0 resultados"`

**Empty state:**
- `total === 0` → `OpsEmptyState` ("no hay registros todavia")
- La tabla usa `customers` directo (sin `usePagination` client-side)

**Compatibilidad con busquedas sin paginar:**
- El backend aplica `LIMIT/OFFSET` solo cuando recibe `page` explicitamente
- Sin `page` → devuelve todos los resultados (usan este modo: search pickers, duplicate guards)

**Referencia canonica:** `customers-page.tsx` lineas 63-100.

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

### `/ventas/historial`

- referencia principal del patron tabular;
- usa `header` -> `kpis` -> separador -> `bloque tabla`;
- el header debe resolverse con `eyebrow + title + actions`, sin parrafo descriptivo visible;
- sirve como modelo base para futuras paginas con tabla.

### Listados de entidades

- referencia conceptual para busqueda primero, filtros estructurados despues y conteo util junto a paginacion;
- no deben duplicar copy, conteos o senales que ya comunica la tabla.

### `postventa`

- referencia valida para listados operativos con badges de disponibilidad;
- sigue el mismo patron tabular que `historial ventas` (header → kpis → separador → bloque tabla);
- usa `OpsStatusBadge size="xs"` para badges de categoria/accesorios (disponibilidad de cambio/anulacion) y `size="sm"` para badges de estado operativo;
- columnas con multiples badges usan `flex gap-1` (sin `flex-wrap` en desktop cuando `minWidth` lo permite);
- si una columna de metadata secundario (ej. vendedor) puede separarse en su propia columna, es preferible a empaquetarla como segunda linea de otra celda;
- `dateTo` con default a hoy cuando el contexto operativo lo justifica.

### `PosHeader`

- referencia principal del modulo `header`.

### `SidebarShell`

- referencia para no duplicar breadcrumb ni shortcuts globales dentro del contenido.

## Referencia canonica: clientes

La implementacion de `customers-page.tsx` (`apps/frontend/components/modules/customers/customers-page.tsx`) es la referencia canonica para estos patrones visuales. Las reglas de esta seccion tienen prioridad sobre convenciones genericas anteriores del documento.

### Estructura de tabla (sin bordes redondeados)

```tsx
// La tabla usa border-y (solo borde superior e inferior), sin rounded-*
<div className="overflow-x-auto">
  <div className="min-w-[1080px] border-y border-[var(--ops-border-strong)]">
    <table className="w-full border-collapse">
      <thead className="bg-[var(--ops-surface-muted)]">
        <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
          <th className="px-4 py-3">Columna</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--ops-border-strong)] bg-[var(--ops-surface)]">
        {/* filas */}
      </tbody>
    </table>
  </div>
</div>
```

### Chip de tipo o categoria (neutro)

```tsx
// Badge neutro con ops-surface-muted, baja saturacion
<span className="inline-flex rounded-full border border-[var(--ops-border-strong)] bg-[color:color-mix(in_srgb,var(--ops-surface-muted)_72%,var(--ops-surface))] px-2.5 py-1 text-[11px] font-semibold text-[var(--ops-text-muted)]">
  {label}
</span>
```

### Chip de estado binario (Activo/Inactivo)

```tsx
// Activo: verde sobrio con color-mix — NUNCA usar accent violeta ni rojo
// Inactivo: neutro opaco con ops-surface-muted
<span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
  active
    ? "border-[color:color-mix(in_srgb,#10b981_34%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#10b981_14%,var(--ops-surface))] text-[color:color-mix(in_srgb,#059669_74%,var(--ops-text))]"
    : "border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] text-[var(--ops-text-muted)]"
}`}>
  {active ? "Activo" : "Inactivo"}
</span>
```

### Jerarquia de datos en fila

```tsx
// Dato principal (nombre ancla, correlativo): text-sm font-semibold
<p className="text-sm font-semibold text-[var(--ops-text)]">{name}</p>
// Metadato secundario (codigo, tipo doc): text-[11px] uppercase tracking
<p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">{code}</p>
```

### Celda de tabla

```tsx
// Padding vertical usa el token ops-row-py (nunca hardcodear px)
<td className="px-4 py-[var(--ops-row-py)] align-top">{content}</td>
```

### Fila con hover

```tsx
// Toda fila de tabla debe mostrar hover
<tr className="transition hover:bg-[var(--ops-surface-muted)]">
```

### Botones en header y acciones

```tsx
// NUNCA usar rounded-full en botones. Siempre rounded-lg.
// Boton primario (accent):
<Button variant="accent" size="sm" className="rounded-lg px-3">
  <Plus className="h-4 w-4" /> Accion
</Button>
// Boton secundario (outline):
<Button variant="outline" size="sm" className="rounded-lg px-3">
  <PencilLine className="h-3.5 w-3.5" /> Editar
</Button>
```

### Busqueda con sales-field

```tsx
// El input de busqueda usa el wrapper sales-field, icono inline
<div className="sales-field flex h-10 items-center gap-2 rounded-lg px-3 transition hover:bg-[var(--ops-surface-muted)]">
  <Search className="h-4 w-4 text-[var(--ops-text-muted)]" />
  <input
    type="text"
    value={query}
    onChange={(event) => setQuery(event.target.value)}
    placeholder="Buscar..."
    className="h-full w-full bg-transparent text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]"
  />
</div>
```

### Labels de filtro

```tsx
// Cada control de filtro DEBE tener un label encima con este patron exacto:
<label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
  Buscar
</label>

// La fila de filtros usa grid con columnas proporcionadas:
<div className="grid gap-2.5 lg:grid-cols-[minmax(0,1.55fr)_0.92fr_0.92fr_auto] lg:items-end">
  <div>
    <label ...>Buscar</label>
    <div className="sales-field ...">{/* input */}</div>
  </div>
  <div>
    <label ...>Tipo</label>
    {/* dropdown o pills */}
  </div>
  ...
</div>

// Si solo hay busqueda (sin filtros adicionales), usar flex:
<div className="flex flex-wrap items-end gap-2.5">
  <div>
    <label ...>Buscar</label>
    <div className="sales-field ...">{/* input */}</div>
  </div>
  {/* limpiar button */}
</div>
```

### KPIs (MetricPill de kardex)

```tsx
// MetricPill con tonos: default (neutro), accent (violeta), warning (amber)
// Label: text-[11px] font-semibold uppercase tracking-[0.16em]
// Value: tabular-nums, todo via color-mix() adaptado al tema
function MetricPill({ label, value, tone = "default" }) { ... }
// Uso:
<MetricPill label="Total" value={count} />
<MetricPill label="Activos" value={activeCount} tone="accent" />
<MetricPill label="Pendientes" value={pendingCount} tone="warning" />
```

## Patrones de formulario: dialogo de creacion/edicion

El dialogo de cliente (`customers-page.tsx` + `customer-form.tsx`) demuestra patrones
reutilizables para cualquier entidad con variantes de tipo (ej. persona_natural vs empresa).

### Entry-mode switch (solo en crear)

Cuando una entidad tiene modos que cambian los campos requeridos:

```tsx
// Toggle al tope del form, solo en modo "create"
{isCreate ? (
  <OpsSegmentedControl
    options={[
      { value: "persona_natural", label: CUSTOMERS.form.switch.personaNatural },
      { value: "empresa", label: CUSTOMERS.form.switch.empresa },
    ]}
    value={state.entry_mode}
    onChange={(entryMode) => onChange({ ...state, ...patchEntryMode(entryMode) })}
    tone="accent"
    variant="switch"
    className="w-full [&>div]:grid [&>div]:w-full [&>div]:grid-cols-2"
  />
) : null}
```

**Reglas:**
- Opciones desde el archivo de mensajes del modulo (nunca hardcodeadas)
- Cambiar de modo resetea todos los campos editables (documento, nombres, direccion)
- Campos especificos de cada modo se renderizan con `{isEmpresa ? <CamposEmpresa/> : <CamposNatural/>}`
- `required` en `OpsFormField` es dinamico segun el modo (`business_name` solo required en empresa)
- En modo `"edit"` no se muestra el switch — el tipo ya esta definido por el registro existente

### Hints contextuales (solo en editar)

En edicion, cuando el tipo de documento implica campos adicionales, se muestra un hint
informativo en vez del switch:

```tsx
{isEdit && isRuc && !isEmpresa ? (
  <div className={`${INFO_BOX_MUTED} flex items-start gap-2 text-xs text-[var(--ops-text-muted)]`}>
    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ripnel-accent)]" />
    <span>{CUSTOMERS.form.hintRuc}</span>
  </div>
) : null}
```

### Two-phase save (idle → validating → saving)

El guardado en el dialog usa tres fases, no un solo booleano:

| Fase | Estado | Que hace |
|------|--------|----------|
| 1. Validacion | `"validating"` | `validateCustomerInput()` + `findDuplicateByDocument()` via API |
| 2. Guardado | `"saving"` | POST o PATCH al backend |

```tsx
const [actionState, setActionState] = useState<"idle" | "validating" | "saving">("idle")
const isBusy = actionState !== "idle"

async function save() {
  const validation = validateInput(form)
  if (validation) { setErrors(validation); return }

  setActionState("validating")
  setErrors(null)
  const duplicate = await findDuplicateByX({ ...excludeId })
  if (duplicate) { setErrors({ field: message }); setActionState("idle"); return }

  setActionState("saving")
  await apiFetchData(...)
  close()
}
```

Cada fase muestra `<LoaderCircle className="animate-spin">` + texto propio, y el boton
esta `disabled` mientras `isBusy`.

### Per-field errors

Los errores de validacion se asignan al campo que los causo, no como mensaje generico:

```tsx
// Tipo de errores
type EntityFormErrors = {
  full_name?: string
  document_number?: string
  business_name?: string
  address?: string
}

// Validacion retorna el tipo o null
function validateInput(input): EntityFormErrors | null { ... }

// Cada campo recibe su error individual
<OpsFormField label="Razon social" required error={errors?.business_name} density="compact">
  <input className={opsInputCompact} ... />
</OpsFormField>
```

**Reglas:**
- Errores se limpian al abrir el dialog (`useEffect` sobre `open`)
- Errores del backend (409, 400) se mapean al campo correspondiente en el `catch`
- `OpsFormField` aplica 3 canales: label rojo, input con borde rojo, mensaje abajo

### Documento con normalizacion y contador

Para campos de documento (DNI, RUC, CE, pasaporte), el input aplica normalizacion en
tiempo real y muestra un contador de caracteres:

```tsx
function normalizeDocumentInput(type: string, value: string) {
  if (type === "dni" || type === "ruc") return value.replace(/\D/g, "")
  if (type === "passport") return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
  if (type === "ce") return value.replace(/[^A-Za-z0-9]/g, "")
  return value
}

// Contador flotante sobre el input
const counter = `${value.length}/${maxLength}`  // → "8/8"
```

---

## Casos de prueba del estandar

- Una pagina de historial debe poder montarse con `header`, `kpis`, separador y `bloque tabla`.
- Una pagina sin KPIs debe poder resolver `header` y `bloque tabla` sin perder jerarquia.
- Una pagina de settings debe heredar `header` y `page shell` sin forzar tabla ni metricas.
- Una pagina de listado debe mantener tema, affordance y densidad sin depender de paneles extra.
- Una pagina de entidades debe poder abrir con busqueda como primer control y dropdowns como filtros secundarios.
- Un listado no debe repetir el mismo conteo en KPI, filtros y paginacion a la vez.
- Una fila con `correlativo + documento` debe mostrar el correlativo como ancla y el documento en escala secundaria.
- Una fila con fecha y sede no debe darles el mismo peso visual que al dato principal.
- Una celda de total debe permitir monto principal y moneda secundaria sin verse alta.
- Un filtro de fecha reusable debe abrir calendario en espanol, respetar tema y seguir sintiendose como filtro compacto.
- Un calendario reusable debe distinguir claramente `hoy` y `seleccionado` sin romper el tema.
- Una celda de acciones debe poder resolver consulta y accion principal sin que ambas compitan como botones principales.
- Un badge de tipo debe verse mas neutro que un estado operativo.
- Un estado binario estable debe verse coherente tanto en claro como en oscuro sin usar el mismo relleno bruto.

## Checklist rapido

- El `header` usa eyebrow, titulo y acciones con la escala correcta?
- El header principal evita subtitulo o descripcion visible?
- Los `kpis` viven despues del header y no dentro de el?
- Los KPIs siguen la jerarquia `neutro + principal con acento + secundario semantico`?
- Los KPIs usan color real en fondo, borde y tinta, no solo un cambio de borde?
- Hay separador sutil entre `kpis` y `tabla` cuando existen KPIs?
- El bloque `tabla` incluye filtros, tabla y paginacion como una sola unidad?
- La busqueda aparece primero cuando la entidad es naturalmente buscable?
- Los filtros son los necesarios para el dato y no una lista decorativa?
- El `refresh` esta arriba o en borde secundario, sin competir con filtros primarios?
- `Limpiar` sigue el patron `icon-only + tooltip` salvo justificacion real?
- La tabla es la superficie principal de la pagina?
- El conteo util vive preferentemente en rango/paginacion y no esta duplicado por costumbre?
- La fila usa una jerarquia corta de tamanos y evita que varios elementos parezcan titulos?
- Fechas, codigos y metadata estan tratados como secundarios y se ven mas pequenos?
- El ancho relativo entre columnas acompana la densidad real del dato y evita huecos innecesarios, sobre todo entre `Venta` y `Fecha`?
- Las acciones de fila siguen el patron `secundaria compacta de consulta + primaria contextual` cuando aplica?
- Los badges de tipo no compiten con los estados operativos?
- Los estados responden al tema y bajan saturacion en oscuro cuando corresponde?
- El date picker diferencia `hoy` y `seleccionado` con dos niveles de enfasis?
- La paginacion usa un patron numerado compacto cuando el listado ya no se resuelve bien solo con anterior/siguiente?
- La paginacion usa `10 filas por pagina` por defecto y muestra rango visible?
- El ancho de la pagina responde al volumen real del contenido?
- La UI se adapta al tema activo usando tokens existentes?
- Todo elemento interactivo tiene cursor, hover y focus claros?
- La pagina distingue claramente entre `page header` operativo, `section header` y `status page`?
