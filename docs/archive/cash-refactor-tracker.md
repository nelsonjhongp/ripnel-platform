# Cash Module Refactor Tracker

## Score inicial: 30 (Tier 3 — Refactor mayor, limite alto)

| Fase | Estado | Archivos creados/modificados |
|------|--------|------------------------------|
| A. Cimientos | ✅ Completado | `cash-types.ts`, `cash-constants.ts`, `cash-utils.ts`, `cash-messages.ts`, `lib/cash.ts` |
| B. Strings | ✅ Completado | Todos los componentes usan `CAJA.*` keys |
| C. Componentes | ✅ Completado | `OpsDialog` con description, `OpsPanelSection` en vez de h2, `OpsFormField` en textarea, back en `PosHeader.actions`, footer canonico |
| D. Hooks | ✅ Completado | `use-cash-page.ts`, `use-cash-admin.ts`, `use-cash-history.ts`, `use-cash-detail.ts` |
| E. Verificacion | ✅ Completado | TypeScript 0 errors, lint 0 warnings (modulo cash), 14 tests pasan |
| F. Auditoria final | ✅ Completado | `cash-final-audit.md` actualizado con evidencia. Score recalculado: 0 (Tier 1 Verde). |

---

## Fase A: Cimientos

- [x] A.1 `cash-types.ts` — 13 tipos movidos de `lib/cash.ts`
- [x] A.2 `cash-constants.ts` — re-exporta `INFO_BOX`, `INFO_BOX_XL`, `INFO_BOX_MUTED`, `ACCENT_HIGHLIGHT_PANEL`, `SURFACE_MUTED_BG`, `ACCENT_LABEL_TEXT` + `METHOD_CONFIG`, `ADMIN_PAGE_SIZE`, `HISTORY_PAGE_SIZE`
- [x] A.3 `cash-utils.ts` — `formatAmount`, `formatBusinessDate`, `getCashStatusLabel`, `deriveConsistencyTone`, `buildCashAdminQuery`
- [x] A.4 `cash-messages.ts` — ~70 keys namespaced: `header`, `status`, `actions`, `closeDialog`, `reopenDialog`, `summary`, `methods`, `admin`, `history`, `detail`, `toast`, `errors`, `loading`, `statusLabels`, `fallback`
- [x] A.5 `lib/cash.ts` → archivo re-export (backward compat)

## Fase B: Strings

- [x] `cash-page.tsx` — ~25 strings → `CAJA.*`
- [x] `cash-control-page.tsx` — ~18 strings → `CAJA.*`
- [x] `cash-history-page.tsx` — ~10 strings → `CAJA.*`
- [x] `cash-history-detail-page.tsx` — ~12 strings → `CAJA.*`
- [x] `cash-status-badge.tsx` — 2 strings via `getCashStatusLabel`

## Fase C: Componentes

- [x] C.1 `OpsDialog` description en `cash-page.tsx`
- [x] C.2 Footer canonico (`Button variant="outline"/"accent"`) en vez de `AdminActionButton`
- [x] C.3 Textarea envuelto en `OpsFormField` con `density="compact"` y `opsInputCompact`
- [x] C.4 `color-mix` eliminado → usa `opsInputCompact` de `ops-control-styles.ts`
- [x] C.5 `OpsPanelSection` reemplaza h2 raw en `cash-control-page.tsx` (Sesiones multi-sede, Alertas operativas)
- [x] C.6 `OpsPanelSection` reemplaza h2 raw en `cash-history-detail-page.tsx` (Montos por metodo, Consistencia)
- [x] C.7 Back button movido a `PosHeader.actions` en `cash-history-detail-page.tsx`
- [x] C.8 `METHOD_CONFIG`, `RANGE_OPTIONS`, `STATUS_OPTIONS` desde `cash-constants` / `cash-messages`

## Fase D: Hooks

- [x] D.1 `use-cash-page.ts` (76 lines) — extraido de `cash-page.tsx`
- [x] D.2 `use-cash-admin.ts` (219 lines) — extraido de `cash-control-page.tsx`
- [x] D.3 `use-cash-history.ts` (105 lines) — extraido de `cash-history-page.tsx`
- [x] D.4 `use-cash-detail.ts` (42 lines) — extraido de `cash-history-detail-page.tsx`

## Fase E: Verificacion

- [x] E.1 TypeScript: `npx tsc --noEmit` → **0 errors**
- [x] E.2 Lint: `npm run lint` → **0 warnings** en modulo cash
- [x] E.3 Tests: `__tests__/cash-utils.test.ts` → **14/14 pasan**
  - `formatAmount`: 5 tests
  - `formatBusinessDate`: 5 tests
  - `getCashStatusLabel`: 2 tests
  - `deriveConsistencyTone`: 2 tests

---

## Archivos finales

```
components/modules/cash/
├── cash-messages.ts               (210 lines) ← NUEVO
├── cash-types.ts                  (130 lines) ← NUEVO
├── cash-constants.ts               (35 lines) ← NUEVO
├── cash-utils.ts                   (68 lines) ← NUEVO
├── use-cash-page.ts                (76 lines) ← NUEVO
├── use-cash-admin.ts              (219 lines) ← NUEVO
├── use-cash-history.ts            (105 lines) ← NUEVO
├── use-cash-detail.ts              (42 lines) ← NUEVO
├── cash-page.tsx                  (335 lines) ← refactorizado
├── cash-control-page.tsx          (555 lines) ← refactorizado
├── cash-history-page.tsx          (244 lines) ← refactorizado
├── cash-history-detail-page.tsx   (220 lines) ← refactorizado
└── cash-status-badge.tsx           (17 lines) ← refactorizado
```

---

## Score post-refactor (auditado)

| Severidad | Hallazgos | Peso | Subtotal |
|-----------|-----------|------|----------|
| 🔴 Critica | 0 | ×3 | 0 |
| 🟡 Mayor | 0 | ×2 | 0 |
| 🟢 Menor | 0 | ×1 | 0 |

**Score final: 0 (🟢 Verde — Tier 1)**

### Evidencia de hardening

| Fix | Archivo | Cambio |
|-----|---------|--------|
| handleOpen conectado | `cash-page.tsx:54,188` | Desestructurado y enrutado a `onAction` del banner not-open |
| CTAs ocultos en consulta | `cash-page.tsx:158-168,181-188` | Guards `canOperateCash` con spread condicional en banners open/not-open |
| Strings hardcodeados | `cash-control-page.tsx:160,282`, `cash-utils.ts:1,25` | `title="Error"` → `CAJA.errors.generic.title`, `\`Fecha ${label}\`` → `CAJA.admin.chartDateLabel`, `getCashStatusLabel` → `CAJA.statusLabels` |
| Panel anidado | `cash-control-page.tsx:352-497` | Secciones hermanas en grid: `OpsPanelSection` independientes para Sesiones y Alertas |
| Tests ampliados | `__tests__/cash-utils.test.ts` | +7 tests para `buildCashAdminQuery` (19/19 pasan) |
| Verificación | `tsc` 0 errors, `lint` 0 warnings, barridos anti-patrones limpios | — |
