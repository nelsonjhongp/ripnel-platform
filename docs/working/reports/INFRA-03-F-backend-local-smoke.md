# INFRA-03-F: Smoke test manual del backend contra PostgreSQL local

> Fecha: 2026-07-08 | Depende de: `docs/working/reports/INFRA-03-D-local-seeds.md` (24/24 migraciones, 8/8 seeds aplicados), diagnóstico previo en conversación (INFRA-03-E: variables necesarias, `DATABASE_URL` local, riesgos de `NODE_ENV`)
>
> Estado: **Smoke test manual exitoso**, ejecutado y reportado por el usuario. Este documento registra la trazabilidad; el agente no ejecutó los comandos en esta sesión, solo los documenta a partir del resultado reportado. Working tree confirmado limpio antes de esta fase (commits de INFRA-03-C/D ya realizados y pusheados fuera de esta conversación).

## Qué se validó

Arranque del backend Express (`apps/backend/src/server.js`) con variables de entorno temporales de PowerShell (sin archivo `.env` real, sin tocar Supabase remoto ni DigitalOcean), apuntando a `ripnel-postgres-local` (contenedor Docker de INFRA-03-A, con el esquema y los seeds de INFRA-03-B/D ya aplicados). Se validaron tres puntos de la cadena completa aplicación↔BD:

1. **Conectividad real a PostgreSQL local** vía el endpoint `GET /health` (`health.controller.js`, ejecuta `select now()` contra la BD).
2. **Login funcional** contra un usuario dev-only sembrado en `database/seed_local_dev_users.sql` (INFRA-03-C3) — confirma que el `password_hash` bcrypt insertado por el seed (`crypt('LocalDevAdmin123', gen_salt('bf', 10))`) es verificable correctamente por `auth.service.js:verifyPassword`.
3. **Sesión autenticada persistente** vía `GET /api/auth/me`, usando la cookie de sesión emitida por el login — confirma que `requireAuth` (`middlewares/auth.js`) valida el JWT firmado y que la resolución de rol/permisos (`role_id` → `role_name` vía `auth.repo.js`) funciona de punta a punta contra el esquema local.

**Validación implícita adicional:** el servidor llegó a escuchar en el puerto (no abortó con `process.exit(1)`), lo que confirma que `assertCashSchemaCompatibility()` (`server.js`, se ejecuta antes de levantar el puerto) pasó sin errores — el esquema de caja del PostgreSQL local es compatible con lo que el backend espera.

## Variables de entorno usadas (temporales, no persistidas en ningún `.env`)

```
DATABASE_URL=postgresql://ripnel_local_dev:ripnel_local_dev_only@localhost:5433/ripnel_local
JWT_SECRET=<dev-only dummy secret, >=32 chars, not real>
DB_SSL=false
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

Coinciden exactamente con lo documentado en INFRA-03-A (`DATABASE_URL`/`DB_SSL`) e INFRA-03-E (`NODE_ENV=development`, para evitar el riesgo de cookies `Secure` sobre `http://localhost` señalado en esa fase). `JWT_SECRET` es un valor dev-only de ≥32 caracteres, sin relación con ningún secreto real — se omite su valor exacto en este documento porque el repositorio es público.

**Advertencia — todo lo anterior es exclusivamente local/dev, no productivo.** `DATABASE_URL` apunta únicamente a `ripnel-postgres-local` (contenedor Docker descartable de INFRA-03-A, credenciales `ripnel_local_dev` / `ripnel_local_dev_only` ya públicas en `docker-compose.local.yml` y sin acceso de red fuera de la máquina local). La contraseña `LocalDevAdmin123` usada en el login pertenece al usuario dev-only `admin` sembrado por `database/seed_local_dev_users.sql` (INFRA-03-C3), documentada allí en texto plano a propósito. Ninguno de estos valores protege nada real ni debe reutilizarse en Supabase remoto, staging o producción de DigitalOcean.

## Comandos usados (equivalentes PowerShell — patrón estándar de la sesión reportada por el usuario)

```powershell
# Variables temporales solo para este proceso/sesión de terminal
$env:DATABASE_URL   = "postgresql://ripnel_local_dev:ripnel_local_dev_only@localhost:5433/ripnel_local"
$env:JWT_SECRET     = "<dev-only dummy secret, >=32 chars, not real>"
$env:DB_SSL         = "false"
$env:NODE_ENV       = "development"
$env:FRONTEND_URL   = "http://localhost:3000"

# Arranque del backend
node apps/backend/src/server.js
```

```powershell
# 1) Healthcheck
Invoke-RestMethod -Uri http://localhost:3001/health -Method Get

# 2) Login (persistiendo cookies de sesión en $session)
Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method Post `
  -ContentType "application/json" `
  -Body '{"username":"admin","password":"LocalDevAdmin123"}' `
  -SessionVariable session

# 3) Verificación de sesión con la cookie ya emitida
Invoke-RestMethod -Uri http://localhost:3001/api/auth/me -Method Get -WebSession $session
```

*(Reconstrucción del patrón PowerShell equivalente a lo reportado; el agente no ejecutó ni presenció literalmente estos comandos en esta sesión — se documentan a partir del resultado descrito por el usuario.)*

## Resultados observados (reportados por el usuario)

**1. `GET /health`**
```json
{
  "ok": true,
  "dbTime": "2026-07-08T14:51:09.231Z"
}
```

**2. `POST /api/auth/login`** (`admin` / `LocalDevAdmin123`)
- Usuario devuelto: `admin`
- Email: `admin.localdev@ripnel.invalid`
- Rol: `ADMIN`

**3. `GET /api/auth/me`** (con la sesión de la cookie del login)
- Mismo usuario autenticado, rol `ADMIN` confirmado.

Los tres resultados coinciden exactamente con lo sembrado en INFRA-03-C3/D: usuario `admin` con email `@ripnel.invalid` (dominio reservado de pruebas) bajo el rol vigente `ADMIN`.

## Qué queda pendiente

- **Solo se probó el usuario `admin`.** No se validó login de `almacen` (rol `ALMACEN`) ni `vendedor` (rol `VENDEDOR/A`), ambos también sembrados en `database/seed_local_dev_users.sql`.
- **Solo se confirmó el nombre del rol (`ADMIN`), no el contenido del array `permissions`** devuelto por `/api/auth/me` — INFRA-03-D confirmó 24 permisos asignados a `ADMIN` a nivel de base de datos, pero no se verificó en esta fase que el payload HTTP los liste completos y correctos.
- **No se ejecutó la suite de tests automatizados del backend** (`npm run test --workspace @ripnel/backend`) contra `ripnel-postgres-local` — sigue siendo el plan pendiente descrito en INFRA-03-E, punto 7, incluida la duda sobre si algunos tests asumen una BD vacía en vez de una ya sembrada.
- **No se probó ningún flujo operativo más allá de autenticación** (por ejemplo, listar ubicaciones, consultar inventario, o un endpoint protegido por permisos específicos de `ALMACEN`/`VENDEDOR/A`) — el smoke test cubre auth de punta a punta, no operación de negocio.
- **No se probó desde un navegador real ni desde el frontend** — la llamada fue directa vía `Invoke-RestMethod`, no a través de `apps/frontend` corriendo en `localhost:3000`, por lo que el comportamiento real de CORS + cookies cross-origin en un navegador (`credentials: "include"`, `SameSite=Lax`) sigue sin validarse en esta fase.
- **Las variables de entorno fueron temporales de terminal**, no se creó ningún `apps/backend/.env` — sigue pendiente la decisión (ya planteada en INFRA-03-E, punto 3) de si conviene crear un `.env.local.example` pre-rellenado o mantener solo la documentación.

## `git status --short` final

```
(working tree limpio — este reporte quedó trackeado en un commit posterior)
```

Commit posterior en que se incluyó este archivo. No se tocó código, seeds ni migraciones en esta fase.
