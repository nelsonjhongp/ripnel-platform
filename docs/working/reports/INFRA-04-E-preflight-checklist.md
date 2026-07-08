# INFRA-04-E: Preflight checklist final antes de crear recursos DigitalOcean

> Fecha: 2026-07-08 | Depende de: `docs/working/reports/INFRA-04-A-do-readiness-audit.md`, `docs/working/reports/INFRA-04-B-staging-runbook.md`, `docs/working/reports/INFRA-04-C-deploy-artifacts-plan.md`, `docs/working/reports/INFRA-04-D-deploy-artifacts.md`
>
> Estado: **Cierre documental de la serie INFRA-04.** Ningún recurso fue creado en DigitalOcean, no se tocó Supabase remoto, no se modificó código, seeds ni migraciones. No se ejecutó `git add` ni commit.
>
> **Advertencia — repo público, sin secretos reales.** Este documento no contiene ni referencia ningún valor real de credenciales, dominios o cadenas de conexión — todo lo aplicable a valores reales sigue viviendo exclusivamente fuera del repo, tal como se estableció desde `INFRA-04-B`/`INFRA-04-D`.
>
> **Crear recursos en DigitalOcean implica costo real (billing) y requiere una autorización explícita posterior, distinta de este documento** — ver sección 6.

## Ajeno a esta fase

Los cambios en `apps/frontend/components/modules/inventory/inventory-adjustments-create-page.tsx`, `use-replacement-search.ts`, `use-product-search.ts`, `transfers-request-page.tsx`, `transfers-shared.tsx`, `apps/frontend/hooks/use-debounced-api-search.ts`, y los reportes `FRONTEND-STRUCTURE-01-legacy-map.md`/`PRODUCT-SEARCH-01-frontend-search-roadmap.md` corresponden al trabajo paralelo de búsqueda/POS ya señalado desde `INFRA-03-H`. **No forman parte de la serie INFRA-04 ni de este checklist**, y no fueron tocados por esta fase.

## 1. Estado confirmado de INFRA-04 A-D

| Fase | Contenido | Estado |
|---|---|---|
| 04-A | Readiness audit: arquitectura, variables, `NODE_ENV`/`DB_SSL`, estrategia de 25 migraciones, 3 opciones de seeds, requisitos PostgreSQL/Droplet, riesgos | Commiteado (`440d6d0`) |
| 04-B | Runbook operativo: decisiones cerradas (Droplet único, same-origin, PM2, build in-situ, seeds Opción A), checklists de creación, `.env` con placeholders, orden de despliegue, admin sin password real, smoke test, rollback | Commiteado (`5bb933f`) |
| 04-C | Plan de artefactos: qué versionar, dónde (`docs/infra/templates/`, `scripts/deploy/`) | Commiteado (`05eed1b`) |
| 04-D | Artefactos reales: `nginx.staging.example.conf`, `ecosystem.config.example.js`, 2× `.env.staging.*.example`, `apply-migrations.sh` (ejecutable), `.gitignore` con `*.crt` | Commiteado (`189fd30`) |

La capa documental/plantillas de la serie está completa y verificada (`git log`, `git show --stat HEAD` en el checkpoint previo). No hay trabajo de planificación pendiente sobre staging — solo decisiones humanas y autorización explícita para pasar a ejecución real.

## 2. Decisiones humanas pendientes antes de crear recursos

| # | Decisión | Estado |
|---|---|---|
| 1 | Cuenta/billing de DigitalOcean lista (método de pago activo, proyecto creado en el panel) | No verificable desde el repo — pendiente de confirmación humana |
| 2 | Región del Droplet y de la BD Managed | Pendiente — recomendable la misma región para ambos |
| 3 | Tamaño de Droplet | Pendiente — sin datos de carga real para dimensionar (hueco heredado de INFRA-01) |
| 4 | Tamaño/plan de DO Managed PostgreSQL | Pendiente — depende de si el plan soporta `pgvector` (gate técnico de la sección 3) |
| 5 | Dominio/subdominio temporal o IP directa para el primer acceso | Pendiente — el runbook asume `<STAGING_DOMAIN>`; para el primer smoke test podría bastar la IP pública del Droplet sin dominio ni TLS |
| 6 | Acceso público o restringido | Pendiente — las contraseñas dev-only locales no son aptas para staging con red abierta; decidir si se restringe por IP allowlist/VPN antes del primer deploy |
| 7 | Estrategia mínima de backup | Pendiente, sin resolver desde INFRA-01 — confirmar si el plan de DO Managed PostgreSQL elegido incluye backups gestionados por defecto y si eso basta para el primer corte |
| 8 | Esperar a estabilizar el frontend paralelo o excluirlo del primer deploy | Pendiente — no mezclar sin decisión explícita |

Ninguna de estas 8 decisiones es resoluble por análisis de código — todas requieren confirmación humana explícita.

## 3. Secuencia go/no-go — DO Managed PostgreSQL

```
1. Crear la instancia (versión 17, región/plan ya decididos en la sección 2)
        │
2. Validar conexión: psql "$DATABASE_URL" -c "select version();"
        │  ¿conecta? ──NO──► ABORTAR: revisar trusted sources / SSL / credenciales antes de seguir
        │  SÍ
        ▼
3. Validar extensión vector:
   CREATE EXTENSION IF NOT EXISTS vector;
   SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
        │  ¿existe la extensión? ──NO──► GO/NO-GO: decidir si se posterga el módulo
        │                                 chatbot (única migración que la usa) y se
        │                                 continúa sin él, o se aborta hasta resolver
        │                                 disponibilidad de pgvector en el plan
        │  SÍ
        ▼
4. Continuar → aplicar las 25 migraciones (scripts/deploy/apply-migrations.sh)
```

Ningún paso de este bloque se ha ejecutado — es la secuencia a seguir cuando se autorice.

## 4. Secuencia go/no-go — Droplet

```
1. Crear Droplet (SO, región, tamaño ya decididos en la sección 2)
        │
2. Instalar dependencias base: Node 20.x, git, nginx, pm2 (npm install -g pm2)
        │
3. Configurar firewall: ufw allow OpenSSH, ufw allow 'Nginx Full', ufw enable
   (puertos 3000/3001 nunca expuestos directamente)
        │
4. Clonar repo (usuario no-root dedicado)
        │
5. Configurar env fuera del repo — copiar los placeholders de
   docs/infra/templates/.env.staging.backend.example y
   .env.staging.frontend.example, completar con valores reales
   SOLO en el Droplet, nunca en el repo
        │
6. Validar conexión + vector (bloque de la sección 3) — si no se hizo ya
   como parte de la creación de la BD
        │  ¿OK? ──NO──► ABORTAR, no continuar con migraciones
        │  SÍ
        ▼
7. Aplicar migraciones: scripts/deploy/apply-migrations.sh
   (DATABASE_URL revisado explícitamente antes de correrlo)
        │  ¿25/25 OK? ──NO──► detenerse en el primer fallo, reportar, no corregir sin autorización
        │  SÍ
        ▼
8. Crear admin seguro (comando SQL documentado en INFRA-04-B sección 9,
   password generado fuera de cualquier archivo versionado)
        │
9. Levantar PM2: pm2 start ecosystem.config.js (basado en
   docs/infra/templates/ecosystem.config.example.js), pm2 save, pm2 startup
        │
10. Configurar Nginx (basado en docs/infra/templates/nginx.staging.example.conf),
    nginx -t && systemctl reload nginx, TLS si ya hay dominio (sección 2, decisión 5)
        │
11. Smoke test: /health → login admin → /api/auth/me → frontend en navegador,
    F5, sidebar — mismo patrón ya validado en local (INFRA-03-F/G/H)
```

## 5. Riesgos que siguen abiertos

- `pgvector` no confirmado contra una instancia real (se resuelve recién en el paso 3 de la sección 3, no antes).
- Backup/restore sin estrategia definida (sección 2, punto 7) — sin esto, cualquier prueba destructiva en staging es irreversible.
- Sin logging de aplicación — Nginx access log + `console.error` como única fuente de diagnóstico.
- Node sin versión pineada en `package.json` (`engines` ausente) — instalar Node 20 "a mano" en el Droplet sin ese resguardo formal.
- Trabajo paralelo de frontend no estabilizado — riesgo de que el build in-situ (paso 7 de la sección 4) falle por código ajeno a infraestructura.
- Ninguna de las 8 decisiones humanas de la sección 2 está resuelta todavía — proceder sin ellas generaría trabajo a medias o recursos mal dimensionados desde el arranque.

## 6. Qué debe decir explícitamente una autorización futura para crear recursos reales

Para pasar a creación real de recursos en DigitalOcean, la autorización debe incluir, como mínimo:

1. Confirmación explícita de **"crear recursos ahora"** (no "continuemos" ni "sigamos" — algo inequívoco, dado que toda la serie INFRA-04 fue hasta ahora solo lectura/documental).
2. Respuestas a las 8 decisiones de la sección 2 (o indicación explícita de cuáles se delegan y cuáles no).
3. Confirmación de si el primer paso autorizado es **solo la BD Managed PostgreSQL** (para validar `pgvector` antes de comprometerse con el Droplet) o **BD + Droplet juntos**.
4. Confirmación de que se entiende que **crear recursos en DigitalOcean implica costo real (billing)**, a diferencia de todo lo hecho hasta ahora en esta serie.

## 7. Recomendación final

**Pausar la creación de recursos reales hasta resolver, como mínimo, las decisiones 1 (cuenta/billing), 4 (plan de BD con `pgvector`) y 7 (backup) de la sección 2.** El resto (región, tamaño de Droplet, dominio/IP, acceso público/restringido, frontend paralelo) son ajustables sobre la marcha sin gran costo, pero esas tres determinan si el primer recurso creado tiene sentido tal cual o si habría que abortarlo en el primer minuto (por ejemplo, si el plan de BD elegido no soporta `pgvector`, habría que recrear la instancia). La serie documental está lista para ejecutarse en cuanto se decida avanzar — no queda trabajo de planificación pendiente, solo decisiones humanas y la autorización explícita de la sección 6.

## `git status --short --untracked-files=all`

```
 M apps/frontend/components/modules/inventory/inventory-adjustments-create-page.tsx
 M apps/frontend/components/modules/postsales/use-replacement-search.ts
 M apps/frontend/components/modules/sales/pos/use-product-search.ts
 M apps/frontend/components/modules/transfers/transfers-request-page.tsx
 M apps/frontend/components/modules/transfers/transfers-shared.tsx
?? apps/frontend/hooks/use-debounced-api-search.ts
?? docs/working/reports/FRONTEND-STRUCTURE-01-legacy-map.md
?? docs/working/reports/INFRA-04-E-preflight-checklist.md
?? docs/working/reports/PRODUCT-SEARCH-01-frontend-search-roadmap.md
```

El único archivo generado por INFRA-04-E es este reporte. Todo lo demás es ajeno a esta serie (ver "Ajeno a esta fase" al inicio del documento). No se ejecutó `git add` ni commit. No se creó ningún recurso en DigitalOcean, no se tocó Supabase remoto, no se modificó código, seeds ni migraciones.
