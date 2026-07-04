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
- docs/working/IMPLEMENTATION-TRACKER.md
- plan aprobado;
- archivos modificados;
- documentos de dominio necesarios para validar invariantes.

Objetivo:
Determinar si la implementación cumple el plan sin introducir regresiones
observables ni expansión de alcance.

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

Para una corrección puntual, describir solo:
- defecto;
- archivo objetivo;
- cambio mínimo;
- prueba de aceptación.

No implementar la corrección dentro de esta validación.
```
