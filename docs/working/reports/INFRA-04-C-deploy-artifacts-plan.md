# INFRA-04-C: Plan de artefactos para el deploy de staging

> Fecha: 2026-07-08 | Depende de: `docs/working/reports/INFRA-04-A-do-readiness-audit.md`, `docs/working/reports/INFRA-04-B-staging-runbook.md`
>
> Estado: **Documento de planificación, ningún artefacto creado todavía.** No se creó ningún recurso en DigitalOcean, no se tocó Supabase remoto, no se modificó código de aplicación, seeds ni migraciones. No se ejecutó `git add` ni commit.
>
> **Ajeno a este documento:** el working tree actual tiene cambios de un trabajo paralelo de frontend (búsqueda/POS y reestructuración — `apps/frontend/components/modules/inventory/inventory-adjustments-create-page.tsx`, `use-replacement-search.ts`, `use-product-search.ts`, `transfers-request-page.tsx`, `transfers-shared.tsx`, `apps/frontend/hooks/use-debounced-api-search.ts`, y los reportes `PRODUCT-SEARCH-01-*`/`FRONTEND-STRUCTURE-01-*`). No forman parte de INFRA-04-C, no se tocaron, y no deben mezclarse con el trabajo de infraestructura de esta fase.

## Objetivo

Definir con precisión qué artefactos conviene versionar en el repo antes del primer deploy real a staging (plantillas de Nginx/PM2/env, script de migraciones, checklist de smoke test), dónde deberían vivir dentro de la estructura actual, y cuáles NO deben tocarse por ningún motivo — sin crear ninguno de ellos todavía.

## 1. Artefactos recomendados para versionar

| Artefacto | Contenido | ¿Contiene secretos? |
|---|---|---|
| Ejemplo de config de Nginx para staging | `server` block same-origin (`/`→frontend `:3000`, `/api`+`/health`→backend `:3001`), headers `Host`/`X-Forwarded-Proto`/`X-Forwarded-For`, placeholder de dominio (`<STAGING_DOMAIN>`), sin certificados reales | No — solo estructura de config, sin claves ni dominios reales |
| Ejemplo de ecosystem PM2 | Definición de los dos procesos (`ripnel-backend`, `ripnel-frontend`) con comando, `cwd`, y referencia a variables de entorno **por nombre**, nunca por valor | No — PM2 lee el `.env` real del sistema en tiempo de ejecución, el ecosystem file no necesita valores |
| Ejemplo de `.env` sin secretos | Mismo patrón que `apps/backend/.env.example`/`apps/frontend/.env.example` ya existentes, pero con los nombres de variable específicos de staging y comentarios de contexto (`NODE_ENV=production`, `DB_SSL=true`, etc.) | No — son plantillas de nombres, no de valores reales |
| Script/checklist de migraciones | El mismo patrón `for f in $(ls supabase/migrations | sort); do psql ... -v ON_ERROR_STOP=1 -f "$f" ...; done` ya usado tres veces (`INFRA-03-B`, `INFRA-03-D`, documentado de nuevo en `INFRA-04-B`) | No — no requiere ningún valor real embebido, `DATABASE_URL` se lee del entorno |
| Checklist de smoke test | Lista reutilizable de verificaciones (`/health`, login, `/api/auth/me`, frontend, F5, sidebar) ya usada en `INFRA-03-F/G/H` y `INFRA-04-B` sección 10 | No — es una lista de pasos, no de credenciales |

Todos estos artefactos ya existen **como texto dentro de reportes** (`INFRA-04-B` principalmente) — la propuesta es extraerlos a archivos reutilizables y copy-paste-ready, no inventar contenido nuevo.

## 2. Artefactos que NO deben versionarse

- **`.env` reales** — ya cubiertos por `.gitignore` (`.env`, `.env.*`, con excepción explícita de `!.env.example`/`!.env.*.example`). Ningún cambio necesario aquí.
- **Certificados CA reales** (por ejemplo, el certificado CA de DigitalOcean Managed PostgreSQL si `CA_CERT_PATH` resulta necesario, `INFRA-04-B` sección 3/5) — `.gitignore` ya ignora `*.pem` (sección "Local tooling"), pero **no tiene una regla para `*.crt`**, extensión común para certificados CA descargados desde paneles como el de DO. **Hueco identificado, no corregido en esta fase** (ver sección 8).
- **Passwords** — ninguno de los artefactos de la sección 1 debe contener un valor de password, ni siquiera de ejemplo "realista"; usar siempre placeholders explícitos (`<REEMPLAZAR_...>`), mismo criterio ya aplicado en `INFRA-04-B`.
- **Connection strings reales** — ningún artefacto debe incluir un host, usuario o password real de DigitalOcean Managed PostgreSQL ni de Supabase remoto.

## 3. Rutas sugeridas dentro del repo

Evaluación de las tres opciones que planteaste, más una alternativa híbrida:

| Ruta candidata | Encaje |
|---|---|
| `docs/infra/runbooks/` | **No recomendada.** Duplicaría/fragmentaría la convención ya establecida: toda la serie INFRA-01 a INFRA-04-B vive en `docs/working/reports/`, con su propio patrón de IDs y trazabilidad. Introducir una segunda ubicación para runbooks ahora dividiría el rastro documental sin necesidad real. |
| `docs/infra/templates/` | **Recomendada para las plantillas de config** (Nginx, PM2, `.env.*.example` específicos de staging). Mantiene el material de deploy agrupado cerca de `docs/deploy.md` (la guía general ya existente), y dentro de `docs/` es coherente con que estos archivos son, ante todo, documentación operativa consultada por humanos antes de copiarse a un servidor — no código de aplicación. |
| `scripts/deploy/` | **Recomendada para el script de migraciones.** `scripts/` ya existe en el repo con un precedente claro (`scripts/ripnel-repo-snapshot.ps1`) de herramientas operativas que no son parte de la aplicación — un script ejecutable de aplicación de migraciones encaja naturalmente ahí, mejor que dentro de `docs/`. |

**Recomendación final (híbrida, no una sola de las tres tal cual):**
- `docs/infra/templates/` → `nginx.staging.example.conf`, `ecosystem.config.example.js`, `.env.staging.backend.example`, `.env.staging.frontend.example`.
- `scripts/deploy/` → `apply-migrations.sh` (el loop reusable).
- **Runbooks y checklists narrativos siguen en `docs/working/reports/`** (sin cambios) — el checklist de smoke test, por ahora, se mantiene embebido en `INFRA-04-B` sección 10 en vez de extraerse a un archivo aparte (ver punto siguiente).

## 4. `ecosystem.config.example.js` — ¿crear o mantener solo documentado?

**Recomendación: sí conviene crear un ejemplo**, no dejarlo solo en prosa. Motivo: PM2 es sensible a errores de sintaxis/estructura del `ecosystem.config.js` real (nombre de proceso, `cwd`, `script`, `args`) — un ejemplo copy-paste-ready reduce el riesgo de error manual en el primer deploy real, y no contiene ningún secreto (las variables se referencian por nombre, PM2 las toma del `.env` del sistema o de `env_file`). No se crea en esta fase — queda como artefacto propuesto para `INFRA-04-D`.

## 5. `nginx.staging.example.conf` — ¿crear o mantener solo documentado?

**Recomendación: sí conviene crear un ejemplo**, mismo razonamiento que PM2. La configuración same-origin descrita en `INFRA-04-B` (rutas `/api`, `/health` vs. resto) tiene varios detalles fáciles de omitir a mano (headers de proxy, orden de `location` blocks) — un archivo de referencia reduce el riesgo de un primer deploy con proxy mal configurado. Tampoco contiene secretos (dominio como placeholder, sin certificados). No se crea en esta fase — propuesto para `INFRA-04-D`.

## 6. Script de migraciones — ¿reusable o comando manual?

**Recomendación: sí conviene un script reusable.** El mismo patrón (`for f in $(ls supabase/migrations | sort); do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f" || break; done`) ya se ejecutó **tres veces de forma idéntica** en esta serie (`INFRA-03-B`, `INFRA-03-D`, y otra vez copiado a mano en `INFRA-04-B`) — es una señal clara de que vale la pena extraerlo a `scripts/deploy/apply-migrations.sh` en vez de seguir copiando el comando manualmente cada vez, con el riesgo de una transcripción incorrecta en el momento de aplicarlo contra staging real. No se crea en esta fase — propuesto para `INFRA-04-D`.

## 7. Riesgos de crear estos artefactos mientras hay cambios frontend paralelos

- **Riesgo bajo de colisión directa** — todos los artefactos propuestos (`docs/infra/templates/`, `scripts/deploy/`) están en rutas completamente separadas de los archivos que el trabajo paralelo de búsqueda/POS está tocando (`apps/frontend/components/...`, `apps/frontend/hooks/...`). No hay overlap de archivos.
- **Riesgo real: el paso "build frontend in-situ" del runbook (`INFRA-04-B`, sección 7) podría fallar o comportarse de forma inesperada** si el trabajo paralelo introduce un problema que sí bloquee el build (no solo el warning de Hooks ya detectado en tiempo de ejecución en `INFRA-03-H`, que no necesariamente rompe `next build`) — si el primer deploy real a staging se intenta mientras ese trabajo sigue inestable, un fallo de build podría confundirse con un problema de infraestructura cuando en realidad es de código de aplicación ajeno a esta serie.
- **Riesgo de mezcla de alcance en el mismo commit/PR** — si al versionar estos artefactos de infraestructura alguien agrupa el commit junto con los cambios de búsqueda/POS todavía en curso, se pierde la trazabilidad clara que esta serie INFRA-04 ha mantenido hasta ahora (commits `chore(infra)`/`docs(infra)`/`fix(db)` separados de los cambios de dominio).
- **Mitigación recomendada:** crear los artefactos de esta fase en su propio commit separado cuando se autorice `INFRA-04-D`, y no intentar el primer deploy real de staging hasta que el trabajo paralelo de frontend esté estable o se decida explícitamente excluirlo (ya señalado como pendiente en `INFRA-04-A`/`INFRA-04-B`).

## 8. Plan mínimo para INFRA-04-D

Sigue en modo solo lectura/planificación para la creación de recursos DigitalOcean — pero pasa a modo "crear archivos versionados" (plantillas, no infraestructura real):

1. Crear `docs/infra/templates/nginx.staging.example.conf` (sección 5).
2. Crear `docs/infra/templates/ecosystem.config.example.js` (sección 4).
3. Crear `docs/infra/templates/.env.staging.backend.example` y `.env.staging.frontend.example` (extensión natural de los `.env.example` ya existentes en cada app, pero específicos de staging).
4. Crear `scripts/deploy/apply-migrations.sh` (sección 6).
5. Evaluar en ese momento si agregar `*.crt` a `.gitignore` (hueco identificado en la sección 2) — cambio mínimo, pero fuera del alcance permitido de esta fase (`INFRA-04-C` solo puede crear el reporte).
6. Confirmar que el trabajo paralelo de frontend esté resuelto o explícitamente excluido antes de intentar el primer deploy real (no es parte de crear artefactos, es una condición previa a la ejecución real, que quedaría para una fase posterior a `INFRA-04-D`).

## `git status --short` final

```
 M apps/frontend/components/modules/inventory/inventory-adjustments-create-page.tsx
 M apps/frontend/components/modules/postsales/use-replacement-search.ts
 M apps/frontend/components/modules/sales/pos/use-product-search.ts
 M apps/frontend/components/modules/transfers/transfers-request-page.tsx
 M apps/frontend/components/modules/transfers/transfers-shared.tsx
?? apps/frontend/hooks/use-debounced-api-search.ts
?? docs/working/reports/FRONTEND-STRUCTURE-01-legacy-map.md
?? docs/working/reports/INFRA-04-C-deploy-artifacts-plan.md
?? docs/working/reports/PRODUCT-SEARCH-01-frontend-search-roadmap.md
```

El único archivo generado por INFRA-04-C es este reporte. Los demás archivos modificados/nuevos son ajenos a esta fase (trabajo paralelo de frontend, ya señalado al inicio de este documento) y no fueron tocados por ella. No se ejecutó `git add` ni commit. No se creó ningún recurso en DigitalOcean, no se tocó Supabase remoto, no se modificó código de aplicación, seeds ni migraciones.
