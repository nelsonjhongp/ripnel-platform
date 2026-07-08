# INFRA-04-A: Readiness audit para staging/producción en DigitalOcean

> Fecha: 2026-07-08 | Depende de: `docs/working/reports/INFRA-01-do-deployment-plan.md`, `docs/working/reports/INFRA-02-environments-plan.md`, serie INFRA-03 completa (`INFRA-03-A` a `INFRA-03-H`)
>
> Estado: **Auditoría solo lectura completada.** No se crearon recursos en DigitalOcean, no se tocó Supabase remoto, no se modificó código, seeds ni migraciones. No se ejecutó `git add` ni commit.

## Uso

Este documento persiste el audit de preparación para el siguiente bloque de infraestructura (Droplet DigitalOcean + DigitalOcean Managed PostgreSQL), después de que INFRA-03 dejara validado el entorno local completo. Es solo diagnóstico — ninguna decisión aquí implica ejecución; las fases de creación real de recursos quedan para INFRA-04-B en adelante, bajo autorización explícita.

## 1. Resumen del estado actual de infraestructura

**[Confirmado]**
- BD local: `ripnel-postgres-local` (Docker, `pgvector/pgvector:pg17`), **25/25 migraciones** aplicadas limpias, 8/8 seeds dev-only aplicados sin error tras las correcciones de INFRA-03-D.
- Backend local validado end-to-end (`/health`, login, `/api/auth/me`) contra esa BD — INFRA-03-F.
- Frontend local validado en Modo A y B, con `admin` (sin sede) — INFRA-03-G.
- Usuarios operativos `almacen`/`vendedor` validados con sede asignada, sidebar coherente con permisos — INFRA-03-H.
- INFRA-01 (plan de fases DO) e INFRA-02 (plan de entornos, hallazgo de `NODE_ENV` binario, decisión de imagen pgvector) siguen vigentes tal cual se documentaron — nada de esto ha sido implementado todavía a nivel Droplet/DO real.

**Corrección de conteo de migraciones:** los reportes `INFRA-03-B` y `INFRA-03-D` registran "24/24 migraciones" en su texto. El conteo real, verificado en esta auditoría con `ls supabase/migrations/ | wc -l`, es **25**. Los timestamps de los 25 archivos son consistentes con el historial de desarrollo (ninguno se agregó después de esas fases) — es decir, el número correcto siempre fue 25, y el texto de esos reportes subestimó el conteo en uno.

**Esto no invalida INFRA-03.** Los comandos usados en INFRA-03-B/D iteraban con `for f in $(ls supabase/migrations | sort)`, es decir, **aplicaron todos los archivos presentes en el directorio, en orden, sin importar el número exacto** — el resultado reportado (todas las migraciones aplicadas sin error, esquema completo de 43 tablas) es correcto y verificable independientemente de la etiqueta numérica usada en el texto. No se reabren ni se editan los reportes `INFRA-03-B` ni `INFRA-03-D`; esta nota queda registrada aquí, en INFRA-04-A, como corrección de cara a las fases de DigitalOcean.

**[Confirmado — hallazgo adicional]** El working tree tiene cambios **no relacionados con infraestructura** en curso ahora mismo (ver sección "Working tree" más abajo) — trabajo paralelo de frontend sobre búsqueda/POS, ya señalado en `INFRA-03-H` por el warning de Hooks en `/ventas/nueva`.

## 2. Arquitectura staging recomendada

Sin cambios respecto a la Ruta A ya decidida en INFRA-01, aplicada a un Droplet de **staging**:

```
Internet
   │
   ▼
Nginx (reverse proxy, TLS Let's Encrypt)
   │
   ├── / , /app*       → Next.js (`next start`, proceso Node en PM2/systemd)
   └── /api*, /health   → Express backend (proceso Node en PM2/systemd)
                              │
                              ▼
                    DigitalOcean Managed PostgreSQL
                    (instancia de staging, separada de producción)
```

Docker sigue pospuesto (INFRA-01 Fase 7), sin cambios en esta recomendación.

## 3. Variables de entorno necesarias por componente

**Backend** (`config/env.js`, confirmado): `PORT`, `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `ALLOWED_ORIGINS` (opcional), `SESSION_COOKIE_DOMAIN`, `DB_SSL`, `DB_SSL_REJECT_UNAUTHORIZED`, `CA_CERT_PATH` (opcional), `GEMINI_API_KEY`/`SMTP_*` (opcionales, no bloqueantes).

**Frontend** (`.env.example`, confirmado): solo `NEXT_PUBLIC_API_BASE_URL` — build-time, se hornea en el bundle del cliente (restricción de Next ya señalada en INFRA-01/03-A).

**Base de datos (DO Managed PostgreSQL):** cadena de conexión provista por el panel de DO (host, puerto, usuario, password, nombre de BD, modo SSL) — se traduce 1:1 a `DATABASE_URL` del backend. No hay variables adicionales propias del backend para esto.

## 4. Decisión recomendada: `NODE_ENV`, `APP_ENV`, `DB_SSL`, `DATABASE_URL`

- **`NODE_ENV=production`** en staging — reconfirmando el hallazgo de INFRA-02: el código solo distingue `production` vs. cualquier otro valor (CORS dev-bypass, `SameSite`/`Secure` de cookies). Usar `NODE_ENV=staging` reactivaría el bypass de CORS para IPs privadas y cookies sin `Secure`, pensado solo para desarrollo local.
- **`APP_ENV` (nueva, opcional, no existe hoy en `config/env.js`):** si se quiere distinguir staging de producción para logging/alertas, la recomendación es introducir una variable puramente informativa (`APP_ENV=staging` / `APP_ENV=production`) que **no** alimente ninguna decisión de seguridad — solo se leería para logs/nombre de instancia. Cambio de código menor, no implementado, a evaluar en una fase de hardening (INFRA-01 Fase 6), no en el primer corte de staging.
- **`DB_SSL=true`** — recomendado sin excepción para staging/producción.
- **`DB_SSL_REJECT_UNAUTHORIZED=true`** — recomendado sin excepción; validar certificado del servidor, no aceptar conexiones sin verificar.
- **`CA_CERT_PATH`** — `shared/db.js` ya soporta esta variable (`buildSslConfig()` la lee y hace `fs.readFileSync` si está presente). Queda **pendiente de confirmar si DigitalOcean Managed PostgreSQL requiere un certificado CA propio** para validar la cadena de confianza, o si su certificado ya es reconocido por el store de certificados estándar del sistema. El runbook de implementación posterior debe contemplar explícitamente: descargar el certificado CA de DigitalOcean (si el panel lo provee) y configurar `CA_CERT_PATH`, o usar un connection string con `sslmode=verify-full`/equivalente si DO lo ofrece directamente en la cadena de conexión.
- **`DATABASE_URL`** apunta a la instancia de staging de DO Managed PostgreSQL — nunca a la de producción, nunca a Supabase remoto.

## 5. Estrategia de migraciones para DO Managed PostgreSQL

Aplicar las **25 migraciones** de `supabase/migrations/` en orden, contra una instancia de staging descartable primero (nunca la definitiva de entrada). La migración `202604010001_create_user_function.sql` **ya está corregida en el repo** (el `GRANT ... TO anon, authenticated` fue reemplazado por `REVOKE ALL ... FROM PUBLIC` en INFRA-03-B) — una instancia DO nueva construida desde cero con el historial actual del repo no debería tropezar con ese problema, que es exclusivo de bases que ya tenían la migración vieja aplicada (como el Supabase remoto compartido, si nunca se corrigió ahí). Antes de aplicar contra DO real: repetir el mismo procedimiento de INFRA-03-B/D (aplicar contra una instancia de prueba primero, con `ON_ERROR_STOP=1`, deteniéndose ante cualquier fallo).

## 6. Estrategia de seeds

**No se recomienda aplicar ningún seed dev-only en un staging expuesto a red.** Los tres usuarios ya sembrados en local (`admin`/`LocalDevAdmin123`, `almacen`/`LocalDevAlmacen123`, `vendedor`/`LocalDevVendedor123`, de `database/seed_local_dev_users.sql`) tienen contraseñas deliberadamente obvias y documentadas en texto plano en el propio repo — **no deben usarse en ningún entorno accesible por red**, incluido staging. Son válidas únicamente contra `ripnel-postgres-local`, un contenedor Docker sin exposición de red fuera de la máquina local.

Tres opciones para el primer corte de staging, sin decidir aquí cuál aplicar:

- **A) Staging vacío + admin seguro creado manualmente.** Solo se aplican las 25 migraciones (esquema), sin ningún seed de datos. Un único usuario `ADMIN` se crea a mano contra la instancia de staging, con una contraseña generada específicamente para ese entorno (no reutilizando ninguna de las dev-only). Es la opción de menor superficie de riesgo.
- **B) Seed mínimo seguro para QA.** Se aplica el conjunto de 8 seeds ya validado en INFRA-03-D (`seed_access_control.sql` → `seed_operational_mvp.sql` → `supabase/seed.sql` corregido → `supabase/seed_styles_legacy.sql` corregido → `seed_variants_inventory.sql` → `seed_style_size_prices.sql` → `seed_sales_mvp.sql`), pero **sustituyendo las contraseñas de cualquier usuario sembrado** por valores generados para staging, nunca los valores dev-only documentados en el repo.
- **C) Dataset demo protegido.** Igual que B, pero además con el acceso a staging restringido (IP allowlist, VPN, o autenticación adicional a nivel de Nginx) para que ni siquiera con credenciales débiles quede expuesto a internet abierto.

**Qué datos reales faltarían en cualquiera de las tres opciones:** catálogo real de productos/precios, ubicaciones reales, usuarios reales del equipo, clientes reales. Ninguno de los seeds actuales los cubre; staging con datos reales requeriría un proceso de carga separado (fuera del alcance de esta auditoría) o una migración de datos desde el Supabase remoto de dev online, si se decide que ese es el origen de verdad para QA.

## 7. Requisitos de PostgreSQL

- **Versión objetivo: 17** — coincide con Supabase remoto (`17.6.1.084`, confirmado en INFRA-03-C2) y con la imagen local (`pgvector/pgvector:pg17`, `17.10`).
- **Extensión `vector`:** DigitalOcean documenta soporte para PostgreSQL con `pgvector`/`vector`, pero **la instancia real de staging debe validarse antes de aplicar migraciones** — no se asume disponible solo porque esté documentado a nivel de plataforma.
- **Primer check técnico obligatorio del clúster, antes de aplicar cualquier migración:**
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
  ```
  Si esto falla o no devuelve una fila, se decide de inmediato si se posterga el módulo `chatbot` (única migración que usa `vector`, `202606010001_chatbot_module.sql`) en vez de descubrirlo a mitad del pipeline de 25 migraciones, como ya ocurrió con el problema de roles en INFRA-03-B.
- **SSL/conexión segura:** obligatorio (`DB_SSL=true`), ya soportado nativamente por `shared/db.js` sin cambios de código (ver sección 4 sobre `CA_CERT_PATH`).

## 8. Requisitos del Droplet

Todos siguen **pendientes de decisión/implementación**, sin cambios respecto a lo ya señalado en INFRA-01:

| Requisito | Estado |
|---|---|
| Node/npm | Sin versión pineada (`engines` ausente en todos los `package.json`) — sigue siendo un hueco de reproducibilidad |
| Build frontend | Pendiente decidir: in-situ en el Droplet vs. en CI |
| Proceso backend | PM2 vs. systemd — sigue sin decidirse |
| Reverse proxy | Ningún archivo de config de Nginx existe en el repo todavía (a propósito, pospuesto) |
| Logs | Sin logging HTTP de aplicación (`morgan`/similar) — Nginx access log sería la única fuente si no se agrega algo antes |
| Restart | Depende de la elección PM2/systemd — ninguno configurado todavía |
| Firewall | No hay ninguna referencia a `ufw`/reglas de firewall en el repo — a definir en la fase de implementación |

## 9. Riesgos principales antes de crear staging

1. **`pgvector` documentado a nivel de plataforma DO, pero no verificado en la instancia real** — el check de la sección 7 es el gate obligatorio antes de continuar.
2. **Backup/restore nunca probado** (heredado de INFRA-01) — sigue siendo el hueco más crítico antes de considerar cualquier entorno accesible por red como "listo".
3. **Sin logging de aplicación** — diagnosticar un incidente real en staging hoy dependería solo de logs de Nginx (aún inexistentes) y `console.error` de 5xx.
4. **Frontend paralelo no estabilizado.** Hay trabajo en curso sobre búsqueda/POS (ver "Working tree" abajo) ajeno a esta auditoría, con un warning de React Hooks ya detectado en `/ventas/nueva` (`INFRA-03-H`). No forma parte del alcance de staging readiness, pero es un riesgo real si se despliega a staging antes de que ese trabajo se estabilice o se excluya explícitamente del primer corte.
5. **Ningún `Dockerfile`/config de Nginx/unidad PM2-systemd existe todavía** — el "primer deploy" real todavía no tiene ningún artefacto de infraestructura escrito, solo decisiones documentadas.
6. **Contraseñas dev-only del pipeline de seeds no son aptas para un entorno accesible por red** (sección 6) — riesgo si se reutiliza `database/seed_local_dev_users.sql` sin ajuste en un staging expuesto a internet.

## 10. Lista de decisiones humanas pendientes

Heredadas de INFRA-01 (sin resolver aún): esquema de dominio (`app.ripnel.com`/`api.ripnel.com` vs. `/api`), PM2 vs. systemd, build in-situ vs. CI, tratamiento de `pgvector`/`chatbot`, estrategia de backup/restore, tamaño de pool de conexiones, tamaño de Droplet.

Nuevas, surgidas en esta auditoría:
- ¿Introducir `APP_ENV` como variable informativa (sección 4), o mantener solo `NODE_ENV`?
- ¿Cuál de las tres opciones de seeds (A/B/C, sección 6) usar para el primer corte de staging?
- ¿Esperar a que se estabilice el trabajo paralelo de POS/búsqueda antes del primer deploy a staging, o excluirlo explícitamente?
- ¿Staging vive en el mismo Droplet que eventualmente será producción, o en uno separado desde el día uno?
- ¿DigitalOcean Managed PostgreSQL requiere `CA_CERT_PATH` propio, o su certificado ya es confiable por defecto? (a confirmar en el panel de DO)

## 11. Plan propuesto para INFRA-04-B

Mantener el mismo modo solo-lectura/planeamiento (sin crear recursos DO todavía):

1. Resolver, con el usuario, las decisiones humanas pendientes de la sección 10 que sean bloqueantes (mínimo: dominio, PM2/systemd, tamaño de Droplet, opción de seeds A/B/C).
2. Documentar el checklist exacto de creación de la instancia DO Managed PostgreSQL (versión 17, verificación de `pgvector` disponible vía el check SQL de la sección 7, región, tamaño) — sin crearla todavía.
3. Documentar el checklist exacto de creación del Droplet (imagen base, tamaño, firewall inicial) — sin crearlo todavía.
4. Solo tras autorización explícita, pasar a una fase de implementación real (creación de recursos DO) — sería INFRA-04-C o posterior, ya fuera del modo solo-lectura.

## Working tree — cambios ajenos a INFRA-04-A

```
 M apps/frontend/components/modules/inventory/inventory-adjustments-create-page.tsx
 M apps/frontend/components/modules/postsales/use-replacement-search.ts
 M apps/frontend/components/modules/sales/pos/use-product-search.ts
 M apps/frontend/components/modules/transfers/transfers-request-page.tsx
 M apps/frontend/components/modules/transfers/transfers-shared.tsx
?? apps/frontend/hooks/use-debounced-api-search.ts
?? docs/working/reports/PRODUCT-SEARCH-01-frontend-search-roadmap.md
```

Estos archivos corresponden al trabajo paralelo de búsqueda/POS ya señalado en `INFRA-03-H` (el warning de React Hooks en `/ventas/nueva` pasa por este mismo stack: `useDebouncedApiSearch` → `useProductSearch`). **No fueron tocados por esta auditoría ni forman parte del alcance de staging readiness** — se incluyen aquí únicamente como el riesgo #4 de la sección 9 ("frontend paralelo no estabilizado"), no como trabajo de infraestructura.

## `git status --short` final

```
 M apps/frontend/components/modules/inventory/inventory-adjustments-create-page.tsx
 M apps/frontend/components/modules/postsales/use-replacement-search.ts
 M apps/frontend/components/modules/sales/pos/use-product-search.ts
 M apps/frontend/components/modules/transfers/transfers-request-page.tsx
 M apps/frontend/components/modules/transfers/transfers-shared.tsx
?? apps/frontend/hooks/use-debounced-api-search.ts
?? docs/working/reports/INFRA-04-A-do-readiness-audit.md
?? docs/working/reports/PRODUCT-SEARCH-01-frontend-search-roadmap.md
```

El único archivo generado por INFRA-04-A es este reporte. No se ejecutó `git add` ni commit. No se crearon recursos en DigitalOcean, no se tocó Supabase remoto, no se modificó código, seeds ni migraciones.
