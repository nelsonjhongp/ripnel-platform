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

Del `docs/working/IMPLEMENTATION-TRACKER.md`, leer únicamente la entrada
autorizada por la tarea o la evidencia. Si no existe, registrar su ausencia
como hecho. No leer ni resumir otras entradas ni sustituir la tarea explícita
por otra prioridad.

Luego lee solo la documentación y código que INDEX.md indique para esta tarea.

No reabrir una auditoría global. No transformar hipótesis en alcance.

Si la tarea toca migraciones, seguridad, permisos backend o despliegue,
confirma primero, en el nivel mínimo necesario:
- base Git evaluada;
- working tree relevante;
- estado remoto o ambiente real relevante.

Si existe una diferencia material, declárala como hecho, dependencia o bloqueo.

Construye un plan implementable y autónomo con:

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

El plan aprobado que entregues debe poder pegarse directamente en `03` y servir
también para `04`, sin depender de conversación previa.

Debe incluir de forma explícita:
- tarea autoritativa;
- archivos permitidos;
- invariantes;
- fuera de alcance;
- pruebas técnicas y manuales;
- entrada de tracker autorizada, o ausencia confirmada de entrada.

Persistencia mínima:
- fase 02 produce el plan autónomo, pero no crea el archivo de reporte;
- después de revisión y aprobación humana, el plan puede pegarse íntegro en
  la fase siguiente o persistirse mediante una acción documental explícitamente
  autorizada;
- no crear un handoff adicional; el plan aprobado sigue siendo el único handoff
  formal.

Reglas:
- No crear componentes compartidos sin dos usos estables o una necesidad real de
  accesibilidad/comportamiento.
- No migrar legacy fuera del flujo que se está tocando.
- No proponer cambios laterales “aprovechando que estamos ahí”.
- Si una condición del plan no puede verificarse, declararla como dependencia
  o pregunta abierta.

Entrega un plan breve pero completo. No implementar.
```
