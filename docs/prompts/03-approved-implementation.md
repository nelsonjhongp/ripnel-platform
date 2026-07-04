# 03 — Approved implementation

> Usar solo cuando un plan específico ya fue revisado y aprobado.
>
> Esta fase sí puede modificar archivos, pero únicamente dentro del alcance.

## Prompt

```text
Modo: implementación aprobada.

Repositorio:
[PEGAR RUTA LOCAL DEL REPOSITORIO]

Tarea:
[ID Y NOMBRE]

Plan aprobado:
[PEGAR O ENLAZAR EL PLAN APROBADO]

Antes de editar, lee:
- AGENTS.md
- docs/INDEX.md
- docs/working/FRONTEND-WORKFLOW.md
- docs/working/IMPLEMENTATION-TRACKER.md
- documentos de dominio indicados en el plan.

Primero confirma en máximo 8 líneas:
- objetivo;
- archivos objetivo;
- invariantes;
- fuera de alcance;
- pruebas previstas.

Luego implementa únicamente el plan aprobado.

Reglas:
- No ampliar alcance.
- No crear componentes compartidos, docs ni migraciones fuera del plan.
- No convertir hallazgos laterales en cambios.
- No reemplazar componentes legacy en masa.
- Mantener el patrón de pantalla y componentes compartidos solo cuando coincidan
  con la semántica y necesidad del flujo.
- Si aparece un bloqueo no previsto, detener la implementación y reportarlo.

Al finalizar:
1. Ejecuta las pruebas indicadas.
2. Para UI, obtener evidencia indicada en el plan:
   - viewport 1366×768 si corresponde;
   - tema oscuro si el cambio usa tokens/estados semánticos;
   - mediciones de overflow si el problema es layout.
3. Actualiza únicamente la entrada del tracker autorizada por el plan.
4. Entrega:
   - resumen de archivos modificados;
   - pruebas ejecutadas y resultado;
   - evidencia visual/funcional;
   - hallazgos fuera de alcance, sin implementarlos;
   - diff check.

No declares una tarea cerrada: la decisión de cierre corresponde a validación.
```
