# Auditoria final y seguimiento del modulo Caja

## Objetivo

Este documento es la fuente temporal de seguimiento para llevar el modulo `cash` a Tier 1 real. No reemplaza los estandares del repo: los aplica de forma trazable para que otro agente pueda continuar el hardening sin depender del chat anterior ni inventar criterios.

El objetivo no es solo pasar `tsc`, lint y tests unitarios. Caja solo puede declararse Tier 1 cuando la auditoria final este ejecutada con evidencia, el score este recalculado y no queden flujos principales rotos.

## Fuentes normativas

| Documento | Que valida |
|---|---|
| `AGENTS.md` | Reglas estables del proyecto, arquitectura frontend/backend, patrones operativos, mensajes, hooks, dialogs y anti-patrones. |
| `docs/module-review-checklist.md` | Checklist oficial para auditar modulos frontend contra el estandar de `ventas`. |
| `docs/refactor-vs-rebuild.md` | Matriz de decision, score y tier final. |
| `DESIGN.md` | Sistema visual RIPNEL: tokens `ops-*`, densidad ERP, componentes canonicos y reglas de dialog/panel. |
| `docs/frontend-page-standard.md` | Composicion de paginas, headers, filtros, tablas, paginacion y jerarquia visual. |
| `docs/frontend-ui-ux-operativo.md` | Criterios operativos especificos, incluyendo patron para modulos de caja. |

## Estado heredado

El refactor previo partio de un score aproximado de 30, clasificado como Tier 3. La base arquitectonica mejoro: se crearon `cash-messages.ts`, `cash-types.ts`, `cash-constants.ts`, `cash-utils.ts` y hooks por responsabilidad. Tambien se agregaron tests unitarios para algunas utilidades.

Sin embargo, `docs/cash-refactor-tracker.md` todavia marca `F. Auditoria final` como pendiente, mientras declara un score final estimado de `~2`. Ese score no debe usarse como cierre hasta reejecutar el checklist con evidencia. La auditoria actual confirma que el modulo esta cerca de Tier 1, pero aun tiene hallazgos que impiden declararlo verde.

## Score final recalculado

| Severidad | Cantidad | Peso | Subtotal |
|---|---:|---:|---:|
| Critica | 0 | x3 | 0 |
| Mayor | 0 | x2 | 0 |
| Menor | 0 | x1 | 0 |
| **Total** |  |  | **0** |

**Tier final: Tier 1 (Verde).**

## Estado de cierre

Estado actual: **completado**.

Decision final: **Tier 1 (Verde)**, hardening completado con evidencia.

## Evidencia de fixes

| Hallazgo | Fix aplicado | Archivo | Verificación |
|----------|-------------|---------|-------------|
| `onAction={() => {}}` para Abrir caja | `handleOpen` desestructurado y conectado al CTA | `cash-page.tsx:54,188` | `grep handleOpen` muestra 4 matches: definición, retorno, desestructuración, wiring |
| CTAs visibles en modo consulta | `canOperateCash` guard con spread condicional | `cash-page.tsx:158-168,181-188` | Revisión visual: sin `actionLabel`/`onAction` cuando `!canOperateCash` |
| `title="Error"` | `CAJA.errors.generic.title` | `cash-control-page.tsx:160` | `grep 'title="Error"'` → 0 matches |
| `Fecha ${label}` | `CAJA.admin.chartDateLabel(label)` + key en messages | `cash-control-page.tsx:282`, `cash-messages.ts:98` | `grep 'Fecha \$\{label\}'` → 0 matches |
| `getCashStatusLabel` con strings duplicadas | Importa `CAJA.statusLabels` | `cash-utils.ts:1,25` | `grep 'Pendiente de cierre'` en utils → 0 matches |
| `OpsPanelSection` anidado | Secciones hermanas en grid | `cash-control-page.tsx:352-497` | `OpsPanelSection` dentro de `OpsPanelSection` → 0 matches |
| Sin tests para `buildCashAdminQuery` | +7 tests (19/19 pasan) | `__tests__/cash-utils.test.ts` | `npx playwright test __tests__/cash-utils.test.ts` → 19 passed |

### Verificación final

```
npx tsc --noEmit       → 0 errors
npm run lint -- --quiet → 0 warnings
19/19 tests pasan      → Playwright cash-utils
```

Barridos anti-patrones (todos 0 matches):
- `color-mix` fuera de `ops-control-styles.ts`
- `<select>` nativo
- `<section>` / `<h2>` / `<article>`
- `as any` / `Record<string, unknown>`
- `setOpen(true)` / `openOnFocus`

## Criterios de Tier 1 — verificacion final

- Score recalculado entre 0 y 5 segun `docs/module-review-checklist.md`.
- Cero hallazgos criticos.
- Cero flujos principales rotos: abrir caja, cerrar caja, reabrir caja, filtrar historial y ver detalle.
- Cero acciones operativas visibles para usuarios sin permiso operativo, salvo estados informativos.
- Cero strings visibles hardcodeados fuera de `cash-messages.ts`, salvo valores tecnicos no visibles y excepciones documentadas.
- `tsc`, lint y tests requeridos pasan.
- Este documento y `docs/cash-refactor-tracker.md` quedan actualizados con evidencia final.

## Estado de cierre

Estado actual: **pendiente de hardening**.

Decision actual: **Tier 2 bajo / Amarillo**, recuperable por hardening incremental.

No declarar Tier 1 hasta completar el plan anterior y registrar evidencia final.
