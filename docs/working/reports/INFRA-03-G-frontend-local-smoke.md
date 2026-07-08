# INFRA-03-G: Smoke test manual del frontend local contra backend local y PostgreSQL local

> Fecha: 2026-07-08 | Depende de: `docs/working/reports/INFRA-03-F-backend-local-smoke.md` (backend local validado contra `ripnel-postgres-local`), diagnóstico previo en conversación (INFRA-03-G diagnóstico: Modo A/B, `NEXT_PUBLIC_API_BASE_URL`, riesgos de CORS/cookies)
>
> Estado: **Smoke test manual exitoso en ambos modos (A y B)**, ejecutado y reportado por el usuario. Este documento registra la trazabilidad; el agente no ejecutó los comandos en esta sesión, solo los documenta a partir del resultado reportado. Working tree confirmado limpio antes de esta fase.
>
> **Advertencia — repo público, sin secretos reales.** Las credenciales mencionadas (`admin` / `LocalDevAdmin123`) son dev-only, pertenecen exclusivamente al usuario sembrado por `database/seed_local_dev_users.sql` (INFRA-03-C3) en el contenedor descartable `ripnel-postgres-local`, y no protegen nada real. No se leyó ni se incluyó contenido de ningún `.env` real.

## Qué se validó

Con `ripnel-postgres-local` (24/24 migraciones, 8/8 seeds — INFRA-03-B/D) y el backend local ya corriendo en `http://localhost:3001` (INFRA-03-F), se levantó el frontend local en `http://localhost:3000` y se probó el flujo completo de autenticación y navegación autenticada desde un navegador real, en los dos modos de conexión frontend↔backend descritos en el diagnóstico previo (Modo A: same-origin vía `rewrites()` de Next; Modo B: cross-origin explícito vía `NEXT_PUBLIC_API_BASE_URL`). Esta es la primera validación de punta a punta de la pila completa (UI → API → PostgreSQL) sobre infraestructura enteramente local.

## Modo A — `NEXT_PUBLIC_API_BASE_URL` sin definir (same-origin vía proxy de Next)

**Comando:**
```powershell
Remove-Item Env:NEXT_PUBLIC_API_BASE_URL -ErrorAction SilentlyContinue
npm run dev:frontend
```

**Resultado:** frontend levantó correctamente en `http://localhost:3000`.

**Login:** `admin` / `LocalDevAdmin123` — login correcto, navegación autenticada correcta.

**Rutas visitadas/cargadas:**
- `/inicio`
- `/ventas/nueva`
- `/cuenta`
- `/panel`
- `/transferencias/solicitar`
- `/transferencias`
- `/caja`

Sin errores de CORS ni bloqueo de sesión en ninguna de las 7 rutas.

## Modo B — `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001` (cross-origin explícito)

**Comando:**
```powershell
$env:NEXT_PUBLIC_API_BASE_URL="http://localhost:3001"
npm run dev:frontend
```

**Resultado:** frontend levantó correctamente.

**Login:** `admin` / `LocalDevAdmin123` — login correcto, navegación autenticada correcta.

**Rutas visitadas/cargadas:**
- `/inicio`
- `/caja`

Sin errores de CORS ni bloqueo de cookies — confirma empíricamente lo anticipado en el diagnóstico previo: aunque `localhost:3000` y `localhost:3001` son orígenes distintos, al ser mismo *site* las cookies `SameSite=Lax` (emitidas por el backend en `NODE_ENV=development`) viajan correctamente en el fetch cross-origin, y la lista de permitidos de CORS del backend (`app.js`, bypass de dev para `localhost`/IP privada) aceptó el origen del frontend sin fricción.

## Observaciones

- **Usuario `admin` sin sede por defecto:** en algunas pantallas apareció una indicación relacionada con falta de sede/ubicación, porque el usuario dev `admin` no tiene sede por defecto asignada. Esto es consistente con el propio diseño de los seeds: tanto `database/seed_local_dev_users.sql` (INFRA-03-C3) como `database/seed_operational_mvp.sql` asignan sede por defecto solo a los usuarios operativos (`almacen`→`ALM-CENT`, `vendedor`→`TD-CENT`), y deliberadamente **no** asignan ninguna a `admin` — no es un error de seed, sino un supuesto implícito de que `ADMIN` opera sin restricción de sede única. No bloqueó el smoke test de infraestructura (login, sesión, navegación funcionaron igual), pero expone una pregunta de producto/UX no resuelta: si algunas pantallas dependen de tener una sede activa para renderizar correctamente, hay que decidir si el usuario `ADMIN` debe tener una sede por defecto asignada (dev y/o real) o si esas pantallas deben tolerar explícitamente un `ADMIN` sin sede.
- **Warning de LCP por `/ripnel-logo.svg`:** Next mostró una advertencia de rendimiento (Largest Contentful Paint) relacionada con el logo. No bloquea esta fase — es una observación de performance de UI, no de infraestructura.

## Pendientes

- **Decidir el tratamiento de `admin` sin sede por defecto** (ver Observaciones) — requiere una decisión de producto/UX, no una corrección de infraestructura; no se tocó ningún seed en esta fase.
- **No se probaron `almacen` ni `vendedor`** en el frontend — el smoke test de esta fase, igual que el de INFRA-03-F, solo cubrió `admin`. Sigue pendiente validar visualmente el sidebar y las pantallas permitidas para los otros dos roles vigentes.
- **No se completó ningún flujo transaccional de punta a punta** (por ejemplo, una venta o una transferencia completa) — se confirmó que las pantallas cargan y la sesión se mantiene, no que una operación de negocio completa funcione correctamente contra los datos sembrados.
- **El warning de LCP del logo** queda como mejora de performance a evaluar en otro momento, fuera del alcance de esta serie de fases de infraestructura.
- Sigue pendiente, heredado de INFRA-03-F: correr la suite de tests automatizados del backend contra `ripnel-postgres-local`, y verificar el contenido completo del array `permissions` (no solo que el sidebar se vea razonable).

## `git status --short` final

```
?? docs/working/reports/INFRA-03-G-frontend-local-smoke.md
```

Único archivo sin trackear: este mismo reporte. No se creó, modificó ni tocó ningún archivo de código, seed o migración en esta fase. No se ejecutó `git add` ni commit.
