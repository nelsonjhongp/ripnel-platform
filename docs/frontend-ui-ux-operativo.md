# Frontend UI/UX Operativo

## Propósito

RIPNEL es una interfaz de trabajo. La UI debe ayudar a vender, registrar, consultar y corregir con rapidez, no comportarse como una página de marketing.

## Principios

- Reducir pasos, ambigüedad y cambios de contexto.
- Mantener densidad suficiente para escritorio sin sacrificar legibilidad.
- Mostrar primero lo que permite decidir: producto, importe, estado, sede, fecha, usuario o acción.
- Usar superficies y paneles para agrupar decisiones, no para decorar.
- Mantener la acción principal visible y el feedback cerca del problema.

## Copy y ayuda contextual

- No añadir descripciones que repiten título, labels o datos visibles.
- Usar tooltip o hint solo cuando una regla no sea autoexplicativa, pueda producir error o tenga impacto operativo.
- Explicar bloqueos con causa y siguiente paso: “No puedes confirmar porque la caja está cerrada” es mejor que “Operación no disponible”.
- Evitar mensajes positivos permanentes si no cambian una decisión.
- Las labels locales, placeholders y botones simples pueden vivir junto al componente; mensajes de dominio, errores, toasts y confirmaciones reutilizables deben centralizarse.

## Densidad y jerarquía

La referencia de densidad y composición visual está en `docs/frontend-page-standard.md`. Este documento conserva solo consideraciones de copy, feedback y flujos sensibles.

## Color semántico

- Acento Ripnel: acción primaria, foco, selección y estado activo.
- Success: operación completada o saldo/cobertura positiva.
- Warning: atención, pendiente o riesgo que aún permite actuar.
- Danger: error, bloqueo o acción destructiva.
- Neutral: metadata, estado inactivo o información no prioritaria.

Nunca usar color como única señal para una regla de negocio. Acompañarlo con texto, icono o ambos cuando la decisión sea importante.

## Formularios y settings

- Formularios: labels normales, agrupación por decisión y errores cerca del campo.
- Settings y cuenta: columna más estrecha, secciones continuas y pocos elementos simultáneos.
- No convertir seguridad, apariencia o preferencias en dashboard de tarjetas.
- Los campos de solo lectura deben comunicarlo sin parecer editables.
- Un selector simple suele ser mejor que una pared de cards de opciones; usar selección visual expandida solo cuando comparar opciones sea parte de la tarea.

## Caja y flujos sensibles

- Mostrar el estado de caja de forma visible antes de permitir una venta o movimiento dependiente.
- Las alertas de cierre, descuadre o operación bloqueada deben indicar impacto y acción siguiente.
- En acciones irreversibles o de alto impacto, confirmar de forma explícita y mantener el contexto del importe, documento o stock afectado.

## Tablas y acciones

- La acción de fila debe ser visible cuando hay una sola acción frecuente.
- Usar menú de acciones cuando varias acciones compiten por ancho o son menos frecuentes.
- Iconos sin texto solo para acciones universales y con tooltip.
- Mantener encabezados discretos y filas escaneables.
- Diferenciar dato principal y metadata por peso tipográfico, no por multiplicar colores.

## Anti-patrones

- dashboard decorativo con muchas cards sin pregunta operativa;
- texto explicativo repetido o descripción persistente que repite título, labels o datos visibles;
- fondos grandes en violeta o múltiples acentos fuertes en una sola pantalla;
- cards altas para contenido que una tabla o fila compacta comunica mejor;
- KPIs que repiten el mismo dato ya visible en tabla, paginación o rango;
- scroll horizontal de la página;
- controls con affordance débil o sin foco distinguible;
- alertas de alta prioridad usadas para información neutra;
- componentes compartidos creados para un solo caso;
- wrappers que solo agregan una clase Tailwind o renombran un componente;
- clases visuales copiadas de forma masiva sin patrón semántico;
- migraciones visuales masivas que no resuelven un flujo;
- usar la demo como una orden de adoptar todos los componentes;
- una pantalla que oculta por completo la siguiente acción cuando existe un bloqueo.

## Revisión

La checklist de revisión por arquetipo de página está en `docs/frontend-page-standard.md`.

## Referencias

- `DESIGN.md`: tokens visuales, tipografía y controles operativos.
- `docs/frontend-page-standard.md`: arquetipos de página, composición y checklist.
- `docs/frontend-component-inventory.md`: catálogo canónico de componentes.
- `docs/frontend-operational-components.md`: elección de componentes por interacción.
