# INFRA-04-D: Artefactos versionados de deploy para staging

> Fecha: 2026-07-08 | Depende de: `docs/working/reports/INFRA-04-C-deploy-artifacts-plan.md`
>
> Resumen breve, solo archivos creados/modificados y `git status --short` final. No se creó ningún recurso en DigitalOcean, no se tocó Supabase remoto, no se modificó código de aplicación, seeds ni migraciones. No se ejecutó `git add` ni commit.

## Archivos creados

- `docs/infra/templates/nginx.staging.example.conf`
- `docs/infra/templates/ecosystem.config.example.js`
- `docs/infra/templates/.env.staging.backend.example`
- `docs/infra/templates/.env.staging.frontend.example`
- `scripts/deploy/apply-migrations.sh` (con permiso de ejecución)

## Archivo modificado

- `.gitignore` — agregada la línea `*.crt` (junto a `*.pem` ya existente), sin tocar ninguna otra regla.

## Ajeno a esta fase

Los cambios en `apps/frontend/...` y `apps/frontend/hooks/use-debounced-api-search.ts`, y los reportes `FRONTEND-STRUCTURE-01-*`/`PRODUCT-SEARCH-01-*`, corresponden al trabajo paralelo de búsqueda/POS ya señalado en `INFRA-03-H`/`INFRA-04-A`/`INFRA-04-B`/`INFRA-04-C` — no se tocaron en INFRA-04-D.

## `git status --short` final

```
 M .gitignore
 M apps/frontend/components/modules/inventory/inventory-adjustments-create-page.tsx
 M apps/frontend/components/modules/postsales/use-replacement-search.ts
 M apps/frontend/components/modules/sales/pos/use-product-search.ts
 M apps/frontend/components/modules/transfers/transfers-request-page.tsx
 M apps/frontend/components/modules/transfers/transfers-shared.tsx
?? apps/frontend/hooks/use-debounced-api-search.ts
?? docs/infra/
?? docs/working/reports/FRONTEND-STRUCTURE-01-legacy-map.md
?? docs/working/reports/INFRA-04-D-deploy-artifacts.md
?? docs/working/reports/PRODUCT-SEARCH-01-frontend-search-roadmap.md
?? scripts/deploy/
```

No se ejecutó `git add` ni commit.
