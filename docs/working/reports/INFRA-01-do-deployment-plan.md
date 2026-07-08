# INFRA-01: Plan de despliegue DigitalOcean (Droplet + Nginx + Managed PostgreSQL)

> Fecha: 2026-07-08 | Depende de: diagnóstico de infraestructura (docs/deploy.md, revisión de código backend/frontend/supabase, no versionado como reporte separado)
>
> Documento vivo de seguimiento. No reemplaza `docs/deploy.md` (guía de referencia general), lo complementa con un plan de ejecución por fases específico para DigitalOcean.
>
> Estado global: **Preparación** — ninguna fase ejecutada todavía. Todo lo descrito abajo es plan, no implementación.

## Uso

- Marcar cada checkbox `- [ ]` → `- [x]` a medida que se completa.
- No saltar fases: cada una es prerequisito de la siguiente salvo que se indique lo contrario.
- Actualizar la sección "Registro de decisiones" cada vez que se resuelve un punto de la lista de "Decisiones pendientes".
- Este documento no toca producción por sí mismo — cada fase describe qué se tocaría, pero la ejecución real ocurre en tareas separadas y explícitamente aprobadas.

---

## 1. Decisión recomendada

**Ruta A confirmada: Droplet sin Docker para el primer despliegue.**

- Nginx como reverse proxy en el host.
- Backend Express como proceso Node gestionado por PM2 o systemd (decisión pendiente, ver sección 4).
- Frontend Next.js con `next build` + `next start`, mismo mecanismo de proceso que el backend.
- DigitalOcean Managed PostgreSQL como base de datos, con SSL obligatorio (ya soportado por el backend actual).
- Docker Compose queda como **Fase 7, opcional y posterior**, no como parte del primer corte productivo.

**Justificación breve:** el código ya corre hoy como procesos Node estándar sin pasos de build en el backend y con un `next start` convencional en el frontend (sin dependencias de Vercel Edge). El backend ya está preparado para correr detrás de un proxy (`trust proxy` activo, CORS/CSRF desacoplados del transporte, cookies pensadas para HTTPS). Introducir Docker en el mismo movimiento que la migración de base de datos sumaría una segunda variable de complejidad nueva —hoy no existe un solo `Dockerfile` en el repo— cuando el objetivo inmediato es reducir riesgo, no maximizar portabilidad. Docker se evalúa después, con el deploy manual, logging y backup ya resueltos y probados.

---

## 2. Fases

| Fase | Nombre | Estado |
|---|---|---|
| 0 | Limpieza / commit del estado actual | Pendiente |
| 1 | Documentación de deploy DO | Pendiente |
| 2 | Preparación de variables y checklist | Pendiente |
| 3 | Staging con seed/demo | Pendiente |
| 4 | Prueba de migración Supabase → DO Managed PostgreSQL | Pendiente |
| 5 | Deploy productivo mínimo | Pendiente |
| 6 | Hardening posterior | Pendiente |
| 7 | Docker Compose (opcional) | Pendiente / no iniciar sin decisión explícita |

### Fase 0 — Limpieza / commit del estado actual

**Objetivo:** dejar el working tree en un estado ordenado y commiteado antes de tocar infraestructura, sin mezclar el trabajo de infra con el refactor de transferencias en curso (`nelson/transfer-request-workspace-refactor`).

**Archivos que se tocarían:** ninguno de infraestructura. Posiblemente commits de lo que ya está modificado/sin trackear en la rama actual (a decisión del usuario, no automático).

**Archivos que NO se deben tocar:** nada de Nginx, `.env`, Dockerfiles, migraciones — no existen todavía en este alcance.

**Comandos esperados (referencia, no ejecutados en esta fase de planeamiento):**
```
git status
git add <archivos específicos>
git commit -m "..."
git checkout -b infra/do-deploy   # si se decide aislar el trabajo de infra en su propia rama
```

**Riesgos:** mezclar cambios de dominio (transfers) con cambios de infraestructura en el mismo commit o PR, dificultando revisión y rollback independientes.

**Criterios de éxito:** working tree limpio o agrupado coherentemente; rama de infra separada si así se decide.

**Rollback:** trivial — nada productivo involucrado, `git reset`/`git revert` locales sin impacto externo.

---

### Fase 1 — Documentación de deploy DO

**Objetivo:** crear la guía específica de despliegue en DigitalOcean (Droplet + Nginx + Managed PostgreSQL), complementando `docs/deploy.md` sin reemplazarlo, dejando explícitas las decisiones aún abiertas como "pendiente" en vez de asumirlas.

**Archivos que se tocarían:** `docs/deploy.md` (nueva sección "DigitalOcean") o un documento nuevo `docs/deploy-digitalocean.md`; entrada de seguimiento en `docs/working/IMPLEMENTATION-TRACKER.md` apuntando a este documento.

**Archivos que NO se deben tocar:** código de aplicación, `.env*`, `supabase/migrations/`, cualquier archivo de configuración de servidor real.

**Comandos esperados:** ninguno — solo edición de documentación.

**Riesgos:** documentar como definitivas decisiones que siguen abiertas (dominio, PM2 vs systemd, tamaño de Droplet) — mitigar marcándolas explícitamente como pendientes hasta que se resuelvan en la sección 4.

**Criterios de éxito:** documento revisado y aprobado antes de avanzar a Fase 2.

**Rollback:** revertir el commit de documentación.

---

### Fase 2 — Preparación de variables y checklist

**Objetivo:** consolidar la lista completa de variables de entorno necesarias para el Droplet (sin valores reales) y un checklist de preparación de servidor (usuario no-root, firewall, SSH, Node, swap si aplica, PM2/systemd instalado).

**Archivos que se tocarían:** posible actualización de `apps/backend/.env.example` / `apps/frontend/.env.example` **solo si** aparece alguna variable nueva necesaria específicamente para DO (hoy no se detectó ninguna faltante); el checklist se documenta en el archivo creado en Fase 1.

**Archivos que NO se deben tocar:** `.env` reales — no deben crearse todavía en esta fase, y nunca deben commitearse.

**Comandos esperados:** ninguno todavía — solo preparación de la lista.

**Riesgos:** confundir plantillas de ejemplo con archivos reales; omitir una variable crítica (`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `SESSION_COOKIE_DOMAIN`, `ALLOWED_ORIGINS`, `DB_SSL*`, `NEXT_PUBLIC_API_BASE_URL`).

**Criterios de éxito:** checklist de variables + checklist de servidor completo y revisado por el usuario.

**Rollback:** no aplica (solo documentación).

---

### Fase 3 — Staging con seed/demo

**Objetivo:** levantar un entorno de staging completo (Droplet de prueba o el mismo Droplet en modo staging) contra una base de datos de prueba, cargado con los seeds ya existentes en el repo (`database/seed_operational_demo.sql`, `database/seed_test_users.sql`, `supabase/seed.sql`, etc.), para validar el stack de punta a punta sin tocar datos reales.

**Archivos que se tocarían:** ninguno del repositorio (es configuración de servidor); un `.env` de staging vive únicamente en el servidor de staging, nunca en el repo.

**Archivos que NO se deben tocar:** datos de producción; `supabase/migrations/*.sql` se aplican tal cual, no se editan ni reordenan.

**Comandos esperados (referencia):**
```
npm ci
npm run build --workspace @ripnel/frontend
psql "$STAGING_DATABASE_URL" -f supabase/migrations/<archivo>.sql   # en orden, uno por uno
psql "$STAGING_DATABASE_URL" -f database/seed_test_users.sql
pm2 start ... / systemctl start ...
```

**Riesgos:** usar por error una cadena de conexión de producción en vez de la de staging; falta de aislamiento real entre datos demo y datos reales.

**Criterios de éxito:** healthcheck responde OK, login funciona, al menos un flujo de negocio completo (venta o transferencia) corre de punta a punta con datos demo.

**Rollback:** el Droplet/BD de staging es descartable por definición — se destruye sin impacto.

---

### Fase 4 — Prueba de migración Supabase → DO Managed PostgreSQL

**Objetivo:** ensayar el proceso real de exportación/importación desde el proyecto Supabase actual hacia una instancia de DigitalOcean Managed PostgreSQL, aplicar las migraciones versionadas en orden y correr las validaciones existentes.

**Archivos que se tocarían:** ninguno del repositorio. Las migraciones y scripts de validación se **usan**, no se modifican.

**Archivos que NO se deben tocar:** `supabase/migrations/*.sql`, `database/validate_*.sql` (se ejecutan tal cual), cualquier dato de producción real.

**Comandos esperados (referencia, no ejecutados en esta fase de planeamiento):**
```
pg_dump <cadena de conexión de Supabase>            # fuera del repo, con credenciales del panel
psql "$DO_DATABASE_URL" -f supabase/migrations/202603250001_ripnel_mvp_v2.sql
psql "$DO_DATABASE_URL" -f supabase/migrations/202603310001_auth_username_rbac.sql
... (resto de las 24 migraciones, en orden cronológico por nombre de archivo)
psql "$DO_DATABASE_URL" -f database/validate_permissions.sql
psql "$DO_DATABASE_URL" -f database/validate_cash_closing.sql
psql "$DO_DATABASE_URL" -f database/validate_sales_history_detail.sql
DATABASE_URL="$DO_DATABASE_URL" npm run test --workspace @ripnel/backend
```

**Riesgos:** la extensión `pgvector` (usada solo por el módulo `chatbot`) puede no estar disponible en el plan/tier de DO elegido — verificar antes o desactivar el módulo para el primer corte; diferencia de versión de motor Postgres entre Supabase y el plan DO; ejecutar contra datos reales antes de tiempo.

**Criterios de éxito:** las 24 migraciones aplican sin error; los tres scripts `validate_*.sql` pasan; la suite `node --test` del backend pasa contra la BD migrada; `assertCashSchemaCompatibility()` no bloquea el arranque del servidor.

**Rollback:** la base de prueba se descarta sin impacto — Supabase sigue siendo la fuente de verdad hasta que se confirme el corte definitivo en Fase 5.

---

### Fase 5 — Deploy productivo mínimo

**Objetivo:** primer despliegue real a producción en el Droplet definitivo, con dominio real, TLS y la base de datos ya migrada y validada en Fase 4.

**Archivos que se tocarían:** en el servidor (fuera del repo): configuración de Nginx, `.env` reales, unidades PM2/systemd. En el repo: actualización de este documento y de `docs/deploy.md` con el resultado final.

**Archivos que NO se deben tocar:** código de aplicación, salvo que esta fase revele un bug bloqueante — en ese caso se trata como un cambio de código normal, con su propio PR, no como parte de "infra".

**Comandos esperados (referencia):**
```
npm ci --omit=dev            # o build en CI + transferencia de artefacto al Droplet
npm run build --workspace @ripnel/frontend
pm2 start ... --name ripnel-backend
pm2 start ... --name ripnel-frontend
# o equivalentes systemctl enable --now
certbot --nginx -d <dominio(s) elegidos>
nginx -t && systemctl reload nginx
```

**Riesgos:** downtime durante el corte de DNS; cookies rotas si `SESSION_COOKIE_DOMAIN` o el esquema de dominio no coincide exactamente con lo probado en staging; rate limits mal calibrados bloqueando tráfico legítimo el primer día.

**Criterios de éxito:** checklist completo de la sección 5 de este documento pasa en producción real.

**Rollback:** mantener el entorno anterior (Supabase + hosting actual) activo en paralelo hasta confirmar estabilidad; TTL de DNS bajo preparado de antemano para poder revertir el apuntado rápidamente; `NEXT_PUBLIC_API_BASE_URL` documentado para poder revertir el frontend al backend anterior si hiciera falta.

---

### Fase 6 — Hardening posterior

**Objetivo:** cerrar los huecos "recomendables" identificados en el diagnóstico previo: logging HTTP estructurado, tuning del pool de conexiones (`max`/`idleTimeoutMillis`), backup automatizado y programado (no solo probado una vez en Fase 4), monitoreo/alertas básicas, graceful shutdown del backend, pin de versión de Node (`engines` en `package.json`).

**Archivos que se tocarían:** `apps/backend/src/shared/db.js` (configuración de pool), posible middleware nuevo de logging, `apps/backend/package.json` / `apps/frontend/package.json` (`engines`), documentación de la estrategia de backup.

**Archivos que NO se deben tocar:** lógica de negocio de los módulos ERP — fuera del alcance de esta fase.

**Comandos esperados:** despliegue incremental, una mejora a la vez, cada una con su propio ciclo de prueba y PR.

**Riesgos:** introducir regresiones en el pool de conexiones o en el manejo de señales de proceso si no se prueba cada cambio de forma aislada.

**Criterios de éxito:** cada mejora tiene su propia validación antes de mergear — no es un cambio único masivo.

**Rollback:** cada cambio de esta fase es independiente y revertible por separado (PRs pequeños).

---

### Fase 7 — Docker Compose (opcional)

**Objetivo:** evaluar e implementar Docker Compose **solo si**, tras la Fase 6, se confirma una necesidad real (escalar a más de un Droplet, estandarizar onboarding, aislar dependencias). No es un paso obligatorio del plan.

**Archivos que se tocarían:** `Dockerfile` nuevo para backend, `Dockerfile` nuevo para frontend, `docker-compose.yml`, `.dockerignore` — todos archivos nuevos. Ajustes menores posibles en `next.config.ts` (p. ej. `output: 'standalone'`) si se decide optimizar la imagen del frontend.

**Archivos que NO se deben tocar:** nada de producción activa hasta validar el compose completo en staging primero; no se toca la base de datos (sigue siendo Managed PostgreSQL externo, nunca un contenedor).

**Comandos esperados:** `docker compose build`, `docker compose up -d` primero en staging, nunca directo en producción.

**Riesgos:** los ya señalados en el diagnóstico original — mezclar esta fase con cambios de infraestructura pendientes multiplicaría el espacio de fallas; por eso va al final, no junto con la migración inicial.

**Criterios de éxito:** staging dockerizado pasa el mismo checklist de la sección 4 de este documento.

**Rollback:** mientras no se dockerice producción, no hay rollback que gestionar. Si se llega a dockerizar producción, mantener la versión no-dockerizada corriendo en paralelo hasta confirmar paridad completa.

---

## 3. Decisiones pendientes

| # | Decisión | Opciones | Nota |
|---|---|---|---|
| 1 | Esquema de dominio | (a) `app.ripnel.com` + `api.ripnel.com` — requiere `SameSite=None; Secure` (ya soportado por el código actual) <br> (b) mismo dominio con `/api` — simplifica cookies (`SameSite=Lax` bastaría) pero acopla más el ciclo de deploy de front/back | El código hoy soporta ambos sin cambios; (a) facilita separar front/back en droplets distintos a futuro, (b) es operativamente más simple en el corto plazo |
| 2 | PM2 vs systemd | (a) PM2 — gestión más simple para Node, reinicio automático, logs integrados, `pm2 startup` para persistencia <br> (b) systemd — más nativo del SO, sin dependencia npm adicional, integración estándar con `journalctl` | Backend y frontend son ambos procesos Node — la elección debería ser consistente entre los dos |
| 3 | Build del frontend | (a) build en el propio Droplet (`next build` in situ) <br> (b) build en CI (GitHub Actions) y transferencia del artefacto ya compilado | (b) reduce carga de CPU/RAM en el Droplet durante deploys y separa build de runtime; requiere ampliar `.github/workflows/ci.yml`, que hoy no tiene job de deploy |
| 4 | `pgvector` / módulo `chatbot` | (a) confirmar soporte de `pgvector` en el plan DO elegido y mantener el módulo <br> (b) desactivar/posponer el módulo `chatbot` para el primer corte y resolver esto sin presión de fecha | Depende de si el chatbot está en uso real hoy — no confirmado en el diagnóstico |
| 5 | Backup/restore | (a) usar el backup gestionado nativo de DO Managed PostgreSQL <br> (b) complementar con `pg_dump` programado a almacenamiento externo (Spaces u otro) | Hoy no existe ningún script ni rutina de backup en el repo — cualquiera de las dos opciones debe quedar **probada**, no solo configurada, antes de Fase 5 |
| 6 | Pool de conexiones | (a) mantener defaults de `pg.Pool` (10 conexiones) <br> (b) fijar `max`/`idleTimeoutMillis` explícitos acorde al límite del plan DO <br> (c) sumar el connection pooler gestionado de DO si se anticipa más de una instancia del backend | Relevante especialmente si se corre el backend en cluster PM2 con N instancias (10×N conexiones) |
| 7 | Tamaño de Droplet | Depende de: tráfico esperado, si el build del frontend se hace in situ (más RAM necesaria) o en CI (menos), y si se corre clustering multi-core | No hay datos de carga real en el repo para dimensionar — pendiente de definir con el usuario |

---

## 4. Checklist mínimo antes de tocar producción

- [ ] Backup/restore **probado** contra DO Managed PostgreSQL (no solo configurado) — ver decisión pendiente #5
- [ ] Staging funcional de punta a punta (Fase 3 completada y validada)
- [ ] Healthcheck (`GET /health`) responde OK con la base de datos real conectada
- [ ] Login → refresh de sesión funciona correctamente bajo el esquema de dominio elegido (decisión pendiente #1)
- [ ] Flujo de venta completo: caja abierta → venta → confirmación → stock actualizado
- [ ] Flujo de caja: apertura → movimientos → cierre/arqueo
- [ ] Flujo de transferencia completo: solicitud → aprobación → despacho → recepción → stock actualizado en ambas sedes
- [ ] Logs disponibles para diagnosticar un incidente real (aunque sea solo Nginx access log mientras no exista logging de aplicación)
- [ ] Plan de rollback documentado y ensayado: DNS con TTL bajo, entorno anterior (Supabase/hosting actual) aún activo durante la ventana de validación

---

## 5. Registro de decisiones y hallazgos

| Fecha | Fase/Decisión | Hallazgo / decisión | Estado |
|---|---|---|---|
| 2026-07-08 | INFRA-01 | Documento creado a partir del diagnóstico de infraestructura previo (Droplet + Nginx + PM2/systemd + Managed PostgreSQL, Docker pospuesto a Fase 7) | Documentado |

---

## Plantilla para nueva entrada de fase

```text
### Fase [N] — [Nombre]

Estado: Pendiente | En curso | Completada; validar | Bloqueada

Objetivo:
Archivos que se tocarían:
Archivos que NO se deben tocar:
Comandos esperados:
Riesgos:
Criterios de éxito:
Rollback:
```
