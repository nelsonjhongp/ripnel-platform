# Supabase Team Access

## Objetivo

Usar Supabase como PostgreSQL administrado sin acoplar la logica del ERP al frontend.

## Quien necesita acceso

- Frontend-only: no necesita acceso directo a la base si el backend ya esta corriendo.
- Backend / data / migraciones: si necesita acceso al proyecto Supabase y a la cadena de conexion.

## Fuente de verdad del esquema

Usar primero estas rutas:

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

## De donde sacar DATABASE_URL

En Supabase:

1. Abrir el proyecto correcto
2. Ir a `Project Settings`
3. Ir a `Database`
4. Copiar la cadena de conexion aprobada por el proyecto

No subir nunca el password real al repositorio.

## Hace falta invitar miembros en Supabase

No siempre.

- Si una persona solo va a trabajar frontend y usara un backend ya configurado, no necesita acceso directo a Supabase.
- Si una persona va a tocar backend, SQL, migraciones o revisar datos desde el dashboard, si conviene invitarla al proyecto u organizacion.

Segun la documentacion oficial de Supabase, los miembros se invitan desde los ajustes de equipo de la organizacion y se les puede asignar rol segun el nivel de acceso. Si el plan lo permite, tambien existen roles con alcance por proyecto.

Recomendacion practica para RIPNEL:

- 1 owner o admin: la persona que administra facturacion, configuracion y acceso general.
- backend / lider tecnico: admin o developer segun necesidad.
- frontend puro: normalmente sin acceso a Supabase al inicio.
- analista de datos o QA que necesite mirar dashboard: solo si realmente lo necesita.

Si todavia estan empezando y son pocos, no es obligatorio invitar a todos desde el dia uno. Pueden avanzar compartiendo la guia de entorno y dejando que solo una o dos personas manejen Supabase al principio.

## Flujo recomendado del equipo

1. `git pull`
2. Copiar archivos `.env`
3. Instalar dependencias
4. Levantar backend
5. Levantar frontend

## Comandos base

Desde la raiz del repo:

- `npm run dev:backend`
- `npm run dev:frontend`

## Nota sobre dependencias

El repo usa workspaces y se espera un solo `package-lock.json` en la raiz.

## Regla importante

El frontend no debe hablar directo con Supabase para operaciones del ERP. La app debe consumir el backend, y el backend debe hablar con PostgreSQL.
