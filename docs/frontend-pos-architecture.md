# POS Architecture — Nueva Venta

## File map

```
components/modules/sales/pos/
  pos-page.tsx          Route component (663 → ~640L). Renders all stages + dialogs.
  pos-types.ts          Domain types, enums, constants (DOC_TYPES, PAYMENT_METHODS, TAX_RATE).
  pos-constants.ts      CSS class constants + PAYMENT_TOLERANCE.
  pos-messages.ts       Centralized UI strings (~200 labels, errors, hints).
  pos-utils.ts          Pure functions: pricing, search, validation, summary derivation.
  pos-stage-props.ts    Typed props per stage (shared between page and stages).
  pos-icons.tsx         Icon renderers for documents and payment methods.
  stage-section.tsx     Wrapper for each operational section (products/customer/payment).
  stage-products.tsx    Product search + cart table.
  stage-customer.tsx    Customer search + document type selector.
  stage-payment.tsx     Payment method (single/mixed) + discount controls.
  stage-summary.tsx     Right sidebar: step status, totals, finalize button.
  use-pos-sale.ts       Orchestrator hook. Composes 7 sub-hooks + cross-cutting logic.
  use-cart.ts           Cart items, price overrides, removal dialogs.
  use-cash-context.ts   Cash session context, open/reopen cash.
  use-customer-search.ts Customer fetch, debounce, filter by document type.
  use-payment-state.ts  Payment mode, method, mixed payments, discount state.
  use-product-search.ts Product fetch, debounce, search ranking, style selection.
  use-sale-confirmation.ts Sale confirmation, reset, review, receipts.
  use-sale-keyboard.ts  Keyboard shortcuts (F2/F4/F8/Escape) + stage pulse.
  pos-dialogs/
    customer-dialog.tsx
    discount-dialog.tsx
    price-adjustment-dialog.tsx
    product-config-dialog.tsx
    remove-item-dialog.tsx

components/ui/purchase-system/
  PosHeader.tsx                 POS header (eyebrow + title + meta/actions).
  sale-review-dialog.tsx        Pre-confirmation review.
  sale-confirmation-dialog.tsx  Post-confirmation (receipt, new sale, detail).
```

## Hook composition

```
usePosSale()            ← page entry
  ├─ useCashContext()   ← location + permissions
  ├─ useProductSearch() ← location (triggers fetch)
  ├─ usePaymentState()  ← documentType, payment mode, discounts
  ├─ useCustomerSearch()← documentType (filters by type)
  ├─ useCart()          ← cart items, price overrides
  ├─ useSaleConfirmation() ← confirm, reset, review, receipts
  └─ useSaleKeyboard()  ← keyboard shortcuts, stage navigation
```

The orchestrator (usePosSale) handles:
- Cross-cutting derived state (totals, mixedPaymentsPreview, summaryStatusMessage, submitDisabled)
- Cross-cutting actions (selectProductStyle auto-add, confirmSale, resetSaleDraft, applyDiscountDraft)
- UI dialogs (customerDialog, productConfig, saleConfirmation, saleReview)

## CSS constants

Defined in `pos-constants.ts`, used across POS + purchase-system:

| Constant | Purpose |
|---|---|
| `INPUT_CLASS` | Input field styling |
| `INFO_BOX` | Standard info panel (rounded-lg, border, surface bg) |
| `INFO_BOX_MUTED` | Muted info panel |
| `INFO_BOX_XL` | Rounded-xl panel variant |
| `SURFACE_MUTED_BG` | Semitransparent muted background |
| `COMPACT_LABEL_CLASS` | Compact field label |
| `PAYMENT_TOLERANCE` | Floating point tolerance (0.01) |

## UI messages

`pos-messages.ts` centralizes all display strings under namespaced keys:
`POS.header`, `POS.stage`, `POS.cash`, `POS.product`, `POS.customer`,
`POS.payment`, `POS.summary`, `POS.sale`, `POS.discount`, `POS.priceAdjust`,
`POS.productConfig`, `POS.removeItem`, `POS.error`.

## Testing

**Framework**: Playwright unit tests (`@playwright/test`).

**Config**: `apps/frontend/playwright.config.ts` → testDir `__tests__/`, match `*.test.ts`.

**Commands**:
```
npm run test         # npx playwright test
npm run test:watch   # npx playwright test --watch
```

**Test file**: `__tests__/pos-utils.test.ts` — 98 tests across 20+ describe blocks covering:
- `trimOrNull`, `parseAmountInput`, `round2`, `formatMoney`
- `groupVariantsByStyle`, `findVariantByAttributes`, `getVariantOptionValues`
- `buildProductSearchResults`, `computeSaleDiscountAmount`
- `calculateSalePreview` (retail/wholesale/tax/discount/override/missing price)
- `isCustomerValidForDocumentType`, `getCustomerSearchFilter`, `filterCustomersByDocumentType`
- `validateCustomerForm`, `buildCustomerPayload`, `buildCustomerFormFromCustomer`
- `createPaymentDraft`, `createDefaultMixedPayments`
- `buildCustomerDisplayName`, `buildCustomerDocument`
- `deriveSummaryState`, `allocateDiscountAcrossItems`
- `buildCashLabel`, `getPaymentMethodLabel`, `resolveEffectivePriceMode`

## Design decisions

1. **No ORM in backend. No direct DB in frontend.** Backend owns business logic.
2. **POS uses `ops-*` canonical components** (OpsDialog, OpsSelect, OpsStatusBadge, etc.).
3. **CSS uses design tokens** (`var(--ops-*)`) throughout. No hardcoded colors.
4. **Peruvian domain** (boleta/factura, IGV 18%, Yape/Plin) is in `pos-types.ts`.
5. **Single-page wizard** (no multi-step routing) — all stages visible simultaneously.
