# RIPNEL Project Guide

## Purpose

This repository is the MVP of RIPNEL, an ERP focused on inventory, sales, pricing and internal transfers.

The current goal is to keep the architecture portable:

- frontend in `apps/frontend`
- backend in `apps/backend`
- PostgreSQL hosted on Supabase for now
- business logic in backend, not in frontend
- SQL explicit with `pg`, no ORM

## Current structure

- `apps/frontend`: Next.js app router UI
- `apps/backend`: Node.js + Express API
- `database`: SQL snapshots and reference scripts
- `supabase`: local Supabase config and migrations

## Source of truth

When you need to understand the domain or schema, inspect these first:

1. `supabase/migrations/202603250001_ripnel_mvp_v2.sql`
2. `database/ripnel_mvp_v2.sql`
3. `apps/backend/src/modules/*`

Do not invent tables or fields if the migration already defines them.

## Architecture rules

- Frontend must call backend APIs for ERP operations.
- Backend treats Supabase as managed PostgreSQL.
- Do not use `supabase-js` as backend foundation.
- Do not connect frontend directly to database tables for ERP flows.
- Keep CommonJS in backend.
- Keep explicit SQL.
- Prefer small modular files over large mixed controllers.

## Frontend stack

- Next.js 16
- React 19
- Tailwind CSS 4
- shadcn/ui
- Radix UI primitives
- lucide-react icons
- `class-variance-authority`, `clsx`, `tailwind-merge`

## Frontend UI direction

- ERP-like layout, clean and operational.
- Compact spacing in sidebar and topbar.
- Prefer practical pages over decorative dashboards.
- Use the existing sidebar shell and keep navigation aligned with real modules.
- Avoid links to modules that do not exist unless there is an intentional placeholder page.
- Use `ripnel-logo.svg` when appropriate, but optimize heavy assets before production.

## Backend conventions

- `src/config`: env and config
- `src/middlewares`: express middleware
- `src/modules/<module>`:
  - `*.routes.js`
  - `*.controller.js`
  - `*.service.js`
  - `*.repo.js`
- `src/shared`: db and shared errors

## Current API baseline

- `GET /health`
- `GET /api/roles`
- `GET /api/locations`
- `POST /api/locations`

## Current business modules visible in UI

- Inicio
- Administracion
  - Usuarios
  - Roles
  - Ubicaciones
- Catalogos
- Productos
- Precios
- Transferencias
- Venta rapida

## Domain notes

For products, the current schema already suggests this flow:

- `product_styles`
- `style_sizes`
- `style_colors`
- `product_variants`
- `style_size_prices`
- `pricing_rules`

So product creation should be built around styles first, then sizes/colors, then variants, then prices.

## Environment

Backend:

- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`

Frontend:

- `NEXT_PUBLIC_API_BASE_URL`

## Working style

- Reuse existing modules before creating new ones.
- Prefer progressive completion over large rewrites.
- Keep pages functional even if the module is incomplete.
- If a module is not ready, use an intentional placeholder instead of a dead link.
- When changing layout, adjust sidebar, topbar and content together so proportions stay coherent.

## Next priorities

Recommended order for the next modules:

1. `Ubicaciones`
2. `Usuarios`
3. `Roles`
4. `Estilos`
5. `Variantes`
6. `Precios`

