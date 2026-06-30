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

> **Excepciones al patron routes/controller/service/repo:**
> - `health` no tiene `service.js` ni `repo.js` — es un endpoint trivial de 1 query (`SELECT NOW()`). La excepcion es intencional.
> - `notifications` no tiene `repo.js` — su `service.js` (514L) agrega queries de otros modulos. La extraccion a `notifications.repo.js` queda como deuda tecnica.

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
| `SELECTED_CARD` | Active state for selectable cards (accent border + bg) |
| `CARD_BASE` | Default state for selectable cards |

Module-specific constants can re-export from `ops-control-styles.ts` (see `pos-constants.ts`, `postsales-constants.ts`).

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
- Every `<OpsDialog>` **must** have a `description` prop. If no context-specific text exists, fall back to the dialog's `title`. Example: `description={item?.label ?? POS.removeItem.title}`
- `ops-dialog.tsx` uses `<DialogPrimitive.Description asChild>` to auto-wire `aria-describedby` — never render dialog description as a raw `<p>` outside this pattern.

### Buttons

- Primary actions: `variant="accent"`
- Secondary/cancel: `variant="outline"`
- Icon-only: `variant="ghost" size="icon-xs"`
- Binary toggles: use `OpsSegmentedControl` with `variant="switch" tone="accent"`, not two separate buttons

### Dropdowns and toggles

- `OpsSelect` for dropdown selections — never raw `<select>`
- `OpsSegmentedControl` with `variant="switch" tone="accent"` for binary toggles
- `SearchablePicker` for typeahead search (products, customers)

### Search pickers — behavior consistency

- `SearchablePicker` is the shared foundation for all typeahead search.
- **Close on select**: after the user confirms an item, the picker closes (same behavior as native `<select>`). Never call `setOpen(true)` in the close/cancel handler — let the user click the input to search again.
- `openOnFocus` is acceptable for initial discovery but must not race with explicit close logic (e.g., avoid calling `.focus()` on the input from inside a dialog's close handler if `openOnFocus` is active).
- Thin module-specific wrappers (`ProductStylePicker`, `CustomerPicker`) provide domain-specific `renderItem` but delegate everything else to `SearchablePicker`.

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

### Derived state — single source of truth

When two places compute the same derived state (e.g., summary status message, submit readiness), consolidate into one pure function:

```ts
// pos-summary-utils.ts — single source
export function deriveSummaryState(input): SummaryDerivedState { ... }

// Hook — computes once, passes result to components
const derived = useMemo(() => deriveSummaryState({...}), [deps])

// Stage component — may recompute locally with the same function
const derived = deriveSummaryState({...})
```

Use `summaryHeadline`, `headerStatus`, `isReadyToFinalize` from the result. Never re-implement the same branching logic in two places.

### Messages

Centralize UI strings in `<module>-messages.ts` under namespaced keys:

```ts
export const MODULE = {
  section: { title: "...", hint: "..." },
  error: { saveError: "...", fieldError: "..." },
} as const
```

Reference: `pos-messages.ts` with namespaces `POS.header`, `POS.stage`, `POS.cash`, etc.

- **Template keys**: function-valued for dynamic strings: `linesOfPayment: (n: number) => \`${n} lineas de pago\``
- **Toast strings**: group under a `toast` namespace within the module messages file
- Zero hardcoded user-facing strings in hooks, utils, or component files — every string references a message key

### Utility files — split by domain

A utility file that exceeds ~300 lines should be split by domain. Each domain file imports core helpers from the base util (never the reverse):

```
pos-utils.ts (128 lines)          ← core: parseAmountInput, round2, createPaymentDraft, ...
pos-pricing-utils.ts (235 lines)  ← calculateSalePreview, discounts, taxes
pos-search-utils.ts (140 lines)   ← groupVariantsByStyle, buildProductSearchResults
pos-customer-utils.ts (195 lines) ← validateCustomerForm, filterCustomersByDocumentType
pos-summary-utils.ts (250 lines)  ← deriveSummaryState + interfaces
```

Consumers import from the specific domain file they need:
```ts
import { calculateSalePreview } from "./pos-pricing-utils"
import { deriveSummaryState } from "./pos-summary-utils"
```

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

### Per-field error types

For forms with multiple editable fields, use a typed error object with optional keys
per field instead of a single `string | null`:

```tsx
// customers-types.ts
export type CustomerFormErrors = {
  _form?: string
  full_name?: string
  business_name?: string
  commercial_name?: string
  document_number?: string
  address?: string
}

// customers-utils.ts
export function validateCustomerInput(input): CustomerFormErrors | null {
  const errors: CustomerFormErrors = {}

  if (!input.full_name.trim() && !input.business_name.trim()) {
    errors.full_name = CUSTOMERS.form.noNameError
  }

  if (input.document_type === "ruc") {
    if (!input.business_name.trim()) {
      errors.business_name = CUSTOMERS.form.rucBusinessNameRequired
    }
    if (!input.address.trim()) {
      errors.address = CUSTOMERS.form.rucAddressRequired
    }
  }

  // Document number validation
  if (!/^\d{8}$/.test(input.document_number)) {
    errors.document_number = CUSTOMERS.form.invalidFormat("DNI")
  }

  return Object.keys(errors).length > 0 ? errors : null
}
```

**Rules:**
- Error type has optional keys (`?`) for every validatable field
- Validation function returns the error object or `null`
- Each `OpsFormField` receives its individual error: `<OpsFormField error={errors?.document_number} />`
- `_form` key is for cross-field errors (only valid when multiple fields share a constraint)
- Errors clear via `useEffect` on dialog `open`, not via individual `onChange` per field

### Two-phase save action state

Dialogs that create/update entities with server-side validation (duplicate checks)
use a 3-phase state machine, never a single boolean:

```tsx
const [actionState, setActionState] = useState<"idle" | "validating" | "saving">("idle")
const isBusy = actionState !== "idle"

async function save() {
  // Phase 1: local validation
  const validation = validateCustomerInput(form)
  if (validation) { setErrors(validation); return }

  // Phase 2: server-side validation (duplicate check)
  setActionState("validating")
  setErrors(null)
  const duplicate = await findDuplicateByDocument({ ...excludeId })
  if (duplicate) {
    setErrors({ document_number: "Ya existe un cliente con este documento." })
    setActionState("idle")
    return
  }

  // Phase 3: actual save
  setActionState("saving")
  await apiFetchData("/api/entity", { method: "POST", body: JSON.stringify(payload) })
  close()
}

// In the footer button:
{actionState === "validating" ? (
  <LoaderCircle className="animate-spin" /> Validando...
) : actionState === "saving" ? (
  <LoaderCircle className="animate-spin" /> Guardando...
) : "Guardar"}
```

**Rules:**
- `"idle"`: no action in progress — buttons enabled
- `"validating"`: running local validation + pre-save checks (no DB write yet)
- `"saving"`: executing POST/PATCH — buttons disabled
- On validation or duplicate error, reset to `"idle"` so user can retry
- Each phase shows distinct text with `LoaderCircle animate-spin`

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

### Frontend route summary (provisional)

| Modulo | Ruta | API base |
|---|---|---|
| Inicio | `/inicio` | `GET /api/home/overview` |
| Dashboard | `/panel` | `GET /api/dashboard/*` |
| POS | `/ventas/nueva` | `GET/POST /api/sales/*` |
| Historial ventas | `/ventas/historial` | `GET /api/sales` |
| Detalle venta | `/ventas/[saleId]` | `GET /api/sales/[saleId]` |
| Postventa | `/postventa` | `GET/POST/PATCH /api/postsales/*` |
| Detalle postventa | `/postventa/[saleId]` | `GET /api/postsales/[saleId]` |
| Caja | `/caja` | `GET/POST/PATCH /api/cash/*` |
| Redirecciones legacy | `/purchase-system`, `/transaction-history`, etc. | → rutas nuevas via `next.config.ts` |

> **Nota provisional:** Las rutas anteriores (`/ventas`, `/purchase-system`, `/transaction-history`) redirigen a las nuevas via rewrite en `next.config.ts`. Eliminar los redirects cuando los bookmarks y accesos directos esten migrados.

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
- `GET /api/notifications/*`
- `POST /api/chatbot/*`

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
- Ventas (POS): `/ventas/nueva` — full POS flow with customer picker, variant search, mixed payments, discounts, document types, cash validation
- Historial de ventas: `/ventas/historial` — sales list with real backend integration
- Detalle de venta: `/ventas/[saleId]` — sale detail with receipt PDF, payments, totals
- Postventa: `/postventa` — exchanges and cancellations (en revision: dialogs extraidos a componentes propios, pendiente consolidar UI final)
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

## Shared components — cross-module reuse

If a component is imported by 2+ feature modules, move it to `components/shared/<category>/`:

```
components/shared/pickers/product-variant-picker.tsx  ← used by sales + postsales
```

When moving:
- Remove dead props (check with `grep` that the prop is actually read in the component body, not just defined in the interface).
- Update all imports in consumer files.
- Delete the old file.

## Detail page patterns (proven)

These patterns were validated on `sale-detail-page.tsx` (`ventas/[saleId]`) and `postsale-detail-page.tsx` (`postventa/[saleId]`). New detail pages must follow them.

### Visual composition

Every detail page follows the same structure. The top section is a unified header panel; the grid below splits into main content (left) and sidebar metrics/actions (right).

```
OpsPageShell (width="wide")
├── PosHeader (eyebrow + title + meta + actions)
│
├── Header panel — INFO_BOX_XL, p-5 shadow-sm md:p-6
│   ├── Left: doc type · date · location
│   ├── Left: customer name + document number
│   ├── Left: seller · created · confirmed (text-xs)
│   ├── Right: ACCENT_HIGHLIGHT_PANEL (total + paid + partial badge + missing)
│   └── Bottom: notes (conditional, border-t)
│
├── Grid: lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:items-start
│   ├── Main column (space-y-4)
│   │   ├── OpsPanelSection "Productos" / "Venta base" + table
│   │   ├── OpsPanelSection "Trazabilidad"  (postsale only)
│   │   └── OpsPanelSection "Anulacion"     (postsale only)
│   │
│   └── Sidebar (space-y-4, lg:sticky lg:top-20)
│       ├── OpsPanelSection "Acciones"      (postsale only: exchange/cancel)
│       ├── OpsPanelSection "Totales"       (subtotal, discount, tax, total, units, lines)
│       ├── OpsPanelSection "Pagos"         (payment items + reversals + net reconciliation)
│       └── OpsPanelSection "Notas"         (conditional)
│
└── ReceiptOptionsModal (conditional)
```

**Key rule**: customer name, document, seller, and location go in the **header panel** (`INFO_BOX_XL`), never in a sidebar panel. The sidebar is for metrics and actions, not identity/operation metadata.

### Header panel — field layout

The `INFO_BOX_XL` panel always follows this internal structure:

```tsx
<div className={`${INFO_BOX_XL} p-5 shadow-sm md:p-6`}>
  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    {/* Left block */}
    <div className="min-w-0 space-y-2">
      <p className="text-sm text-[var(--ops-text-muted)]">
        {formatDocumentType(docType)} · {formatDateTime(date)} · {locationName}
      </p>
      <div>
        <p className="font-semibold text-[var(--ops-text)]">{customerName || genericCustomer}</p>
        {docType && docNumber ? <p className="text-sm text-[var(--ops-text-muted)]">{docType} {docNumber}</p> : null}
      </div>
      <p className="text-xs text-[var(--ops-text-muted)]">
        {sellerLabel}: {sellerName} · {createdLabel}: {formatDateTime(createdAt)}
        {confirmedAt ? ` · ${confirmedLabel}: ${formatDateTime(confirmedAt)}` : ""}
      </p>
    </div>
    {/* Right block — total highlight */}
    <div className={`${ACCENT_HIGHLIGHT_PANEL} px-4 py-3 lg:min-w-60`}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${ACCENT_LABEL_TEXT}`}>
        {totalHeader}
      </p>
      <p className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-[var(--ops-text)]">
        {formatCurrency(totalAmount)}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--ops-text-muted)]">
        <span>{paidLabel} {formatCurrency(paidAmount)}</span>
        {!fullyPaid ? <OpsStatusBadge tone="warning">{partialLabel}</OpsStatusBadge> : null}
      </div>
      {!fullyPaid && balanceDue > 0 ? (
        <p className="mt-1 text-sm font-semibold text-[var(--ops-tone-warning-text)]">
          {missingLabel} {formatCurrency(balanceDue)}
        </p>
      ) : null}
    </div>
  </div>
  {/* Notes — bottom, separated */}
  {notes ? (
    <p className="mt-3 text-sm text-[var(--ops-text-muted)] border-t border-[var(--ops-border-soft)] pt-3">
      {noteLabel}: {notes}
    </p>
  ) : null}
</div>
```

### PosHeader rules

- **Badge goes in `meta`, never inside `title`/`h1`.** `title` is a clean string or simple `ReactNode`. Status badge, location chip, and similar metadata use the `meta` prop.
- `actions` include back button, preview/download buttons, dropdown overflow. Back button must be inside `actions`, not a separate div above `PosHeader`.

### OpsPanelSection: title inside the border

All sections in the grid (Products, Totals, Payments, Actions, Notes) must use `OpsPanelSection` — title and icon live **inside** the panel border, not as a raw `<h2>` outside. Never recreate `<section>+<h2>+<article>` locally.

```tsx
<OpsPanelSection
  title={PS.detail.sections.totals}
  icon={<ReceiptText className="h-4 w-4 text-[var(--ripnel-accent)]" />}
>
  <div className="space-y-2">
    <OpsMetricRow label={PS.detail.subtotal} value={formatCurrency(subtotal)} />
    {/* ... */}
  </div>
</OpsPanelSection>
```

### Sidebar composition standard

The sidebar always follows this order (top to bottom). Not all sections are present in every page; reorder is not allowed.

| # | Section | Component | Applies to |
|---|---------|-----------|------------|
| 1 | Actions | `OpsPanelSection` with buttons | Postsale only |
| 2 | Totals | `OpsPanelSection` + `OpsMetricRow` × N | All detail pages |
| 3 | Payments | `OpsPanelSection` wrapping payment list | All detail pages |

The grid uses `lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]` with the sidebar being `lg:sticky lg:top-20`.

### Table inside a rounded panel

When a full-width table lives inside `OpsPanelSection` (which has `rounded-xl`), use the proven pattern from `stage-products.tsx`:

```tsx
<OpsPanelSection title="Productos" icon={<Package />}>
  <div className={`-mx-[var(--ops-panel-padding)] overflow-hidden rounded-b-xl ${hasContent ? "-mb-[var(--ops-panel-padding)]" : ""}`}>
    <div className="overflow-x-auto">
      <table>...</table>
    </div>
  </div>
</OpsPanelSection>
```

`overflow-hidden` + `rounded-b-xl` clips the table's white background to the panel's rounded bottom corners. Without this, the table background bleeds over the rounded border.

### Child panel without wrapper (PaymentsNetPanel pattern)

When a sub-component renders payment list + reconciliation, the `OpsPanelSection` wrapper with title and icon belongs in the **parent page**, not in the child component. The child returns only the inner content:

```tsx
// Parent (page) — wraps child in OpsPanelSection
<OpsPanelSection
  title={PS.detail.sections.payments}
  icon={<CreditCard className="h-4 w-4 text-[var(--ripnel-accent)]" />}
>
  {payments.length === 0 ? (
    <p className="...">{noPaymentsMessage}</p>
  ) : (
    <PaymentsNetPanel context={context} paymentSummary={summary} />
  )}
</OpsPanelSection>

// Child (sections) — no wrapper, just content
export function PaymentsNetPanel({ context, paymentSummary }) {
  return (
    <>
      <div className="space-y-2">
        {payments.map(p => <div className={INFO_BOX_MUTED}>...</div>)}
        {reversals.length > 0 ? <div>...</div> : null}
      </div>
      <div className="mt-4 space-y-2 border-t ... pt-4">
        <OpsMetricRow label={registeredLabel} value={formatCurrency(paymentTotal)} />
        <OpsMetricRow label={reversalsLabel} value={formatCurrency(reversalTotal)} />
        <div className="border-t ... pt-2">
          <OpsMetricRow label={netLabel} value={formatCurrency(netTotal)} />
        </div>
      </div>
    </>
  )
}
```

This prevents double-wrapping of `OpsPanelSection` and keeps the sidebar sections visually consistent.

### Document-type routing for PDFs

```ts
const isProforma = sale.document_type === "proforma"
const isInvoice = sale.document_type === "boleta" || sale.document_type === "factura"

// boleta/factura → /api/sales/{id}/pdf + ReceiptOptionsModal
// proforma       → /api/sales/{id}/proforma-pdf  (no download modal)
// none           → hide PDF buttons entirely
```

### Modal standards (all detail pages)

- Every modal must use the canonical footer from DESIGN.md: `flex flex-col-reverse gap-2 sm:flex-row sm:justify-end` with `Button variant="outline"` for close/cancel.
- Modal strings must live in a module-specific messages file (e.g. `receipt-messages.ts`), never hardcoded as string literals.
- `OpsStatusBadge` icon must use the `icon` prop, not be passed as a child.

### Subsequent load feedback (detail pages)

Detail pages that render raw `<table>` (not `OpsDataTable`) must dim the content while re-fetching on filter changes. Use `opacity-50 transition-opacity duration-150 pointer-events-none` on the content wrapper when `loading && data` (subsequent loads, not first load which already has `LoadingPage`):

```tsx
const { data, loading, error } = useApiGet(fetcher, deps)

// In JSX — wrapper around the reloadable content block:
<div
  className={cn(
    "base classes...",
    loading && data && "opacity-50 transition-opacity duration-150 pointer-events-none"
  )}
>
  {/* table content */}
</div>
```

**Rules:**
- Guard: `loading && data` — only dim on subsequent fetches, never on first load
- `pointer-events-none` prevents clicks on stale data
- Apply to the outermost wrapper of the reloadable content block (not the entire section)
- Do NOT use on sections that don't change with the re-fetch (e.g., sidebar metrics that are static)
- This pattern applies to any detail page with raw tables: `inventory-detail`, `sale-detail`, `postsale-detail`, `transfers-detail`

### Conditional metrics

Rows like IGV and discount must be hidden when their value is 0 — same guard pattern:
```tsx
{discountAmount > 0 ? <OpsMetricRow label={...} value={...} tone="warning" /> : null}
{Number(tax_amount) !== 0 ? <OpsMetricRow label={...} value={...} /> : null}
```

### Panel constant decision tree

| Constant | Purpose | Where |
|---|---|---|
| `INFO_BOX_XL` | **Unified header panel** | Top of detail page, contains all sale metadata + total |
| `ACCENT_HIGHLIGHT_PANEL` | Total highlight block | **Inside** `INFO_BOX_XL`, right side |
| `ACCENT_LABEL_TEXT` | Accent-colored label text | Inside `ACCENT_HIGHLIGHT_PANEL` |
| `OpsPanelSection` | Every titled section in the grid | Products, Totals, Payments, Actions, Exchange trace, Notes |
| `INFO_BOX_MUTED` | Individual items inside a section | Payment cards, exchange detail blocks, `DetailField` cells |
| `CARD_BASE` | Selectable card default state | Sale line cards in `BaseSalePanel` |
| `SELECTED_CARD` | Selectable card active state | Selected line card in exchange dialogs |

### Cross-module formatting

CSS class constants and formatting utilities can be imported across modules:

- **CSS constants**: re-export from `ops-control-styles.ts` via module-specific constants files (e.g. `postsales-constants.ts` re-exports `INFO_BOX_XL`, `ACCENT_HIGHLIGHT_PANEL`, etc.)
- **Formatting**: `formatDocumentType` from `sales-utils.ts` is reused in `postsale-detail-page.tsx`. Do not duplicate document-type formatting per module.
- **Types**: if the API returns a field that the TypeScript type doesn't declare, **add it to the type file** (e.g. `sale_discount_amount` was added to `PostsaleContext.sale`). Do not use `as any` or `Record<string, unknown>` workarounds for well-known fields.

### Message organization (detail pages)

```ts
// sales-history-messages.ts
export const SH = {
  detail: { eyebrow, loading, error, back, preview, download, totalHeader,
            products, totals, payments, subtotal, discount, tax, ... },
  table: { columns: { sale, variant, quantity, unitPrice, lineTotal, ... } },
}

// receipt-messages.ts
export const RC = {
  dialog: { title, description, close, footerNote },
  options: { ticket80, ticket58, pdfTicket, pdfA4 },
  preview: { label, description },
  badge: { comingSoon },
}
```

- `SH.table.columns` must define every column header used in detail tables.
- `SH.detail` must define every fallback string (e.g. `fallbackSize: "ST"`, `fallbackColor: "Unico"`, `fallbackDash: "-"`, `unknownStatus: "Desconocido"`).
- Zero hardcoded user-facing strings in component files.

### Anti-patterns (do NOT do)

- Badge inside `<h1>` / `PosHeader.title`
- `color-mix()` inline in component files — extract to `ops-control-styles.ts`
- `<section>+<h2>+<article>` — use `OpsPanelSection`
- `<p>` as modal footer — use canonical `outline` + `accent` buttons
- IGV row always visible (even when 0)
- PDF preview button always pointing to `/api/sales/{id}/pdf` regardless of document type
- Modal strings hardcoded as literals
- `setOpen(true)` inside dialog close handlers or after item selection — the picker must close and stay closed, consistent with `<select>` behavior
- Utility files over 500 lines — split by domain before they reach that size
- Duplicating `deriveSummaryState`-like logic in a hook when the pure function already covers the same branches
- `<OpsDialog>` without a `description` prop — always provide one, even if it's just the `title` as fallback
- **Customer/operation info in a sidebar panel** — use the unified `INFO_BOX_XL` header panel instead
- **Child component wrapping itself in `OpsPanelSection`** — the parent page owns the section wrapper; child returns content only
- **Standalone `ACCENT_HIGHLIGHT_PANEL` floating between PosHeader and grid** — total highlight always lives inside `INFO_BOX_XL`

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

1. `Auditoria de modulos`: ejecutar `docs/module-review-checklist.md` en postsales, cash, inventory, transfers, customers, products, BI
2. `Hardening post-auditoria`: aplicar `docs/refactor-vs-rebuild.md` segun el tier detectado en cada modulo
3. `Caja y cierres`: integracion completa de cash closing con ventas, arqueos y reportes
4. `Reportes y BI`: expandir analytics mas alla del dashboard actual
5. `Permisos granulares`: refinar permisos por ubicacion y rol en flujos criticos
6. `Testing end-to-end`: flujos criticos (venta, caja, transferencias)

### Guias de auditoria y refactor

Antes de modificar cualquier modulo existente, ejecutar:

1. `docs/module-review-checklist.md` — checklist paso a paso con comandos grep
2. `docs/refactor-vs-rebuild.md` — decision matrix y sistema de tiers

El modulo `ventas` es la referencia canonica (Tier 3 completado, score ~0 actual).

## Hardening checklist (ventas modulo)

Refactor completado en Junio 2026.

| Fase | Estado | Descripcion |
|------|--------|-------------|
| 1. Strings huerfanos | ✅ | `pos-utils.ts`, `use-product-search.ts` → centralizados en `pos-messages.ts` |
| 2. Strings componentes | ✅ | `stage-products/customer/payment`, `product-config-dialog` → `pos-messages.ts` |
| 3. CSS color-mix | ✅ | Extraido a `ops-control-styles.ts`. Corregido double-wrapping `border-[[...]]` → `border-[...]` en 4 archivos |
| 4. Split orchestrator | ✅ | `use-pos-sale.ts` (807→712). Nuevos: `use-sale-confirmation.ts`, `use-sale-keyboard.ts` |
| 5. Verificacion | ✅ | TypeScript, 98 tests Playwright pasan |

### Nuevos hooks

```
usePosSale()
  ├─ useCart()
  ├─ useCashContext()
  ├─ useCustomerSearch()
  ├─ usePaymentState()
  ├─ useProductSearch()
  ├─ useSaleConfirmation()   ← nuevo (confirmacion, reset, revision, recibos)
  └─ useSaleKeyboard()       ← nuevo (F2/F4/F8/Escape, pulse, goToStage)
```

### Convencion de mensajes

El archivo `pos-messages.ts` usa español sin tildes por convencion. Toda string visible al usuario debe residir en `pos-messages.ts` o `sales-history-messages.ts`, nunca hardcodeada.

### Estado de hardening por modulo

> **Component inventory detallado:** `docs/frontend-component-inventory.md` — matriz de componentes x modulo, deprecados, referencias canonicas y anti-patrones.

| Modulo | Hardening | Tipo | Componentes clave | -messages | -constants | -types | -utils | Notas |
|--------|:---------:|------|-------------------|:---------:|:----------:|:------:|:------:|-------|
| Ventas (POS) | ✅ Tier 3 | Formulario + Listado + Detalle | PosHeader, OpsSegmentedControl, SearchablePicker, OpsPanelSection, SalesWizardRail | ✅ | ✅ | ✅ | ✅ 5 files | Canonico. 9 hooks. |
| Caja | ✅ | Estado + Listado + Admin + Detalle | PosHeader, OpsDialog, OpsPanelSection, OpsMetricCard, DashboardChartCard | ✅ | ✅ | ✅ | ✅ | Completo. 4 hooks. |
| Clientes | ✅ | Listado CRUD | PosHeader, OpsDialog, OpsFormField, OpsSegmentedControl, AdminRowActionsMenu | ✅ | ✅ | ✅ | ✅ | Completo. Two-phase save. |
| Postventa | ✅ Parcial | Listado + Detalle | PosHeader, OpsDialog, OpsFormField, SearchablePicker, INFO_BOX_XL | ✅ | ✅ | — | — | Dialogs extraidos. Faltan types/utils. |
| Inventario | ✅ | Listado + Detalle + Formulario | PosHeader, OpsDialog, OpsFormField, OpsQuantityStepper, INFO_BOX_XL | ✅ | ✅ | ✅ | shared.ts | Completo. 0 color-mix inline. 0 Admin* components. All strings centralised. |
| Kardex | ✅ | Listado | PosHeader, DateFilterPicker, CHIP_ENTRY/EXIT/ADJUST | ✅ | ✅ | — | domain.ts | Completo. 5 color-mix locales sin migrar. |
| Administracion | ✅ | Listado CRUD x 3 | PosHeader, OpsDialog, OpsFormField, AdminRowActionsMenu, AdminConfirmModal, RolePermissionPicker | ✅ | ✅ | ✅ | ✅ | Completo. 3 paginas + 4 base. Dialogs unificados (sin /nuevo). Two-phase save + per-field errors. |
| Productos | ✅ | Overview + Styles + Variants + Create | PosHeader, OpsDataTable, OpsDialog, OpsFormField, OpsSelect, AdminRowActionsMenu | ✅ | ✅ | ✅ | ✅ | Refactorizado. AdminModalShell→OpsDialog. 8 Admin* migrados. 0 color-mix inline. |
| Precios | ✅ | Listado + Workspace + Reglas | PosHeader, OpsDataTable, OpsMetricInlineGroup, OpsSelect, OpsSearchField, CoverageBar | ✅ | ✅ | — | lib/ | Refactorizado. TooltipProvider removido. 0 color-mix inline. 0 strings hardcodeados. |
| Transferencias | ✅ | Listado + Detalle + Request + Manage + History | PosHeader, OpsDialog, OpsPanelSection, OpsDataTable, Pagination | ✅ | ✅ | — | shared.tsx + hook | Refactorizado. 65 color-mix→ops-tone. 7 TooltipProvider removidos. 10 Admin* migrados. |
| Inicio | ✅ | Dashboard | PosHeader, OpsMetricInlineGroup, OpsStatusBadge, INFO_BOX | ✅ | ✅ | — | — | Refactorizado. SURFACE_MUTED_30/52. Tildes fijadas. |
| Dashboard | ✅ | Charts + Metricas | PosHeader, OpsMetricInlineGroup, DashboardChartCard, OpsPanelSection | ✅ | ✅ | — | lib/ | Refactorizado. SURFACE_MUTED_24 + CHART4_HIGHLIGHT_PANEL. 0 color-mix, 0 TooltipProvider. |
| BI | — | — | — | — | — | — | — | Placeholder (redirect a `/panel`) |
| Cuenta | ✅ | Settings | PosHeader, OpsDialog, OpsFormField | ✅ | ✅ | — | — | Refactorizado. InlineMessage→toast. Tildes fijadas. |
| Catalogos | ✅ | Hub + Listado + Form | PosHeader, OpsDialog, OpsFormField, OpsSelect, RowActionsMenu, AdminConfirmModal | ✅ | ✅ | ✅ | — | Refactorizado. AdminModalShell→OpsDialog. AdminField→OpsFormField. AdminInlineMessage removido. |
| Notificaciones | ✅ | Listado | PosHeader, Button, OpsStatusBadge | ✅ | — | — | — | Refactorizado. raw button→Button. Tildes fijadas. TooltipProvider removido. |

## Hardening checklist (inventario / stock modulo)

Refactor iniciado en Junio 2026. Modulo compuesto por 5 pantallas: stock actual, detalle de producto, movimientos (kardex), ajustes (lista), ajustes (creacion).

| Fase | Estado | Descripcion |
|------|--------|-------------|
| 1. Pagina principal (`/inventario`) | ✅ | Vista unificada sin tabs. 737→304 lineas. UI identica admin/usuario. Auto-scope a sede default via `useAuth()`. Badge de sede en `PosHeader.meta`. Strings en `inventory-messages.ts`. |
| 2. Pagina detalle (`/inventario/[styleId]`) | ✅ | Sin tabs. 394→310 lineas. Patron canonico detail pages: `INFO_BOX_XL` + grid 1.35fr/0.65fr + sidebar. Matriz en main column, cards de sede y link a kardex en sidebar. Redirect a kardex con `query` y `location_id` (UUID). |
| 3. Shared types (`inventory-summary-shared.ts`) | ✅ | Limpieza: removidos 8 tipos/funciones de tabs y vista por sede. 176→130 lineas. |
| 4. Constants (`inventory-constants.ts`) | ✅ | Nuevo archivo. Re-export de `INFO_BOX_XL`, `ACCENT_HIGHLIGHT_PANEL`, etc. desde `ops-control-styles.ts`. |
| 5. Pagina kardex (`/inventario/movimientos`) | ✅ | Hardening completo Junio 2026. `kardex-messages.ts` + `kardex-constants.ts` creados. `kardex-domain.ts` migrado de `lib/` a `kardex/`. Componente unificado (sin split `KardexPage`/`KardexPageContent`). 0 strings hardcodeados, 0 `color-mix()` inline. Auto-scope a sede default via `useAuth()`. Badge de sede en `PosHeader.meta` con `OpsStatusBadge`. Dropdown de sede condicional: solo visible si `availableLocations.length > 1`. Fechas con `DateFilterPicker` (estandar de la app) + restriccion cruzada (`max={dateTo}` / `min={dateFrom}`) + `max={todayStr}` en Hasta. Metricas homogeneas (4 conteos, no mezcla conteo/cantidad). `movement.movement_direction` del backend usado directo en render (sin re-resolver por fila). Filtros con URL-sync. Clear filters → sede default. Labels de dominio en `KARDEX.labels.{operation,origin,reference}` importados por `kardex-domain.ts`. Redirect desde inventory-detail-page verificado. |
| 6. Pagina ajustes lista (`/inventario/ajustes`) | ✅ | `inventory-adjustments-page.tsx` refactorizado: PosHeader, OpsMetricInlineGroup, OpsFiltersRow, OpsDataTable, URL-sync, auto-scope. 0 strings hardcodeados. |
| 7. Pagina ajustes creacion (`/inventario/ajustes/nuevo`) | ✅ | `inventory-adjustments-create-page.tsx` (1049L) refactorizado: OpsFormField, OpsSelect, SearchablePicker, OpsDialog, two-phase save. `adjustments-detail-page.tsx` (501L) con patron canonico (INFO_BOX_XL + grid + OpsPanelSection). `adjustment-summary-stage.tsx` extraido. 0 color-mix inline. TypeScript OK. |
| 8. Umbral `LOW_STOCK_THRESHOLD` | 🔲 | Pendiente: extraer de constante `3` en backend a configuracion por sede. Duplicado en 4 archivos backend. |
| 9. Sistema de estados y notificaciones | ✅ | `active = TRUE` agregado en 7 queries (`inventory.repo.js` + `dashboard.repo.js`). URLs de notificaciones corregidas (`sin-stock`→`out`, `stock-bajo`→`low`). Labels de status centralizados en `inventory-messages.ts`. Desactivar producto (`active=false`) ahora lo oculta de inventario y detiene notificaciones — borrado logico real. |
| 10. CSS y UX en detalle | ✅ | `opsControlClassName`: `focus-visible:ring-*` → `focus-visible:shadow-[...]` (eliminado borde azul de Tailwind en todos los selects/inputs ops). Matriz tallas/colores: `minWidth` 820→600px, padding reducido `px-4`→`px-3`, wrapper redundante eliminado. Feedback dimmer (`opacity-50`) al cambiar sede. |

### Archivos del modulo inventario

```
apps/frontend/components/modules/inventory/
├── inventory-constants.ts          ← re-export de ops-control-styles
├── inventory-messages.ts           ← STOCK.* (list + detail)
├── inventory-page.tsx              ← pagina principal (vista unica, sin tabs)
├── inventory-detail-page.tsx       ← detalle de producto (patron canonico)
├── inventory-summary-shared.ts     ← tipos compartidos
├── inventory-adjustments-shared.ts ← tipos de ajustes
├── inventory-adjustments-page.tsx  ← lista de ajustes (refactorizado)
├── inventory-adjustments-create-page.tsx ← creacion de ajustes (refactorizado)
├── adjustments-messages.ts         ← ADJ.* strings centralizados
├── adjustments-constants.ts        ← re-export de ops-control-styles
├── adjustments-detail-page.tsx     ← detalle de ajuste (refactorizado)
└── adjustment-summary-stage.tsx    ← resumen sidebar (extraido)

apps/frontend/components/modules/kardex/
├── kardex-constants.ts            ← re-export de ops-control-styles + chips kardex
├── kardex-domain.ts               ← logica de dominio (tipos, resolvers, labels)
├── kardex-messages.ts             ← KARDEX.* strings centralizados
└── kardex-page.tsx                ← movimientos de stock (refactorizado)
```

### Patrones aplicados en inventario

- **Pagina principal**: `PosHeader` + `OpsMetricInlineGroup` + `OpsTableBlock className="border-t ... pt-4"` + `OpsFiltersRow` + `OpsDataTable`. Igual que ventas historial.
- **Pagina detalle**: `PosHeader` con `meta` badges + `INFO_BOX_XL` header panel + `ACCENT_HIGHLIGHT_PANEL` + grid `lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]` + `OpsPanelSection` en main y sidebar. Igual que sale-detail y postsale-detail.
- **Auto-scopeo**: `useAuth()` → `defaultLocation?.location_id` como valor inicial del filtro de sede. `useRef` para que el efecto solo se ejecute una vez.
- **Mensajes**: `STOCK.header.*`, `STOCK.filters.*`, `STOCK.columns.*`, `STOCK.detail.*` — todos los strings visibles referencian `STOCK.*`.

### Patrones aplicados en kardex

- **Pagina kardex**: `PosHeader` con `meta` badge de sede + `OpsMetricInlineGroup` (4 metricas homogeneas: conteo) + `OpsTableBlock` + `OpsFiltersRow` + `OpsDataTable`. Mismo patron que inventory-page y sales history.
- **Auto-scopeo**: replica el patron de inventory-page: `useAuth()` → `defaultLocation?.location_id` como valor inicial. `useRef` guard para una sola ejecucion. El dropdown de sede se oculta si `availableLocations.length <= 1`.
- **Fechas**: `DateFilterPicker` con `density="compact"` (estandar de la app). Restriccion cruzada (`max={dateTo}` en Desde, `min={dateFrom}` en Hasta). `max={todayStr}` en Hasta (sin fechas futuras). Sin defaults de rango (el usuario decide si filtra).
- **Filtros condicionales**: dropdown de sede solo visible si `availableLocations.length > 1`. Grid `OpsFiltersRow` ajusta columnas dinamicamente con `cn()`.
- **Render de filas**: `movement.movement_direction` del backend como fuente primaria (`??` fallback al resolver local). Chips con `CHIP_ENTRY`/`CHIP_EXIT`/`CHIP_ADJUST` y cantidades con `QTY_POSITIVE`/`QTY_NEGATIVE` desde `kardex-constants.ts`.
- **Domain logic**: `kardex-domain.ts` con tipos, resolvers y formateadores. Labels de operacion/origen/referencia en `KARDEX.labels.*`. Formateadores (`formatMovementOperationLabel`, etc.) importan desde `kardex-messages.ts`.
- **URL-sync**: filtros se persisten en query params via `router.replace` en `useEffect`.
- **Clear filters**: resetea a sede default del usuario, no a `"ALL"`. Si hay contexto de navegacion (`reference_type`/`reference_id`), navega a `pathname` limpio.
- **Mensajes**: `KARDEX.header.*`, `KARDEX.filters.*`, `KARDEX.columns.*`, `KARDEX.table.*`, `KARDEX.metrics.*`, `KARDEX.labels.{operation,origin,reference}` — todos los strings visibles referencian `KARDEX.*`.

## Hardening checklist (administracion modulo)

Refactor completado en Junio 2026. Modulo compuesto por 3 pantallas: usuarios, roles, ubicaciones (sedes).

| Fase | Estado | Descripcion |
|------|--------|-------------|
| 1. Archivos base | ✅ | `admin-messages.ts`, `admin-types.ts`, `admin-constants.ts`, `admin-utils.ts` creados. Todos los strings, tipos, constantes y validaciones centralizados. |
| 2. OpsDialog | ✅ | `AdminModalShell` (deprecado) migrado a `OpsDialog` en los 3 modulos. Footer canonico: `flex-col-reverse gap-2 sm:flex-row sm:justify-end` + `outline` + `accent`. `description` prop siempre presente. |
| 3. OpsFormField | ✅ | `AdminField` + `AdminInput` migrado a `OpsFormField` + `opsInputCompact`. Label, required asterisk, error per-field via `data-field-error`. |
| 4. Two-phase save | ✅ | `idle` → `validating` → `saving` → `idle` en los 3 modulos. `LoaderCircle animate-spin` + texto distinto por fase. Boton `disabled` cuando `actionState !== "idle"`. |
| 5. Per-field errors | ✅ | `UserFormErrors`, `RoleFormErrors`, `LocationFormErrors` con keys opcionales por campo. `validate*Input()` retorna errors o `null`. Errores se limpian al abrir dialog (`useEffect` + `Promise.resolve().then()`). |
| 6. Error mapping | ✅ | `mapUserSaveError`, `mapRoleSaveError`, `mapLocationSaveError` mapean 409 (duplicate) al campo responsable. `_form` para errores genericos. |
| 7. Toasts | ✅ | `showSuccess` / `showError` desde `lib/toast.ts`. Eliminado `successMessage` state persistente en locations. |
| 8. Rutas /nuevo eliminadas | ✅ | `users-create-page.tsx`, `roles-create-page.tsx`, `locations-create-page.tsx` eliminados. Rutas `/nuevo` eliminadas. Crear y editar unificados en un solo OpsDialog por modulo. |
| 9. Clave temporal | ✅ | `window.alert` reemplazado por OpsDialog dedicado con `code` + boton copy-to-clipboard. |
| 10. color-mix() inline | ✅ | Eliminado. Tokens `--ops-tone-warning-*` y `--ops-tone-danger-*` usados via `INFO_BOX_MUTED` + clases de borde/bg. |
| 11. TooltipProvider | ✅ | Wrapper redundante eliminado de los 3 modulos (SidebarShell ya provee TooltipProvider global). |
| 12. Types/admin.ts | ✅ | `types/admin.ts` global eliminado. Tipos migrados a `admin-types.ts` local del modulo. |
| 13. usePagination | ✅ | locations-page migrada de paginacion manual a `usePagination` hook (consistente con users y roles). |
| 14. Verificacion | ✅ | TypeScript 0 errores. Lint 0 errores (2 warnings pre-existentes `useMemo` deps). |

### Archivos del modulo administracion

```
apps/frontend/components/modules/administration/
├── admin-constants.ts          ← re-export de ops-control-styles + LOCATION_TYPE_LABELS
├── admin-messages.ts           ← ADMIN.* (todos los strings centralizados)
├── admin-types.ts              ← User, Role, Location, *FormState, *FormErrors, EMPTY_*_FORM
├── admin-utils.ts              ← validate*, build*Payload, to*FormState, map*SaveError, formatPermissionChip
├── users-page.tsx              ← listado + OpsDialog crear/editar + OpsDialog sedes + dialog clave temporal
├── roles-page.tsx              ← listado + OpsDialog crear/editar con RolePermissionPicker
└── locations-page.tsx          ← listado + OpsDialog crear/editar
```

### Patrones aplicados

- **Listado**: `PosHeader` + `OpsMetricInlineGroup` + `OpsSectionDivider` + `OpsTableBlock` + `OpsFiltersRow` + `OpsDataTable`. Igual que ventas historial, clientes, kardex, inventario.
- **Dialogs**: `OpsDialog` con `size="lg"` (users, roles) o `size="sm"` (locations). Footer canonico con `LoaderCircle animate-spin` + texto por fase.
- **Two-phase save**: `actionState: "idle" | "validating" | "saving"`. Local validation → server save. Error 409 mapeado al campo responsable.
- **Per-field errors**: `*FormErrors` con keys opcionales. `OpsFormField error={errors?.campo}`. Errores limpiados al abrir dialog.
- **Eliminacion logica**: `AdminConfirmModal` con `confirmTone="danger"` (inactivar) / `"accent"` (activar). PATCH `{ active: !active }`.
- **Clave temporal**: OpsDialog dedicado con `code` + boton copy-to-clipboard + `Check` icon feedback.
- **Mensajes**: `ADMIN.header.*`, `ADMIN.filters.*`, `ADMIN.table.*`, `ADMIN.dialog.*`, `ADMIN.toast.*`, `ADMIN.form.*`, `ADMIN.errors.*` — todos los strings visibles referencian `ADMIN.*`.

### Como continuar en otro chat

Para continuar con la fase 6 (ajustes lista), usar este prompt:

```
Continuar hardening del modulo inventario/stock en RIPNEL.
Revisar AGENTS.md seccion "Hardening checklist (inventario / stock modulo)".
Fase actual: 6 — pagina ajustes lista (/inventario/ajustes).

Tareas:
1. Revisar `adjustments-messages.ts` existente, verificar cobertura de strings
2. Refactorizar inventory-adjustments-page.tsx: usar mensajes, revisar strings huerfanas
3. Revisar inventory-adjustments-shared.ts: limpiar tipos no usados

No modificar los archivos ya refactorizados (inventory-page.tsx, inventory-detail-page.tsx, inventory-messages.ts, inventory-constants.ts, inventory-summary-shared.ts, kardex-page.tsx, kardex-messages.ts, kardex-constants.ts, kardex-domain.ts).
```

## Hardening checklist (productos modulo)

Refactor completado en Junio 2026. Modulo compuesto por 4 pantallas: overview, estilos, variantes, creacion.

| Fase | Estado | Descripcion |
|------|--------|-------------|
| 1. products-messages.ts | ✅ | Expandido de 66L a 280L. Cobertura completa de overview, styles, variants, create, status, warnings. |
| 2. products-constants.ts | ✅ | Nuevo archivo. STATUS_DOT_* (6 variantes), WARNING_CHIP_*, MSG_BOX_*, VARIANT_WARNING_*. |
| 3. products-overview-page.tsx | ✅ | TooltipProvider removido. Nested TooltipProvider eliminado. 150+ strings → PRODUCTS.*. 11 color-mix → constants/ops-tone. |
| 4. styles-page.tsx | ✅ | 8 Admin* migrados: AdminModalShell→OpsDialog, AdminField→OpsFormField, AdminInput→opsInputCompact, AdminTextarea→textarea, AdminCheckboxField→raw, AdminFormActionsBar→canonical footer, AdminActionButton→Button, AdminInlineMessage→toast, AdminConfirmModal→OpsDialog. Two-phase save. |
| 5. variants-page.tsx | ✅ | AdminCheckboxOption→custom checkbox. AdminConfirmModal→OpsDialog. successMessage→showSuccess toast. 5 color-mix→constants. |
| 6. product-create-page.tsx | ✅ | AdminInlineMessage→styled div. color-mix→DUPLICATE_WARNING_TEXT. Strings→PRODUCTS.*. |
| 7. Verificacion | ✅ | TypeScript 0 errores. |

### Archivos del modulo productos

```
apps/frontend/components/modules/products/
├── products-messages.ts          ← PRODUCTS.*, ~280L
├── products-constants.ts         ← STATUS_DOT_*, WARNING_CHIP_*, MSG_BOX_*
├── products-types.ts             ← tipos de formulario (sin cambios)
├── products-utils.ts             ← utilidades (sin cambios)
├── products-overview-page.tsx    ← listado maestro
├── styles-page.tsx               ← estilos CRUD (refactorizado)
├── variants-page.tsx             ← variantes CRUD (refactorizado)
├── product-create-dialog.tsx     ← dialogo de creacion (ya limpio)
├── product-create-form.tsx       ← formulario de creacion (color-mix fix)
└── product-create-page.tsx       ← pagina de creacion standalone (refactorizada)
```

### Como continuar en otro chat (productos)

```
Continuar trabajo en modulo productos de RIPNEL.

Tareas pendientes:
1. Evaluar si product-create-page.tsx (standalone) es ruta muerta vs product-create-dialog.tsx (dialogo)
2. Revisar products-utils.ts para posibles splits por dominio (>237L)
```

## Hardening checklist (transferencias modulo)

Refactor completado en Junio 2026. Modulo compuesto por 7 pantallas: listado, detalle, request, manage, history, pendientes + hook compartido.

| Fase | Estado | Descripcion |
|------|--------|-------------|
| 1. transfers-messages.ts | ✅ | Creado desde 0. ~250 keys cubriendo header, status, scope, queue, actions, filters, table, detail, request, manage, history, validation, toast. |
| 2. transfers-constants.ts | ✅ | Creado desde 0. TRANS_STATUS_* (5 vars), TRANS_QUEUE_* (3 vars), TRANS_STAGE_* (4 vars) — reemplazan 65 color-mix inline. |
| 3. transfers-shared.tsx | ✅ | 23 color-mix→TRANS_STATUS_*/TRANS_QUEUE_*/TRANS_STAGE_*. TRANSFER_ACTION_CONFIG strings→TRANS.actionConfig.*. Format functions→TRANS.*. |
| 4. transfers-request-ui.tsx | ✅ | 22 color-mix→ops-tone. 50+ strings→TRANS.request.*. Tildes fijadas. |
| 5. transfers-request-page.tsx | ✅ | TooltipProvider removido. AdminInlineMessage→styled div. 3 section+h2→OpsPanelSection. color-mix→ops-tone. Strings→TRANS.*. |
| 6. transfers-manage-page.tsx | ✅ | AdminInlineMessage→styled div. AdminTextarea→textarea. 2 color-mix→ops-tone. Strings→TRANS.manage.*. |
| 7. transfers-list-page.tsx | ✅ | 3 TooltipProvider removidos. AdminConfirmModal→OpsDialog. AdminInlineMessage→styled div. 1 color-mix→ops-tone. Strings→TRANS.list.*/table.*. |
| 8. transfers-history-page.tsx | ✅ | 2 TooltipProvider wrappers removidos. Strings→TRANS.history.*/filters.*. |
| 9. transfers-detail-page.tsx | ✅ | TooltipProvider removido. AdminConfirmModal→OpsDialog. AdminInlineMessage→styled div. 13 color-mix→ops-tone. Strings→TRANS.detail.*. |
| 10. use-transfer-draft.ts | ✅ | 15 strings→TRANS.validation.*/toast.*. successMessage→showSuccess toast. |
| 11. Verificacion | ✅ | TypeScript 0 errores. |

### Archivos del modulo transferencias

```
apps/frontend/components/modules/transfers/
├── transfers-messages.ts         ← TRANS.*, ~250 keys
├── transfers-constants.ts        ← TRANS_STATUS_*, TRANS_QUEUE_*, TRANS_STAGE_*
├── transfers-shared.tsx          ← tipos, format functions, action config (refactorizado)
├── transfers-request-ui.tsx      ← request form UI (refactorizado)
├── transfers-request-page.tsx    ← request page wrapper (refactorizado)
├── transfers-pending-page.tsx    ← placeholder (7L, sin cambios)
├── transfers-manage-page.tsx     ← manage page (refactorizado)
├── transfers-list-page.tsx       ← inbox list (refactorizado)
├── transfers-history-page.tsx    ← history list (refactorizado)
├── transfers-detail-page.tsx     ← detail page (refactorizado)
└── use-transfer-draft.ts        ← hook (refactorizado)
```

### Como continuar en otro chat (transferencias)

```
Continuar trabajo en modulo transferencias de RIPNEL.
Revisar AGENTS.md seccion "Hardening checklist (transferencias modulo)".

Tareas pendientes:
1. transfers-pending-page.tsx (7L) es placeholder — evaluar si necesita contenido real
2. Verificar integracion de TRANSFER_ACTION_CONFIG description functions con TRANS.actionConfig.*
```

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
