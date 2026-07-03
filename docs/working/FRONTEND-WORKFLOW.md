# RIPNEL — Frontend Workflow

> Método de trabajo para tareas frontend y refactors. Busca mejorar flujos reales sin convertir cada cambio en una campaña de normalización.

## Principio rector

Primero resolver la tarea del operador. Después mejorar la estructura solo cuando esa mejora reduce riesgo, duplicación real o fricción comprobable.

No usar una regla documental, un grep, un alias legacy o una diferencia estética aislada como motivo suficiente para ampliar una tarea.

## Antes de tocar código

Leer:

1. `AGENTS.md`
2. `docs/working/IMPLEMENTATION-TRACKER.md`
3. los documentos indicados por `docs/INDEX.md` para el dominio de la tarea
4. el código real de la ruta, módulo, componente y contrato involucrados

El código y las pruebas prevalecen si contradicen documentación.

## Clasificar la tarea

| Tipo | Ejemplos | Cómo proceder |
|---|---|---|
| Corrección localizada | error de validación, permiso, control visual, texto de bloqueo | implementar alcance pequeño y verificar flujo afectado |
| Mejora de flujo | demasiadas decisiones simultáneas, acción principal oculta, tabla poco operable | redactar brief UX corto antes de implementar |
| Refactor estructural | pantalla con estado acoplado, regla repetida en módulos, módulo difícil de cambiar | revisar `refactor-vs-rebuild.md`, delimitar fases y contratos |
| Rebuild acotado | el flujo no puede completarse de forma clara o segura con la estructura actual | justificar explícitamente; conservar dominio y contratos válidos |

## Brief UX obligatorio para mejora de flujo o refactor visual

Antes de implementar, registrar en la tarea o en el tracker:

```text
Operador:
Tarea que quiere completar:
Estado inicial:
Acción primaria:
Información que debe ver primero:
Opciones que pueden aparecer después:
Bloqueos o riesgos:
Criterio de éxito:
```

Mantenerlo en ocho líneas o menos. No producir una especificación larga si el flujo es claro.

### Reglas de composición

- La pantalla debe hacer visible la tarea principal antes que la arquitectura interna.
- Un título no necesita descripción por defecto.
- Añadir una línea de ayuda solo si evita un error, aclara alcance o explica una consecuencia.
- Una métrica solo aparece si cambia una decisión.
- Usar tabla, fila o sección simple antes de convertir datos en cards.
- Las opciones avanzadas deben aparecer cuando el contexto las justifica, no todas al inicio.
- Un bloqueo debe decir causa y siguiente acción.
- Labels, placeholders y botones simples no necesitan centralización si son locales.
- El contenido debe mantenerse útil a 1366×768; la página no debe tener scroll horizontal.

## Criterio para extraer o crear componentes

Crear o consolidar un componente compartido solo cuando se cumpla al menos una condición:

- existe en dos módulos estables con la misma semántica;
- encapsula accesibilidad o comportamiento difícil de repetir correctamente;
- reduce una duplicación que ya causó divergencia real.

No extraer por:

- una clase Tailwind repetida una o dos veces;
- un wrapper que solo renombra un componente;
- una variación local de padding, radio o copy;
- el deseo de completar una taxonomía de UI.

Los componentes legacy siguen funcionando hasta que un flujo activo justifique reemplazarlos.

## Alcance de una tarea

Todo ticket de implementación debe declarar:

```text
Objetivo:
Alcance:
No tocar:
Invariantes:
Aceptación:
```

- **Objetivo:** resultado observable para el operador o sistema.
- **Alcance:** módulo, archivos o flujo exacto.
- **No tocar:** áreas que no deben expandirse.
- **Invariantes:** permisos, sede, transacción, contrato API, compatibilidad o datos.
- **Aceptación:** pruebas técnicas y casos manuales.

Para una tarea con alcance explícito y bajo riesgo, implementar directamente. Para una mejora de flujo, refactor estructural o cambio de contrato, presentar primero el brief UX y un plan máximo de cinco puntos.

## Validación proporcional

| Cambio | Validación mínima |
|---|---|
| visual o componente base | typecheck, lint, tema claro/oscuro, pantalla piloto a 1366×768 |
| formulario o diálogo | estados normal, error, disabled, teclado/foco y acción cancelable |
| permisos o sede | backend rechaza acceso, guard de ruta, sidebar y caso por rol |
| stock, caja, ventas o postventa | operación completa, transacción, saldo/movimiento y feedback |
| refactor estructural | pruebas existentes, casos manuales, contratos preservados y revisión de dependencias cuando aplique |

## Uso de Graphify

Graphify es opcional y sirve para arquitectura, no para decidir UX.

Usarlo antes o después de un cambio estructural cuando sea útil entender:

- dependencias de un módulo;
- ciclos;
- comunidades o acoplamiento;
- archivos de alto impacto;
- efectos de mover responsabilidades entre módulos.

No usarlo como paso obligatorio para cambios pequeños ni como criterio automático de calidad.

El reporte debe considerarse un snapshot: si el working tree cambió desde su commit base, confirmar frescura antes de usarlo. Actualizarlo para una revisión estructural concreta, no después de cada ajuste de UI.

## Cierre de una tarea

Al terminar:

1. reportar archivos modificados;
2. listar pruebas y validaciones ejecutadas;
3. registrar hallazgos fuera de alcance sin implementarlos;
4. actualizar solo la entrada relevante de `IMPLEMENTATION-TRACKER.md`;
5. no añadir reglas globales nuevas salvo que el cambio haya creado un contrato duradero y aprobado.

## Plantilla de reporte breve

```text
Resultado:
Archivos:
Validación:
Pendientes / hallazgos fuera de alcance:
Tracker:
```
