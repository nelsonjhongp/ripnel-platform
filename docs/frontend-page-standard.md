# Frontend Page Standard

Estandar base para paginas operativas de RIPNEL. Distingue entre headers operativos generales y listados densos con tabla para evitar forzar un solo patron donde no aplica.

## Objetivo

- dar una forma consistente a las paginas operativas;
- evitar paneles pesados o jerarquias duplicadas;
- mantener una lectura ERP compacta y directa;
- definir un patron especifico para listados con filas y tabla.

## Familia 1: Header operativo general

- Usar eyebrow pequeno en color distintivo Ripnel.
- Usar `h1` limpio, sin envolverlo en card o hero-panel por defecto.
- Mantener la escala actual usada en ventas:
  - eyebrow pequeno en mayusculas;
  - titulo principal con jerarquia fuerte;
  - subtitulo solo si orienta una decision real.
- Reutilizar `PosHeader` como componente recomendado para este bloque.
- `meta` a la derecha se reserva para chips de contexto, estados breves o accesos compactos.
- No asumir que `meta` es el lugar natural para KPIs en todas las pantallas.

## Familia 2: Listados operativos con tabla

Cuando la pantalla existe principalmente para filtrar, recorrer filas y ejecutar acciones sobre una tabla, el orden recomendado es:

- `header limpio`;
- `franja compacta de metricas separada`;
- `contenedor de listado`;
- dentro del contenedor:
  - `filtros`;
  - `toolbar compacta` con conteo y paginacion, y modos de vista si aplica;
  - `tabla`.

Este patron debe sentirse mas cercano a `Postventa` que a un dashboard.

## Regla de header para listados

- El header debe ser mas sobrio y no competir con la tabla.
- Puede acercarse a la densidad visual de `Clientes`.
- Mantener eyebrow, titulo y acciones relacionadas.
- Evitar cargar KPIs dentro del header por defecto.
- Si existe texto de apoyo, debe ser minimo y solo si realmente orienta.

## Regla de metricas compactas

- Las metricas de un listado deben vivir en una fila separada debajo del header.
- Deben usar pills o badges compactos, no cards grandes.
- La fila puede hacer wrap, pero debe seguir sintiendose breve y horizontal.
- Esta banda resume el estado del listado, no reemplaza la toolbar ni la tabla.

## Regla del contenedor de listado

- El contenedor de listado puede ser la propia pagina y no un panel exterior.
- Debe ordenar filtros, tabla y footer de listado como una sola unidad visual.
- La tabla puede tener solo estructura minima: header, divisores y borde sutil.
- Filtros y paginacion no tienen que estar dentro del panel especifico de la tabla para seguir perteneciendo al mismo bloque.

## Regla de toolbar de listado

- Los filtros visibles pueden vivir libres sobre la pagina, sin panel padre.
- El conteo y la paginacion pueden vivir en un footer de listado debajo de la tabla.
- Si existe una toolbar superior, debe responder a una necesidad real del modulo y no por costumbre.
- Los modos de vista solo entran cuando el modulo realmente los necesite.

## Regla para tablas operativas

- Mantener densidad alta y filas compactas.
- Usar labels breves y operativos.
- Evitar descripciones permanentes si los controles ya se entienden por contexto.
- Mantener conteo y paginacion visibles.
- Default visual recomendado: `10 filas por pagina`.
- Si una pantalla requiere otro tamano por razon operativa, debe justificarse explicitamente en codigo.

## Reglas de jerarquia

- No repetir contexto que ya vive en sidebar, breadcrumb o topbar.
- No usar cards pesadas solo para encerrar un titulo.
- No separar KPIs, filtros y tabla en demasiadas cajas si pueden convivir con claridad.
- No usar varios niveles de fondo/acento que compitan entre si.

## Referencias de uso

### Nueva venta

- Referencia principal para headers de flujo operativo.
- Conserva eyebrow pequeno, titulo notorio y meta superior cuando el flujo lo necesita.

### Postventa

- Referencia principal para listados operativos con tabla.
- Usa header limpio, fila separada de metricas y toolbar superior dentro del panel.
- El refinamiento para `Historial de ventas` permite que filtros y toolbar vivan en el contenedor de listado y que la tabla sea el subpanel interno a todo el ancho.

### Historial de ventas

- Referencia para listados despanelados.
- Usa metricas centradas, filtros libres, tabla a ancho util y paginacion debajo.

### Clientes

- Referencia de sobriedad de encabezado y densidad visual.
- Ayuda a calibrar tamano percibido, ritmo y compactacion.
- No se toma como plantilla completa de filtros o layout.

## Checklist rapido

- La pantalla es un flujo o un listado?
- El header compite con la tabla o la deja respirar?
- Las metricas viven en una fila separada si la pantalla es un listado?
- Los filtros y la toolbar estan dentro del panel principal?
- El conteo y la paginacion se ven antes de la tabla?
- La tabla sigue siendo la superficie principal?
- El contenido se siente operativo y no mock/dashboard?
