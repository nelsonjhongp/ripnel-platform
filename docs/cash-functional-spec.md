# Cash Module — Functional Specification

Especificacion funcional del modulo de caja. Flujos, estados, reglas de negocio, roles, permisos y alcance actual vs planeado.

---

## 1. Roles y permisos

| Permiso | Quien lo tiene | Que permite |
|---------|---------------|-------------|
| `cash.view` | CAJA, TIENDA, VENTAS, ADMIN | Ver caja del dia, historial, detalle (solo lectura) |
| `cash.operate` | CAJA, ADMIN | Abrir y cerrar caja |
| `cash.admin.view` | ADMIN | Panel de control multi-sede, graficos, alertas |
| `cash.admin.reopen` | ADMIN | Reabrir cajas cerradas |

Regla: `admin.manage` (ADMIN global) concede todos los permisos de caja implicitamente.

Un usuario sin sede default no puede abrir caja. Un usuario con solo `cash.view` ve datos pero sin botones de abrir/cerrar.

---

## 2. Estados y transiciones

```
[no existe] ──POST /api/cash/open──▶ [open] ──PATCH /close──▶ [closed] ──PATCH /reopen──▶ [open]
                                        ▲                                                   │
                                        └───────────────────────────────────────────────────┘
```

| Transicion | Endpoint | Condiciones |
|------------|----------|-------------|
| Abrir | `POST /api/cash/open` | Idempotente si ya existe open; error 409 si ya existe closed |
| Cerrar | `PATCH /api/cash/:id/close` | Solo si open; bloquea si hay ventas sin confirmar |
| Reabrir | `PATCH /api/cash/:id/reopen` | Solo si closed; requiere `admin.reopen`; motivo obligatorio |

---

## 3. Flujo del operador (CAJA / TIENDA)

### 3.1 Pantalla principal: "Caja del dia" (`/caja`)

```
OpsPageShell
├── PosHeader (eyebrow + titulo + fecha en meta + acciones)
├── [Sin sede] → InlineStatusCard warning "Sin sede asignada"
├── [Solo consulta] → InlineStatusCard warning "Acceso de consulta"
├── [Carga] → LoadingPage "Cargando estado de caja"
├── [Error] → InlineStatusCard danger
│
├── OpsActionBanner (estado de caja)
│   ├── No abierta → warning, "Abrir caja"
│   ├── Abierta → success, "Cerrar caja" + quien abrio
│   └── Cerrada → neutral, quien cerro (sin accion)
│
├── 3 OpsMetricCard (si hay resumen)
│   ├── Total del dia (accent)
│   ├── Ventas (success, conteo)
│   └── Consistencia (success/warning, "Cuadra"/"Revisar")
│
└── OpsPanelMuted "Metodos de pago"
    ├── Efectivo, Yape, Plin, Transferencia
    └── Total pagos (con tooltip de ayuda)
```

### 3.2 Dialogo de apertura

```
OpsDialog (size=sm)
├── Panel muted: sede + fecha de negocio
├── OpsFormField: notas (textarea, opcional)
└── Footer: Cancelar (outline) | Abrir caja (accent)
```

### 3.3 Dialogo de cierre

```
OpsDialog (size=md)
├── Panel muted: desglose por metodo + total
├── OpsFormField: notas (textarea, opcional)
└── Footer: Cancelar (outline) | Cerrar caja (accent)
```

### 3.4 Historial (`/caja/historial`)

```
OpsPageShell
├── PosHeader (eyebrow + titulo + acciones)
├── Filtros: estado, fecha desde/hasta, limpiar
├── OpsDataTable con columnas:
│   ├── Fecha (business_date)
│   ├── Abrio (nombre + timestamp)
│   ├── Cerro (nombre + timestamp o badge "Pendiente")
│   ├── Total (S/. X.XX)
│   └── Accion (ver → /caja/historial/[id])
└── Paginacion
```

### 3.5 Detalle de cierre (`/caja/historial/[id]`)

```
OpsPageShell
├── PosHeader (titulo: sede · fecha, status badge, back button)
├── 6 metricas inline: Total, Ventas, Apertura, Cierre, Abrio, Cerro
├── Observaciones (condicional)
└── Grid 2 columnas:
    ├── OpsPanelSection "Montos por metodo"
    │   └── Efectivo, Yape, Plin, Transferencia
    └── OpsPanelSection "Consistencia"
        ├── Total ventas
        ├── Total pagos
        └── Diferencia (warning si inconsistente)
```

---

## 4. Flujo del administrador (ADMIN)

### 4.1 Panel de control (`/caja/control`)

```
OpsPageShell
├── PosHeader (eyebrow + titulo + acciones)
├── 4 metric cards: Sesiones, Total registrado, Pendientes, Sedes abiertas
├── Graficos (colapsables):
│   ├── AreaChart: tendencia diaria
│   └── BarChart: comparativo por sede (top 6)
├── Filtros: rango (7d/30d/60d), estado, sede
└── Grid 2 columnas:
    ├── OpsPanelSection "Sesiones multi-sede"
    │   └── OpsDataTable con Reabrir + Ver detalle
    └── OpsPanelSection "Alertas operativas"
        ├── Sedes abiertas → OpsAttentionRow warning
        └── Sesiones inconsistentes → OpsAttentionRow danger
```

### 4.2 Dialogo de reapertura

```
OpsDialog (size=sm)
├── Info: sede, fecha, ultimo cerrado por, ultimo total
├── OpsFormField: motivo (textarea, requerido)
└── Footer: Cancelar (outline) | Reabrir caja (accent)
```

---

## 5. Reglas de negocio

| Regla | Implementacion |
|-------|---------------|
| Una caja por sede por fecha | `UNIQUE(location_id, business_date)` + validacion en servicio |
| Solo ventas confirmadas cuentan | `WHERE s.status = 'confirmed'` en queries de totales |
| Reversals restan del total | `UNION ALL SELECT -amount FROM sales_payment_reversals` |
| No cerrar con ventas pendientes | `countUnconfirmedSalesByLocationAndDate()` pre-cierre |
| Apertura idempotente | Si ya existe `open`, retorna la existente sin error |
| Consistencia con tolerancia | `|grand_total - payment_total| < 0.01` |
| Fecha de negocio = America/Lima | `AT TIME ZONE 'America/Lima'` en todas las queries |
| Reapertura requiere motivo | Zod `.min(1)` en `reopen_notes` |
| Admin reabre cualquier sede | `resolveCashAdminContext` no enforcea location |

---

## 6. Alcance actual vs planeado

### 6.1 Implementado (Junio 2026)

- [x] Apertura y cierre de caja por sede y fecha
- [x] Reapertura con motivo (admin)
- [x] Totales por metodo (cash, yape, plin, transfer)
- [x] Consistencia ventas vs pagos
- [x] Bloqueo de cierre con ventas sin confirmar
- [x] Historial paginado con filtros
- [x] Detalle de cierre con metricas
- [x] Panel de control admin multi-sede
- [x] Graficos de tendencia y comparativo
- [x] Alertas de sedes abiertas y sesiones inconsistentes
- [x] Integracion con POS (valida estado de caja antes de vender)

### 6.2 Planeado — Tier 2 (arqueo minimo)

- [ ] `opening_balance` — con cuanto dinero fisico se abre
- [ ] `closing_balance_declared` — cuanto dinero fisico hay al cerrar
- [ ] Diferencia sistema vs declarado en UI
- [ ] Dialogos de apertura/cierre con campos de saldo

### 6.3 Planeado — Tier 3 (trazabilidad)

- [ ] Tabla `cash_closing_events` — registro de cada transicion
- [ ] Timeline de eventos en detalle de caja
- [ ] No sobrescribir totales al reabrir/cerrar de nuevo

### 6.4 Fuera de alcance actual

- Arqueo fisico detallado (conteo de billetes/monedas por denominacion)
- Registro de retiros de efectivo durante el dia
- Cortes parciales (cierres intra-dia)
- Multiples cajas simultaneas en la misma sede
- Exportacion de reportes (PDF, CSV)
- Impresion de cierre de caja

---

## 7. Archivos del modulo

### Backend

| Archivo | Lineas | Proposito |
|---------|--------|-----------|
| `cash.routes.js` | 53 | Definicion de rutas + auth middleware |
| `cash.controller.js` | 144 | Request/response adapters |
| `cash.service.js` | 647 | Logica de negocio completa |
| `cash.repo.js` | 495 | Queries SQL |
| `cash.access.js` | 27 | Resolucion de permisos |
| `cash.errors.js` | 22 | Codigos de error |

### Frontend

| Archivo | Lineas | Proposito |
|---------|--------|-----------|
| `cash-page.tsx` | 435 | Pagina "Caja del dia" |
| `cash-control-page.tsx` | 579 | Panel admin multi-sede |
| `cash-history-page.tsx` | 244 | Historial paginado |
| `cash-history-detail-page.tsx` | 220 | Detalle de cierre |
| `cash-status-badge.tsx` | 17 | Badge de estado |
| `use-cash-page.ts` | 166 | Hook pagina principal |
| `use-cash-admin.ts` | 223 | Hook panel admin |
| `use-cash-history.ts` | 70 | Hook historial |
| `use-cash-detail.ts` | 43 | Hook detalle |
| `cash-messages.ts` | 264 | Strings centralizados |
| `cash-types.ts` | 129 | Tipos TypeScript |
| `cash-constants.ts` | 35 | Constantes CSS + config |
| `cash-utils.ts` | 61 | Funciones puras |

---

## 8. Documentos relacionados

| Documento | Proposito |
|-----------|-----------|
| `docs/cash-database-spec.md` | Especificacion tecnica de tablas, queries y relaciones |
| `docs/cash-improvement-plan.md` | Plan de mejora en tiers con pasos de implementacion |
| `docs/cash-closing-base.md` | Base tecnica original (referencia historica) |
