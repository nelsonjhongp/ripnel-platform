# INFRA-02: Plan de entornos (local / dev online / staging / producción)

> Fecha: 2026-07-08 | Depende de: `docs/working/reports/INFRA-01-do-deployment-plan.md`
>
> Aclaración de alcance recibida del usuario: Supabase remoto se usa **solo como PostgreSQL online de desarrollo/prueba**, sin datos críticos de producción. El destino productivo preferente sigue siendo Droplet DigitalOcean + DigitalOcean Managed PostgreSQL (ver INFRA-01).
>
> Modo: solo lectura sobre el repo. No se modificó código, config real, ni se crearon Dockerfile/docker-compose. No se ejecutaron migraciones ni se leyeron `.env` reales.

## Uso

Documento de evaluación y plan, no de ejecución. Complementa a INFRA-01: mientras INFRA-01 ordena las fases hacia DigitalOcean, este documento ordena la separación de entornos (incluida una BD local) que debería existir en paralelo, especialmente antes o durante la Fase 3 (staging) de INFRA-01.

---

## 1. Estado actual de BD

**[Confirmado por archivo]**
- `supabase/config.toml` (`project_id = "ripnel-platform"`) y `supabase/.temp/` (metadata de vinculación del CLI, no leída en detalle por contener posibles identificadores de proyecto) confirman que el repo está actualmente **linkeado a un proyecto Supabase remoto real**.
- 24 migraciones versionadas en `supabase/migrations/`, aplicadas en orden cronológico por nombre de archivo (confirmado en sesiones previas).
- `database/` contiene scripts de referencia: seeds (`seed_operational_demo.sql`, `seed_operational_30_days.sql`, `seed_operational_mvp.sql`, `seed_sales_confirmed_demo.sql`, `seed_test_users.sql`, `seed_variants_inventory.sql`, `seed_access_control.sql`, `seed_style_size_prices.sql`) y validaciones de solo lectura (`validate_permissions.sql`, `validate_cash_closing.sql`, `validate_sales_history_detail.sql`, `readiness_sales_mvp.sql`).
- **Corroboración directa de la aclaración del usuario dentro del propio SQL:** `database/seed_operational_demo.sql` dice literalmente `-- Legacy/demo seed: do not use on the current shared Supabase base.` y `database/seed_operational_30_days.sql` dice `-- an existing Supabase database using real stock documents` y `-- safe to re-run on the shared demo Supabase base`. Es decir, el propio repo ya trataba a Supabase como una **base compartida de demo/desarrollo**, no como producción — esto no es solo la aclaración del usuario, está documentado en comentarios SQL preexistentes.
- `apps/backend/.env.example` ya contempla el caso de Postgres local sin TLS: `# Set DB_SSL=false only for local Postgres without SSL.`

**[Inferencia razonable]**
- Al ser una única instancia Supabase remota compartida para "desarrollo/prueba", cualquier desarrollador o agente que ejecute seeds, migraciones de prueba o tests de integración contra ella puede interferir con el trabajo de otros (colisión de datos demo, IDs duplicados, estados de stock inconsistentes).
- No hay evidencia de un mecanismo de aislamiento por rama/desarrollador (no hay branching de Supabase, no hay esquemas separados por usuario) — todo el equipo comparte el mismo `DATABASE_URL` de dev online.

**Riesgos de seguir usando solo Supabase remoto para desarrollo:**

| Riesgo | Tipo |
|---|---|
| Colisión de datos entre desarrolladores/agentes trabajando en paralelo sobre la misma base compartida | Inferencia |
| Dependencia de red: no hay desarrollo/test offline posible | Confirmado (arquitectura: `DATABASE_URL` siempre remoto) |
| Iteración lenta para migraciones riesgosas: no hay una copia descartable local donde "romper y resetear" sin afectar a otros | Inferencia |
| Límites de conexión/cómputo del plan Supabase bajo carga de tests repetidos de agentes | Inferencia — no se puede confirmar el plan/tier desde el repo |
| Exposición de red mayor que un Postgres local: cualquier fuga de `DATABASE_URL` de dev apunta a un host accesible por red, no a `localhost` | Inferencia |
| Ausencia de "shadow database" utilizable contra el remoto para `db diff` (el shadow de `config.toml`, puerto 54320, solo aplica en local) | Confirmado por `supabase/config.toml` |

---

## 2. Propuesta de entornos

| Entorno | Base de datos | Propósito | Quién lo toca |
|---|---|---|---|
| **Local** | Postgres local (Docker) o Supabase CLI local | Desarrollo día a día, pruebas rápidas, iteración de agentes, romper/resetear sin costo | Cada desarrollador/agente, aislado |
| **Dev online** | Supabase remoto actual (`ripnel-platform`) | Continúa como entorno compartido de desarrollo/demo — **no producción**, según aclaración del usuario | Equipo, para validar integración entre features antes de staging |
| **Staging** | DigitalOcean Managed PostgreSQL (instancia de prueba, separada de producción) | Validar el proceso de deploy y migración completo en topología idéntica a producción (Droplet + Nginx + Managed PG), sin arriesgar datos reales — corresponde a Fase 3-4 de INFRA-01 | Antes de cada release a producción |
| **Producción** | DigitalOcean Managed PostgreSQL (instancia definitiva) | Entorno real una vez completadas las fases de INFRA-01 | Solo tras checklist de producción aprobado |

**[Inferencia]** Esta secuencia (local → dev online → staging → producción) no reemplaza el flujo actual de trabajo con Supabase — el dev online sigue existiendo tal como está — solo agrega un nivel local por debajo (más rápido, aislado) y formaliza el nivel de staging que hoy no existe.

---

## 3. BD local

### Opción A — PostgreSQL local vía Docker Compose (un solo servicio, sin capa Supabase)

**[Confirmado]** `.github/workflows/ci.yml` ya usa exactamente `postgres:16-alpine` como servicio en CI. Replicar esa misma imagen en local garantiza paridad byte-a-byte con lo que corre en cada PR.

- Pros: mínimo footprint (un solo contenedor), coincide con CI, coincide conceptualmente con el destino final (DO Managed PostgreSQL es Postgres puro, no Supabase), fácil de resetear (`down -v`).
- Contras: la imagen estándar `postgres:16-alpine` **no incluye `pgvector`** — si se mantiene el módulo `chatbot` (única migración que usa `CREATE EXTENSION vector`), habría que usar la imagen `pgvector/pgvector:pg16` en su lugar, o aceptar que ese módulo no funcione en local. Hay que declarar `pgcrypto` manualmente igual que en las migraciones (ya lo hacen, es estándar).

### Opción B — Supabase local CLI (`supabase start`)

**[Confirmado por archivo]** `supabase/config.toml` **ya está completamente configurado** para esto sin necesidad de crear ningún archivo nuevo: puerto API `54321`, puerto DB `54322`, shadow `54320`, `major_version = 17`, `db.migrations.enabled = true`, `db.seed.enabled = true` apuntando a `./seed.sql`. Es decir, hoy mismo `supabase start` aplicaría las 24 migraciones y el seed automáticamente, sin ningún cambio de configuración.

**[Confirmado]** `supabase/.gitignore` ya excluye `.branches` y `.temp`, y el root `.gitignore` ya excluye `supabase/.branches/` y `supabase/.temp/` — el estado local de Supabase CLI ya está contemplado en el control de versiones.

- Pros: cero configuración nueva (ya existe), replica más fielmente el motor y versión mayor (17) del proyecto remoto (relevante para validar portabilidad de versión antes de saltar a DO), incluye Supabase Studio local para inspección visual, `pgvector` viene soportado de forma nativa en la imagen de Postgres que usa Supabase CLI (sin necesidad de elegir una imagen alternativa).
- Contras: internamente la CLI de Supabase también depende de Docker (no lo evita, solo lo abstrae), y levanta servicios que la aplicación **no usa** (Auth/GoTrue, Storage, Realtime, API Gateway) — confirmado en sesión previa que el backend no usa `auth.uid()`, RLS, Storage ni Realtime — esto es peso y complejidad de arranque sin beneficio real para este proyecto.

### Recomendación

**[Inferencia razonable, no una decisión tomada por el usuario]** Para el uso diario recomiendo la **Opción A (Postgres local vía Docker Compose, un solo servicio)** porque es más liviana, coincide con lo que ya valida CI, y es fiel al destino final (Postgres puro en DO, sin capa Supabase). La **Opción B queda como alternativa válida de arranque inmediato** si en algún momento se quiere prototipar sin esperar a que se cree el archivo de Docker Compose local (fase posterior), dado que no requiere crear nada nuevo — ya está lista en `config.toml`.

**Archivos que harían falta en una fase posterior (NO creados ahora):**
- `docker-compose.local.yml` (o `.dev.yml`) con un único servicio `postgres` (imagen `postgres:16-alpine` para paridad con CI, o `pgvector/pgvector:pg16` si se decide conservar `chatbot` en local).
- `apps/backend/.env.local.example` o una nota adicional en el `.env.example` actual indicando `DATABASE_URL` de ejemplo para el Postgres local y `DB_SSL=false` (el comentario ya existe, solo faltaría el valor de ejemplo de `DATABASE_URL` apuntando a `localhost`).
- Posibles scripts npm (`db:local:up`, `db:local:reset`) en `package.json` — evaluar en esa fase, no ahora.
- Nota breve en `docs/backend-supabase-workflow.md` explicando cuándo usar local vs dev online.

**Qué NO crear todavía:** `docker-compose.yml`/`Dockerfile` reales, ningún script `.sh`/`.ps1` nuevo, ningún `.env` real, ninguna modificación a `supabase/config.toml` o a las migraciones existentes.

---

## 4. Integración futura con DigitalOcean

**[Confirmado, reutilizando hallazgos de la sesión de diagnóstico previa]** El esquema no usa `auth.uid()`, `auth.jwt()`, RLS (`CREATE POLICY`), Supabase Storage ni Realtime — la única dependencia de extensión no trivial es `pgvector` (solo para `chatbot`), y `pgcrypto` es universal. Esto sigue siendo la base de la portabilidad hacia DO Managed PostgreSQL.

**Cómo validar portabilidad:** aplicar las migraciones en dos escalones antes de tocar cualquier instancia real de DO — primero contra el Postgres local (barato, rápido, iterativo, se puede resetear en segundos), y solo después de que pase ahí, repetir el mismo proceso contra una instancia de prueba de DO Managed PostgreSQL descartable (esto es exactamente la Fase 4 de INFRA-01; este documento solo agrega el paso previo en local).

**Cómo probar migraciones:** aplicar los 24 archivos de `supabase/migrations/` en orden estricto por nombre contra la instancia local/de prueba, y correr `npm run test --workspace @ripnel/backend` contra ese mismo `DATABASE_URL` — la suite de tests ya cubre `cash-schema`, `security`, `transfers.service`, `locations.auth`, `locations.validation`, entre otros.

**Cómo probar seeds:** usar los seeds ya existentes y ya anotados como seguros para bases compartidas de demo (`database/seed_operational_30_days.sql`, `supabase/seed.sql`, `supabase/seed_styles_legacy.sql`) — cargarlos contra local primero, luego contra la instancia de prueba de DO, nunca directamente contra producción.

**Cómo evitar tocar data real:** regla dura para cualquier prueba de portabilidad — el `DATABASE_URL` usado debe ser siempre de una instancia descartable (local o una BD de prueba de DO separada de la definitiva), nunca la cadena de conexión del proyecto Supabase compartido ni, más adelante, la de producción DO. Cada ejecución de prueba debería dejar registrado en el reporte de trazabilidad correspondiente **contra qué entorno se corrió** (por nombre, no por valor de conexión).

---

## 5. Estrategia de variables

**[Confirmado por archivo]** El `.gitignore` raíz ya excluye `.env` y `.env.*`, exceptuando explícitamente `.env.example` y `.env.*.example` (línea `!.env.*.example`). Esto significa que la convención para archivos como `.env.staging.example` o `.env.production.example` **ya está soportada por el `.gitignore` actual sin necesidad de tocarlo**.

**Estructura propuesta de archivos (nombres, no contenido real, nada de esto se crea en este turno):**

| Entorno | Backend | Frontend |
|---|---|---|
| Plantilla genérica | `apps/backend/.env.example` (ya existe) | `apps/frontend/.env.example` (ya existe) |
| Local (real, gitignored) | `apps/backend/.env` | `apps/frontend/.env.local` |
| Staging (plantilla, fase posterior) | `apps/backend/.env.staging.example` | `apps/frontend/.env.staging.example` |
| Producción (plantilla, fase posterior) | `apps/backend/.env.production.example` | `apps/frontend/.env.production.example` |

**Variables que deben existir por entorno (solo nombres, sin valores):**

Backend: `PORT`, `NODE_ENV`, `DATABASE_URL`, `DB_SSL`, `DB_SSL_REJECT_UNAUTHORIZED`, `CA_CERT_PATH`, `JWT_SECRET`, `FRONTEND_URL`, `ALLOWED_ORIGINS`, `SESSION_COOKIE_DOMAIN`, `GEMINI_API_KEY` (opcional), `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM` (opcionales).

Frontend: `NEXT_PUBLIC_API_BASE_URL`.

**[Confirmado por código — hallazgo importante para staging]** `apps/backend/src/config/env.js` solo distingue dos estados reales: `NODE_ENV === 'production'` vs. cualquier otro valor. `apps/backend/src/app.js` y `middlewares/auth.js` usan ese mismo booleano para decidir si se permite el bypass de CORS para IPs privadas/localhost, y `session-cookie.js` usa exactamente esa condición para decidir si la cookie lleva `Secure` y `SameSite=None` vs `SameSite=Lax` sin `Secure`. **Consecuencia directa:** si staging se configura con `NODE_ENV=staging` (un tercer valor, pensando que es "distinto de producción"), el código lo trataría como entorno no-productivo — reactivando el bypass de CORS para IPs privadas y cookies sin `Secure`/`SameSite=None`. **Recomendación derivada de esto:** staging debe usar `NODE_ENV=production` para heredar el mismo comportamiento de seguridad que producción real; diferenciar staging de producción debe hacerse con otras variables (dominio, `DATABASE_URL`), no con `NODE_ENV`, salvo que se decida ampliar ese gating en el código — lo cual sería un cambio de código, fuera de alcance de este documento.

---

## 6. Estrategia para agentes

**[Confirmado]** Hoy `config/env.js` no distingue "agente" de "humano" — cualquier proceso que lea el `.env` del backend usa el mismo `DATABASE_URL`, sea quien sea quien lo ejecute. La separación segura depende de **convención de proceso**, no de código.

**Cómo permitir a los agentes analizar/probar sin tocar Supabase remoto:**
- Por defecto, cualquier `.env` que un agente use en su entorno de trabajo debe apuntar a la instancia **local** (Docker Postgres u opción Supabase CLI local), nunca al `DATABASE_URL` de dev online, salvo que una tarea lo requiera explícitamente y quede aprobada por el usuario.
- Los reportes de `docs/working/reports/` deben declarar contra qué entorno corrió cada validación (ver plantilla de INFRA-01), de forma que quede trazable si alguna vez se corrió algo contra dev online por error.

**Comandos que se consideran seguros (contra local/descartable, o de solo lectura):**
- `npm run test --workspace @ripnel/backend` apuntando a `DATABASE_URL` local.
- `psql "$LOCAL_DATABASE_URL" -f database/validate_permissions.sql` (y los otros `validate_*.sql`) — son de solo lectura por diseño.
- `supabase db reset` **solo si se corre contra la instancia local** (por diseño de la CLI, este comando opera sobre el contenedor local, no sobre el proyecto remoto linkeado).
- Lectura de migraciones, seeds y documentación; `git status`, `git diff` de solo lectura.

**Comandos que requieren aprobación explícita antes de ejecutarse:**
- Cualquier comando que use el `DATABASE_URL` de Supabase remoto (dev online) o de DO (staging/producción).
- `supabase db push` — aplica cambios contra el proyecto remoto ya linkeado (confirmado por la existencia de `supabase/.temp/`, que indica que el CLI está vinculado a un proyecto real).
- Cualquier `psql`/aplicación de migración contra staging o producción.
- Creación, modificación o destrucción de recursos reales en DigitalOcean (Droplets, bases de datos administradas).
- `git push`, `git commit` (ya cubierto por las reglas generales de la sesión, se reitera aquí por completitud).

**Cómo documentar trazabilidad sin perder contexto:** mantener el patrón ya usado por el repo en `docs/working/reports/` (IDs `INFRA-NN`, plantilla con Objetivo / Alcance / No tocar / Riesgos / Resultado, tal como en `IMPLEMENTATION-TRACKER.md` y en `INFRA-01`), agregando siempre una línea explícita de "Entorno usado: local | dev online | staging | producción" en cada entrada donde se haya ejecutado algo contra una base de datos real.

---

## 7. Recomendación final

**Qué hacer primero:**
1. Decidir formalmente Opción A vs. B de BD local (recomendado: A — Docker Compose, un solo servicio Postgres) y crear los archivos correspondientes en una fase dedicada, separada de este documento de evaluación.
2. Actualizar en una fase posterior `README.md` y `docs/deploy.md` para reflejar explícitamente que Supabase es hoy "dev/online", no producción — hoy ambos documentos describen a Supabase como si fuera la base de datos sin matizar esa distinción, lo cual puede confundir a futuros lectores o agentes.
3. Incorporar la fila de "Local" y "Dev online" al checklist de variables de la Fase 2 de INFRA-01, que hoy solo contempla staging/producción.

**Qué postergar:**
- Toda creación de `docker-compose.yml`/`Dockerfile`, tanto para la BD local como para la app (sigue correspondiendo a fases posteriores, incluida la Fase 7 opcional de INFRA-01).
- Staging y producción reales en DigitalOcean (siguen dependiendo de las Fases 3-5 de INFRA-01, sin cambios por este documento).
- Introducir `NODE_ENV=staging` como tercer estado — usar `NODE_ENV=production` para staging hasta que se revise deliberadamente ese gating en el código.

**Qué archivo de reporte debería existir:** este mismo, `docs/working/reports/INFRA-02-environments-plan.md`, como plan de entornos complementario a `INFRA-01-do-deployment-plan.md`.

**Qué fase vendría después:** una fase dedicada a "BD local" (creación de `docker-compose.local.yml` con el servicio Postgres único + validación de paridad contra lo que ya usa CI) que se inserta **antes o en paralelo** a la Fase 3 (staging) de INFRA-01, sin reemplazar ninguna fase existente de ese documento.

---

## Registro de decisiones y hallazgos

| Fecha | Tema | Hallazgo / decisión | Estado |
|---|---|---|---|
| 2026-07-08 | Alcance de Supabase | Usuario aclara que Supabase remoto es solo dev/test, sin datos críticos de producción; confirmado además por comentarios preexistentes en `database/seed_operational_demo.sql` y `seed_operational_30_days.sql` | Documentado |
| 2026-07-08 | BD local | `supabase/config.toml` ya está listo para `supabase start` sin cambios; se recomienda igualmente Docker Compose Postgres-only como estándar por paridad con CI y con el destino DO | Documentado; decisión de implementación pendiente |
| 2026-07-08 | `NODE_ENV` en staging | El código solo distingue `production` vs. no-producción; usar `NODE_ENV=production` en staging para no reactivar el bypass de CORS/cookies pensado para desarrollo | Documentado; pendiente de aplicar en la fase de staging |
