# TRANSFERS-01-B — Revision de permisos de transferencias

Fecha: `2026-07-07`

## Objetivo

Contrastar el estado final de permisos de transferencias despues de las migraciones, con foco en `ADMIN`, `VENDEDOR/A` y `ALMACEN`.

## Fuentes revisadas

- `supabase/migrations/202603310001_auth_username_rbac.sql`
- `supabase/migrations/202604290001_home_transfer_request_permissions.sql`
- `supabase/migrations/202605200002_transfer_capabilities_rbac_hardening.sql`
- `supabase/migrations/202606010002_transfer_store_scope_rbac.sql`
- `supabase/migrations/202606020001_transfer_perm_expansion.sql`
- `supabase/migrations/202607020001_role_redesign_vendedora.sql`
- `apps/backend/src/modules/transfers/transfers-access.js`
- `apps/frontend/lib/capabilities.ts`

## Matriz final post migraciones

| Rol | transfers.manage | request.create | request.view_own | approve | ship | receive | cancel |
|---|---:|---:|---:|---:|---:|---:|---:|
| ADMIN | Si | Si | Si | Si | Si | Si | Si |
| VENDEDOR/A | No | Si | Si | Si | Si | Si | Si |
| ALMACEN | No | No | No | Si | Si | Si | Si |

## Lectura operativa

- `ADMIN` conserva acceso completo por `transfers.manage` y por sub-permisos explicitos.
- `VENDEDOR/A` reemplaza roles legacy de tienda/ventas/caja para operacion de tienda; puede crear, ver y ejecutar transferencias, pero no tiene `manage`, por lo que no accede a scope de red ni destino libre.
- `ALMACEN` queda como rol ejecutor: puede aprobar, despachar, recibir y cancelar; no puede crear solicitudes ni buscar candidatos.

## Conclusion sobre ALMACEN

La perdida de capacidad de crear/ver solicitudes no parece accidente.

Evidencia:

- `202605200002_transfer_capabilities_rbac_hardening.sql` borra y reasigna permisos transfer para `ADMIN`, `ALMACEN`, `TIENDA` y `VENTAS`; `ALMACEN` queda solo con `approve`, `ship`, `receive`, `cancel`.
- `202607020001_role_redesign_vendedora.sql` ratifica el diseno: el comentario de fase de `ALMACEN` indica remover `transfers.manage` y mantener sub-permisos explicitos.
- La lista final de `ALMACEN` excluye `transfers.request.create` y `transfers.request.view_own`.

Interpretacion: `ALMACEN` es ejecutor logistico, no iniciador de solicitudes.

## Contradicciones o riesgos

### `admin.manage` como super-gate

Backend y frontend tratan `admin.manage` como permiso maestro dentro de la resolucion de capacidades:

- `apps/backend/src/modules/transfers/transfers-access.js`
- `apps/frontend/lib/capabilities.ts`

Esto es redundante para `ADMIN`, porque `ADMIN` ya recibe `transfers.manage` y los sub-permisos. El riesgo real es semantico: `admin.manage` se describe como administracion de roles, usuarios y ubicaciones, no como super-admin transversal.

Precaucion: en frontend, `hasPermission` dentro de `apps/frontend/lib/capabilities.ts` no es exclusivo de transferencias; tambien lo usa `resolveCashCapabilities`. Quitar `admin.manage` ahi como limpieza rapida puede afectar mas que transferencias si en algun entorno un admin no recibe permisos de caja explicitos.

### `request.view_own` y visibilidad de ALMACEN

Aunque `ALMACEN` no tiene `transfers.request.view_own`, el backend/frontend calculan `visible=true` si el usuario tiene cualquier capacidad operativa (`approve`, `ship`, `receive`, `cancel`). Funcionalmente puede ver bandeja/detalle; semanticamente el permiso `request.view_own` no representa toda la visibilidad real.

## Recomendacion minima

1. Mantener `ALMACEN` como ejecutor, no solicitante, salvo decision explicita de producto.
2. No agregar `transfers.request.create` a `ALMACEN` por defecto.
3. Documentar en la especificacion funcional que `ALMACEN` ve transferencias por permisos de ejecucion aunque no tenga `request.view_own`.
4. No limpiar `admin.manage` de forma global en `capabilities.ts` sin revisar caja y sidebar. Si se decide limpiar, separar helpers por dominio o verificar `cash` y rutas relacionadas.

## Siguiente decision

Antes de implementar migraciones o UX mayor, confirmar:

- `ALMACEN` seguira sin crear solicitudes.
- `ALMACEN` puede ver bandeja/detalle por permisos de ejecucion.
- `admin.manage` se mantiene como super-gate temporal o se planifica una limpieza transversal aparte.
