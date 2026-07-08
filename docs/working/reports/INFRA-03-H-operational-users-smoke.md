# INFRA-03-H: Smoke test frontend con usuarios operativos locales (`almacen`, `vendedor`)

> Fecha: 2026-07-08 | Depende de: `docs/working/reports/INFRA-03-G-frontend-local-smoke.md` (frontend local validado con `admin`, sin sede por defecto)
>
> Estado: **Smoke test manual exitoso con ambos usuarios operativos.** Ejecutado y reportado por el usuario en navegador real. El agente no ejecutó los comandos ni las interacciones de esta fase — no hay navegador conectado ni servidor de preview disponible en este entorno (verificado antes de esta fase); este documento registra la trazabilidad a partir del resultado reportado.
>
> **Advertencia — repo público, sin secretos reales.** Las credenciales mencionadas (`almacen` / `LocalDevAlmacen123`, `vendedor` / `LocalDevVendedor123`) son dev-only, pertenecen exclusivamente a los usuarios sembrados por `database/seed_local_dev_users.sql` (INFRA-03-C3) en el contenedor descartable `ripnel-postgres-local`, y no protegen nada real. No se leyó ni se incluyó contenido de ningún `.env` real.

## Qué se validó

Con la pila local completa ya en pie (`ripnel-postgres-local` con 24/24 migraciones y 8/8 seeds — INFRA-03-B/D; backend en `http://localhost:3001` — INFRA-03-F; frontend en `http://localhost:3000`, Modo A sin `NEXT_PUBLIC_API_BASE_URL` — mismo modo ya validado en INFRA-03-G), se probaron por primera vez los dos usuarios operativos con sede por defecto asignada (`almacen`→`ALM-CENT`, `vendedor`→`TD-CENT`), a diferencia de INFRA-03-G que solo cubrió `admin` (sin sede). El objetivo específico era confirmar si, con sede asignada, las pantallas que en INFRA-03-G mostraban un aviso de falta de sede se comportan correctamente — y si el sidebar/permisos por rol se ven coherentes con el modelo vigente (`ALMACEN` con 7 permisos, `VENDEDOR/A` con 19, confirmados a nivel de base de datos en INFRA-03-D).

## Usuario `almacen`

| Campo | Valor |
|---|---|
| Usuario | `almacen` |
| Rol | `ALMACEN` |
| Sede esperada | Almacén Central / `ALM-CENT` |
| Login | OK |
| Sesión tras F5 | OK (se mantiene) |
| Aviso de falta de sede | **No apareció** — a diferencia de `admin` en INFRA-03-G |
| Usuario mostrado en UI | Almacen Local Dev |
| Rol mostrado en UI | `ALMACEN` |

**Sidebar observado:** Inicio, Dashboard, Inventario / Stock, Transferencias.

**Rutas probadas:**
| Ruta | Resultado |
|---|---|
| `/inicio` | OK |
| `/inventario` | OK |
| `/inventario/movimientos` (kardex/movimientos) | OK |
| `/inventario/ajustes` | OK |
| `/inventario/ajustes/nuevo` | OK |

**Resultado general:** flujo operativo de almacén correcto en local.

## Usuario `vendedor`

| Campo | Valor |
|---|---|
| Usuario | `vendedor` |
| Rol | `VENDEDOR/A` |
| Sede esperada | Tienda Centro / `TD-CENT` |
| Login | OK |
| Sesión tras F5 | OK (se mantiene) |
| Aviso de falta de sede | **No apareció** |
| Usuario mostrado en UI | Vendedor Local Dev |
| Rol mostrado en UI | `VENDEDOR/A` |

**Sidebar observado:** Inicio, Dashboard, Operaciones, Ventas, Postventa, Caja, Clientes, Inventario, Stock actual, Movimientos de stock, Ajustes de inventario, Transferencias, Catálogos, Productos, Precios — sensiblemente más amplio que el de `almacen`, coherente con que `VENDEDOR/A` tiene 19 permisos asignados frente a los 7 de `ALMACEN` (INFRA-03-D).

**Rutas probadas:**
| Ruta | Resultado |
|---|---|
| `/inicio` | OK |
| `/ventas/nueva` | OK (ver observación abajo) |
| `/caja` | OK |
| `/transferencias` | OK |

**Redirecciones por rutas no permitidas:** OK — el frontend redirige correctamente según los permisos esperados del rol.

**Resultado general:** flujo operativo de vendedor correcto en local.

## Comparación con INFRA-03-G (usuario `admin`)

La hipótesis planteada al cierre de INFRA-03-G queda confirmada: el aviso de falta de sede que aparecía con `admin` (sin sede por defecto asignada por diseño de los seeds) **no aparece** con `almacen` ni con `vendedor`, ambos con sede por defecto asignada por `database/seed_local_dev_users.sql`. Esto refuerza que el aviso está correctamente ligado a la ausencia de sede, no a un problema de infraestructura — sigue siendo una decisión de producto/UX pendiente (ver Pendientes) si `admin` debería tener sede asignada o si las pantallas deben tolerar `ADMIN` sin sede explícitamente.

## Observaciones

- **Warning de React en `/ventas/nueva` (fuera de alcance de esta fase):** al navegar a `/ventas/nueva` con el usuario `vendedor` apareció el warning *"React has detected a change in the order of Hooks called by NuevaVentaPage"*, con stack en `useDebouncedApiSearch` → `useProductSearch` → `usePosSale` → `NuevaVentaPage`. Según el reporte del usuario, coincidió con un proceso paralelo trabajando sobre ese mismo flujo de búsqueda/POS al momento de la prueba — **no se marca como fallo de infraestructura local** ni bloquea el resultado de INFRA-03-H. Queda como observación pendiente de reproducción en una tarea separada de frontend/POS, no de esta serie de infraestructura.
- **Alcance de la validación:** esta fase confirma que login, sesión persistente, sidebar por rol, sedes por defecto y navegación básica funcionan correctamente para los tres usuarios dev-only ya sembrados (`admin`, `almacen`, `vendedor`) sobre la pila 100% local. No se probó ningún flujo transaccional completo (crear una venta real, hacer un ajuste de inventario real, aprobar una transferencia) — solo que las pantallas cargan y el acceso por rol es coherente.

## Pendientes

- **Decisión de producto/UX sobre `admin` sin sede** (heredado de INFRA-03-G) — sigue sin resolverse; no es bloqueante para infraestructura.
- **Reproducir y triar el warning de Hooks de `/ventas/nueva`** en una tarea de frontend/POS separada, una vez que el trabajo paralelo sobre ese flujo (mencionado por el usuario) esté estable — no corresponde a esta serie INFRA-03.
- **No se probó ningún flujo transaccional completo** (venta, ajuste, transferencia de punta a punta) con ninguno de los tres usuarios — sigue pendiente de una fase posterior si se decide ir más allá del smoke test de infraestructura.
- **Suite de tests automatizados del backend contra `ripnel-postgres-local`** — sigue pendiente, heredado de INFRA-03-E/F.
- **Modo B (`NEXT_PUBLIC_API_BASE_URL` cross-origin) no se reprobó con `almacen`/`vendedor`** — INFRA-03-G solo lo probó con `admin`; si se considera necesario, sería una fase adicional, no bloqueante.

## `git status --short` final

```
 M apps/frontend/components/modules/inventory/inventory-adjustments-create-page.tsx
 M apps/frontend/components/modules/postsales/use-replacement-search.ts
 M apps/frontend/components/modules/sales/pos/use-product-search.ts
 M apps/frontend/components/modules/transfers/transfers-request-page.tsx
?? apps/frontend/hooks/use-debounced-api-search.ts
?? docs/working/reports/INFRA-03-H-operational-users-smoke.md
?? docs/working/reports/PRODUCT-SEARCH-01-frontend-search-roadmap.md
```

Los cuatro archivos modificados y `apps/frontend/hooks/use-debounced-api-search.ts` (nuevo) **no fueron tocados por esta fase ni por el agente** — corresponden al proceso paralelo mencionado en la observación de esta misma fase (trabajo sobre el flujo de búsqueda/POS, coincide con el stack del warning de Hooks reportado). `docs/working/reports/PRODUCT-SEARCH-01-frontend-search-roadmap.md` tampoco fue creado por esta fase. El único archivo generado por INFRA-03-H es este reporte. No se ejecutó `git add` ni commit.
