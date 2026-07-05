# 01 — Module triage

> Usar para conocer un módulo o flujo concreto antes de planificar cambios.
>
> Esta fase no modifica nada.

## Prompt

```text
Modo: revisión factual de módulo. No modifiques código, documentación,
configuración, base de datos, migraciones, seeds ni archivos de evidencia.

Seguridad de navegador y evidencia:

Las acciones de navegador que envían formularios, crean, editan, eliminan,
activan/desactivan registros, suben archivos o ejecutan POST/PATCH/DELETE
se consideran modificaciones y están prohibidas durante triage.

Se permiten únicamente navegación, snapshots, lectura del DOM, mediciones,
filtros no persistentes, apertura de diálogos y screenshots.

No modificar ni reutilizar archivos de evidencia existentes.

Los screenshots temporales no deben guardarse dentro del repositorio ni
versionarse. Usar artefactos de sesión o una ubicación temporal externa al
repositorio.

Si la herramienta solo permite un nombre de archivo relativo al workspace,
registrar el archivo como temporal y eliminarlo antes de cerrar la fase.

No exponer cookies, JWT, credenciales, localStorage ni secretos en el reporte.

Repositorio:
[PEGAR RUTA LOCAL DEL REPOSITORIO]

Módulo / vertical:
[ID Y NOMBRE, EJ. LOC-01 — Ubicaciones]

Ruta o rutas objetivo:
[ROUTAS]

Pregunta operativa:
[QUÉ QUIERE COMPLETAR EL USUARIO U OPERADOR]

Contexto de baseline:
[Existente: <ID/ruta> / No requerido: <razón> / Esta revisión produce baseline: <razón>]

Lentes activos:
[MÁXIMO 3: permisos; rol/sede; flujo operativo; UI/copy/densidad;
consistencia/reutilización; datos/transacciones. Si requiere 4 o más, dividir
la tarea o hacer baseline primero.]

Lee primero:
- AGENTS.md
- docs/INDEX.md
- docs/working/FRONTEND-WORKFLOW.md

Del `docs/working/IMPLEMENTATION-TRACKER.md`, localizar únicamente la
entrada o sección autorizada de la vertical o tarea indicada. Si esa entrada no
existe, registrar su ausencia como hecho. No leer ni resumir otras entradas ni
el tracker completo. No sustituir la tarea explícita por otra prioridad del
tracker.

Luego usa INDEX.md para leer únicamente:
- documentos del dominio;
- documentos visuales si hay UI;
- documentos de permisos, caja, stock o seguridad solo si el módulo los toca.

Inspecciona código real de entradas frontend, endpoints backend, pruebas y
reportes previos relevantes. 

Si el módulo expone endpoints backend, verificar:
- middleware de autenticación;
- middleware de autorización;
- permiso o capacidad requerida;
- definición/asignación de permiso;
- emisión o carga en claims/contexto auth cuando corresponda;
- consumidores reales de cada endpoint HTTP mediante búsqueda de
  `api/<recurso>` en frontend, tests, scripts o integraciones.

Para hallazgos de permisos backend, exigir cadena verificable:
definición/asignación de permiso
→ emisión o carga en claims/contexto auth
→ middleware
→ ruta
→ consumidores HTTP relevantes para compatibilidad.

No exigir que toda ruta de escritura tenga consumidor frontend para considerarla
válida o relevante.

No asumas que la documentación reemplaza código.

Prevalencia:
1. comportamiento verificable, pruebas y código vigente;
2. contratos backend, migraciones y schemas cuando correspondan;
3. documentación activa enlazada por INDEX.md;
4. prompts y reportes previos.

Si existe contradicción, reportarla. No resolverla por suposición.

No inferir consumidores HTTP a partir de imports internos de repositorios,
servicios o helpers del backend.

Objetivo:
Entender el contrato actual del módulo y proponer máximo 3 candidatos de mejora
o validación, sin decidir ni implementar cambios.

Separar estrictamente:
- Hecho confirmado: archivo + línea, ruta, test, log, screenshot o comportamiento observable.
- Inferencia: interpretación no validada.
- Pregunta abierta: requiere navegador, datos reales, backend, decisión de negocio o usuario.

Entrega:

1. Contrato actual
   - rutas;
   - entradas frontend;
   - endpoints backend;
   - dependencias de dominio;
   - permisos/sedes implicados, solo si existen.

2. Flujo actual
   - operador;
   - tarea principal;
   - acción primaria;
   - estados bloqueados;
   - validaciones;
   - confirmaciones;
   - resultado esperado.

3. Patrón de pantalla
   - arquetipo según frontend-page-standard.md;
   - componentes compartidos usados;
   - componentes de dominio;
   - legacy detectado, solo si es relevante al flujo.

4. Hallazgos
   Para hallazgos visuales o de flujo:
   - No afirmar problemas de densidad, jerarquía, overflow o legibilidad solo por leer JSX.
   - Si no existe evidencia de navegador, screenshot o prueba manual, clasificarlos como hipótesis o pregunta abierta.
   Un snapshot, texto visible o control presente prueba renderizado y accesibilidad
   observable; no prueba que una acción de negocio, validación, permiso o flujo
   completo funcione.
   
   Para afirmar que un flujo funciona, exigir evidencia de prueba existente,
   comportamiento no persistente verificable o ejecución controlada autorizada
   en una fase posterior.
   - Si hay navegador disponible, usar viewport 1366×768 y registrar evidencia visual cuando el hallazgo dependa de UI.
   Antes de navegar, establecer viewport 1366×768. Luego abrir o recargar la ruta objetivo antes de tomar snapshot, mediciones o screenshots.
   
   Máximo 3 candidatos. Para cada uno:
   - ID;
   - tipo: bug / UX / flujo / deuda técnica / documentación;
   - evidencia;
   - impacto;
   - riesgo;
   - alcance probable;
   - validación necesaria;
   - qué no debe tocar.

5. Cumplimiento documental
   - documentos leídos;
   - regla concreta aplicada desde cada uno;
   - contradicciones doc ↔ código, si existen;
   - información insuficiente, si existe.

6. Baseline
   - si se creó o se recomienda crear baseline durable, explicar por qué cumple
     los criterios;
   - si no corresponde, registrar que el triage es puntual y no deja mapa
     reutilizable;
   - no crear reportes adicionales si el tracker, el diff futuro o la tarea
     bastan.

7. Recomendación
   Recomendar una sola siguiente fase o tarea compatible con la tarea revisada,
   sin repriorizar desde el tracker, con:
   - objetivo;
   - alcance;
   - exclusiones;
   - invariantes;
   - aceptación;
   - evidencia requerida.

No actualizar tracker. No crear componentes. No proponer refactor global.
```
