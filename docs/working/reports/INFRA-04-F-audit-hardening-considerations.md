# INFRA-04-F: Consideraciones para staging DO tras el merge de audit-hardening (PR #24/#25)

> Fecha: 2026-07-08 | Depende de: `docs/working/reports/INFRA-04-A-do-readiness-audit.md`, `docs/working/reports/INFRA-04-E-preflight-checklist.md`
>
> Estado: **Addendum solo lectura.** No se crearon recursos en DigitalOcean, no se tocó Supabase remoto, no se modificó código, seeds ni migraciones. No se ejecutó `git add` ni commit. No se reabren ni editan `INFRA-04-A` ni `INFRA-04-E` (ya commiteados) — se sigue la misma convención usada en `INFRA-04-A` al corregir el conteo de migraciones de `INFRA-03-B/D`: la corrección queda registrada en el documento nuevo.

## Por qué existe este documento

Entre el cierre de la serie INFRA-04 (04-A a 04-E, todos commiteados el 2026-07-08) y ahora, se auditó en detalle el merge del PR #24/#25 de Ivan Manrique (`audit-hardening-f1-f7`, ya integrado a `main` desde el 2026-07-04). Ese trabajo trae hallazgos que afectan directamente al plan de staging ya documentado y que no estaban explícitos en `INFRA-04-A`/`E`.

## 1. El conteo de "25 migraciones" ya incluye audit-hardening — sin acción requerida

`INFRA-04-A` (sección 5) y `INFRA-04-E` (sección 1, fila 04-A) ya cuentan **25 migraciones** aplicadas contra el Postgres local, y ese conteo **ya incluye** las 3 migraciones del PR de Ivan:

- `202607040002_audit_logs.sql`
- `202607040003_fix_audit_trigger_tableoid.sql`
- `202607040004_fix_audit_trigger_tg_relid.sql`

Y las variables de entorno que ese mismo PR introdujo (`DB_SSL`, `DB_SSL_REJECT_UNAUTHORIZED`, `CA_CERT_PATH`) **ya están listadas** en `INFRA-04-A` sección 3. **No hace falta corregir nada en esos dos documentos por este punto** — el plan ya las contemplaba correctamente, aunque en ese momento no se había hecho la auditoría línea por línea del contenido del PR.

## 2. Hallazgo nuevo: gap de actor tracking en ventas/inventario/transferencias

El PR de Ivan agrega triggers `AFTER INSERT/UPDATE/DELETE` en 26 tablas (incluye `sales`, `sales_details`, `sales_payments`, `inventory`, `inventory_adjustments`, `stock_movements`, `stock_transfers`, `stock_transfer_lines`) que registran cada operación en `audit_logs`, leyendo el actor desde `current_setting('app.actor_user_id', true)` — una variable de sesión que el backend debe fijar explícitamente con `SET LOCAL` antes de escribir (helper `attachActor()` en `apps/backend/src/shared/db.js`).

**Confirmado por revisión de código:** de los servicios que manejan sus propias transacciones (`pool.connect()` + `begin`/`commit`), **solo `users.service.js` llama a `attachActor()`**. `sales.service.js` (1 transacción), `inventory.service.js` (2 transacciones) y `transfers.service.js` (4 transacciones) **no lo hacen**.

**Consecuencia:** en staging (y hoy mismo en local/Supabase), cada venta, ajuste de inventario o transferencia queda auditada con `actor_user_id = NULL` y `actor_role = NULL`. No rompe la operación — el trigger tolera actor nulo — pero vacía de sentido el propósito forense de la auditoría justo en las tablas de mayor volumen e interés (dinero y stock).

**No es un hallazgo de infraestructura, es un hallazgo de código** — no bloquea la creación de recursos DO, pero si el objetivo de staging incluye validar la auditoría como feature, el resultado esperado ("¿quién hizo esta venta?") va a fallar hasta que se cierre este gap. Vale la pena decidir explícitamente si se resuelve antes o después del primer deploy a staging.

## 3. Hallazgo nuevo: sin estrategia de volumen/retención para `audit_logs`

`audit_logs` es *append-only* por diseño (UPDATE/DELETE/TRUNCATE revocados del rol de aplicación — correcto para un ledger forense). Pero al estar enganchada a 26 tablas, incluidas las de mayor tráfico (`sales_details`, `stock_movements`), crece sin límite y sin ningún mecanismo de purga o archivado documentado en el repo. Esto no aparece en los riesgos ya listados en `INFRA-04-A` sección 9 ni en `INFRA-04-E` sección 5.

No es bloqueante para un primer corte de staging (volumen bajo, entorno descartable), pero si staging vive semanas o se reutiliza como base de producción, es una decisión pendiente a agregar a la lista de `INFRA-04-A` sección 10 / `INFRA-04-E` sección 2: **¿hay política de retención/archivado para `audit_logs`, o se asume crecimiento indefinido por ahora?**

## 4. Ampliación sugerida al smoke test de staging

`INFRA-04-E` sección 4, paso 11, define el smoke test post-deploy como `/health → login admin → /api/auth/me → frontend en navegador, F5, sidebar` — el mismo patrón ya validado en local (`INFRA-03-F/G/H`). Ese patrón **no verifica la feature de auditoría** en sí.

Sugerencia concreta para cuando se ejecute el smoke test real en staging: agregar un paso que confirme que una escritura real (por ejemplo, el login mismo no genera fila porque `users` no se toca en un login exitoso salvo `last_login`; mejor usar una operación de escritura explícita, como crear/editar una ubicación o un ajuste de inventario de prueba) efectivamente produce una fila en `audit_logs` con `table_name`/`operation` correctos — y, dado el hallazgo de la sección 2, documentar explícitamente si `actor_user_id` sale poblado o `NULL` según el módulo probado.

## 5. Resumen para decisión humana

No cambia ninguna de las 8 decisiones pendientes ya listadas en `INFRA-04-E` sección 2. Se agregan, para considerar junto con esas, dos preguntas nuevas:

| # | Decisión nueva | Bloqueante para crear recursos DO |
|---|---|---|
| 9 | ¿Cerrar el gap de `attachActor()` en sales/inventory/transfers antes del primer deploy a staging, o aceptar auditoría con actor `NULL` en esas tablas para el primer corte? | No — es cambio de código, no de infraestructura, pero afecta qué tan útil es el smoke test de auditoría (sección 4) |
| 10 | ¿Definir ya una política de retención/purga de `audit_logs`, o postergarla mientras staging sea de bajo volumen y descartable? | No |

Ninguna de las dos bloquea la secuencia go/no-go de `INFRA-04-E` secciones 3-4 tal como está escrita hoy.

## `git status --short --untracked-files=all`

```
 M apps/frontend/components/modules/inventory/inventory-adjustments-create-page.tsx
 M apps/frontend/components/modules/postsales/use-replacement-search.ts
 M apps/frontend/components/modules/sales/pos/use-product-search.ts
 M apps/frontend/components/modules/transfers/transfers-request-page.tsx
 M apps/frontend/components/modules/transfers/transfers-shared.tsx
?? apps/frontend/hooks/use-debounced-api-search.ts
?? docs/working/reports/FRONTEND-STRUCTURE-01-legacy-map.md
?? docs/working/reports/INFRA-04-F-audit-hardening-considerations.md
?? docs/working/reports/PRODUCT-SEARCH-01-frontend-search-roadmap.md
```

El único archivo generado por INFRA-04-F es este reporte. No se ejecutó `git add` ni commit. No se creó ningún recurso en DigitalOcean, no se tocó Supabase remoto, no se modificó código, seeds ni migraciones.
