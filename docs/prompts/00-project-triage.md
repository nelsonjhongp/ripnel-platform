# 00 — Project triage

> Usar cuando la pregunta es: “¿Qué vertical conviene abordar ahora?”
>
> Esta fase no modifica nada.

## Prompt

```text
Modo: revisión / triage de proyecto. No modifiques código, documentación,
configuración, base de datos, migraciones, seeds ni archivos de evidencia.

Repositorio:
[PEGAR RUTA LOCAL DEL REPOSITORIO]

Lee primero:
- AGENTS.md
- docs/INDEX.md
- docs/working/FRONTEND-WORKFLOW.md
- docs/working/IMPLEMENTATION-TRACKER.md

Luego revisa solo los documentos y código necesarios para evaluar candidatos
ya presentes en el tracker. No leas todo el repositorio.

Objetivo:
Proponer el siguiente trabajo elegible sin decidir la prioridad final por mí.

Reglas:
- Máximo 3 candidatos.
- No implementar nada.
- No proponer refactors globales.
- No tratar deuda menor o una hipótesis como prioridad.
- No crear componentes ni documentos nuevos.
- Separar estrictamente hechos confirmados, inferencias y preguntas abiertas.
- Si no existe evidencia suficiente para priorizar un candidato, declararlo.
- No abrir investigación profunda de módulos que no estén entre los tres candidatos. Usar evidencia existente del tracker, reportes previos, tests, diffs y rutas principales.

Para cada candidato entregar:
1. ID de tracker o vertical.
2. Objetivo de negocio/operación.
3. Evidencia concreta: archivo, ruta, test, log, screenshot o reporte previo.
4. Riesgo si no se aborda.
5. Alcance probable y exclusiones.
6. Validación mínima necesaria.
7. Dependencias o bloqueos.
8. Por qué es candidato ahora, no una recomendación abstracta.

Cerrar con:
- tabla de máximo 3 candidatos;
- una recomendación principal;
- una alternativa si el objetivo principal no se puede validar;
- preguntas que requieren decisión humana.

No actualizar el tracker ni crear reportes.
```
