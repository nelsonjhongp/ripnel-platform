# 02 — Implementation plan

> Usar después de elegir un hallazgo o tarea del triage.
>
> Esta fase no modifica nada.

## Prompt

```text
Modo: planificación de implementación. No modifiques código, documentación,
configuración, base de datos, migraciones, seeds ni archivos de evidencia.

Repositorio:
[PEGAR RUTA LOCAL DEL REPOSITORIO]

Tarea elegida:
[ID Y NOMBRE]

Fuente de evidencia:
[REPORTE, CAPTURAS, LOGS, LÍNEAS O HALLAZGO CONFIRMADO]

Objetivo:
[RESULTADO OBSERVABLE]

Lee primero:
- AGENTS.md
- docs/INDEX.md
- docs/working/FRONTEND-WORKFLOW.md
- docs/working/IMPLEMENTATION-TRACKER.md

Luego lee solo la documentación y código que INDEX.md indique para esta tarea.

No reabrir una auditoría global. No transformar hipótesis en alcance.

Construye un plan implementable con:

1. Resumen del problema confirmado.
2. Decisión de solución y por qué es proporcional.
3. Archivos exactos a modificar.
4. Cambios por archivo.
5. Invariantes:
   - contratos/API;
   - permisos;
   - stock/caja/transacciones;
   - accesibilidad;
   - compatibilidad de datos;
   - otros que correspondan.
6. Fuera de alcance explícito.
7. Riesgos y cómo se reducen.
8. Plan de validación:
   - pruebas técnicas;
   - pruebas manuales;
   - viewport y tema si hay UI;
   - screenshots o mediciones si corresponde.
9. Actualización exacta requerida en tracker:
   - qué entrada;
   - qué estado;
   - qué evidencia registrar.

Reglas:
- No crear componentes compartidos sin dos usos estables o una necesidad real de
  accesibilidad/comportamiento.
- No migrar legacy fuera del flujo que se está tocando.
- No proponer cambios laterales “aprovechando que estamos ahí”.
- Si una condición del plan no puede verificarse, declararla como dependencia
  o pregunta abierta.

Entrega un plan breve pero completo. No implementar.
```
