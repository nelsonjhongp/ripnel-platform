# RIPNEL — Plantillas de prompts para agentes

Estas plantillas sirven para trabajar con OpenCode, Codex u otro agente sin depender de que el agente recuerde conversaciones anteriores.

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
- `docs/working/IMPLEMENTATION-TRACKER.md`

Después debe leer solo los documentos de dominio, seguridad, UI o pruebas que `INDEX.md` indique para la tarea.

No leer toda la carpeta `docs` por defecto.

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
- IDs de tarea: `POS-01-A`, `POS-01-B`, `LOC-01-A`.
- Fases:
  - `A` suele ser revisión factual.
  - `B` suele ser validación o planificación.
  - `C` suele ser implementación.
  - Ajustar si una vertical requiere más pasos.
- Un prompt no concede permiso para ampliar alcance.
- Si el agente no puede verificar algo, debe declararlo como pregunta abierta, no como defecto.

## Qué no hacer

- No convertir estas plantillas en un checklist mecánico para “normalizar” todo el repositorio.
- No crear un prompt por cada pantalla salvo que el flujo sea excepcional y se reutilice.
- No copiar reglas completas de `AGENTS.md`, `DESIGN.md` o documentos de dominio: la plantilla debe remitir a ellos.
- No usar un archivo grande, una clase repetida, una ruta antigua o un componente legacy como prueba automática de deuda prioritaria.
