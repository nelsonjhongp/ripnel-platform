# INFRA-03-B: Validación de migraciones en PostgreSQL local

> Fecha: 2026-07-08 | Depende de: `docs/working/reports/INFRA-03-local-postgres.md` (INFRA-03-A)
>
> Estado: **Resuelto — 24 de 24 migraciones aplicadas correctamente** tras corregir `supabase/migrations/202604010001_create_user_function.sql` (ver sección 9). No se tocó Supabase remoto ni DigitalOcean. No se modificó código de backend/frontend. No se modificó ninguna otra migración. No se hizo `git add` ni commit.
>
> Las secciones 1-8 documentan el primer intento (fallido) tal como ocurrió, como registro de auditoría. La sección 9 documenta la corrección aplicada y el segundo intento (exitoso).

## 1. Estado del contenedor local

```
docker compose -f docker-compose.local.yml up -d
→ Container ripnel-postgres-local Running

docker compose -f docker-compose.local.yml ps
NAME                     IMAGE                    STATUS                        PORTS
ripnel-postgres-local    pgvector/pgvector:pg17   Up About a minute (healthy)   0.0.0.0:5433->5432/tcp
```

Healthcheck en estado `healthy`. Conectividad confirmada:

```
docker exec ripnel-postgres-local psql -U ripnel_local_dev -d ripnel_local -c "select version();"
→ PostgreSQL 17.10 (Debian 17.10-1.pgdg12+1) on x86_64-pc-linux-gnu
```

Confirmado: motor **PostgreSQL 17.10**, coherente con la imagen `pgvector/pgvector:pg17` elegida en INFRA-03-A y con la paridad buscada respecto a Supabase remoto (17.6.1.084).

Base `ripnel_local` verificada vacía antes de aplicar migraciones (`\dt` → "Did not find any relations"), como se documentó explícitamente en INFRA-03-A.

## 2. Comando usado para aplicar migraciones

Cada archivo de `supabase/migrations/` se aplicó, en orden alfabético/cronológico por nombre, con:

```bash
docker exec -i ripnel-postgres-local psql -U ripnel_local_dev -d ripnel_local -v ON_ERROR_STOP=1 -f - < "<archivo>.sql"
```

`ON_ERROR_STOP=1` garantiza que el proceso se detenga y devuelva código de salida distinto de cero ante el primer error dentro de cada script — necesario porque `psql` por defecto continúa ejecutando sentencias tras un error.

## 3. Lista de migraciones — resultado por archivo

| # | Archivo | Resultado |
|---|---|---|
| 1 | `202603250001_ripnel_mvp_v2.sql` | OK |
| 2 | `202603310001_auth_username_rbac.sql` | OK |
| 3 | `202604010001_create_user_function.sql` | **FALLÓ** — ejecución detenida aquí |
| 4-24 | (resto de migraciones, desde `202604170001_add_sales_receipts.sql` hasta `202607040004_fix_audit_trigger_tg_relid.sql`) | **No intentadas** — el proceso se detuvo en el primer fallo, tal como exige el alcance de esta fase |

## 4. Resultado final

**Validación incompleta.** 2 de 24 migraciones se aplicaron limpias contra PostgreSQL 17 local. La tercera migración falla de forma reproducible por una dependencia de plataforma Supabase que no existe en un Postgres vanilla (local o, previsiblemente, DigitalOcean Managed PostgreSQL). El resto de las migraciones (21) queda sin probar hasta resolver este bloqueo.

## 5. Fallo encontrado

**Archivo exacto:** `supabase/migrations/202604010001_create_user_function.sql`

**Línea / sentencia:**
```sql
-- línea 57
GRANT EXECUTE ON FUNCTION create_user_with_password(VARCHAR, VARCHAR, VARCHAR, VARCHAR, UUID) TO anon, authenticated;
```

**Error exacto devuelto por PostgreSQL:**
```
CREATE FUNCTION
psql:<stdin>:57: ERROR:  role "anon" does not exist
```

(La función `create_user_with_password` sí se creó correctamente — línea 17-54 — el fallo ocurre específicamente en el `GRANT` de la línea 57.)

**Causa probable:** `anon` y `authenticated` son roles de PostgreSQL que **Supabase provisiona automáticamente a nivel de plataforma** (usados por su capa PostgREST/GoTrue para clientes anónimos y autenticados vía API REST/RPC). No son roles estándar de PostgreSQL ni están creados por ninguna otra migración de este repo — se confirmó por búsqueda que ninguna de las 24 migraciones contiene `CREATE ROLE anon` ni `CREATE ROLE authenticated`. En un Postgres vanilla (este contenedor local, y previsiblemente DigitalOcean Managed PostgreSQL) esos roles simplemente no existen, por lo que el `GRANT` falla.

El comentario en la línea 56 del propio archivo (`/* Permitir que clientes anónimos ejecuten esta función (para Supabase) */`) confirma que esta sentencia fue escrita explícitamente pensando en el modelo de acceso de Supabase (RPC anónimo vía PostgREST), no en el modelo de autenticación propio del backend (JWT + cookies, ya confirmado en el diagnóstico de INFRA-01/02 que el backend no usa `auth.uid()` ni RLS de Supabase para el resto del esquema).

**Alcance del hallazgo:** se verificó por búsqueda (`grep` de `anon`, `authenticated`, `service_role`, `supabase_admin`) que esta es la **única** ocurrencia de roles Supabase-específicos en las 24 migraciones — no es un patrón repetido, es un caso aislado en un único archivo.

**Opciones de corrección (ninguna aplicada — pendiente de autorización):**

1. **Bootstrap de roles antes de migrar:** crear manualmente `anon` y `authenticated` como roles vacíos (`CREATE ROLE anon; CREATE ROLE authenticated;`) antes de aplicar esta migración en cualquier entorno no-Supabase (local, staging DO, producción DO). Mantiene la migración intacta tal como está versionada; agrega un paso de bootstrap documentado por entorno.
2. **Hacer el GRANT condicional dentro de la migración:** envolver la línea 57 en un bloque `DO $$ ... IF EXISTS (SELECT FROM pg_roles WHERE rolname IN ('anon','authenticated')) THEN GRANT ... END IF; END $$;` — evita el error si los roles no existen, sin afectar el comportamiento en Supabase real donde sí existen. Esto **sí modificaría la migración**, por lo que requiere autorización explícita antes de tocarla.
3. **Retirar ese `GRANT` específico** si la función `create_user_with_password` ya no se invoca vía RPC anónimo de Supabase desde el frontend (a confirmar — el backend actual crea usuarios vía su propia capa de autorización, no vía llamada RPC directa del cliente). Requiere confirmar primero si algo en el código todavía depende de ese acceso anónimo antes de considerar esta opción.
4. **Aceptar el bootstrap manual como parte del proceso de deploy** hacia DigitalOcean Managed PostgreSQL (documentarlo en INFRA-01/INFRA-02 como paso previo a aplicar migraciones), sin tocar el archivo de migración en absoluto.

No se aplicó ninguna de estas opciones. La migración `202604010001_create_user_function.sql` permanece exactamente como estaba.

## 6. Validaciones mínimas realizadas

- Contenedor `ripnel-postgres-local` levantado y confirmado `healthy` vía `docker compose ps`.
- Conectividad `psql` confirmada (`select version()` → PostgreSQL 17.10).
- Base `ripnel_local` confirmada vacía antes de iniciar (`\dt` sin relaciones).
- Aplicación secuencial de migraciones con `ON_ERROR_STOP=1` para detección temprana de fallos (evita continuar con un esquema parcialmente corrupto).
- Búsqueda exhaustiva de roles Supabase-específicos (`anon`, `authenticated`, `service_role`, `supabase_admin`) en las 24 migraciones para determinar si el fallo es aislado o sistémico — confirmado aislado a un único archivo.
- No se corrieron los scripts `database/validate_*.sql` todavía — no tiene sentido validarlos contra un esquema aplicado solo parcialmente (2 de 24 migraciones).

## 7. Siguiente fase recomendada

Antes de continuar con seeds locales, backend apuntando a la BD local, o tests backend contra la BD local, es necesario **resolver el bloqueo de la migración 3/24** — ninguna de esas tres tareas tiene sentido con un esquema incompleto. Orden sugerido:

1. **Decisión sobre el hallazgo de la sección 5** (elegir una de las 4 opciones, o una distinta) — requiere tu autorización explícita antes de tocar `202604010001_create_user_function.sql` o de crear un paso de bootstrap.
2. **Reintentar la aplicación de las 24 migraciones** desde donde quedó (o desde cero, reseteando el volumen) una vez resuelto el bloqueo — continuaría siendo parte de INFRA-03-B o se abriría INFRA-03-B (continuación) según se prefiera nombrarlo.
3. **Seeds locales** (`database/seed_test_users.sql`, `supabase/seed.sql`, etc.) — solo después de que las 24 migraciones apliquen limpias.
4. **Backend apuntando a la BD local** (`DATABASE_URL` local documentado en INFRA-03-A) — solo después de seeds mínimos disponibles.
5. **Tests backend contra la BD local** (`npm run test --workspace @ripnel/backend`) — última validación, una vez esquema + seeds + conexión estén confirmados.

## 8. `git status --short` final

```
?? docker-compose.local.yml
?? docs/working/reports/INFRA-01-do-deployment-plan.md
?? docs/working/reports/INFRA-02-environments-plan.md
?? docs/working/reports/INFRA-03-B-local-migrations.md
?? docs/working/reports/INFRA-03-local-postgres.md
```

No se ejecutó `git add` ni commit. La migración `supabase/migrations/202604010001_create_user_function.sql` no aparece como modificada porque no fue tocada.

---

## 9. Corrección aplicada y segundo intento

**Decisión tomada (por el usuario):** corregir directamente la migración existente `202604010001_create_user_function.sql`, en vez de crear roles bootstrap `anon`/`authenticated` o agregar una migración `REVOKE` posterior. Justificación: la auditoría previa confirmó que `create_user_with_password` no es llamada por backend, frontend, tests ni docs — el backend crea usuarios con SQL propio en `apps/backend/src/modules/users/users.repo.js` (`insertUser`), y el frontend tiene el cliente Supabase deshabilitado (`lib/supabase.ts`). El `GRANT` era legado de una etapa Supabase-RPC ya no vigente.

### Cambio aplicado en la migración

Archivo modificado: `supabase/migrations/202604010001_create_user_function.sql` (único archivo tocado, tal como exigía el alcance).

**Antes (línea 56-57):**
```sql
/* Permitir que clientes anónimos ejecuten esta función (para Supabase) */
GRANT EXECUTE ON FUNCTION create_user_with_password(VARCHAR, VARCHAR, VARCHAR, VARCHAR, UUID) TO anon, authenticated;
```

**Después:**
```sql
/* Legado: función no expuesta por RPC. El backend crea usuarios con SQL
   propio en apps/backend/src/modules/users/users.repo.js (insertUser).
   Se revoca el acceso por defecto de PUBLIC a esta función SECURITY DEFINER
   para que no quede ejecutable sin permiso explícito. */
REVOKE ALL ON FUNCTION create_user_with_password(
  VARCHAR,
  VARCHAR,
  VARCHAR,
  VARCHAR,
  UUID
) FROM PUBLIC;
```

La función (`CREATE OR REPLACE FUNCTION create_user_with_password(...)`, líneas 17-54) **no se modificó** — mantiene exactamente la misma lógica. Solo se retiró el `GRANT` a roles Supabase-específicos y se agregó un `REVOKE ALL ... FROM PUBLIC` explícito para que la función `SECURITY DEFINER` no quede ejecutable por el privilegio por defecto de `PUBLIC` sobre funciones nuevas.

**Nota importante — alcance real de esta corrección:** editar el archivo de migración versionado en el repo **solo afecta a entornos nuevos que reconstruyan el historial de migraciones desde cero** (como el PostgreSQL local de INFRA-03-A/B). Una instancia Supabase remota donde `202604010001_create_user_function.sql` **ya fue aplicada previamente** no vuelve a ejecutar ese archivo automáticamente solo porque el archivo cambió en el repo — las migraciones de Supabase corren una sola vez por proyecto. Esto significa que, salvo que se aplique una acción explícita contra esa base remota, **el `GRANT EXECUTE ... TO anon, authenticated` original probablemente sigue vigente ahí**, y la función `create_user_with_password` podría seguir siendo ejecutable por esos roles en el entorno Supabase remoto ya existente. Si en algún momento se decide cerrar ese permiso también en Supabase remoto, debe hacerse mediante una acción o **migración nueva, explícitamente aprobada** (por ejemplo, un `REVOKE` versionado con fecha posterior) — **no implementada en esta fase**.

### Reset y reintento

```bash
docker compose -f docker-compose.local.yml down -v   # elimina contenedor + volumen local
docker compose -f docker-compose.local.yml up -d     # recrea desde cero, base ripnel_local vacía
```

Contenedor confirmado `healthy` tras el reinicio. Se reaplicaron las 24 migraciones con el mismo comando y el mismo criterio de parada (`ON_ERROR_STOP=1`) que en el primer intento (sección 2).

### Resultado del segundo intento

| # | Archivo | Resultado |
|---|---|---|
| 1-24 | Las 24 migraciones, desde `202603250001_ripnel_mvp_v2.sql` hasta `202607040004_fix_audit_trigger_tg_relid.sql`, incluida la corregida `202604010001_create_user_function.sql` y la que usa `pgvector` (`202606010001_chatbot_module.sql`) | **OK — todas aplicaron sin error** |

**Resultado final: 24 de 24 migraciones aplicadas correctamente.** No aparecieron fallos adicionales.

### Validaciones adicionales realizadas

```
docker exec ripnel-postgres-local psql -U ripnel_local_dev -d ripnel_local -c "\dx"
```
```
   Name   | Version |   Schema   |                     Description
----------+---------+------------+------------------------------------------------------
 pgcrypto | 1.3     | public     | cryptographic functions
 plpgsql  | 1.0     | pg_catalog | PL/pgSQL procedural language
 vector   | 0.8.4   | public     | vector data type and ivfflat and hnsw access methods
```

```
select count(*) as table_count from information_schema.tables where table_schema='public';
→ 43
```

Confirmado: las extensiones `pgcrypto` y `vector` quedaron instaladas (esta última gracias a la imagen `pgvector/pgvector:pg17` elegida en INFRA-03-A), y el esquema completo de Ripnel (43 tablas) se creó sin intervención manual adicional.

### Siguiente fase recomendada (actualizada)

El bloqueo está resuelto. El orden sugerido en la sección 7 se mantiene, con el paso 1-2 ya completados:

1. ~~Decisión sobre el hallazgo~~ — resuelto (esta sección).
2. ~~Reintentar aplicación de las 24 migraciones~~ — resuelto, 24/24 OK.
3. **Seeds locales** (`database/seed_test_users.sql`, `supabase/seed.sql`, etc.) — siguiente paso natural (INFRA-03-C).
4. **Backend apuntando a la BD local** (`DATABASE_URL` documentado en INFRA-03-A) — después de seeds mínimos.
5. **Tests backend contra la BD local** (`npm run test --workspace @ripnel/backend`) — última validación de esta serie de fases.

### `git status --short` final (tras la corrección)

```
 M supabase/migrations/202604010001_create_user_function.sql
?? docker-compose.local.yml
?? docs/working/reports/INFRA-01-do-deployment-plan.md
?? docs/working/reports/INFRA-02-environments-plan.md
?? docs/working/reports/INFRA-03-B-local-migrations.md
?? docs/working/reports/INFRA-03-local-postgres.md
```

No se ejecutó `git add` ni commit.
