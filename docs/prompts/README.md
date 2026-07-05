# RIPNEL — Plantillas de prompts para agentes

Estas plantillas sirven para trabajar con distintos agentes sin depender de que el agente recuerde conversaciones anteriores.

No son una fuente de reglas del producto. La precedencia es:

1. Código, pruebas y comportamiento verificable vigente.
2. `AGENTS.md`.
3. Documentos activos indicados por `docs/INDEX.md`.
4. `docs/working/IMPLEMENTATION-TRACKER.md`.
5. Esta plantilla.

## Qué problema resuelven

Cada tarea pasa por fases separadas. Un mismo agente no debe revisar, decidir, implementar y validarse sin controles.

```text
00 Project triage
→ elegir candidatos de trabajo, sin cambios

01 Module triage
→ entender un módulo, sin cambios

02 Implementation plan
→ convertir una tarea elegida en alcance cerrado, sin cambios

03 Approved implementation
→ implementar solo el plan aprobado

04 Validation review
→ revisar diff, pruebas y evidencia; decidir cierre
```

## Regla de uso

No pegar todos los prompts a la vez.

Usar únicamente el archivo que corresponde a la fase actual y completar los marcadores `[ENTRE CORCHETES]`.

Antes de cualquier tarea, el agente debe leer:

- `AGENTS.md`
- `docs/INDEX.md`
- `docs/working/FRONTEND-WORKFLOW.md`

Del tracker (`docs/working/IMPLEMENTATION-TRACKER.md`), consultar únicamente la
entrada autorizada por la tarea, la evidencia o el plan. Si no existe, registrar
su ausencia como hecho. No leer ni resumir el tracker completo por defecto.

Después debe leer solo los documentos de dominio, seguridad, UI o pruebas que `INDEX.md` indique para la tarea.

No leer toda la carpeta `docs` por defecto.

## Modelo modular

Los prompts `00` a `04` son el protocolo estable. No crear un prompt nuevo por
pantalla o hallazgo: para adaptar el trabajo a un módulo real, completar una
ficha breve de tarea y activar solo los lentes de revisión necesarios.

- **Vertical:** área durable de producto o dominio, por ejemplo `LOC-01`,
  `STOCK-01`, `POS-01`, `AUTH-01` o `CASH-01`.
- **Baseline:** mapa factual reutilizable de un módulo grande: rutas,
  endpoints, permisos, sedes, flujos, pantallas, diálogos, consumidores y
  riesgos conocidos.
- **Work item:** tarea pequeña, observable y ejecutable dentro de una vertical.
- **Fase:** momento del protocolo `00`, `01`, `02`, `03` o `04`; no define por
  sí sola prioridad, módulo ni alcance.
- **Lente:** foco opcional de revisión, como permisos, rol/sede, flujo
  operativo, UI/copy/densidad, consistencia/reutilización o
  datos/transacciones.
- **Evidencia:** líneas, rutas, pruebas, screenshots, logs, diff o
  comportamiento verificable.

Ficha mínima recomendada:

```text
ID:
Vertical:
Fase:
Objetivo observable:
Operador / rol:
Sede o alcance operativo:
Ruta(s) frontend:
Endpoint(s) backend:
Flujo a revisar:
Lentes activos:
Evidencia esperada:
No tocar:
Criterio de salida:
Tracker autorizado:
```

Mantener la ficha en unas 12 líneas útiles. Si no cabe, probablemente se
necesita un baseline o dividir el trabajo.

### Baseline vs triage puntual

Crear baseline durable solo cuando el módulo tenga varias páginas, diálogos,
endpoints o consumidores externos; cuando existan permisos, sedes o
transacciones con riesgo operativo; cuando se estabilizarán varios work items
del mismo módulo; cuando el conocimiento será reutilizado por chats separados;
o cuando haya contradicción entre documentación, código y comportamiento.

No crear baseline cuando el hallazgo es localizado, el plan aprobado ya delimita
archivos e invariantes, el diff y tracker bastan, o la revisión no aporta un
mapa reutilizable.

Para un work item normal, activar máximo tres lentes. Si requiere cuatro o más,
hacer baseline primero o dividir la tarea.

## Trazabilidad

El tracker conserva estado y decisiones. Los reportes y capturas se guardan solo cuando aportan evidencia duradera:

```text
docs/working/reports/<TASK-ID>-<fase>.md
docs/working/evidence/<TASK-ID>/
```

No crear reportes ni carpetas de evidencia para una corrección trivial si el tracker y el diff bastan para explicarla.

Una entrada de tracker puede enlazar:

```md
Método: `docs/prompts/01-module-triage.md`
Evidencia: `docs/working/reports/LOC-01-A-triage.md`
Decisión: [aceptado / descartado / pendiente]
```

## Contrato mínimo de handoff entre fases

Cada fase nueva debe poder ejecutarse en un chat separado sin depender de la
memoria de una conversación anterior.

Toda fase nueva requiere:

- prompt de la fase actual;
- tarea autoritativa;
- insumo aceptado correspondiente;
- código y documentos necesarios según `AGENTS.md` e `INDEX.md`.

Para `03 Approved implementation` y `04 Validation review`, el insumo aceptado
obligatorio es un **plan aprobado autónomo** generado en la fase `02`.

### Campos mínimos del handoff

- **Tarea autoritativa**
  - ID y nombre exactos.
  - Objetivo observable.
  - Exclusiones explícitas.
- **Evidencia aceptada**
  - archivo + línea;
  - prueba;
  - log;
  - screenshot;
  - diff;
  - comportamiento verificable.
- **Plan aprobado**
  - Debe ser autónomo.
  - Es el único handoff formal entre `02` → `03` → `04`.
  - Debe incluir archivos permitidos, invariantes, fuera de alcance y pruebas.
- **Archivos permitidos**
  - Lista cerrada o patrón acotado.
- **Invariantes**
  - Contratos/API.
  - Permisos/autorización.
  - Datos, migraciones o transacciones cuando apliquen.
  - UX, accesibilidad o layout cuando apliquen.
- **Pruebas**
  - Técnicas.
  - Manuales.
  - Evidencia visual cuando corresponda.
- **Estado del tracker**
  - Entrada de tracker autorizada, o ausencia confirmada de entrada.
  - Rol: contexto, trazabilidad y evidencia enlazada.
  - Límite: no sustituye la tarea explícita.

### Regla sobre tracker

El tracker conserva estado y decisiones, pero no autoriza cambiar la tarea
activa. Si el prompt o el plan aprobado fijan una tarea explícita, ninguna fase
puede sustituirla por otra prioridad encontrada en el tracker.

### Persistencia mínima del plan

- Tarea trivial: el plan aprobado puede pegarse directamente en el prompt de
  `03`.
- Tarea no trivial o ejecutada en otro chat: el plan aprobado debe guardarse
  como `docs/working/reports/<TASK-ID>-B-plan.md` o pegarse íntegro en el
  prompt siguiente.

No crear un handoff adicional. El plan aprobado sigue siendo el único handoff
formal.

### Precondición mínima de reconciliación

Para tareas que toquen migraciones, seguridad, permisos backend o despliegue,
la fase correspondiente debe confirmar, en el nivel mínimo necesario:

- base Git evaluada;
- working tree relevante;
- estado remoto o ambiente real relevante.

Si existe una diferencia material, debe registrarse como hecho y resolverse en
el alcance de la tarea o declararse como bloqueo según la fase.

## Convenciones

- IDs de vertical: `POS-01`, `AUTH-01`, `STOCK-01`.
- IDs de baseline durable: `POS-01-BASE`, `STOCK-01-BASE`, `LOC-01-BASE`.
- IDs de tarea: `POS-01-A`, `POS-01-B`, `LOC-01-A`.
- Las letras identifican work items dentro de una vertical; no representan
  fases del workflow.
- Las fases son exclusivamente `00`, `01`, `02`, `03` y `04`.
- La fase puede aparecer en el nombre del artefacto: `LOC-01-A-triage`,
  `LOC-01-A-plan`, `LOC-01-A-validation`.
- Un prompt no concede permiso para ampliar alcance.
- Si el agente no puede verificar algo, debe declararlo como pregunta abierta, no como defecto.

## Freeze de gobernanza

Después de cambiar estas plantillas o reglas de workflow, probar el modelo con
tres work items reales antes de volver a modificarlas. Durante ese periodo,
registrar fricción como hallazgo, no como cambio inmediato de prompt. Reabrir
gobernanza solo si al menos dos de las tres tareas fallan por la misma
ambigüedad del protocolo.

## Qué no hacer

- No convertir estas plantillas en un checklist mecánico para “normalizar” todo el repositorio.
- No crear un prompt por cada pantalla salvo que el flujo sea excepcional y se reutilice.
- No copiar reglas completas de `AGENTS.md`, `DESIGN.md` o documentos de dominio: la plantilla debe remitir a ellos.
- No usar un archivo grande, una clase repetida, una ruta antigua o un componente legacy como prueba automática de deuda prioritaria.
- No crear reportes para correcciones triviales ni baselines para cada módulo.
- No convertir componentes legacy, strings inline o clases locales en campañas globales.
