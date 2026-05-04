# Frontend UI UX Considerations

Guia rapida para decisiones visuales y de experiencia en RIPNEL.

Este documento complementa a `docs/frontend-page-standard.md`. Cuando haya reglas sobre estructura de pagina, header principal o composicion de modulos, manda `frontend-page-standard.md`.

## Principios base

- No explicar lo obvio: si el titulo, label o accion ya comunican la idea, no agregar parrafo descriptivo.
- Usar una sola descripcion por contexto. Evitar repetir la misma idea en header, seccion y fila.
- Preferir interfaces finas, compactas y operativas antes que bloques decorativos.
- Comparar contra Supabase como referencia de densidad, ritmo y orden, no para copiar marca o producto.
- Mantener informacion donde se usa: labels fuertes junto a controles, detalles solo cuando cambian una decision.

## Settings y perfil

- Usar una columna contenida; evitar full width cuando la pantalla es de lectura/configuracion.
- Priorizar paneles continuos con filas separadas por borde sobre cards grandes apiladas.
- En filas de settings, usar label a la izquierda y valor/control alineado a la derecha.
- Mantener filas compactas; si una fila crece, debe ser porque contiene informacion necesaria.
- Evitar iconos grandes en encabezados de seccion. Si se usan, deben ser secundarios y no competir con el titulo.
- En paginas hijas de settings, usar un enlace claro de retorno como `Volver a perfil`.

## Escala tipografica

- Titulo principal de pagina:
  - `font-size: 1.5rem`
  - `line-height: 2rem`
  - `letter-spacing: -.025em`
- Subtitulo o encabezado de seccion:
  - `font-size: 1rem`
  - `line-height: 1.5rem`
  - peso semibold
- Labels de campos:
  - `font-size: .875rem`
  - peso semibold
- Hint o texto secundario de campo:
  - `font-size: .75rem`
  - solo usarlo cuando agrega contexto real

## Copy

- El header principal de pagina no debe llevar descripcion visible; para estructura de header, seguir `docs/frontend-page-standard.md`.
- Las secciones no necesitan descripcion si sus filas ya explican el contenido.
- Los detalles de fila se reservan para aclaraciones utiles, como el uso operativo de un campo.
- Evitar frases tipo "Datos principales..." o "Configura aspectos..." cuando no agregan informacion nueva.
- No duplicar la misma senal en `KPI + filtros + rango + tabla`; si la pantalla ya comunica el dato, no volver a narrarlo.

## Densidad y jerarquia

- Los titulos y subtitulos deben vivir como texto cuando no necesitan un contenedor para ordenar la pantalla.
- No envolver cada seccion en un panel si el encabezado, el ritmo vertical y las superficies internas ya comunican la jerarquia.
- Usar panel solo para contenido realmente primario, agrupado o accionable.
- Evitar repetir contexto que ya es visible en sidebar, breadcrumb o topbar.
- Preferir filas compactas, bandas, pills, chips y bloques bajos antes que cards altas.
- Si una descripcion no cambia una decision o no evita un error, debe salir.
- Evitar panel dentro de panel salvo que exista una razon operativa clara.
- Cuando una accion es urgente o recurrente, evaluar primero topbar o franja superior antes que otro bloque dentro del contenido.
- Si la tabla ya expresa una cantidad por paginacion o rango visible, no elevar ese mismo numero a un KPI salvo que resuma otra lectura.

## Tokens visuales

- Tema claro:
  - Fondo: `#FCFCFC`
  - Campo/superficie secundaria: `#F6F6F6`
  - Texto principal: `#171717`
  - Texto secundario: `#6F6F6F`
- Tema grafito:
  - Fondo: `#171717`
  - Panel: `#1F1F1F`
  - Campo: `#252525`
  - Texto principal: `#FAFAFA`
  - Texto secundario: `#B4B4B4`
  - Borde: `#2E2E2E`
- Acento Ripnel:
  - Base: `#8E5DB7`
  - Hover: `#7B4EA3`
  - Soft/focus: `#F4ECFA`

## Uso del acento Ripnel

- Usarlo con moderacion en acciones principales, estados activos, focus rings o pequenos detalles.
- No usarlo como color dominante de fondos grandes.
- Evitar multiples acentos compitiendo en la misma pantalla.
- Si una accion es operativa y primaria, puede usar el acento; si es secundaria, preferir borde neutro.

## Checklist rapido

- La pantalla se entiende si se eliminan todos los parrafos secundarios?
- Hay copy repetido entre titulo, seccion y fila?
- El titulo necesita panel o puede vivir como texto?
- Hay cajas duplicando la jerarquia visual?
- Una accion urgente deberia subir al topbar o a la fila superior?
- La pantalla se siente ERP operativo o dashboard decorativo?
- Las filas tienen altura compacta y controles alineados?
- Los colores usan tokens y no clases sueltas de slate/indigo sin razon?
- El acento aparece solo donde ayuda a la jerarquia?
