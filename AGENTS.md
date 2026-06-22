# RIPNEL Project Guide

## Purpose

This repository is the MVP of RIPNEL, an ERP focused on inventory, sales, pricing and internal transfers.

The current goal is to keep the architecture portable:

- frontend in `apps/frontend`
- backend in `apps/backend`
- PostgreSQL hosted on Supabase for now
- business logic in backend, not in frontend
- SQL explicit with `pg`, no ORM

## Current structure

- `apps/frontend`: Next.js app router UI
- `apps/backend`: Node.js + Express API
- `database`: SQL snapshots and reference scripts
- `supabase`: local Supabase config and migrations

## Source of truth

When you need to understand the domain or schema, inspect these first:

1. `supabase/migrations/202603250001_ripnel_mvp_v2.sql`
2. `database/ripnel_mvp_v2.sql`
3. `apps/backend/src/modules/*`

Do not invent tables or fields if the migration already defines them.

## Design System

Before working on UI/visual tasks, load the `frontend-design` skill. The design system is defined in:

- **`DESIGN.md`** — Identity, color system, typography, tokens, components
- **`docs/frontend-page-standard.md`** — Page composition, header, table patterns, pagination
- **`docs/frontend-ui-ux-operativo.md`** — Operational UI criteria, density, anti-patterns

For any visual or frontend work, invoke the skill first:
```
Use frontend-design skill for this task
```

When designing or reviewing UI, ensure alignment with:
- `ops-*` tokens from `globals.css`
- Violet accent `#b07ae4` as primary color
- Poppins font
- Compact ERP density over decorative layouts

## Architecture rules

- Frontend must call backend APIs for ERP operations.
- Backend treats Supabase as managed PostgreSQL.
- Do not use `supabase-js` as backend foundation.
- Do not connect frontend directly to database tables for ERP flows.
- Keep CommonJS in backend.
- Keep explicit SQL.
- Prefer small modular files over large mixed controllers.

## Frontend stack

- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui
- Radix UI primitives
- lucide-react icons
- `@tanstack/react-table` for tables
- `recharts` for charts
- `date-fns` for date utilities
- `react-day-picker` for date pickers
- `@dnd-kit/*` for drag-and-drop
- `next-themes` for theme switching
- `sonner` for toast notifications
- `zod` for schema validation
- `class-variance-authority`, `clsx`, `tailwind-merge`

## Frontend UI direction

- ERP-like layout, clean and operational.
- Compact spacing in sidebar and topbar.
- Prefer practical pages over decorative dashboards.
- Use the existing sidebar shell and keep navigation aligned with real modules.
- Avoid links to modules that do not exist unless there is an intentional placeholder page.
- Use `ripnel-logo.svg` when appropriate, but optimize heavy assets before production.
- Do not add visible explanatory copy when the hierarchy, labels and actions already communicate the screen.
- Prefer contextual help with the existing tooltip pattern over persistent descriptive text.
- If a setting is self-explanatory in context, do not add a tooltip just because help is available.
- In operational views, prioritize dense rows, compact controls and direct actions over large cards and decorative whitespace.
- For single operational selections with several options, prefer `select` / dropdown controls before expanded radio-card lists unless comparison between options is essential.
- For account, preferences, and settings pages, prefer narrower content widths and continuous section stacks over dashboard-like grids of unrelated cards.
- Interactive controls such as `select`, segmented options, and icon actions must show clear affordance through cursor, hover, and focus states.

## Frontend component patterns (proven)

These patterns have been validated in production across multiple modules (POS, cash, postsales, admin, transfers). New modules should follow them.

### UI constants — single source of truth

All reusable CSS class constants live in `components/ui/ops-control-styles.ts`. Do not duplicate these as inline strings in component files.

| Constant | Usage |
|---|---|
| `opsControlClassName` | Default input styling |
| `opsInputCompact` | Compact input (`h-9`) for dense forms |
| `opsSelectTriggerClassName` | Select/dropdown trigger |
| `opsFieldLabelClassName` | Uppercase field label |
| `INFO_BOX` | Standard info panel (`rounded-lg`, surface bg, compact padding) |
| `INFO_BOX_MUTED` | Muted info panel |
| `INFO_BOX_XL` | Rounded-xl panel variant |
| `SURFACE_MUTED_BG` | Semitransparent muted background |

Module-specific constants can re-export from `ops-control-styles.ts` (see `pos-constants.ts`).

### Inputs

- Forms: use `opsInputCompact` for compact fields, `opsControlClassName` for default height
- Always wrap raw inputs in `OpsFormField` for label, required asterisk, and error display
- Never use raw `<select>` — use `OpsSelect` with `OpsOption[]`
- For search/autocomplete: use `SearchablePicker` with `density="compact"` in operational views

### Dialogs

- Use `OpsDialog` for all modals
- Footer pattern: `flex flex-col-reverse gap-2 sm:flex-row sm:justify-end`
- Cancel button: `Button variant="outline"` on the left
- Confirm button: `Button variant="accent"` on the right
- Destructive actions: `Button variant="destructive"` on the right

### Buttons

- Primary actions: `variant="accent"`
- Secondary/cancel: `variant="outline"`
- Icon-only: `variant="ghost" size="icon-xs"`
- Binary toggles: use `OpsSegmentedControl` with `variant="switch" tone="accent"`, not two separate buttons

### Dropdowns and toggles

- `OpsSelect` for dropdown selections — never raw `<select>`
- `OpsSegmentedControl` with `variant="switch" tone="accent"` for binary toggles
- `SearchablePicker` for typeahead search (products, customers)

### Hooks

Compose complex state with focused sub-hooks + an orchestrator:

```
useModulePage()
  ├─ useSubDomainA()
  ├─ useSubDomainB()
  └─ useSubDomainC()
```

The orchestrator handles cross-cutting derived state (e.g., `totals` computed from cart + documentType + pricing) and cross-cutting actions (e.g., `confirmSale`). Sub-hooks own their state, effects, and simple actions.

Reference: `use-pos-sale.ts` (orchestrator) + `use-cart.ts`, `use-cash-context.ts`, `use-customer-search.ts`, `use-payment-state.ts`, `use-product-search.ts`.

### Messages

Centralize UI strings in `<module>-messages.ts` under namespaced keys:

```ts
export const MODULE = {
  section: { title: "...", hint: "..." },
  error: { saveError: "...", fieldError: "..." },
} as const
```

Reference: `pos-messages.ts` with namespaces `POS.header`, `POS.stage`, `POS.cash`, etc.

### Error utilities

`explainApiError` is in `lib/error-utils.ts`. Use it to convert API errors (403, 409, 400, 401) to user-facing messages. Do not duplicate error-to-message logic per module.

## Validation patterns

These patterns ensure consistent error feedback across all forms and dialogs.

### Required fields

- Use `required` prop on `OpsFormField` — renders a red asterisk (`*`) after the label
- Asterisk color: `text-[var(--ops-tone-danger-text)]`

### Error display

`OpsFormField` handles three visual channels simultaneously when `error` is set:
1. **Label turns red** — `text-[var(--ops-tone-danger-text)]`
2. **Input gets red border** — via `data-field-error="true"` + CSS rule in `globals.css`
3. **Error message below** — `<p role="alert" class="text-[11px] font-medium text-[var(--ops-tone-danger-text)]">`

`OpsSelect` also supports an `error` prop for red border on the trigger button.

### Error clearing

Errors must clear when the user starts editing the field:
```tsx
onChange={(value) => {
  setField(value)
  setFieldError(null)  // clear on every keystroke
}}
```

In dialogs, reset all errors when the dialog opens (`useEffect` on `open`).

### Validation flow

Validate on submit, one error at a time via sequential early return:
```tsx
function apply() {
  if (!value.trim()) { setValueError("..."); return }
  if (!reason.trim()) { setReasonError("..."); return }
  // proceed
}
```

### Loading states

Use `LoaderCircle` from `lucide-react` with `animate-spin`:
```tsx
{loading ? (
  <span className="inline-flex items-center gap-2">
    <LoaderCircle className="h-4 w-4 animate-spin" />
    Guardando...
  </span>
) : "Guardar"}
```
Button should be `disabled` while loading.

## Testing

Framework: Playwright (`@playwright/test` v1.60+).

Setup: `apps/frontend/playwright.config.ts` — unit tests in `__tests__/`, match `*.test.ts`.

Commands:
```
npm run test         # npx playwright test
npm run test:watch   # npx playwright test --watch
```

Pattern for unit tests on pure utilities:
```ts
import { test, expect } from "@playwright/test"
import { myFunction } from "../path/to/module"

test.describe("myFunction", () => {
  test("handles normal input", () => {
    expect(myFunction(validInput)).toBe(expectedOutput)
  })

  test("handles edge case", () => {
    expect(myFunction(null)).toBeNull()
  })
})
```

Reference: `__tests__/pos-utils.test.ts` — 71 tests covering pricing, validation, search, summary derivation.

- `src/config`: env and config
- `src/middlewares`: express middleware
- `src/modules/<module>`:
  - `*.routes.js`
  - `*.controller.js`
  - `*.service.js`
  - `*.repo.js`
- `src/shared`: db and shared errors

## Current API baseline

- `GET /health`

Current mounted route groups in backend:

- `GET /health`
- `POST /api/auth/*`
- `GET|POST|PATCH /api/users/*`
- `GET|POST|PATCH /api/roles/*`
- `GET|POST|PATCH /api/locations/*`
- `GET|POST /api/catalogs/*` (mounted at `/api` prefix: `/api/sizes`, `/api/colors`, `/api/garment-types`, `/api/fabrics`, etc.)
- `GET|POST|PATCH /api/styles/*`
- `GET|POST|PATCH /api/variants/*`
- `GET|POST|PATCH /api/prices/*`
- `GET|POST|PATCH /api/pricing-rules/*`
- `GET|POST /api/inventory/*`
- `GET|POST /api/transfers/*`
- `GET|POST|PATCH /api/customers/*`
- `GET|POST /api/products/*`
- `GET|POST /api/sales/*` (full POS: create sale, context, sellable variants, receipts, PDF)
- `GET|POST|PATCH /api/postsales/*` (exchanges, cancellations)
- `GET|POST|PATCH /api/cash/*` (cash register: open, close, history, admin control)
- `GET /api/dashboard/*`
- `GET /api/home/*`

## Current business modules visible in UI

- Inicio
- Dashboard
- Administracion
  - Usuarios
  - Roles
  - Ubicaciones
- Catalogos
- Clientes
- Productos
- Precios
- Inventory
- Kardex
- Transferencias
- Ventas (`purchase-system`): full POS flow with customer picker, variant search, mixed payments, discounts, document types, cash validation
- Historial de ventas (`transaction-history`): sales list with real backend integration
- Postventa: exchanges and cancellations
- Caja: cash register open, close, history, and admin control
- BI: business intelligence with native charts
- Account: user security, appearance, and operation settings

## Domain notes

For products, the current schema already suggests this flow:

- `product_styles`
- `style_sizes`
- `style_colors`
- `product_variants`
- `style_size_prices`
- `pricing_rules`

So product creation should be built around styles first, then sizes/colors, then variants, then prices.

For sales, the current MVP direction is:

- the operator works from the user's default location;
- the frontend should use backend APIs, not direct table access;
- customer can be existing or generic storefront customer;
- stock and current price must be resolved in backend;
- a confirmed sale should impact `sales`, `sales_details`, `sales_payments` and `stock_movements`;
- history and sale detail are follow-up work after the base registration flow is stable.

## Environment

Backend:

- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`

Frontend:

- `NEXT_PUBLIC_API_BASE_URL`

## Working style

- Reuse existing modules before creating new ones.
- Prefer progressive completion over large rewrites.
- Keep pages functional even if the module is incomplete.
- If a module is not ready, use an intentional placeholder instead of a dead link.
- When changing layout, adjust sidebar, topbar and content together so proportions stay coherent.

## Execution boundaries

- Jira is the source of truth for sprint tracking, ownership and status.
- Docs inside `docs/` should be used for active sprint scope, shared flows, testing, readiness checks or stable technical references.
- Do not use repo docs as a substitute for retrospective Jira history unless explicitly requested.
- Keep `AGENTS.md` focused on stable project context, not temporary sprint management decisions.

## Next priorities

Current recommended order:

1. `Hardening de ventas`: edge cases del POS (descuentos complejos, validaciones de stock, flujo de recibos)
2. `Caja y cierres`: integracion completa de cash closing con ventas, arqueos y reportes
3. `Reportes y BI`: expandir analytics mas alla del dashboard actual
4. `Permisos granulares`: refinar permisos por ubicacion y rol en flujos criticos
5. `Testing end-to-end`: flujos criticos (venta, caja, transferencias)
6. `Optimizacion y pulido`: rendimiento, UX density, temas, carga de assets
