---
version: 1.1.0
name: RIPNEL Design System
description: "Sistema visual operativo para un ERP interno de inventario, ventas, caja y transferencias. Prioriza claridad, densidad y velocidad de lectura sobre decoración."
---

# RIPNEL Design System

## Propósito

RIPNEL se usa para operar: registrar ventas, consultar stock, mover mercadería, abrir o cerrar caja y administrar datos. La interfaz debe reducir ambigüedad y pasos, no competir con la información.

Principios:

- claridad antes que decoración;
- densidad suficiente para trabajo de escritorio;
- jerarquía visible sin cajas innecesarias;
- color semántico con uso limitado;
- controles consistentes y accesibles;
- soporte de tema claro y oscuro.

La fuente técnica de tokens es `apps/frontend/app/globals.css`. Este documento define intención y reglas de uso; no reemplaza el código.

## Identidad y tokens

| Elemento | Valor / token | Uso |
|---|---|---|
| Acento | `--ripnel-accent` (`#b07ae4` en tema claro) | acción principal, foco, selección, contexto activo |
| Hover de acento | `--ripnel-accent-hover` | interacción activa |
| Acento suave | `--ripnel-accent-soft` | fondos sutiles de selección o foco |
| Superficies | `--ops-page-background`, `--ops-surface`, `--ops-surface-muted`, `--ops-field` | estructura, paneles y controles |
| Texto | `--ops-text`, `--ops-text-muted` | contenido y metadata |
| Bordes | `--ops-border-strong`, `--ops-border-soft` | separación y affordance |
| Semánticos | `--ops-tone-success-*`, `--ops-tone-warning-*`, `--ops-tone-danger-*` | estado, atención y error |

Usar tokens para superficies, bordes y texto. No introducir colores sueltos de slate, indigo o rose para resolver una pantalla aislada si ya existe un token semántico adecuado.

## Tipografía y jerarquía

Poppins es la tipografía del producto. La jerarquía debe distinguir, como mínimo:

- título de página: claro, compacto y sin descripción redundante;
- título de sección: solo cuando una agrupación lo necesita;
- dato principal: nombre, código o importe que guía una decisión;
- metadata: sede, fecha, SKU, color, talla o contexto secundario;
- label de formulario: normal case, legible y cercano al campo;
- label de filtro o eyebrow: uppercase compacto cuando clasifica, no cuando describe todos los campos.

No usar uppercase/tracking como estilo por defecto de cada label. Reservarlo para filtros, encabezados de tabla, micro-métricas y taxonomía secundaria.

## Densidad y referencia operativa

La referencia de escritorio es **1366×768 a 100% de zoom**.

- La acción principal debe ser localizable sin scroll vertical innecesario.
- No debe existir scroll horizontal de página.
- Una tabla amplia puede desplazarse horizontalmente dentro de su contenedor.
- No convertir cada bloque en una card: tablas, filas y secciones simples suelen comunicar mejor.
- Usar espacios para separar decisiones distintas; no para decorar una página vacía.
- Los dashboards deben responder a una pregunta operativa. No llenar la pantalla con KPIs repetidos.

## Controles operativos

Los controles compartidos deben sentirse como una familia:

- altura compacta base: `h-9`;
- radio base: `rounded-lg`;
- padding horizontal: equivalente a `px-3`;
- tipografía: `text-sm`;
- foco, hover, disabled y error consistentes;
- error visible con borde y fondo semántico, no solo texto rojo.

Para código nuevo, el punto de partida es:

- `Input` para entrada simple;
- `OpsFormField` para label, requerido, hint y error;
- `OpsSelect` para selección simple;
- `OpsSearchField` para búsqueda en listados;
- `OpsDialog` para acciones modales;
- `Button` para acciones;
- `Tooltip` para ayuda breve o iconos ambiguos.

No crear otra familia de campos solo porque una pantalla necesite una variación visual. Componer sobre los controles existentes o mantener la variación dentro del módulo si no tiene repetición real.

## Componentes y composición

### Núcleo compartido

| Necesidad | Componente de referencia |
|---|---|
| shell y layout de página | `OpsPageShell` |
| tabla de datos | `OpsDataTable` o tabla semántica cuando el caso lo requiera |
| formulario | `OpsFormField`, `Input`, `OpsSelect` |
| diálogo | `OpsDialog` |
| estado de negocio | `OpsStatusBadge` |
| sección con información agrupada | `OpsPanelSection` |
| estado vacío | `OpsEmptyState` |
| paginación | `Pagination` |
| ayuda contextual | `Tooltip` |

### Componentes específicos

POS, productos, caja, postventa y transferencias pueden usar composiciones propias cuando representan una interacción del dominio. Esas composiciones no se convierten automáticamente en estándar global.

### Compatibilidad

Existen componentes legacy o aliases por compatibilidad. No se usan como primera opción en código nuevo, pero tampoco se inicia una migración masiva solo para retirarlos. La migración sucede cuando se trabaja funcionalmente en el flujo afectado.

## Paneles, tablas y métricas

- Usar un panel cuando agrupa información accionable, resume una decisión o separa un bloque de riesgo.
- No anidar paneles sin una razón operativa clara.
- Las tablas priorizan dato principal, metadata secundaria, estado semántico y acciones proporcionales.
- Los encabezados de tabla deben ser discretos; las filas deben mantener altura compacta y hover claro.
- Usar `OpsStatusBadge` para estados de negocio. No usar color sin texto cuando el estado puede ser ambiguo.
- Usar métricas solo si cambian la lectura de la pantalla. No repetir en KPI una cifra que ya está explicada por el rango, paginación o tabla.

## Acciones y feedback

- Acción primaria: `Button` con variante de acento.
- Acción secundaria o cancelar: variante outline o ghost según jerarquía.
- Acción destructiva: variante destructiva y confirmación proporcional al impacto.
- Icono sin texto: solo cuando la acción sea universalmente reconocible y tenga tooltip.
- El feedback debe indicar qué ocurrió, qué bloquea y cuál es el siguiente paso. Evitar mensajes positivos persistentes que no cambian una decisión.
- Usar éxito, warning y danger por significado de negocio; no por decoración.

## Tema claro y oscuro

Cada nuevo uso de tokens o estado semántico debe conservar contraste en ambos temas. No fijar colores claros que desaparezcan en tema oscuro ni sombras que dependan de un fondo blanco.

## Anti-patrones

- fondos grandes en violeta o múltiples acentos compitiendo;
- cards altas para contenido que una tabla o fila compacta comunica mejor;
- descripción persistente que repite el título o el label;
- KPIs que repiten el mismo dato ya visible;
- scroll horizontal de la página;
- componentes compartidos creados para una sola pantalla;
- clases visuales copiadas de forma masiva sin patrón semántico;
- una migración global de componentes legacy sin objetivo funcional;
- usar la demo como una orden de adoptar todos los componentes.

## Referencias

- `docs/frontend-page-standard.md`: composición de listados, detalles, formularios y workspaces.
- `docs/frontend-ui-ux-operativo.md`: criterios de uso real y anti-patrones.
- `docs/frontend-operational-components.md`: elección de componentes por interacción.
- `docs/frontend-component-inventory.md`: inventario factual; no es un checklist ni una orden de migración.
