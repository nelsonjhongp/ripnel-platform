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
- documentos de dominio indicados en el plan.

Del `docs/working/IMPLEMENTATION-TRACKER.md`, leer únicamente la entrada
autorizada por el plan. Si no existe, registrar su ausencia como hecho. No leer
ni resumir otras entradas ni sustituir la tarea explícita por otra prioridad.

Si la tarea toca migraciones, seguridad, permisos backend o despliegue:
- confirma que la reconciliación registrada en el plan sigue vigente;
- compara base Git, working tree y estado remoto relevante solo en el nivel
  necesario;
- si difieren de forma material, detén la implementación y reporta bloqueo, sin
  ampliar alcance.

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
- El plan aprobado prevalece sobre prioridades laterales detectadas en tracker.
- No reemplazar componentes legacy en masa.
- Mantener el patrón de pantalla y componentes compartidos solo cuando coincidan
  con la semántica y necesidad del flujo.
- Si el plan pegado no contiene tarea autoritativa, archivos permitidos,
  invariantes y pruebas, detenerse y reportar que debe volver a planificación.
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
