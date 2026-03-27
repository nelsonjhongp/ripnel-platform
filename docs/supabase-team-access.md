# Acceso del equipo a Supabase

## Objetivo

Usar Supabase como PostgreSQL administrado sin acoplar la logica del ERP al frontend.

## Ver tambien

- [Workflow Backend y Supabase](./backend-supabase-workflow.md)
- [Flujo de producto](./product-flow.md)

## Quien necesita acceso

- Frontend-only: no necesita acceso directo a la base si el backend ya esta corriendo.
- Backend / data / migraciones: si necesita acceso al proyecto Supabase y a la cadena de conexion.

## Fuente de verdad del esquema

Revisar primero estas rutas:

1. `supabase/migrations/202603250001_ripnel_mvp_v2.sql`
2. `database/ripnel_mvp_v2.sql`
3. `apps/backend/src/modules`

No crear tablas manualmente sin reflejarlas en migraciones.

## Variables locales

### Backend

Copiar:

- `apps/backend/.env.example` -> `apps/backend/.env`

Completar:

- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`

### Frontend

Copiar:

- `apps/frontend/.env.example` -> `apps/frontend/.env.local`

Completar:

- `NEXT_PUBLIC_API_BASE_URL`

## De donde sacar `DATABASE_URL`

En Supabase:

1. Abrir el proyecto correcto.
2. Ir a `Project Settings`.
3. Ir a `Database`.
4. Copiar la cadena de conexion aprobada por el proyecto.

No subir nunca el password real al repositorio.

## Recomendacion de acceso

- 1 owner o admin: quien administra configuracion general y acceso.
- Backend o lider tecnico: admin o developer segun necesidad.
- Frontend puro: normalmente sin acceso directo al inicio.
- QA o analista: solo si realmente necesita revisar datos en dashboard.

## Comandos base

Desde la raiz del repo:

- `npm install`
- `npm run dev:backend`
- `npm run dev:frontend`

## Regla importante

El frontend no debe hablar directo con Supabase para operaciones del ERP. La app debe consumir el backend, y el backend debe hablar con PostgreSQL.
