# &#128085; RIPNEL Platform - MVP

ERP MVP de RIPNEL orientado a inventario, ventas, precios y transferencias internas, con una arquitectura portable: frontend separado, backend con logica de negocio y PostgreSQL administrado en Supabase.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22-43853D?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-1F2937?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Figma](https://img.shields.io/badge/Figma-Design-F24E1E?style=for-the-badge&logo=figma&logoColor=white)

## Descripcion

RIPNEL Platform busca cubrir el flujo base de un ERP comercial:

- catalogos operativos;
- ubicaciones;
- estilos de producto;
- variantes con SKU;
- precios;
- movimientos posteriores de inventario, ventas y transferencias.

El proyecto esta pensado para evolucionar por modulos, manteniendo la logica de negocio en backend y usando SQL explicito sobre PostgreSQL.

## Arquitectura del proyecto

| Ruta | Rol |
| --- | --- |
| `apps/frontend` | Aplicacion web en Next.js con App Router |
| `apps/backend` | API en Node.js + Express |
| `database` | Snapshots y referencias SQL |
| `supabase` | Migraciones, config local y seeds base |
| `docs` | Documentacion tecnica estable del proyecto |

## Stack y reglas base

- Frontend: Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, Radix UI.
- Backend: Node.js + Express + `pg`.
- Base de datos: PostgreSQL en Supabase.
- Persistencia: SQL explicito, sin ORM.
- Flujo ERP: el frontend consume backend; no habla directo con tablas para operaciones del negocio.

## Inicio rapido

```bash
npm install
npm run dev:backend
npm run dev:frontend
```

Frontend por defecto:

- `http://localhost:3000`

## Variables de entorno

### Backend

Crear `apps/backend/.env` a partir de `apps/backend/.env.example`.

Variables minimas:

- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`

### Frontend

Crear `apps/frontend/.env.local` a partir de `apps/frontend/.env.example`.

Variable minima:
## Flujo funcional actual

El flujo base de producto sigue este orden:
Editor de precios ahora selecciona por style_size_price_id y muestra style+talla en el selector.
Cambio en list-prices.tsx.
Antes buscaba por style_code (ambiguo si había varias tallas del mismo style).

## Changelog — 2026-04-23 (resumen de trabajo reciente)

Resumen profesional y ordenado de las acciones realizadas hoy (work in progress):

- Objetivo general: restaurar módulos faltantes, mejorar la estabilidad del pipeline de desarrollo y eliminar avisos críticos de ESLint que bloqueaban el build.

- Restauraciones principales:
	- `apps/frontend/app/(protected)/account-mockup/page.tsx` — archivo restaurado desde un commit previo y recuperado al working tree.

- Cambios operativos y de infraestructura:
	- Añadido pipeline básico de CI: `/.github/workflows/ci.yml` (instalación, lint, build y comprobaciones básicas).
	- Añadido `apps/backend/.env.example` con variables de entorno de ejemplo y placeholders operativos.

- Correcciones de código (frontend):
	- Resolución de múltiples avisos de ESLint sobre `react-hooks/set-state-in-effect`.
	- Estrategia aplicada: diferir llamadas que provocaban `setState` dentro de `useEffect` usando microtasks (`void Promise.resolve().then(...)`) para evitar actualizaciones de estado síncronas en el cuerpo del efecto.
	- Páginas corregidas (ejemplos representativos):
		- `apps/frontend/app/(protected)/bi/page.tsx`
		- `apps/frontend/app/(protected)/kardex/page.tsx`
		- `apps/frontend/app/(protected)/postventa/page.tsx`
		- `apps/frontend/app/(protected)/postventa/[saleId]/page.tsx`
		- `apps/frontend/app/(protected)/purchase-system/page.jsx`
		- otras páginas relacionadas con `inventory`, `dashboard`, `caja`, `administracion`.

- Estado actual y observaciones:
	- Los cambios están aplicados en el working tree; algunos archivos requieren commit.
	- Backend arrancable localmente (escucha en `3001` durante pruebas). Frontend en conflicto si hay una instancia previa en `3000`.
	- `npm ci` en CI fallará si no existe `package-lock.json` en el repo; se recomienda ejecutar `npm install` localmente y commitear `package-lock.json` para que `npm ci` funcione en GitHub Actions.

- Siguientes pasos recomendados (priorizados):
	1. Ejecutar localmente:

		 ```bash
		 npm.cmd install
		 npm.cmd --workspace @ripnel/frontend run lint
		 npm.cmd --workspace @ripnel/frontend run build
		 ```

	2. Verificar el estado del frontend dev server y detener instancias previas si es necesario (ej. `taskkill /PID <pid> /F` en Windows).
	3. Commit + push de los cambios (incluyendo `package-lock.json` si se genera):

		 ```bash
		 git add .
		 git commit -m "chore: restore account mockup; add CI; defer setState in effects to satisfy lint"
		 git push
		 ```

	4. Revisar CI en GitHub Actions y confirmar que `npm ci` + `next build` pasan en el pipeline.

---
Generado y añadido el 2026-04-23 como resumen del trabajo del día.
COMMIT
Si algo falla: ROLLBACK.
API real para pricing_rules implementada y conectada al frontend.
Nuevos archivos backend:
pricing-rules.repo.js
pricing-rules.service.js
pricing-rules.controller.js
pricing-rules.routes.js
Registro de rutas en app.js:
GET /api/pricing-rules
POST /api/pricing-rules
PATCH /api/pricing-rules/:ruleId
Vista rules conectada en list-prices.tsx:
Carga reglas reales
Crea regla si no existe
Edita regla existente
Muestra listado real de reglas

## Notas de ventas

- `document_type` se mantiene como dato comercial interno de la venta (`none`, `proforma`, `boleta`, `factura`).
- El backend ya no intenta emitir comprobantes externos ni expone colas/reintentos de emision.
- `sales_receipts` queda como legado de base de datos fuera del flujo activo actual.

## Documentacion tecnica

- [Workflow Backend + Supabase](./docs/backend-supabase-workflow.md)
- [Acceso del equipo a Supabase](./docs/supabase-team-access.md)
- [Flujo de producto](./docs/product-flow.md)
- [Scope de Ventas MVP Semana 9](./docs/sales-mvp-scope.md)
- [Flujo funcional de ventas](./docs/sales-flow.md)
- [Testing manual de ventas](./docs/testing-sales.md)
- [Readiness check de ventas](./docs/sales-readiness-check.md)
