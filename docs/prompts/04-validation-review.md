# 04 — Validation review

> Usar después de una implementación aprobada.
>
> Esta fase no debe implementar correcciones nuevas salvo que se le autorice
> una corrección estrictamente puntual.

## Prompt

```text
Modo: validación y cierre. No modifiques código, documentación, configuración,
base de datos, migraciones ni seeds.

Repositorio:
[PEGAR RUTA LOCAL DEL REPOSITORIO]

Tarea:
[ID Y NOMBRE]

Plan aprobado:
[ENLACE O RESUMEN]

Evidencia disponible:
- diff: [RUTA O COMANDO]
- pruebas: [RESULTADOS]
- screenshots/logs: [RUTAS]
- tracker: [ENTRADA]

Lee:
- AGENTS.md
- docs/INDEX.md
- docs/working/FRONTEND-WORKFLOW.md
- plan aprobado;
- archivos modificados;
- documentos de dominio necesarios para validar invariantes.

Del `docs/working/IMPLEMENTATION-TRACKER.md`, leer únicamente la entrada
autorizada de esta misma tarea. Si no existe, registrar su ausencia como hecho.
No leer ni resumir otras entradas ni sustituir la tarea explícita por otra
prioridad.

Si la tarea toca migraciones, seguridad, permisos backend o despliegue,
confirma en el nivel mínimo necesario:
- base Git evaluada;
- working tree relevante;
- estado remoto o ambiente real relevante.

Si existe una diferencia material frente a la base validada, regístrala como
riesgo o bloqueo según corresponda.

Objetivo:
Determinar si la implementación cumple el plan sin introducir regresiones
observables ni expansión de alcance.

La validación debe comparar la implementación contra el plan aprobado autónomo
de `02`, no contra memoria conversacional previa.

Revisar:

1. Alcance
   - ¿solo se modificaron archivos permitidos?
   - ¿hay cambios laterales?

2. Corrección
   - ¿el cambio resuelve el problema confirmado?
   - ¿preserva invariantes y contratos?

3. Validación
   - ¿tests relevantes pasan?
   - ¿el resultado manual/visual responde a la aceptación?
   - ¿se revisó 1366×768, overflow o tema cuando correspondía?

4. Tracker
   - ¿la entrada registra evidencia y siguiente estado correctamente?
   - ¿no cambió roadmap sin autorización?

Separar:
- confirmado;
- no verificable;
- regresión o riesgo;
- hallazgo fuera de alcance.

Cerrar con una decisión única:
- Aceptar y cerrar.
- Aceptar con seguimiento no bloqueante.
- Requiere corrección puntual.
- Rechazar / volver a planificación.

Si el plan aprobado no contiene tarea autoritativa, archivos permitidos,
invariantes o pruebas, mapearlo a `Rechazar / volver a planificación` por
handoff insuficiente.

Para una corrección puntual, describir solo:
- defecto;
- archivo objetivo;
- cambio mínimo;
- prueba de aceptación.

No implementar la corrección dentro de esta validación.
```
