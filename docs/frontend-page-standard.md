# Frontend Page Standard

## Objetivo

Este documento define cómo se compone una página operativa de RIPNEL. Busca consistencia visible sin convertir cada vista en una plantilla rígida.

Referencia principal: **1366×768 a 100% de zoom**.

- No debe haber scroll horizontal de página.
- Una tabla amplia puede tener scroll horizontal dentro de su propio contenedor.
- La acción principal debe ser identificable sin scroll vertical innecesario.
- La interfaz debe priorizar lectura, captura y decisión sobre decoración.

## Estructura base

Una página puede combinar, según el flujo:

1. contexto: breadcrumb, título o estado;
2. acción principal o acción bloqueante;
3. resumen útil, si cambia una decisión;
4. filtros y resultados;
5. detalle, formulario o espacio de trabajo;
6. feedback de carga, vacío, error o permisos.

No todos los bloques son obligatorios. El layout debe responder a la tarea del operador, no a una lista de componentes.

## Arquetipos de página

### 1. Listado operativo

Usar para clientes, inventario, kardex, historial, precios, catálogos o administración.

Debe resolver:

- qué conjunto se está viendo;
- cómo buscar o filtrar;
- qué datos permiten decidir;
- qué acción aplica a cada fila;
- cómo navegar a detalle, edición o siguiente página.

Patrón recomendado:

```text
contexto / título + acción primaria
resumen breve, solo si aporta
filtros
resultado: tabla + vacío/carga/error + paginación
```

Criterios:

- filtros visibles solo cuando reducen trabajo real;
- búsqueda con placeholder que indique qué puede encontrarse;
- botón “Limpiar” solo cuando haya filtros activos;
- botón “Actualizar” cuando la información pueda quedar desactualizada durante la sesión;
- paginación y conteo deben describir el conjunto actual, no duplicar KPI decorativos;
- acciones de fila deben ser proporcionales: visibles si son pocas, menú si el ancho o la densidad lo requieren.

### 2. Detalle o consulta

Usar para venta, postventa, ajuste, transferencia o cierre de caja.

Debe resolver:

- qué entidad se está consultando;
- estado y trazabilidad;
- información principal;
- líneas o movimientos relacionados;
- acciones permitidas y sus consecuencias.

Patrón recomendado:

```text
contexto + título + estado + acciones
información principal / resumen
secciones de líneas, totales, trazabilidad y notas
```

Usar paneles solo para agrupar información accionable. Evitar una grilla de cards si una columna de secciones claras comunica mejor.

### 3. Formulario o diálogo operativo

Usar para creación, edición, apertura/cierre de caja y decisiones acotadas.

Criterios:

- labels de formulario en normal case;
- campos agrupados por decisión, no por tipo HTML;
- requerido, hint y error cerca del control;
- error por campo cuando el operador puede corregirlo directamente;
- error global para permisos, red o reglas cruzadas;
- acciones de cancelar/confirmar con jerarquía clara;
- no mostrar ayuda persistente si el campo ya es autoexplicativo;
- usar validación reactiva o pre-chequeos solo cuando evita pérdida de trabajo o una acción inútil.

Un diálogo debe resolver una decisión acotada. Si el flujo requiere múltiples etapas, tablas y contexto persistente, evaluar una página o workspace dedicado.

### 4. Workspace o flujo multietapa

Usar para POS, ajustes de inventario y flujos donde el estado debe permanecer visible.

Criterios:

- la tarea activa domina la pantalla;
- el resumen permanece accesible sin duplicar toda la información;
- las decisiones avanzadas aparecen cuando son necesarias;
- confirmar el resultado final con una acción clara;
- usar progreso solo cuando el usuario realmente necesita entender etapas o completar pasos en orden.

### 5. Cuenta y settings

Usar una columna más estrecha, secciones continuas y controles de baja densidad. Evitar convertir preferencias o seguridad en un dashboard de tarjetas sin relación.

## Encabezados y contexto

- El título debe nombrar la tarea, no repetir el módulo del sidebar sin aportar contexto.
- Un estado, sede, fecha o rango puede acompañar el título cuando cambia la lectura.
- La descripción solo se muestra si evita un error o aclara un alcance que no es evidente.
- La acción primaria debe estar cerca del contexto que la justifica.

## Tablas y jerarquía de datos

- Usar una columna principal para el dato que identifica la fila.
- Mostrar SKU, sede, fecha, color, talla, usuario u otra metadata con menor peso visual.
- Los estados de negocio deben tener texto además de color.
- Mantener filas compactas, con hover y foco distinguibles.
- Encabezados de tabla pueden usar uppercase compacto porque clasifican columnas.
- No redondear una tabla por regla. Elegir borde, superficie o panel según la composición de la pantalla.
- En móviles o anchos reducidos, priorizar columnas esenciales antes de esconder datos decisivos.

## Filtros y búsqueda

- Colocar filtros sobre los resultados que afectan.
- Priorizar búsqueda y filtros frecuentes; opciones raras pueden ir a un menú o selector secundario.
- Usar fecha/rango cuando el tiempo cambia la lectura del módulo.
- No mostrar filtros que no están disponibles para el perfil actual.
- Persistir filtros en URL o estado compartido solo cuando el usuario necesita volver a la misma consulta.

## Estados y feedback

Cada bloque de resultados debe manejar, según corresponda:

- carga inicial;
- recarga posterior sin bloquear información irrelevante;
- vacío con siguiente acción clara;
- error recuperable;
- acceso denegado;
- estado bloqueante de operación, como caja cerrada o stock insuficiente.

No usar banners de alta prioridad para información neutra. Un warning o danger debe explicar el bloqueo y, cuando sea posible, ofrecer la siguiente acción.

## Color y densidad

- El violeta marca foco, selección, acción primaria o contexto activo.
- Success, warning y danger representan significado de negocio.
- Evitar más de una señal cromática fuerte por bloque.
- Una métrica se muestra cuando cambia una decisión; no por rellenar espacio.
- Preferir tablas, filas y resúmenes bajos antes que cards altas repetidas.

## Revisión rápida

Antes de aprobar una página:

- ¿La tarea principal se entiende al primer vistazo?
- ¿La acción primaria es visible y proporcional?
- ¿Los filtros reducen trabajo real?
- ¿La tabla muestra primero el dato que identifica la fila?
- ¿Los estados tienen texto y semántica correcta?
- ¿Hay paneles, KPIs o copy que repiten información ya visible?
- ¿Funciona a 1366×768 sin scroll horizontal de página?
- ¿Tema claro y oscuro conservan contraste?
- ¿La vista respeta permisos y sede cuando aplica?
