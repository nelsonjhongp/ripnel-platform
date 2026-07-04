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
