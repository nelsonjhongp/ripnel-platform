# Frontend UI UX Operativo

Guia breve para futuras interfaces operativas de RIPNEL.

## Cuando usar ayudas contextuales

- Evitar texto explicativo permanente cuando la pantalla ya se entiende por jerarquia visual.
- Usar iconos de informacion para aclarar metricas, estados o reglas de negocio que no sean obvias.
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
