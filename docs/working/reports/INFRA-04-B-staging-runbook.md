# INFRA-04-B: Runbook operativo de staging en DigitalOcean

> Fecha: 2026-07-08 | Depende de: `docs/working/reports/INFRA-04-A-do-readiness-audit.md`, `docs/working/reports/INFRA-01-do-deployment-plan.md`, `docs/working/reports/INFRA-02-environments-plan.md`, serie `INFRA-03-A` a `INFRA-03-H`
>
> Estado: **Documento solo lectura/planificación.** No se creó ningún recurso en DigitalOcean, no se tocó Supabase remoto, no se modificó código, seeds ni migraciones. No se ejecutó `git add` ni commit. Todos los comandos de este runbook son **para ejecución futura, bajo autorización explícita** — ninguno se corrió en esta sesión.
>
> **Advertencia — repo público.** Ningún valor de este documento es un secreto real. Todas las contraseñas, cadenas de conexión y dominios son placeholders (`<ENTRE_CORCHETES>`) a reemplazar en el momento de la ejecución real, fuera del repositorio.
>
> **Ajeno a este runbook:** el working tree actual tiene cambios de un trabajo paralelo de frontend (búsqueda/POS — `apps/frontend/hooks/use-debounced-api-search.ts`, `use-product-search.ts`, `use-replacement-search.ts`, `transfers-request-page.tsx`, `transfers-shared.tsx`, `inventory-adjustments-create-page.tsx`, y los reportes `PRODUCT-SEARCH-01-*`/`FRONTEND-STRUCTURE-01-*`). No forman parte de INFRA-04-B y no deben incluirse en el primer despliegue de staging sin una decisión explícita aparte (ver INFRA-04-A, riesgo #4).

## 1. Objetivo de staging

Tener un entorno accesible por red, separado de Supabase remoto (dev online) y de cualquier futura producción, que reproduzca la topología real de destino (Droplet + Nginx + PostgreSQL administrado) para validar el proceso de deploy, migraciones y operación básica antes de comprometerse con producción. Staging **no** contiene datos reales ni usuarios reales — es infraestructura de validación, no un entorno de negocio.

## 2. Arquitectura propuesta

Decisiones base ya fijadas por el usuario para esta fase:

```
Internet
   │
   ▼
Nginx (Droplet único, reverse proxy + TLS)
   │
   ├── /health, /api/*  → Backend Express (proceso Node vía PM2, puerto 3001)
   └── /  (todo lo demás) → Frontend Next.js (proceso Node vía PM2, `next start`, puerto 3000)
                                   │
                                   ▼
                         DigitalOcean Managed PostgreSQL 17
                         (instancia separada del Droplet)
```

- **Un solo Droplet** para frontend + backend (ambos procesos Node, gestionados por PM2).
- **Same-origin**: frontend en `/`, backend detrás de `/api` y `/health`, mismo dominio — sin necesidad de CORS cross-origin ni de `NEXT_PUBLIC_API_BASE_URL` (ver sección 6).
- **Build del frontend in-situ** en el Droplet (`next build` se ejecuta ahí mismo, no en CI).
- **Base de datos separada**: DigitalOcean Managed PostgreSQL 17, con acceso restringido por IP del Droplet ("trusted sources").

## 3. Checklist de creación de DO Managed PostgreSQL

- [ ] **Versión:** PostgreSQL **17** (paridad con Supabase remoto `17.6.1.084` y con el Postgres local `pgvector/pgvector:pg17`, confirmado en INFRA-03-C2/03-A).
- [ ] **Región:** la más cercana a la región donde se cree el Droplet (misma región DO recomendable, para latencia y para que el tráfico BD↔Droplet no salga a internet).
- [ ] **Usuario/BD:** crear un usuario y una base de datos dedicados para staging (no reutilizar el usuario admin por defecto del clúster para la app). Nombre sugerido: BD `ripnel_staging`, usuario `ripnel_staging_app` — placeholders, a decidir en el momento.
- [ ] **Trusted sources:** restringir el acceso de red de la instancia Managed PostgreSQL **solo a la IP del Droplet de staging** (feature nativa de DO) — nunca dejar el acceso abierto a `0.0.0.0/0`.
- [ ] **SSL/CA:** confirmar en el panel de DO si el certificado del clúster requiere `CA_CERT_PATH` explícito en el backend o si su cadena ya es reconocida por el store de certificados del sistema operativo del Droplet. Descargar el certificado CA desde el panel de DO si se provee, y guardarlo fuera del repo (ver sección 5).
- [ ] **Validación de `vector` — primer check técnico, antes de aplicar cualquier migración:**
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
  ```
  Si falla o no devuelve fila: decidir de inmediato si se posterga el módulo `chatbot` (única migración que la usa, `202606010001_chatbot_module.sql`) antes de continuar con el resto del pipeline.

## 4. Checklist de creación del Droplet

- [ ] **SO recomendado:** Ubuntu LTS más reciente disponible en el catálogo de imágenes de DO al momento de crear el Droplet (no se fija una versión exacta aquí porque cambia con el tiempo; elegir la LTS vigente en DO).
- [ ] **Node/npm:** instalar **Node 20.x** — es la versión que ya usa `.github/workflows/ci.yml` (`node-version: 20`) para correr los tests del backend y frontend, la elección más coherente con lo que ya se valida en CI. Instalar vía NodeSource o `nvm`, no vía el paquete `nodejs` genérico de `apt` (suele quedar desactualizado).
- [ ] **Git:** instalar para poder clonar el repo (`apt install git`).
- [ ] **Nginx:** instalar como reverse proxy (`apt install nginx`), configurar el server block de staging (sección 7) y certificado TLS (Let's Encrypt/certbot, fuera del detalle de este runbook — INFRA-01 ya lo contemplaba).
- [ ] **PM2:** instalar globalmente (`npm install -g pm2`), configurar `pm2 startup` para persistencia tras reinicios del Droplet.
- [ ] **Firewall:** `ufw allow OpenSSH`, `ufw allow 'Nginx Full'` (80/443), `ufw enable`. Los puertos 3000/3001 (backend/frontend) **no deben exponerse directamente** — solo Nginx debe alcanzarlos, vía `localhost`.
- [ ] **Directorios de app/logs:** ejecutar la app bajo un usuario no-root dedicado (p. ej. `ripnel`), con el repo clonado en `/home/ripnel/ripnel-platform` (o `/opt/ripnel-platform`, a decidir) y logs de PM2 en su ubicación por defecto (`~/.pm2/logs/`) o redirigidos a `/var/log/ripnel/` si se prefiere centralizarlos — decisión abierta, no bloqueante para el primer corte.

## 5. Variables de entorno de backend para staging (placeholders)

```
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://<STAGING_DB_USER>:<STAGING_DB_PASSWORD>@<STAGING_DB_HOST>:<STAGING_DB_PORT>/<STAGING_DB_NAME>?sslmode=require
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
CA_CERT_PATH=/home/ripnel/certs/do-staging-ca.crt   # solo si DO Managed PostgreSQL lo requiere (confirmar en el panel, sección 3)
JWT_SECRET=<STAGING_JWT_SECRET_32_CHARS_MINIMO_GENERADO_APARTE>
FRONTEND_URL=https://<STAGING_DOMAIN>
SESSION_COOKIE_DOMAIN=
GEMINI_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

**`NODE_ENV=production`** — no `staging`, reconfirmando el hallazgo de INFRA-02: el código solo distingue `production` vs. cualquier otro valor (CORS dev-bypass, `SameSite`/`Secure` de cookies); usar un tercer valor reactivaría comportamiento pensado solo para desarrollo local.

Este archivo `.env` se crea **directamente en el Droplet**, fuera del repositorio clonado (o excluido por `.gitignore`, que ya cubre `.env`/`.env.*` salvo los `.example`) — nunca se commitea, nunca se pega en un reporte con valores reales.

## 6. Variables de entorno de frontend para staging (placeholders)

```
NEXT_PUBLIC_API_BASE_URL=
```

**Se recomienda dejarla vacía/sin definir**, igual que el Modo A ya validado en `INFRA-03-G`: con same-origin (`/` para frontend, `/api`+`/health` para backend, mismo dominio detrás de Nginx), `lib/api.ts` usa rutas relativas y `credentials: "same-origin"` — no hace falta ninguna URL absoluta ni hay CORS cross-origin que gestionar. Si en el futuro se decide separar frontend/backend en subdominios distintos (`app.`/`api.`, ya evaluado en INFRA-01), esta variable pasaría a ser obligatoria — no es el caso de este runbook.

## 7. Orden exacto de despliegue

1. **Clonar el repo** en el Droplet (usuario no-root dedicado):
   ```bash
   git clone https://github.com/nelsonjhongp/ripnel-platform.git
   cd ripnel-platform
   ```
2. **Instalar dependencias** (monorepo con workspaces):
   ```bash
   npm ci
   ```
3. **Configurar `.env` fuera del repo** (o en `apps/backend/.env`, ya cubierto por `.gitignore`) con los valores de la sección 5 — nunca commiteado.
4. **Validar conexión a la BD** antes de tocar el esquema:
   ```bash
   psql "$DATABASE_URL" -c "select version();"
   ```
   Seguido del check de `vector` de la sección 3, **antes** de aplicar ninguna migración.
5. **Aplicar las 25 migraciones** (orden y comando patrón en la sección 8).
6. **Crear el admin seguro** manualmente (sección 9) — **no** se aplica ningún seed dev-only (Opción A ya decidida).
7. **Build del frontend in-situ:**
   ```bash
   npm run build --workspace @ripnel/frontend
   ```
8. **Levantar backend y frontend con PM2:**
   ```bash
   pm2 start apps/backend/src/server.js --name ripnel-backend
   pm2 start npm --name ripnel-frontend -- run start --workspace @ripnel/frontend
   pm2 save
   ```
9. **Configurar Nginx** (server block same-origin, `/api`+`/health` → `localhost:3001`, resto → `localhost:3000`, con `proxy_set_header Host`/`X-Forwarded-Proto`/`X-Forwarded-For` — el backend ya tiene `trust proxy` activo, confirmado en `app.js`), recargar (`nginx -t && systemctl reload nginx`), y emitir certificado TLS.
10. **Probar `/health`, login y rutas básicas** (smoke test completo en la sección 10).

## 8. Estrategia para migraciones

**Comando patrón**, mismo criterio ya usado en `INFRA-03-B`/`INFRA-03-D` (adaptado de `docker exec` a `psql` directo, sin Docker de por medio en staging):

```bash
cd supabase/migrations
for f in $(ls | sort); do
  echo "=== Applying: $f ==="
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f" || { echo "FAILED: $f"; break; }
done
```

- **Orden:** por nombre de archivo (orden cronológico ya garantizado por la convención `YYYYMMDDNNNN_descripcion.sql` del repo) — **25 archivos** en total (conteo corregido en INFRA-04-A).
- **`ON_ERROR_STOP=1`** obligatorio, para detenerse ante el primer fallo en vez de continuar con un esquema parcial.
- **Si falla la extensión `vector`:** no debería ocurrir si el check de la sección 3 ya se hizo antes de empezar el loop de migraciones — pero si de todos modos aparece un fallo en `202606010001_chatbot_module.sql` específicamente, detenerse ahí, no forzar nada, y decidir explícitamente si se omite esa migración puntual (dejando el módulo `chatbot` fuera de staging) o se resuelve la disponibilidad de `pgvector` en el clúster antes de continuar — igual criterio que se usó para el fallo de `supabase/seed_styles_legacy.sql` en `INFRA-03-D`: detenerse, reportar, no corregir sin autorización.

## 9. Estrategia para admin inicial

**Sin password real en ningún documento del repo.** El comando SQL de creación usa un placeholder que se reemplaza en el momento, directamente en una sesión interactiva de `psql` (no en un archivo que se vaya a commitear):

```sql
INSERT INTO users (full_name, username, email, password_hash, role_id, active, must_change_password)
SELECT
  'Admin Staging',
  'admin',
  'admin@<STAGING_DOMAIN>',
  crypt('<REEMPLAZAR_POR_PASSWORD_GENERADO_LOCALMENTE_ANTES_DE_EJECUTAR>', gen_salt('bf', 10)),
  r.role_id,
  true,
  true  -- fuerza cambio de password en el primer login real
FROM roles r
WHERE r.name = 'ADMIN'
ON CONFLICT (username) DO NOTHING;
```

- Generar el password fuera de cualquier archivo versionado (p. ej. `openssl rand -base64 24` en la propia terminal del Droplet), pegarlo directo en la sesión `psql`, y **no guardarlo en ningún reporte ni commit**.
- `must_change_password = true` — a diferencia de los usuarios dev-only locales (`must_change_password = false`, aceptable solo porque son descartables y sin red), en staging se fuerza la rotación en el primer login real.
- **Advertencia explícita: `LocalDevAdmin123`, `LocalDevAlmacen123` y `LocalDevVendedor123` (usuarios de `database/seed_local_dev_users.sql`, INFRA-03-C3) no deben usarse en staging ni en ningún entorno accesible por red** — son contraseñas dev-only documentadas en texto plano a propósito, válidas únicamente contra `ripnel-postgres-local`.
- **Verificación de permisos post-creación (no asumir, confirmar):** las migraciones ya siembran progresivamente `permissions`/`role_permissions` para `ADMIN` de forma acumulativa (confirmado: 9 migraciones tocan `role_permissions`, y `202607020001_role_redesign_vendedora.sql` hace una asignación incondicional de *todos* los permisos existentes a `ADMIN` en su Fase 7) — es razonable esperar que el admin creado manualmente, con solo las 25 migraciones aplicadas (sin `database/seed_access_control.sql`), quede con permisos funcionales. **No se verificó exhaustivamente si el conjunto exacto coincide 1:1 con los 24 permisos que aporta `seed_access_control.sql`** — por eso el smoke test de la sección 10 incluye confirmar explícitamente que el login del admin devuelve un array de `permissions` no vacío y coherente, en vez de asumirlo.

## 10. Smoke test posterior a staging

Mismo patrón ya validado en `INFRA-03-F`/`INFRA-03-G`/`INFRA-03-H`, ahora contra el dominio de staging:

1. **`GET https://<STAGING_DOMAIN>/health`** → `{"ok": true, "dbTime": "..."}`.
2. **Login** con el admin creado en la sección 9 (`POST /api/auth/login`) → confirmar `200` y usuario/rol `ADMIN` en la respuesta.
3. **`GET /api/auth/me`** con la cookie de sesión → confirmar que el usuario sigue autenticado y que **`permissions` no viene vacío** (ver nota de verificación de la sección 9).
4. **Frontend:** abrir `https://<STAGING_DOMAIN>/` en un navegador real, confirmar que la sesión persiste tras `F5` (mismo patrón de `INFRA-03-G`), y que el sidebar refleja el rol `ADMIN`.
5. **Usuario operativo si aplica:** dado que la Opción A no siembra `almacen`/`vendedor`, este paso queda condicionado a si se decide crear manualmente un segundo usuario (`ALMACEN` o `VENDEDOR/A`) con el mismo patrón de la sección 9 para validar sidebar/permisos por rol distinto de `ADMIN` — no es obligatorio para el primer corte, es una extensión opcional del smoke test.

## 11. Rollback básico

- **Si el deploy falla antes de servir tráfico real** (nadie más apuntando a este staging todavía): destruir el Droplet y la instancia Managed PostgreSQL de staging sin impacto — ambos son descartables por definición en esta fase.
- **Si falla a mitad de una migración:** el loop de la sección 8 se detiene en el primer error (`ON_ERROR_STOP=1`); la migración fallida no queda parcialmente aplicada (mismo comportamiento transaccional ya confirmado en `INFRA-03-B`/`INFRA-03-D`). Decidir corrección explícita antes de reintentar — no forzar continuar.
- **Si el problema aparece después de servir tráfico de prueba:** Nginx puede apuntarse temporalmente a una página de mantenimiento estática mientras se investiga, sin necesidad de destruir el Droplet.
- **Nunca** existe rollback hacia Supabase remoto ni hacia ningún dato real — staging no tiene ninguna dependencia de esos entornos por diseño de esta fase.

## 12. Riesgos y pendientes antes de ejecutar

Heredados de INFRA-04-A, reconfirmados aquí:

- `pgvector` documentado a nivel de plataforma DO, pero no verificado en una instancia real — el check de la sección 3 es el gate obligatorio.
- Backup/restore de la instancia Managed PostgreSQL de staging no está definido en este runbook — recomendable resolverlo antes de considerar staging "estable", aunque no bloquea el primer despliegue de validación.
- Sin logging de aplicación (`morgan`/similar) — Nginx access log queda como única fuente de trazabilidad HTTP mientras no se agregue algo más.
- **El trabajo paralelo de frontend (búsqueda/POS) sigue sin estabilizar** (ver advertencia al inicio de este documento) — recomendable no incluirlo en el primer despliegue de staging, o esperar a que se resuelva el warning de Hooks ya detectado en `INFRA-03-H`.
- No existe todavía ningún archivo de configuración de Nginx ni ecosystem file de PM2 versionado en el repo — este runbook describe los pasos, pero los artefactos concretos (server block, `ecosystem.config.js` si se decide usarlo) no se crean en esta fase.
- Verificación de permisos de `ADMIN` post-migraciones (sección 9) queda como paso de validación explícito, no como algo garantizado de antemano.
- Confirmar en el panel de DO si `CA_CERT_PATH` es necesario (sección 3/5) antes de fijarlo como obligatorio u opcional en el `.env` real.

## `git status --short` final

```
 M apps/frontend/components/modules/inventory/inventory-adjustments-create-page.tsx
 M apps/frontend/components/modules/postsales/use-replacement-search.ts
 M apps/frontend/components/modules/sales/pos/use-product-search.ts
 M apps/frontend/components/modules/transfers/transfers-request-page.tsx
 M apps/frontend/components/modules/transfers/transfers-shared.tsx
?? apps/frontend/hooks/use-debounced-api-search.ts
?? docs/working/reports/FRONTEND-STRUCTURE-01-legacy-map.md
?? docs/working/reports/INFRA-04-B-staging-runbook.md
?? docs/working/reports/PRODUCT-SEARCH-01-frontend-search-roadmap.md
```

El único archivo generado por INFRA-04-B es este runbook. Los demás archivos modificados/nuevos (frontend de búsqueda/POS, `PRODUCT-SEARCH-01-*`, `FRONTEND-STRUCTURE-01-*`) son ajenos a esta fase, no fueron tocados por ella, y quedan excluidos del alcance de staging tal como se advierte al inicio de este documento. No se ejecutó `git add` ni commit. No se creó ningún recurso en DigitalOcean, no se tocó Supabase remoto, no se modificó código, seeds ni migraciones.
