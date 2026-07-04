# Refactor vs Rebuild Decision Guide

## Propósito

Este documento ayuda a decidir si una pantalla o módulo requiere corrección incremental, refactor estructural o una reconstrucción acotada. No debe usarse como una auditoría automática ni basarse en contar strings, aliases, `color-mix()` o selects.

La pregunta central es:

> ¿El flujo puede mejorar de forma segura reutilizando su estructura actual, o la estructura impide entregar una experiencia correcta?

## Antes de decidir

Revisar primero:

- el flujo real del usuario y qué está fallando;
- contratos backend y reglas de dominio;
- permisos, sede, transacciones y estados bloqueantes;
- componentes compartidos ya disponibles;
- pruebas o caminos de verificación existentes;
- el alcance que realmente puede completarse sin detener el producto.

No iniciar una reconstrucción por deuda estética aislada.

## Decisión

| Señal | Mantenimiento o refactor incremental | Refactor estructural | Rebuild acotado |
|---|---|---|---|
| Flujo de usuario | funciona; hay fricción puntual | funciona parcialmente; decisiones mezcladas | no permite completar la tarea con claridad o seguridad |
| Backend y contratos | estables | estables con adaptaciones claras | incompletos o contradicen el flujo; resolver backend primero |
| Estado y datos | localizado | demasiado acoplado, pero rescatable | estado impredecible y ligado a UI sin límites claros |
| Presentación | inconsistente en piezas puntuales | jerarquía, layout o composición dificultan operar | la estructura impide representar el flujo correcto |
| Riesgo | pequeño y verificable | requiere fases pequeñas | menor riesgo rehacer la capa de presentación que parchearla |
| Cobertura | smoke test/manual viable | requiere ampliar verificación | no existe forma de confiar sin construir pruebas o casos nuevos |

## Tipos de trabajo

### Mantenimiento localizado

Usar cuando el flujo es sano y el problema está aislado:

- ajuste visual de un control compartido;
- corrección de validación o copy;
- error de permisos o datos en una acción;
- mejora puntual de tabla, diálogo o feedback;
- actualización de un contrato bien delimitado.

Mantener el alcance pequeño y verificable.

### Refactor estructural

Usar cuando una pieza impide mantener el módulo, pero la lógica de negocio sigue siendo válida:

- una pantalla concentra demasiados estados que pueden separarse por responsabilidad;
- se repite una regla de dominio en varios lugares;
- tabla, filtros y paginación están mezclados de forma que bloquean cambios;
- una composición visual hace difícil comprender el flujo;
- una abstracción compartida ya tiene dos o más usos reales y necesita consolidarse.

Dividirlo en fases que preserven comportamiento. Cada fase debe poder probarse y revertirse conceptualmente.

### Rebuild acotado

Usar solo cuando el flujo principal, la estructura de estado y la presentación están tan entrelazados que corregirlos de forma incremental cuesta más riesgo que reconstruir la capa de interfaz.

Un rebuild no significa borrar dominio, backend o migraciones. Normalmente se conserva:

- reglas de negocio puras;
- contratos válidos;
- tipos útiles;
- endpoints y transacciones existentes;
- pruebas o fixtures aprovechables.

El rebuild debe tener un objetivo funcional explícito, una ruta de migración, verificación por etapas y una decisión de qué código se retira al final.

## Lo que no justifica un rebuild

- strings locales inline;
- un componente legacy aislado;
- clases Tailwind repetidas sin impacto visible;
- un select o diálogo antiguo que funciona;
- diferencias menores de radio, padding o color;
- un archivo grande cuyo flujo aún es entendible y estable;
- una auditoría basada solo en grep o métricas de estilo.

## Plan mínimo de una decisión grande

1. Describir el flujo actual y el problema observable.
2. Definir el resultado de operación esperado.
3. Identificar contratos backend y reglas que no deben romperse.
4. Elegir mantenimiento, refactor estructural o rebuild acotado.
5. Delimitar archivos y módulos fuera de alcance.
6. Definir pruebas manuales y automáticas proporcionales.
7. Implementar por etapas pequeñas.
8. Eliminar compatibilidad o código viejo solo cuando el flujo nuevo esté validado.

## Regla de oro

> Refactoriza para mejorar un flujo real. Reconstruye solo cuando el esqueleto impide entregar ese flujo de forma correcta y verificable.
