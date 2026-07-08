# INFRA-03-A: PostgreSQL local con Docker

> Fecha: 2026-07-08 | Depende de: `docs/working/reports/INFRA-01-do-deployment-plan.md`, `docs/working/reports/INFRA-02-environments-plan.md`
>
> Corrección de decisión respecto a INFRA-02: la imagen local es **`pgvector/pgvector:pg17`**, no `postgres:16-alpine` ni `pgvector/pgvector:pg16`. Ver justificación abajo.
>
> Estado: **Implementado (solo el compose de BD local)** — sin migraciones ni seeds aplicados todavía. No se tocó Supabase remoto ni DigitalOcean. No se ejecutó ningún comando en esta fase.

## Propósito de INFRA-03-A

Dar al equipo y a los agentes una base de datos PostgreSQL local, aislada y descartable, para desarrollo y pruebas rápidas, sin depender de red ni de la instancia Supabase remota compartida. Esta fase entrega únicamente la infraestructura de la base de datos vacía (`docker-compose.local.yml`); no aplica todavía el esquema de Ripnel.

**Por qué evita tocar Supabase remoto:** hoy cualquier prueba, test de integración o experimento de esquema que necesite una base de datos real solo tiene como opción el `DATABASE_URL` de Supabase (dev online, compartido por todo el equipo — ver INFRA-02, sección 1). Con `ripnel-postgres-local` corriendo en `localhost:5433`, cualquier desarrollador o agente puede apuntar su `DATABASE_URL` local a este contenedor, romper y resetear el volumen cuantas veces necesite, sin colisionar con el trabajo de otros ni generar tráfico contra el proyecto Supabase compartido. Es la instancia "segura por defecto" descrita en la sección 6 de INFRA-02 (comandos seguros para agentes).

## Corrección de imagen respecto a INFRA-02 (justificación)

| Factor | Decisión |
|---|---|
| Supabase remoto actual corre PostgreSQL **17** (confirmado: `supabase/.temp/postgres-version` = `17.6.1.084`; `supabase/config.toml` declara `major_version = 17`) | Requiere paridad de major version → **17**, no 16 |
| Destino futuro preferente es DigitalOcean Managed PostgreSQL **17** (ver INFRA-01/INFRA-02, recomendación de sesión anterior) | Refuerza **17** |
| Existe una migración con `CREATE EXTENSION IF NOT EXISTS vector` (`supabase/migrations/202606010001_chatbot_module.sql`) | Requiere una imagen con **pgvector** precompilado, no la imagen oficial `postgres` a secas |
| CI (`.github/workflows/ci.yml`) usa `postgres:16-alpine`, pero **no aplica el set completo de migraciones** (no hay paso de migración en el workflow, y ningún test referencia `vector`/`chatbot`) | La versión de CI no es una restricción real para la BD local en esta fase — CI se ajustará por separado si en el futuro valida migraciones completas (fuera de alcance de INFRA-03-A) |

**Imagen elegida: `pgvector/pgvector:pg17`.**

## Contenido de `docker-compose.local.yml`

Archivo nuevo en la raíz del repo. Un único servicio:

- **Imagen:** `pgvector/pgvector:pg17`
- **Contenedor:** `ripnel-postgres-local`
- **Base/usuario/password:** `ripnel_local`, `ripnel_local_dev`, `ripnel_local_dev_only` — valores dev-only, hardcodeados a propósito en el compose porque son para un contenedor local descartable, no un secreto real ni reutilizable fuera de esta máquina.
- **Puerto:** `5433` (host) → `5432` (contenedor) — deliberadamente distinto del `5432` estándar para no chocar con un Postgres nativo que pudiera existir en la máquina del desarrollador.
- **Volumen persistente:** `ripnel_postgres_local_data` (named volume de Docker) montado en `/var/lib/postgresql/data`.
- **Healthcheck:** `pg_isready -U ripnel_local_dev -d ripnel_local`, cada 5s, 5 reintentos.
- **Sin otros servicios:** no incluye backend, frontend, Nginx, Redis ni ningún otro componente — solo la base de datos, tal como se pidió.

## Comandos sugeridos (no ejecutados en esta fase)

**Levantar la BD:**
```
docker compose -f docker-compose.local.yml up -d
```

**Ver estado / esperar healthcheck:**
```
docker compose -f docker-compose.local.yml ps
```

**Ver logs:**
```
docker compose -f docker-compose.local.yml logs -f postgres
```

**Detener la BD (conserva el volumen/datos):**
```
docker compose -f docker-compose.local.yml stop
```

**Detener y remover el contenedor (conserva el volumen/datos):**
```
docker compose -f docker-compose.local.yml down
```

**Resetear el volumen (borra todos los datos locales, para empezar de cero):**
```
docker compose -f docker-compose.local.yml down -v
```

## `DATABASE_URL` local de ejemplo (sin secretos reales)

```
DATABASE_URL=postgresql://ripnel_local_dev:ripnel_local_dev_only@localhost:5433/ripnel_local
DB_SSL=false
```

Estos valores coinciden exactamente con las credenciales dev-only definidas en `docker-compose.local.yml` — no son secretos, son la configuración pública de un contenedor local descartable. `DB_SSL=false` porque el Postgres local no expone TLS (coherente con el comentario ya existente en `apps/backend/.env.example`: *"Set DB_SSL=false only for local Postgres without SSL"*).

## Cómo apuntaría el backend a esta BD (fase posterior, no en INFRA-03-A)

En una fase posterior, un desarrollador o agente que quiera usar esta BD local copiaría `apps/backend/.env.example` a `apps/backend/.env` (archivo real, gitignored, **no creado en esta fase**) y reemplazaría `DATABASE_URL` y `DB_SSL` por los valores de la sección anterior. Ningún archivo `.env` real fue creado, leído ni modificado en INFRA-03-A — esta sección es solo referencia para cuando se ejecute INFRA-03-B.

## Estado del esquema — explícito

**Todavía NO se aplican migraciones ni seeds en esta fase.** El contenedor `ripnel-postgres-local`, una vez levantado, contendría una base `ripnel_local` **vacía** (sin las tablas de Ripnel). Aplicar `supabase/migrations/*.sql` en orden y los seeds de `database/`/`supabase/` es el objetivo de la siguiente fase.

## Siguiente fase recomendada: INFRA-03-B

Aplicar las 24 migraciones de `supabase/migrations/` en orden contra `ripnel-postgres-local`, validar con los scripts de `database/validate_*.sql`, y evaluar carga de seeds (`supabase/seed.sql`, `database/seed_test_users.sql`, etc.). INFRA-03-B es el paso que efectivamente deja la BD local usable para desarrollo/tests, y debe tratarse como su propia fase con su propio reporte, no como parte de INFRA-03-A.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Confundir el puerto local (`5433`) con el de un Postgres nativo (`5432`) ya instalado en la máquina del desarrollador | Puerto deliberadamente distinto (`5433`); documentado explícitamente en este reporte y en el propio compose |
| Usar por error las credenciales dev-only de este compose en un entorno real | Son credenciales obviamente locales (`ripnel_local_dev_only`), nunca deben aparecer en `.env` de staging/producción; queda documentado aquí y no se tocó ningún `.env` real |
| Confundir `docker-compose.local.yml` con un compose de aplicación completo | El archivo y este reporte dejan explícito que es solo BD, sin backend/frontend/Nginx |
| Volumen Docker acumulando datos obsoletos entre pruebas | Comando de reseteo (`down -v`) documentado arriba |
| Imagen `pgvector/pgvector:pg17` no disponible o con diferencias menores respecto al Postgres exacto de Supabase remoto (17.6.1.084) | Riesgo aceptado para esta fase — es paridad de *major version*, no de build exacto; se revisita si INFRA-03-B revela incompatibilidades reales al aplicar migraciones |

## Rollback

Esta fase es completamente reversible y no afecta nada fuera del repo local:

- Si el compose nunca se levanta: eliminar `docker-compose.local.yml` deja el repo exactamente como estaba.
- Si el compose se levantó: `docker compose -f docker-compose.local.yml down -v` elimina contenedor y volumen sin dejar rastro; no hay integración con Supabase remoto ni DigitalOcean que revertir, porque esta fase no los tocó.
- No se hizo `git add` ni commit — los archivos nuevos quedan como cambios locales sin trackear hasta que el usuario decida incorporarlos.

## `git status --short` (salida real, ejecutada al cierre de esta fase, antes de cualquier `git add`)

```
?? docker-compose.local.yml
?? docs/working/reports/INFRA-01-do-deployment-plan.md
?? docs/working/reports/INFRA-02-environments-plan.md
?? docs/working/reports/INFRA-03-local-postgres.md
```

Nota: esta es la salida real de `git status --short` en el momento de cerrar INFRA-03-A — únicamente los 4 archivos nuevos y no trackeados generados en esta serie de fases de infraestructura (`docker-compose.local.yml` de esta fase, más los tres reportes `INFRA-01`, `INFRA-02` e `INFRA-03`). No hay archivos modificados pendientes de sesiones anteriores en este snapshot, y no se ejecutó `git add` ni commit en ningún momento de esta fase.
