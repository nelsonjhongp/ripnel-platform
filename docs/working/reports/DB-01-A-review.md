# DB-01-A - Revision factual aceptada

## Alcance y fecha

Revision factual aceptada el 2026-07-05 sobre la dependencia actual de RIPNEL respecto de Supabase PostgreSQL y la portabilidad futura hacia otro PostgreSQL gestionado. No incluyo cambios tecnicos, infraestructura, migraciones ni decisiones de despliegue.

## Hallazgo central

RIPNEL usa Supabase como PostgreSQL gestionado. La aplicacion no depende operativamente de Supabase Auth, Storage, Realtime, Edge Functions, RLS ni APIs cliente para los flujos ERP actuales.

## Portabilidad

La arquitectura actual, con frontend Next.js consumiendo el backend Express y backend usando `pg` contra PostgreSQL, no requiere refactor de frontend ni backend para usar otro PostgreSQL gestionado compatible.

## Compatibilidad y riesgos futuros

Una migracion futura debe ensayar extensiones PostgreSQL, triggers, funciones, grants/roles especificos como `anon` y `authenticated`, datos vivos, TLS, backups, restore y rollback. Estos puntos pertenecen a un ensayo futuro y no se ejecutan ahora.

## Decision actual

Mantener Supabase durante desarrollo, pruebas e integracion.

## Decision diferida

`DEP-01-B` y `DB-01-B` solo se reactivan tras una decision explicita de readiness para staging/produccion, despues de revisar y estabilizar modulos criticos del ERP.

## Fuera de alcance

No se aprobo Docker, Nginx, VPS, migracion de base de datos, cambio de proveedor, cambio de conexion ni implementacion tecnica asociada.
