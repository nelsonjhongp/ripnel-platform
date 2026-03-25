# RIPNEL Platform

Repositorio base del MVP de inventario y ventas de RIPNEL.

## Estructura

- `apps/frontend`: aplicacion web en Next.js.
- `apps/backend`: utilidades y servicios de backend.
- `database`: scripts SQL y snapshots de esquema.
- `supabase`: configuracion local y migraciones.

## Seguridad y entorno

- Los archivos `.env` no se suben al repositorio.
- El backend debe usar `apps/backend/.env` solo en local.
- El archivo compartible es `apps/backend/.env.example`, con placeholders sin secretos.
- `supabase/.temp` y otros estados locales quedan ignorados.

## Puesta en marcha

1. Instala dependencias del frontend con `npm install --workspace @ripnel/frontend`.
2. Instala dependencias del backend con `npm install --workspace @ripnel/backend`.
3. Crea `apps/backend/.env` a partir de `apps/backend/.env.example`.
4. Levanta el frontend con `npm run dev:frontend`.

## Nota

Si mas adelante agregas variables de entorno en frontend, sigue el mismo patron: archivo local fuera de Git y un `.env.example` con valores de muestra.
