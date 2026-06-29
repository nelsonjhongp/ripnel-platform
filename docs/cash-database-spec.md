# Cash Module — Database Specification

Especificacion tecnica de la capa de datos del modulo de caja. Tablas, columnas, constraints, queries y relaciones entre entidades.

---

## 1. Tabla principal: `cash_closings`

Una fila = una sesion de caja para una ubicacion en una fecha de negocio. No hay tabla de sesiones separada ni tabla de historial — el historial son las filas cerradas.

### 1.1 DDL original

**Archivo:** `supabase/migrations/202603250001_ripnel_mvp_v2.sql:646-669`

```sql
CREATE TABLE IF NOT EXISTS cash_closings (
  cash_closing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id     UUID NOT NULL REFERENCES locations(location_id),
  business_date   DATE NOT NULL,

  status    VARCHAR(20) NOT NULL DEFAULT 'open',
  opened_by UUID REFERENCES users(user_id),
  closed_by UUID REFERENCES users(user_id),

  total_cash     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_cash >= 0),
  total_yape     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_yape >= 0),
  total_plin     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_plin >= 0),
  total_transfer NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_transfer >= 0),
  total_all      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_all >= 0),

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at  TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CHECK (status IN ('open','closed')),
  UNIQUE (location_id, business_date)
);
```

### 1.2 Columnas agregadas (reapertura)

**Archivo:** `supabase/migrations/202606180001_cash_reopen.sql:4-7`

```sql
ALTER TABLE cash_closings
  ADD COLUMN IF NOT EXISTS reopened_by UUID REFERENCES users(user_id),
  ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reopen_notes TEXT;
```

### 1.3 Columnas agregadas (saldos)

**Archivo:** `supabase/migrations/202606230001_cash_balance_columns.sql:3-5`

```sql
ALTER TABLE cash_closings
  ADD COLUMN IF NOT EXISTS opening_balance numeric(12,2) not null default 0
    check (opening_balance >= 0),
  ADD COLUMN IF NOT EXISTS closing_balance_declared numeric(12,2);
```

### 1.4 Columnas completas

| # | Columna | Tipo | Nullable | Default | Descripcion |
|---|---------|------|----------|---------|-------------|
| 1 | `cash_closing_id` | UUID | NOT NULL | gen_random_uuid() | PK |
| 2 | `location_id` | UUID | NOT NULL | — | FK → `locations(location_id)` |
| 3 | `business_date` | DATE | NOT NULL | — | Fecha de negocio (America/Lima) |
| 4 | `status` | VARCHAR(20) | NOT NULL | `'open'` | `'open'` o `'closed'` |
| 5 | `opened_by` | UUID | nullable | — | FK → `users(user_id)`. Quien abrio |
| 6 | `closed_by` | UUID | nullable | — | FK → `users(user_id)`. Quien cerro |
| 7 | `total_cash` | NUMERIC(12,2) | NOT NULL | 0 | Total efectivo (CHECK >= 0) |
| 8 | `total_yape` | NUMERIC(12,2) | NOT NULL | 0 | Total Yape |
| 9 | `total_plin` | NUMERIC(12,2) | NOT NULL | 0 | Total Plin |
| 10 | `total_transfer` | NUMERIC(12,2) | NOT NULL | 0 | Total transferencia |
| 11 | `total_all` | NUMERIC(12,2) | NOT NULL | 0 | Suma de los 4 metodos |
| 12 | `notes` | TEXT | nullable | — | Notas libres |
| 13 | `created_at` | TIMESTAMPTZ | NOT NULL | CURRENT_TIMESTAMP | Apertura |
| 14 | `closed_at` | TIMESTAMPTZ | nullable | — | Cierre |
| 15 | `updated_at` | TIMESTAMPTZ | NOT NULL | CURRENT_TIMESTAMP | Auto-actualizado por trigger |
| 16 | `reopened_by` | UUID | nullable | — | FK → `users(user_id)`. Quien reabrio |
| 17 | `reopened_at` | TIMESTAMPTZ | nullable | — | Cuando reabrio |
| 18 | `reopen_notes` | TEXT | nullable | — | Motivo de reapertura |

> Nota: el schema vigente tambien incluye `opening_balance` (saldo inicial, default `0`) y `closing_balance_declared` (saldo fisico declarado al cierre), agregados en la migracion del 2026-06-23.

### 1.5 Constraints

| Constraint | Tipo | Definicion |
|---|---|---|
| `cash_closings_pkey` | PRIMARY KEY | `(cash_closing_id)` |
| `cash_closings_location_id_fkey` | FOREIGN KEY | `location_id → locations(location_id)` |
| `cash_closings_opened_by_fkey` | FOREIGN KEY | `opened_by → users(user_id)` |
| `cash_closings_closed_by_fkey` | FOREIGN KEY | `closed_by → users(user_id)` |
| `cash_closings_reopened_by_fkey` | FOREIGN KEY | `reopened_by → users(user_id)` |
| `chk_cash_closings_status` | CHECK | `status IN ('open','closed')` |
| `uq_cash_closings_loc_date` | UNIQUE | `(location_id, business_date)` |
| (implicito ×4) | CHECK | Cada `total_* >= 0` |

---

## 2. Tablas relacionadas (sin FK directa)

`cash_closings` no tiene FK directa a `sales` ni `sales_payments`. La relacion se resuelve por **ubicacion + fecha de negocio** via queries con JOIN.

### 2.1 `sales` (columnas relevantes)

**Archivo:** `supabase/migrations/202603250001_ripnel_mvp_v2.sql`

| Columna | Tipo | Uso en caja |
|---------|------|-------------|
| `sale_id` | UUID | JOIN con `sales_payments` |
| `location_id` | UUID | Filtrar por sede |
| `status` | VARCHAR | Solo `'confirmed'` cuenta |
| `total_amount` | NUMERIC | Sumado en chequeo de consistencia |
| `confirmed_at` | TIMESTAMPTZ | Fecha de negocio para el dia de caja |

### 2.2 `sales_payments`

**Archivo:** `supabase/migrations/202603250001_ripnel_mvp_v2.sql:643`

| Columna | Tipo | Uso en caja |
|---------|------|-------------|
| `sale_id` | UUID | JOIN con `sales` |
| `method` | VARCHAR(20) | `'cash'`, `'yape'`, `'plin'`, `'transfer'` |
| `amount` | NUMERIC(12,2) | Sumado por metodo |
| `paid_at` | TIMESTAMPTZ | Fecha de negocio |

### 2.3 `sales_payment_reversals`

**Archivo:** `supabase/migrations/202604200001_postsales_controlled_mvp.sql:25-41`

| Columna | Tipo | Uso en caja |
|---------|------|-------------|
| `payment_id` | UUID | FK a `sales_payments` (unique) |
| `location_id` | UUID | Filtrar por sede |
| `method` | VARCHAR(20) | Mismo CHECK que payments |
| `amount` | NUMERIC(12,2) | RESTADO del total del metodo |
| `reversed_at` | TIMESTAMPTZ | Fecha de negocio |

---

## 3. Ciclo de vida

```
[no existe] ──open──▶ [open] ──close──▶ [closed] ──reopen──▶ [open] ──close──▶ [closed]
                          ▲                                                         │
                          └─────────────────────────────────────────────────────────┘
```

### 3.1 Apertura

- INSERT con `status='open'`, `opened_by`, `business_date=Lima/today`
- **Idempotente**: si ya existe fila `open` para `(location_id, business_date)`, retorna la existente
- Si ya existe fila `closed` → error 409 (`CASH_ALREADY_CLOSED_FOR_DATE`)

### 3.2 Cierre

- UPDATE `status='closed'`, `closed_by`, `closed_at=NOW()`
- Calcula y persiste los 5 `total_*` desde `sales_payments` - `sales_payment_reversals`
- **Bloquea si hay ventas sin confirmar** (`status != 'confirmed'`) para esa sede y fecha
- Si se cierra dos veces → error 409 (`CASH_ALREADY_CLOSED`)

### 3.3 Reapertura

- Requiere permiso `cash.admin.reopen`
- UPDATE `status='open'`, `reopened_by`, `reopened_at=NOW()`, `reopen_notes`
- Los `total_*` y `closed_by`/`closed_at` **no se borran** — quedan como registro historico
- Solo se puede reabrir si `status='closed'`
- `reopen_notes` es obligatorio (min 1 caracter)

### 3.4 Lo que NO persiste

- Al reabrir y volver a cerrar, los totales de la primera vez se **sobrescriben**
- Solo se guarda la **ultima** reapertura (`reopened_by/at/notes`)
- No hay registro de cuantas veces se reabrio ni quien cerro cada vez

---

## 4. Calculo de totales

### 4.1 Query de pagos por metodo

**Archivo:** `apps/backend/src/modules/cash/cash.repo.js:47-63` (`buildConsistencyJoins`)

```sql
WITH payment_movements AS (
   SELECT sp.method, sp.amount AS signed_amount
   FROM sales_payments sp
   INNER JOIN sales s ON s.sale_id = sp.sale_id
   WHERE s.location_id = $1
     AND s.status = 'confirmed'
     AND DATE(sp.paid_at AT TIME ZONE 'America/Lima') = $2::date

   UNION ALL

   SELECT spr.method, -spr.amount AS signed_amount
   FROM sales_payment_reversals spr
   WHERE spr.location_id = $1
     AND DATE(spr.reversed_at AT TIME ZONE 'America/Lima') = $2::date
)
SELECT method, COALESCE(SUM(signed_amount), 0) AS total
FROM payment_movements
GROUP BY method
```

Reglas:
- Solo ventas `confirmed`
- Fecha de negocio = `America/Lima`
- Reversals restan (signo negativo)
- Metodos reconocidos: cash, yape, plin, transfer
- Metodos desconocidos: ignorados silenciosamente en `by_method`, pero afectan `grand_total` y consistencia

### 4.2 Consistencia

**Archivo:** `apps/backend/src/modules/cash/cash.service.js` (`buildSalesSummary`)

```
grand_total = SUM(sales.total_amount) WHERE confirmed + location + business_date
payment_total = SUM(payments) - SUM(reversals)
difference = grand_total - payment_total
is_consistent = |difference| < 0.01
```

Compara el total de ventas confirmadas (`sales.total_amount`) contra la suma neta de pagos. Si la diferencia es >= 0.01 SOL, se marca inconsistente.

---

## 5. Permisos

**Archivo:** `apps/backend/src/modules/cash/cash-access.js:1-27`

| Permiso | Capability | Acceso |
|---------|------------|--------|
| `cash.view` | `view` | Ver caja actual, historial, detalle |
| `cash.operate` | `operate` | Abrir y cerrar caja |
| `cash.admin.view` | `admin` | Panel de control multi-sede, graficos, alertas |
| `cash.admin.reopen` | `reopen` | Reabrir cajas cerradas |

Regla especial: `admin.manage` (rol ADMIN global) concede **todos** los permisos de caja automaticamente.

---

## 6. API endpoints

**Archivo:** `apps/backend/src/modules/cash/cash.routes.js:20-51`

| Metodo | Ruta | Permiso | Proposito |
|--------|------|---------|-----------|
| GET | `/api/cash/` | `view` o `operate` | Listar cierres (paginado, filtrado) |
| GET | `/api/cash/current` | `view` o `operate` | Estado actual + totales vivos |
| GET | `/api/cash/:id` | `view` o `operate` | Detalle de cierre + resumen ventas |
| GET | `/api/cash/admin/summary` | `admin.view` | Stats, tendencias, por sede, alertas |
| GET | `/api/cash/admin/sessions` | `admin.view` | Listado admin paginado |
| POST | `/api/cash/open` | `operate` | Abrir caja |
| PATCH | `/api/cash/:id/close` | `operate` | Cerrar caja |
| PATCH | `/api/cash/:id/reopen` | `admin.reopen` | Reabrir caja cerrada |

---

## 7. Lo que NO existe en base de datos

| Concepto | Estado | Impacto |
|----------|--------|---------|
| Arqueo (conteo de billetes/monedas) | No existe | Sin tabla `cash_counts` |
| Registro de retiros durante el dia | No existe | Si alguien saca efectivo, no queda registro |
| Eventos de auditoria | No existe | Solo la ultima reapertura; totals anteriores se pierden |
| Log de errores/intentos fallidos | No existe | No hay trazabilidad de quien intento y fallo |
| Transacciones DB en cierre | No existe | `closeCash` hace reads + write sin BEGIN/COMMIT |
| Control de concurrencia | No existe | Sin `SELECT ... FOR UPDATE` ni columna version |

---

## 8. Diagrama de relaciones

```
locations ────┐
users ────────┤
              ├──▶ cash_closings (1 por location+business_date)
              │      ├── opened_by → users
              │      ├── closed_by → users
              │      └── reopened_by → users
              │
sales ────────┤ (JOIN por location_id + DATE(confirmed_at) = business_date)
  └── sales_payments (JOIN por sale_id, metodo)
        └── sales_payment_reversals (JOIN por location_id + DATE(reversed_at))

cash_closings ⟷ sales + sales_payments + sales_payment_reversals
  (relacion logica, sin FK directa)
```

---

## 9. Archivos de referencia

| Archivo | Contenido |
|---------|-----------|
| `supabase/migrations/202603250001_ripnel_mvp_v2.sql:646-669` | DDL `cash_closings` |
| `supabase/migrations/202606180001_cash_reopen.sql` | Migracion reapertura |
| `supabase/migrations/202604200001_postsales_controlled_mvp.sql:25-41` | DDL `sales_payment_reversals` |
| `apps/backend/src/modules/cash/cash.repo.js` | Queries SQL (495 lines) |
| `apps/backend/src/modules/cash/cash.service.js` | Logica de negocio (647 lines) |
| `apps/backend/src/modules/cash/cash.access.js` | Permisos (27 lines) |
| `apps/backend/src/modules/cash/cash.errors.js` | Codigos de error (22 lines) |
| `apps/backend/src/modules/cash/cash.routes.js` | Rutas (53 lines) |
