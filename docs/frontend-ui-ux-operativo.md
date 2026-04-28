# Frontend UI UX Operativo

Guia breve para futuras interfaces operativas de RIPNEL.

## Cuando usar ayudas contextuales

- Evitar texto explicativo permanente cuando la pantalla ya se entiende por jerarquia visual.
- No agregar texto o informacion adicional no solicitada dentro de la interfaz; si la duda puede resolverse con ayuda puntual, responderla primero en chat o usar ayuda contextual minima.
- Usar iconos de informacion para aclarar metricas, estados o reglas de negocio que no sean obvias.
- Reutilizar el patron de `Tooltip` ya existente antes de crear nuevos bloques de apoyo visual.
- Mantener los tooltips como ayuda puntual, no como reemplazo de errores, alertas o validaciones criticas.
- Preferir ayuda contextual en:
  - tarjetas resumen;
  - encabezados de secciones;
  - etiquetas como `Minorista`, `Mayorista`, `Cobertura`, `Vigencia`;
  - estados que dependen de reglas del negocio.

## Anotaciones y comentarios visuales

- Considerar un patron reutilizable de anotaciones ligeras para UI review y refinamiento visual.
- Las anotaciones deben servir para detectar:
  - copy redundante;
  - exceso de cajas o paneles;
  - falta de densidad en vistas ERP;
  - estados que pueden explicarse mejor con iconos o color semantico;
  - lugares donde conviene colapsar detalle.
- Cuando una observacion se repita en varias pantallas, convertirla en criterio de interfaz y no dejarla solo como comentario puntual.

## Criterios de densidad para modulos ERP

- Priorizar lectura operacional sobre decoracion.
- Evitar bloques grandes para datos repetitivos como precios, tallas, stock o estados.
- Cuando una entidad tenga varias subvariantes, intentar primero:
  - filas compactas;
  - chips pequenos;
  - resumen por grupo;
  - detalle desplegable.
- Reservar tarjetas grandes solo para informacion realmente primaria o accionable.

## Alertas y color semantico

- Un estado `0 alertas` debe verse neutro, no alarmante.
- Usar color de atencion solo cuando exista un problema real que requiera accion.
- Diferenciar entre:
  - ayuda contextual;
  - aviso operativo;
  - error o bloqueo.

## Patron recomendado para futuras vistas

- Header corto y util.
- Metricas compactas con ayuda contextual.
- Lista principal con densidad alta.
- Detalle expandible solo cuando agregue contexto real.
- Copy corto, operativo y consistente con el lenguaje ERP del proyecto.

## Patron para cuenta y configuracion operativa

- Tratar `Cuenta` y ajustes como vistas operativas, no como perfil decorativo.
- Preferir anchos mas contenidos para configuracion y preferencias; una referencia razonable es una columna principal tipo `max-w-4xl` o menor, no full width si la lectura no lo necesita.
- Priorizar una superficie continua con secciones separadas por bordes antes que varias cards independientes apiladas como dashboard.
- Evitar KPIs grandes o bloques resumen si el dato ya aparece en campos principales.
- Preferir layouts compactos de dos paneles o dos columnas, con poco espacio muerto.
- Si una seccion como `Apariencia` o `Sede operativa` ya se entiende por su titulo, no agregar parrafos visibles debajo salvo que la accion sea ambigua.
- Si el ajuste es evidente por contexto, no agregar tooltip ni copy de apoyo.
- Para elecciones como sede default:
  - preferir `select` o dropdown cuando el usuario solo necesita escoger una opcion;
  - usar tarjetas/radios solo si la comparacion simultanea entre opciones aporta una decision real.
- En ajustes de apariencia:
  - usar filas cortas;
  - label breve a la izquierda;
  - control o selector a la derecha;
  - evitar exponer ajustes que no se entiendan claramente para el usuario final;
  - los controles deben mostrar affordance visible: `cursor-pointer`, hover y focus claros.
- Para temas visuales de modulos operativos y settings, preferir fondos sobrios y solidos en grises o grafito antes que gradientes protagonistas.

## Patron para modulos de caja

- Separar claramente:
  - `Caja del dia` como vista operativa;
  - `Historial` como vista densa de sesiones;
  - consolas administrativas multi-sede como vistas aparte.
- Evitar texto redundante en headers o tarjetas cuando la pagina ya se entiende por contexto.
- Usar tooltips para explicar:
  - fecha operativa;
  - total del dia;
  - pagos del sistema;
  - diferencia o consistencia.
- En historiales de caja, preferir:
  - filas o tablas compactas;
  - filtros visibles y breves;
  - paginacion cuando la entidad se repite.
- Usar el estado `Pendiente de cierre` para sesiones abiertas en listados operativos cuando comunique mejor la accion esperada.
- Los mini graficos solo deben entrar si resumen una decision real, como tendencia diaria o comparativo por sede.
