# Cash Module — Improvement Plan

Plan de mejora incremental para el modulo de caja. Organizado en 3 tiers por impacto y esfuerzo. Cada tier es independiente y puede ejecutarse por separado.

---

## Resumen ejecutivo

| Tier | Alcance | Esfuerzo | Riesgo | Valor |
|------|---------|----------|--------|-------|
| **Tier 1** | Correcciones sin BD | 3-4h | Bajo | Arregla bugs, mejora UX inmediata |
| **Tier 2** | Arqueo minimo (migracion ligera) | 4-6h | Medio | El dueño ve si cuadra sistema vs fisico |
| **Tier 3** | Trazabilidad completa | 8-12h | Alto | Auditoria real, no se pierden totales anteriores |

---

## Tier 1 — Correcciones sin migracion

### 1.1 `actionError` huerfano en `use-cash-page.ts`

**Problema:** El estado `actionError` se declara y se limpia (`setActionError(null)`), pero nunca se setea en los catch. El componente renderiza `actionError` en un `InlineStatusCard`, pero siempre sera null.

**Archivo:** `apps/frontend/components/modules/cash/use-cash-page.ts`

**Fix:**
- En `handleOpen` catch: agregar `setActionError(explainApiError(err, CAJA.toast.openError.fallback))`
- En `handleClose` catch: agregar `setActionError(explainApiError(err, CAJA.toast.closeError.fallback))`
- Mantener el toast (showError) — el error inline y el toast coexisten para diferentes necesidades

### 1.2 Mostrar nombre de sede en pagina principal

**Problema:** El `PosHeader` en `/caja` solo muestra la fecha. La sede es informacion util para operadores multi-sede. En el dialogo de apertura, el campo "Sede" muestra `—` hardcodeado en vez del nombre real.

**Archivo:** `apps/frontend/components/modules/cash/cash-page.tsx:116-123, 401-402`

**Fix:**
- En `PosHeader.meta`: agregar `defaultLocation?.name` junto a la fecha
- En dialogo de apertura: usar `defaultLocation?.name` en vez de `CAJA.fallback.dash`

### 1.3 Extraer dialogos de `cash-page.tsx`

**Problema:** `cash-page.tsx` tiene 435 lineas. Los dialogos de apertura (~55 lineas) y cierre (~80 lineas) estan inline. Conviene extraerlos a componentes separados siguiendo el patron `pos-dialogs/`.

**Archivos a crear:**
- `components/modules/cash/cash-dialogs/cash-open-dialog.tsx`
- `components/modules/cash/cash-dialogs/cash-close-dialog.tsx`

**Archivo a modificar:** `cash-page.tsx` (reducir ~130 lineas)

### 1.4 Fix reapertura admin — solo deshabilitar fila clickeada

**Problema:** En `cash-control-page.tsx:443`, el boton "Reabrir" usa `disabled={reopeningCash}` que es un booleano global. Al hacer click en reabrir una sesion, TODOS los botones de reabrir en la tabla se deshabilitan.

**Archivo:** `apps/frontend/components/modules/cash/use-cash-admin.ts`, `cash-control-page.tsx`

**Fix:**
- Cambiar `reopeningCash: boolean` → `reopeningId: string | null` en el hook
- En el boton: `disabled={reopeningId !== null}` (deshabilita todos, acceptable)
- Mejor aun: `disabled={reopeningId === closing.cash_closing_id}` (solo la clickeada)

---

## Tier 2 — Arqueo minimo (migracion ligera)

### Objetivo

Permitir que al abrir se declare un saldo inicial y al cerrar un saldo fisico. El sistema calcula la diferencia `total_all - closing_balance_declared` y la muestra como sobrante/faltante.

### 2.1 Migracion SQL

```sql
-- Migracion: YYYYMMDDHHMM_cash_balance_columns.sql
BEGIN;

ALTER TABLE cash_closings
  ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0
    CHECK (opening_balance >= 0),
  ADD COLUMN IF NOT EXISTS closing_balance_declared NUMERIC(12,2);

COMMIT;
```

### 2.2 Backend — ajustar `openCash`

**Archivo:** `apps/backend/src/modules/cash/cash.service.js`

- Aceptar `opening_balance` en el body (Zod schema: `z.number().min(0).optional()`)
- Pasarlo al INSERT en `cash.repo.js`
- Incluir `opening_balance` en la respuesta serializada

### 2.3 Backend — ajustar `closeCash`

- Aceptar `closing_balance_declared` en el body (Zod: `z.number().min(0).optional()`)
- Guardarlo en el UPDATE
- En la respuesta, incluir `closing_balance_declared` y `difference = total_all - closing_balance_declared`

### 2.4 Backend — ajustar `getCashClosingById` y `getCurrentCash`

- Incluir `opening_balance`, `closing_balance_declared` en la proyeccion del repo

### 2.5 Frontend — dialogo de apertura

**Archivo:** `cash-open-dialog.tsx` (creado en Tier 1.3)

- Agregar campo `opening_balance` (input numerico con `opsInputCompact`)
- Label: "Saldo inicial"
- Placeholder: "0.00"
- Validar >= 0

### 2.6 Frontend — dialogo de cierre

**Archivo:** `cash-close-dialog.tsx` (creado en Tier 1.3)

- Agregar campo `closing_balance_declared` (input numerico)
- Label: "Efectivo declarado"
- Tooltip: "Cuanto dinero fisico hay realmente en caja"

### 2.7 Frontend — pagina principal

- Si `closing_balance_declared` existe, mostrar diferencia en la seccion de metricas: "Sobrante: S/. +X.XX" o "Faltante: S/. -X.XX"

### 2.8 Frontend — detalle de cierre

- Agregar filas en panel "Consistencia":
  - Saldo inicial
  - Total sistema
  - Efectivo declarado
  - Diferencia (verde si cuadra, rojo/ambar si no)

### 2.9 Frontend — tipos y mensajes

**Tipos nuevos en `cash-types.ts`:**
```ts
interface CashClosing {
  // ... existentes
  opening_balance: number
  closing_balance_declared: number | null
}
```

**Mensajes nuevos en `cash-messages.ts`:**
```ts
export const CAJA = {
  // ... existentes
  openDialog: {
    // ...
    openingBalanceLabel: "Saldo inicial",
    openingBalancePlaceholder: "0.00",
  },
  closeDialog: {
    // ...
    declaredLabel: "Efectivo declarado",
    declaredPlaceholder: "0.00",
  },
  summary: {
    // ...
    surplus: "Sobrante",
    shortage: "Faltante",
  },
  detail: {
    // ...
    openingBalance: "Saldo inicial",
    declaredBalance: "Efectivo declarado",
    difference: "Diferencia",
  },
}
```

---

## Tier 3 — Trazabilidad completa (migracion estructural)

### Objetivo

Registrar cada transicion (open, close, reopen) como evento independiente. No sobrescribir totales anteriores. Permitir auditoria real de quien hizo que y cuando.

### 3.1 Migracion SQL

```sql
-- Migracion: YYYYMMDDHHMM_cash_closing_events.sql
BEGIN;

CREATE TABLE IF NOT EXISTS cash_closing_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_closing_id UUID NOT NULL REFERENCES cash_closings(cash_closing_id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('open','close','reopen')),
  triggered_by UUID REFERENCES users(user_id),
  event_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  totals_snapshot JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cash_closing_events_closing
  ON cash_closing_events(cash_closing_id, event_at);

COMMIT;
```

### 3.2 Backend — insertar eventos

En `cash.service.js`:
- `openCash`: despues del INSERT, insertar evento `event_type='open'`
- `closeCash`: despues del UPDATE, insertar evento `event_type='close'` + snapshot de totales
- `reopenCash`: despues del UPDATE, insertar evento `event_type='reopen'`

### 3.3 Backend — endpoint de eventos

```
GET /api/cash/:id/events
```

Devuelve array de eventos ordenados por `event_at DESC`.

### 3.4 Frontend — timeline en detalle

En `cash-history-detail-page.tsx`, nuevo panel `OpsPanelSection` "Historial de eventos" con timeline:

```
2026-06-23 08:15 — Abierto por Maria Lopez
2026-06-23 18:30 — Cerrado por Juan Perez (total: S/. 1,250.00)
2026-06-23 18:45 — Reabierto por Admin (motivo: "Falto registrar una venta")
2026-06-23 19:00 — Cerrado por Juan Perez (total: S/. 1,450.00)
```

### 3.5 Backend — no sobrescribir totales

Con eventos, el cierre puede:
1. Escribir los totales actuales en `cash_closings` (backward compatible)
2. Insertar evento con snapshot de totales
3. La UI de detalle muestra el evento mas reciente de tipo `close` para totales
4. El timeline muestra todos los eventos historicos

---

## Verificacion por tier

### Tier 1

```
npx tsc --noEmit                    → 0 errors
npm run lint                         → 0 warnings (modulo cash)
npx playwright test __tests__/cash-utils.test.ts  → todos pasan
```

Revision visual:
- Error inline visible al fallar open/close
- Nombre de sede visible en PosHeader y dialogo de apertura
- Solo un boton de reabrir muestra spinner, no todos

### Tier 2

```
npx tsc --noEmit                    → 0 errors
npm run lint                         → 0 warnings
# Verificar migracion:
#   - Columnas existen en cash_closings
#   - opening_balance DEFAULT 0 funciona
#   - closing_balance_declared nullable funciona
```

Revision visual:
- Campo "Saldo inicial" en dialogo de apertura
- Campo "Efectivo declarado" en dialogo de cierre
- Diferencia visible en pagina principal y detalle

### Tier 3

```
npx tsc --noEmit                    → 0 errors
npm run lint                         → 0 warnings
# Verificar migracion:
#   - Tabla cash_closing_events existe
#   - FK cascade funciona
#   - Indices existen
```

Revision visual:
- Timeline de eventos en detalle de cierre
- Eventos ordenados cronologicamente
- Cada evento muestra quien, cuando y totales (si close)

---

## Archivos afectados por tier

### Tier 1

| Archivo | Cambio |
|---------|--------|
| `components/modules/cash/use-cash-page.ts` | setActionError en catch |
| `components/modules/cash/cash-page.tsx` | location name + extraer dialogos |
| `components/modules/cash/cash-dialogs/cash-open-dialog.tsx` | NUEVO |
| `components/modules/cash/cash-dialogs/cash-close-dialog.tsx` | NUEVO |
| `components/modules/cash/use-cash-admin.ts` | reopeningId en vez de bool |
| `components/modules/cash/cash-control-page.tsx` | disabled condicional |

### Tier 2

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/YYYYMMDDHHMM_cash_balance_columns.sql` | NUEVO |
| `apps/backend/src/modules/cash/cash.service.js` | opening/closing balance |
| `apps/backend/src/modules/cash/cash.repo.js` | columnas en queries |
| `apps/backend/src/shared/schemas.js` | Zod schemas |
| `cash-dialogs/cash-open-dialog.tsx` | campo saldo inicial |
| `cash-dialogs/cash-close-dialog.tsx` | campo efectivo declarado |
| `cash-page.tsx` | mostrar diferencia |
| `cash-history-detail-page.tsx` | filas de balance |
| `cash-types.ts` | tipos nuevos |
| `cash-messages.ts` | mensajes nuevos |

### Tier 3

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/YYYYMMDDHHMM_cash_closing_events.sql` | NUEVO |
| `apps/backend/src/modules/cash/cash.service.js` | insertar eventos |
| `apps/backend/src/modules/cash/cash.repo.js` | queries de eventos |
| `apps/backend/src/modules/cash/cash.routes.js` | nueva ruta GET events |
| `apps/backend/src/modules/cash/cash.controller.js` | handler de eventos |
| `cash-history-detail-page.tsx` | panel timeline |
| `cash-types.ts` | tipo CashClosingEvent |
| `cash-messages.ts` | mensajes timeline |
